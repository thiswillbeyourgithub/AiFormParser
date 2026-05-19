// Admin-side LLM test panel.
//
// Reuses the user pipeline pieces (wllama loader, inferBox, anchor
// matcher, cropper) to let the admin dry-run the model against the
// survey currently open in the editor. Two flows:
//
//   blank: iterate every box, crop from the in-editor template canvas
//          at the stored bbox, and call inferBox. A blank scan should
//          yield missing for every box, so any non-missing value is
//          surfaced as a FAIL.
//
//   filled: admin drops one PDF or image, page count must match. We
//          rasterise, OCR, anchor-match against the in-editor template
//          (its ocrTokens/ocrBlocks already live in state.pages), crop
//          each box from the user canvas, and call inferBox. Plain
//          table, no review queue (this is a debug surface).
//
// Both flows run entirely client-side, like the user pipeline. The
// dropped scan never reaches the server.
//
// Static analytics event names only (CLAUDE.md section 2).

import { rasterisePdf, rasteriseImageFile } from "/static/app/smoke.js";
import { runOcrForPage } from "/static/app/admin-ocr.js";
import { matchPage } from "/static/app/user-anchor.js";
import { cropPage } from "/static/app/user-crop.js";
import {
  loadModel,
  inferBox,
  getLoadedSource,
  shutdown as shutdownLlm,
  DEFAULT_MODEL_LOAD_OPTIONS,
} from "/static/app/user-llm.js";
import { trackUmami } from "/static/app/analytics.js";
import { mountLlmOptions, stripModelDefaults } from "/static/app/llm-options.js";

const STATUS_CLASSES = {
  ok: "status-pill ok",
  warn: "status-pill warn",
  error: "status-pill error",
};

let modelCatalog = null;
let activeAborter = null;
// Handle to the mountLlmOptions() instance for the test panel. Set
// once in wireLlmTestPanel; read by the run / retest paths so they
// can layer the live textarea values over the selected preset's
// saved params.
let optionsHandle = null;

async function fetchModelCatalog() {
  if (modelCatalog) return modelCatalog;
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  modelCatalog = {
    models: body.models,
    llmTimeoutSeconds: body.llm_timeout_seconds,
  };
  return modelCatalog;
}

function makeAbortError() {
  const err = new Error("cancelled");
  err.name = "AbortError";
  return err;
}

function setStatus(el, text, cls = "muted", { spinner = false } = {}) {
  if (!el) return;
  el.className = `status-banner ${cls === "muted" ? "warn" : cls === "ok" ? "ok" : "err"}`;
  el.textContent = "";
  if (spinner) {
    const s = document.createElement("span");
    s.className = "spinner";
    s.setAttribute("aria-hidden", "true");
    el.appendChild(s);
  }
  el.appendChild(document.createTextNode(text));
}

function clearTable(tbody) {
  if (tbody) tbody.innerHTML = "";
}

function resetStream(streamEl, headerLine) {
  if (!streamEl) return;
  streamEl.textContent = headerLine ? `${headerLine}\n` : "";
}

function makeStreamUpdater(streamEl, headerLine) {
  if (!streamEl) return null;
  const prefix = headerLine ? `${headerLine}\n` : "";
  let count = 0;
  return ({ delta, accumulated }) => {
    count += delta.length;
    streamEl.textContent = `${prefix}[${count} chars] ${accumulated}`;
    streamEl.scrollTop = streamEl.scrollHeight;
  };
}

function fmtRaw(raw) {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string") return raw;
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return String(raw);
  }
}

function fmtFieldInfo(box, pageIdx) {
  const parts = [];
  parts.push(`Page ${pageIdx + 1}: ${box.id}`);
  if (box.header && box.header !== box.id) parts.push(`header: ${box.header}`);
  if (box.description) parts.push(box.description);
  let typeLine = `type: ${box.type}`;
  if (Array.isArray(box.choices) && box.choices.length) {
    typeLine += ` (${box.choices.join(" | ")})`;
  }
  parts.push(typeLine);
  return parts;
}

// Show the crop image at full size in a lightweight overlay so the admin
// can confirm which region the matcher actually picked. The overlay is
// pure DOM (no library) and dismisses on click or Escape.
function openZoom(dataUrl) {
  let overlay = document.getElementById("llm-test-zoom");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "llm-test-zoom";
    overlay.className = "zoom-overlay";
    overlay.innerHTML = '<img alt="zoomed crop" />';
    overlay.addEventListener("click", closeZoom);
    document.body.appendChild(overlay);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeZoom();
    });
  }
  overlay.querySelector("img").src = dataUrl;
  overlay.classList.add("visible");
}

function closeZoom() {
  const overlay = document.getElementById("llm-test-zoom");
  if (overlay) overlay.classList.remove("visible");
}

function renderRow(tr, { cropDataUrl, fieldLines, raw, statusText, statusCls }) {
  // Refill an existing <tr> in place. Used both when appending fresh
  // rows during a run and when a "Retest" click re-runs a single box.
  // The retest button is attached separately via attachRetest so the
  // refill can preserve it (or rebind it) cleanly.
  tr.innerHTML = "";

  const tdCrop = document.createElement("td");
  if (cropDataUrl) {
    const img = document.createElement("img");
    img.src = cropDataUrl;
    img.alt = "crop (click to zoom)";
    img.title = "Click to zoom";
    img.className = "llm-test-crop zoomable";
    img.addEventListener("click", () => openZoom(cropDataUrl));
    tdCrop.appendChild(img);
  } else {
    tdCrop.className = "muted";
    tdCrop.textContent = "(no crop)";
  }
  tr.appendChild(tdCrop);

  const tdField = document.createElement("td");
  for (const line of fieldLines) {
    const div = document.createElement("div");
    div.textContent = line;
    tdField.appendChild(div);
  }
  tr.appendChild(tdField);

  const tdRaw = document.createElement("td");
  const pre = document.createElement("pre");
  pre.className = "llm-test-raw";
  pre.textContent = raw || "";
  tdRaw.appendChild(pre);
  tr.appendChild(tdRaw);

  const tdStatus = document.createElement("td");
  tdStatus.className = "llm-test-status-cell";
  const pill = document.createElement("span");
  pill.className = STATUS_CLASSES[statusCls] || "status-pill";
  pill.textContent = statusText;
  tdStatus.appendChild(pill);
  tr.appendChild(tdStatus);
}

function attachRetest(tr, handler) {
  if (!tr || !handler) return;
  const tdStatus = tr.querySelector(".llm-test-status-cell");
  if (!tdStatus) return;
  const existing = tdStatus.querySelector(".llm-test-retest");
  if (existing) existing.remove();
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "secondary llm-test-retest";
  btn.textContent = "Retest";
  btn.title = "Re-run just this box, reusing the loaded model.";
  btn.addEventListener("click", handler);
  tdStatus.appendChild(btn);
}

function appendRow(tbody, opts) {
  const tr = document.createElement("tr");
  renderRow(tr, opts);
  tbody.appendChild(tr);
  return tr;
}

function isIncluded(box) {
  return box._testInclude !== false;
}

function includedBoxesPerPage(pages) {
  return pages.map((p) => (p.boxes || []).filter(isIncluded));
}

function classifyBlank(result) {
  if (!result.ok) {
    return { text: `FAIL: ${result.reason}`, cls: "error" };
  }
  if (result.missing) {
    return { text: "ok (missing as expected)", cls: "ok" };
  }
  return { text: "FAIL: unexpected value on blank", cls: "error" };
}

function classifyFilled(result, anchored) {
  if (!anchored) {
    return { text: "FAIL: no-anchor", cls: "error" };
  }
  if (!result.ok) {
    return { text: `FAIL: ${result.reason}`, cls: "error" };
  }
  if (result.missing) {
    return { text: "ok (missing)", cls: "warn" };
  }
  return { text: "ok", cls: "ok" };
}

function fmtValueForRaw(result) {
  if (!result.ok) return result.raw;
  if (result.missing) return { __missing: true, raw: result.raw };
  return { value: result.value };
}

function getStatePages(state) {
  return Array.isArray(state.pages) ? state.pages : [];
}

function templatePageAdapter(statePage) {
  return {
    width: statePage.canvas.width,
    height: statePage.canvas.height,
    ocr_tokens: statePage.ocrTokens || [],
    ocr_blocks: statePage.ocrBlocks || [],
  };
}

// Resolve the preset the admin is currently testing against. Returns
// null when no preset is selected; the test buttons are disabled in
// that case, so this is mostly defensive.
function selectedPreset(state, els) {
  const name = els.presetPick?.value || "";
  if (!name) return null;
  return (state.presets || []).find((p) => p.name === name) || null;
}

// Build the load options blob that goes to wllama. Starts from the
// shared pipeline defaults so any key the admin did not touch lands
// at the standard value, then layers the preset's saved params, then
// the dropdown's current params (which may include "model_default"
// sentinels that drop the key entirely).
async function buildLoadOptions(preset, options) {
  const base = { ...DEFAULT_MODEL_LOAD_OPTIONS };
  // Drop the preset's "model_default" sentinels before layering so a key
  // the admin parked on model_default falls through to the pipeline
  // default rather than reaching wllama as the literal string. Clone
  // first so the shared preset state is not mutated.
  const presetLoad = stripModelDefaults(structuredClone(preset.loadParams || {}));
  for (const [k, v] of Object.entries(presetLoad)) base[k] = v;
  if (options) {
    const live = await options.readLoadParams();
    for (const [k, v] of Object.entries(live)) base[k] = v;
  }
  return base;
}

async function buildSampleParams(preset, options) {
  const base = stripModelDefaults(structuredClone(preset.sampleParams || {}));
  if (options) {
    const live = await options.readSampleParams();
    for (const [k, v] of Object.entries(live)) base[k] = v;
  }
  return base;
}

async function ensureModel(state, els, options) {
  await fetchModelCatalog();
  const preset = selectedPreset(state, els);
  if (!preset) throw new Error("No preset selected.");
  const loadOptionsOverride = await buildLoadOptions(preset, options);
  setStatus(els.status, "Preparing model (checking cache)...", "muted", { spinner: true });
  const wllama = await loadModel({
    catalog: modelCatalog,
    preferredName: preset.model,
    loadOptionsOverride,
    onProgress: ({ loaded, total, source }) => {
      if (!total) return;
      const pct = Math.min(100, Math.floor((loaded / total) * 100));
      const name = source?.name || "model";
      if (pct >= 100) {
        // wllama runs llama.cpp's warmup plus a synthetic-image pass
        // through the vision encoder after the bytes are on disk. The
        // step is not user-tunable (no warmup flag exposed) and the
        // image size comes from the GGUF, not the Max-image-tokens
        // slider above, so even a low cap will not shorten this step.
        // On CPU it can take a minute or more for a Qwen3-VL model.
        setStatus(
          els.status,
          `Warming up ${name} (vision encoder, first time only, can take a minute on CPU)...`,
          "muted",
          { spinner: true },
        );
      } else {
        setStatus(els.status, `Downloading model (${name}): ${pct}%`, "muted", { spinner: true });
      }
    },
  });
  const src = getLoadedSource();
  setStatus(els.status, `Model ready: ${src?.name || "loaded"}.`, "ok");
  return wllama;
}

async function inferOneBoxBlank({ page, box, wllama, samplingParams, timeoutSeconds, signal, onToken }) {
  const crop = await cropPage(page.canvas, box.bbox);
  let result;
  if (!crop) {
    result = { ok: false, reason: "crop-out-of-frame", raw: null };
  } else {
    try {
      result = await inferBox({
        cropBlob: crop.blob,
        header: box.header,
        description: box.description,
        type: box.type,
        choices: box.choices,
        wllama,
        samplingParams,
        onToken,
        abortSignal: signal,
        timeoutSeconds,
      });
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      result = { ok: false, reason: "inference-error", raw: String(err?.message || err) };
    }
  }
  return { crop, result };
}

async function runBlankTest(state, els, signal, makeRetest) {
  const pages = getStatePages(state);
  if (!pages.length) {
    setStatus(els.status, "No survey loaded in the editor.", "error");
    return;
  }
  const preset = selectedPreset(state, els);
  if (!preset) {
    setStatus(els.status, "Add and select a preset before testing.", "error");
    return;
  }
  const perPage = includedBoxesPerPage(pages);
  const totalBoxes = perPage.reduce((n, list) => n + list.length, 0);
  const totalDefined = pages.reduce((n, p) => n + (p.boxes?.length || 0), 0);
  if (!totalDefined) {
    setStatus(els.status, "Editor has no boxes yet; nothing to test.", "error");
    return;
  }
  if (!totalBoxes) {
    setStatus(els.status, "No boxes are marked 'Include in LLM test'. Tick the box in a side panel to add one.", "error");
    return;
  }
  clearTable(els.tbody);
  resetStream(els.stream, "(waiting for model load)");
  trackUmami("admin:llm-test-blank-started");
  let wllama;
  try {
    wllama = await ensureModel(state, els, optionsHandle);
  } catch (err) {
    setStatus(els.status, `Model failed to load: ${err.message}`, "error");
    return;
  }
  const samplingParams = await buildSampleParams(preset, optionsHandle);
  const timeoutSeconds = Number(modelCatalog?.llmTimeoutSeconds) || 300;
  let done = 0;
  let fails = 0;
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];
    for (const box of perPage[pageIdx]) {
      if (signal?.aborted) throw makeAbortError();
      done += 1;
      const label = `Blank test: box ${done} of ${totalBoxes} (Page ${pageIdx + 1} / ${box.id})`;
      setStatus(els.status, `${label}...`, "muted", { spinner: true });
      resetStream(els.stream, label);
      const onToken = makeStreamUpdater(els.stream, label);
      const { crop, result } = await inferOneBoxBlank({
        page, box, wllama, samplingParams, timeoutSeconds, signal, onToken,
      });
      const verdict = classifyBlank(result);
      if (verdict.cls === "error") fails += 1;
      const tr = appendRow(els.tbody, {
        cropDataUrl: crop?.dataUrl || null,
        fieldLines: fmtFieldInfo(box, pageIdx),
        raw: fmtRaw(fmtValueForRaw(result)),
        statusText: verdict.text,
        statusCls: verdict.cls,
      });
      if (makeRetest) attachRetest(tr, makeRetest({ mode: "blank", pageIdx, boxId: box.id, tr }));
    }
  }
  const summary = fails
    ? `Blank test done: ${fails} of ${totalBoxes} included boxes did not return missing.`
    : `Blank test done: all ${totalBoxes} included boxes returned missing as expected.`;
  setStatus(els.status, summary, fails ? "error" : "ok");
  trackUmami(fails ? "admin:llm-test-blank-fail" : "admin:llm-test-blank-pass");
}


async function rasteriseAdminUpload(file) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const buf = new Uint8Array(await file.arrayBuffer());
    return await rasterisePdf(buf);
  }
  return [await rasteriseImageFile(file)];
}

async function inferOneBoxFilled({ userCanvas, match, box, wllama, samplingParams, timeoutSeconds, signal, onToken }) {
  const transformed = match.transformBox(box.bbox);
  const crop = await cropPage(userCanvas, transformed.bbox);
  let result;
  if (!crop) {
    result = { ok: false, reason: "crop-out-of-frame", raw: null };
  } else {
    try {
      result = await inferBox({
        cropBlob: crop.blob,
        header: box.header,
        description: box.description,
        type: box.type,
        choices: box.choices,
        wllama,
        samplingParams,
        onToken,
        abortSignal: signal,
        timeoutSeconds,
      });
    } catch (err) {
      if (err?.name === "AbortError") throw err;
      result = { ok: false, reason: "inference-error", raw: String(err?.message || err) };
    }
  }
  return { crop, result, transformed };
}

// Cache the rasterised user pages + per-page anchor matches from the
// most recent filled run so per-row "Retest" can re-crop and re-infer
// without redoing OCR. Cleared at the start of every fresh filled run.
let lastFilled = null;

async function runFilledTest(state, els, file, signal, makeRetest) {
  const pages = getStatePages(state);
  if (!pages.length) {
    setStatus(els.status, "No survey loaded in the editor.", "error");
    return;
  }
  const preset = selectedPreset(state, els);
  if (!preset) {
    setStatus(els.status, "Add and select a preset before testing.", "error");
    return;
  }
  const perPageIncluded = includedBoxesPerPage(pages);
  const totalBoxes = perPageIncluded.reduce((n, list) => n + list.length, 0);
  const totalDefined = pages.reduce((n, p) => n + (p.boxes?.length || 0), 0);
  if (!totalDefined) {
    setStatus(els.status, "Editor has no boxes yet; nothing to test.", "error");
    return;
  }
  if (!totalBoxes) {
    setStatus(els.status, "No boxes are marked 'Include in LLM test'. Tick the box in a side panel to add one.", "error");
    return;
  }
  clearTable(els.tbody);
  lastFilled = null;
  resetStream(els.stream, "(waiting for OCR + anchors)");
  trackUmami("admin:llm-test-filled-started");
  setStatus(els.status, `Rasterising "${file.name}"...`, "muted", { spinner: true });
  let userPages;
  try {
    userPages = await rasteriseAdminUpload(file);
  } catch (err) {
    setStatus(els.status, `Could not read file: ${err.message}`, "error");
    return;
  }
  if (userPages.length !== pages.length) {
    setStatus(els.status, `Page count mismatch: template has ${pages.length}, upload has ${userPages.length}.`, "error");
    return;
  }
  // Only OCR / match pages that have at least one included box; the
  // others get a null slot so retest never reaches them.
  const userOcr = new Array(userPages.length).fill(null);
  for (let i = 0; i < userPages.length; i++) {
    if (!perPageIncluded[i].length) continue;
    setStatus(els.status, `OCR page ${i + 1} of ${userPages.length}...`, "muted", { spinner: true });
    try {
      userOcr[i] = await runOcrForPage({ canvas: userPages[i] });
    } catch (err) {
      setStatus(els.status, `OCR failed on page ${i + 1}: ${err.message}`, "error");
      return;
    }
  }
  const perPageMatch = new Array(pages.length).fill(null);
  for (let i = 0; i < pages.length; i++) {
    if (!userOcr[i]) continue;
    const match = matchPage(templatePageAdapter(pages[i]), userOcr[i]);
    perPageMatch[i] = match;
    console.info("[admin-llm-test] page anchor", { page: i + 1, ...match.diagnostics });
  }
  lastFilled = { userPages, perPageMatch };
  let wllama;
  try {
    wllama = await ensureModel(state, els, optionsHandle);
  } catch (err) {
    setStatus(els.status, `Model failed to load: ${err.message}`, "error");
    return;
  }
  const samplingParams = await buildSampleParams(preset, optionsHandle);
  const timeoutSeconds = Number(modelCatalog?.llmTimeoutSeconds) || 300;
  let done = 0;
  let fails = 0;
  let missings = 0;
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const userCanvas = userPages[pageIdx];
    const match = perPageMatch[pageIdx];
    for (const box of perPageIncluded[pageIdx]) {
      if (signal?.aborted) throw makeAbortError();
      done += 1;
      const label = `Filled test: box ${done} of ${totalBoxes} (Page ${pageIdx + 1} / ${box.id})`;
      setStatus(els.status, `${label}...`, "muted", { spinner: true });
      resetStream(els.stream, label);
      const onToken = makeStreamUpdater(els.stream, label);
      const { crop, result, transformed } = await inferOneBoxFilled({
        userCanvas, match, box, wllama, samplingParams, timeoutSeconds, signal, onToken,
      });
      const verdict = classifyFilled(result, transformed.anchored);
      if (verdict.cls === "error") fails += 1;
      else if (verdict.cls === "warn") missings += 1;
      const tr = appendRow(els.tbody, {
        cropDataUrl: crop?.dataUrl || null,
        fieldLines: fmtFieldInfo(box, pageIdx),
        raw: fmtRaw(fmtValueForRaw(result)),
        statusText: verdict.text,
        statusCls: verdict.cls,
      });
      if (makeRetest) attachRetest(tr, makeRetest({ mode: "filled", pageIdx, boxId: box.id, tr }));
    }
  }
  const okCount = totalBoxes - fails - missings;
  const summary = `Filled test done: ${okCount} ok, ${missings} missing, ${fails} failed (of ${totalBoxes} included).`;
  setStatus(els.status, summary, fails ? "error" : "ok");
  trackUmami(fails ? "admin:llm-test-filled-fail" : "admin:llm-test-filled-pass");
}

async function retestOneBox({ state, els, ctx, signal }) {
  const { mode, pageIdx, boxId, tr } = ctx;
  const pages = getStatePages(state);
  const page = pages[pageIdx];
  const box = page?.boxes.find((b) => b.id === boxId);
  if (!box) {
    setStatus(els.status, `Box ${boxId} on page ${pageIdx + 1} no longer exists in the editor.`, "error");
    return;
  }
  const preset = selectedPreset(state, els);
  if (!preset) {
    setStatus(els.status, "Add and select a preset before testing.", "error");
    return;
  }
  const label = `Retest: Page ${pageIdx + 1} / ${box.id}`;
  setStatus(els.status, `${label}...`, "muted", { spinner: true });
  resetStream(els.stream, label);
  const onToken = makeStreamUpdater(els.stream, label);
  let wllama;
  try {
    wllama = await ensureModel(state, els, optionsHandle);
  } catch (err) {
    setStatus(els.status, `Model failed to load: ${err.message}`, "error");
    return;
  }
  const samplingParams = await buildSampleParams(preset, optionsHandle);
  const timeoutSeconds = Number(modelCatalog?.llmTimeoutSeconds) || 300;
  let crop, result, verdict;
  if (mode === "blank") {
    ({ crop, result } = await inferOneBoxBlank({
      page, box, wllama, samplingParams, timeoutSeconds, signal, onToken,
    }));
    verdict = classifyBlank(result);
  } else {
    if (!lastFilled || !lastFilled.userPages?.[pageIdx]) {
      setStatus(els.status, "No filled-test data cached; run a filled test before retesting.", "error");
      return;
    }
    const userCanvas = lastFilled.userPages[pageIdx];
    const match = lastFilled.perPageMatch[pageIdx];
    if (!match) {
      setStatus(els.status, `Page ${pageIdx + 1} was skipped in the last run (no included boxes). Re-run the filled test.`, "error");
      return;
    }
    let transformed;
    ({ crop, result, transformed } = await inferOneBoxFilled({
      userCanvas, match, box, wllama, samplingParams, timeoutSeconds, signal, onToken,
    }));
    verdict = classifyFilled(result, transformed.anchored);
  }
  renderRow(tr, {
    cropDataUrl: crop?.dataUrl || null,
    fieldLines: fmtFieldInfo(box, pageIdx),
    raw: fmtRaw(fmtValueForRaw(result)),
    statusText: verdict.text,
    statusCls: verdict.cls,
  });
  setStatus(els.status, `Retested ${box.id}: ${verdict.text}`, verdict.cls === "error" ? "error" : "ok");
}

// Re-render the preset picker from the survey state and toggle the
// run buttons. Pulls the dropdown's contents to mirror the
// preset-selection change so a freshly added preset is immediately
// usable for testing.
function refreshPresetPicker(state, els) {
  const sel = els?.presetPick || document.getElementById("llm-test-preset");
  if (!sel) return;
  const presets = state.presets || [];
  const previous = sel.value;
  sel.innerHTML = "";
  if (!presets.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No presets defined";
    sel.appendChild(opt);
    sel.disabled = true;
  } else {
    sel.disabled = false;
    for (const p of presets) {
      const opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = p.isDefault ? `${p.name} (default)` : p.name;
      sel.appendChild(opt);
    }
    // Keep the previous selection if it still exists; otherwise pick
    // the default; otherwise the first.
    if (previous && presets.some((p) => p.name === previous)) {
      sel.value = previous;
    } else {
      const def = presets.find((p) => p.isDefault) || presets[0];
      sel.value = def.name;
    }
  }
  // Whenever the picker contents change, refresh the dropdown to mirror
  // the selected preset's params so the admin sees what will actually
  // be used.
  applyPresetToOptions(state, sel.value);
  updateTestButtons(state, els);
}

async function applyPresetToOptions(state, presetName) {
  if (!optionsHandle) return;
  const preset = (state.presets || []).find((p) => p.name === presetName);
  if (!preset) {
    await optionsHandle.setLoadParams({});
    await optionsHandle.setSampleParams({});
    return;
  }
  await optionsHandle.setLoadParams(preset.loadParams || {});
  await optionsHandle.setSampleParams(preset.sampleParams || {});
}

function updateTestButtons(state, els) {
  const blank = els?.blankBtn || document.getElementById("llm-test-blank");
  const filled = els?.filledBtn || document.getElementById("llm-test-filled");
  const ready = getStatePages(state).length > 0 && (state.presets || []).length > 0;
  if (blank) blank.disabled = !ready;
  if (filled) filled.disabled = !ready;
  const meta = els?.presetMeta || document.getElementById("llm-test-preset-meta");
  if (meta) {
    if (!(state.presets || []).length) {
      meta.textContent = "Add a preset in the section above to enable testing.";
    } else {
      const sel = els?.presetPick || document.getElementById("llm-test-preset");
      const preset = (state.presets || []).find((p) => p.name === sel?.value);
      meta.textContent = preset ? `model: ${preset.model}` : "";
    }
  }
}

export function refreshLlmTestPanel(state) {
  refreshPresetPicker(state, null);
  // refreshLlmTestPanel only fires when state.pages is reassigned (load,
  // upload-yaml, discard) or when presets change. Drop the table and
  // the filled-run cache so a stale Retest cannot hit the wrong box id.
  const tbody = document.getElementById("llm-test-tbody");
  if (tbody) tbody.innerHTML = "";
  lastFilled = null;
}

export function wireLlmTestPanel(state) {
  const els = {
    status: document.getElementById("llm-test-status"),
    stream: document.getElementById("llm-test-stream"),
    tbody: document.getElementById("llm-test-tbody"),
    blankBtn: document.getElementById("llm-test-blank"),
    filledBtn: document.getElementById("llm-test-filled"),
    cancelBtn: document.getElementById("llm-test-cancel"),
    filledInput: document.getElementById("llm-test-file"),
    presetPick: document.getElementById("llm-test-preset"),
    presetMeta: document.getElementById("llm-test-preset-meta"),
    optionsHost: document.getElementById("llm-test-options"),
  };
  if (!els.blankBtn || !els.filledBtn) return;

  // Mount the reusable load/sample dropdown into the panel. It is
  // initially empty; refreshPresetPicker (and any preset selection
  // change) populates it from the chosen preset.
  if (els.optionsHost && !optionsHandle) {
    optionsHandle = mountLlmOptions(els.optionsHost, {
      summaryText: "Override preset parameters",
      initiallyOpen: false,
      onChange: async () => {
        if (busy) return;
        // Load-time options take effect only after a reload; sample
        // params apply per call. The simplest contract: tear down on
        // any change so the next run honours whatever the admin sees
        // in the textareas right now.
        await shutdownLlm();
        setStatus(els.status, "Parameters changed. Next test will reload the model.", "muted");
      },
    });
  }

  let busy = false;
  const setBusy = (on) => {
    busy = on;
    els.blankBtn.disabled = on || !getStatePages(state).length || !(state.presets || []).length;
    els.filledBtn.disabled = on || !getStatePages(state).length || !(state.presets || []).length;
    if (els.filledInput) els.filledInput.disabled = on;
    if (els.cancelBtn) els.cancelBtn.disabled = !on;
    if (els.presetPick) els.presetPick.disabled = on || !(state.presets || []).length;
    optionsHandle?.setLocked(on);
    // Per-row Retest buttons share the same worker; disable them so
    // a click during a main run cannot stack a second inference.
    for (const b of document.querySelectorAll(".llm-test-retest")) b.disabled = on;
  };

  const runWith = async (fn) => {
    activeAborter = new AbortController();
    setBusy(true);
    try {
      await fn(activeAborter.signal);
    } catch (err) {
      if (err?.name === "AbortError") {
        setStatus(els.status, "Cancelled by user.", "error");
      } else {
        setStatus(els.status, `Test failed: ${err.message}`, "error");
      }
    } finally {
      activeAborter = null;
      setBusy(false);
    }
  };

  // Factory: produces an onClick handler for the per-row Retest button.
  // Each click re-runs that one box and then rebinds itself, so the
  // button survives the row-cell refresh that renderRow performs.
  const makeRetest = (ctx) => () => {
    if (busy) return;
    runWith(async (signal) => {
      try {
        await retestOneBox({ state, els, ctx, signal });
      } finally {
        attachRetest(ctx.tr, makeRetest(ctx));
      }
    });
  };

  els.blankBtn.addEventListener("click", () => {
    if (busy) return;
    runWith((signal) => runBlankTest(state, els, signal, makeRetest));
  });

  els.filledBtn.addEventListener("click", () => {
    if (busy) return;
    els.filledInput?.click();
  });

  els.filledInput?.addEventListener("change", async () => {
    const file = els.filledInput.files?.[0];
    els.filledInput.value = "";
    if (!file) return;
    runWith((signal) => runFilledTest(state, els, file, signal, makeRetest));
  });

  els.cancelBtn?.addEventListener("click", () => {
    if (!activeAborter) return;
    setStatus(els.status, "Cancelling...", "muted", { spinner: true });
    activeAborter.abort();
  });

  // Switching presets pins the new choice for the next run: refill
  // the dropdown with the new preset's params and tear down the
  // cached wllama (model name + load opts may differ).
  els.presetPick?.addEventListener("change", async () => {
    if (busy) return;
    await applyPresetToOptions(state, els.presetPick.value);
    updateTestButtons(state, els);
    await shutdownLlm();
    setStatus(els.status, "Preset changed. Next test will reload the chosen model.", "muted");
  });

  // Tear down the shared wllama worker when the admin tab is closed or
  // navigated away. Pairs with the same hook on the user page.
  const teardown = () => {
    try { activeAborter?.abort(); } catch {}
    shutdownLlm();
  };
  window.addEventListener("pagehide", teardown);
  window.addEventListener("beforeunload", teardown);

  refreshLlmTestPanel(state);
}
