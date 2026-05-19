import { trackUmami } from "/static/app/analytics.js";
import { createWorkspace, rasteriseFileToPages, loadPagesFromUrls } from "/static/app/admin-canvas.js";
import { wireBoxEditor, collectDuplicateHeaders } from "/static/app/admin-boxes.js";
import { runOcrForPage } from "/static/app/admin-ocr.js";
import { saveSurvey, SaveValidationError } from "/static/app/admin-save.js";
import { runPrecheck, formatPrecheckReport } from "/static/app/admin-precheck.js";
import { wireLlmTestPanel, refreshLlmTestPanel } from "/static/app/admin-llm-test.js";
import { wirePresetSection } from "/static/app/admin-presets.js";
import { isImatrixQuant, warnIfImatrixQuant } from "/static/app/model-quant.js";
import { requestPersistentStorage } from "/static/app/persistent-storage.js";
import { logRuntimeDiagnostics } from "/static/app/diagnostics.js";

// In-memory editor state. Each entry of `pages` mirrors the YAML page,
// plus a live canvas reference. Box drawing, OCR, save, presets, and
// the test panel all plug into this object.
const state = {
  name: "",
  slug: "",
  presets: [],        // [{ name, model, loadParams, sampleParams, isDefault }]
  isEditing: false,
  workspace: null,
  boxEditor: null,
  presetUi: null,
  pages: [],          // { index, canvas, imageFilename, ocrTokens, ocrBlocks, boxes }
  ocrBusy: false,
  ocrStartedAt: null, // Date when the current OCR run started, null when idle.
};

async function fetchSurveys() {
  const res = await fetch("/api/surveys");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).surveys;
}

function renderSurveyRows(surveys) {
  const tbody = document.getElementById("admin-survey-rows");
  tbody.innerHTML = "";
  if (!surveys.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="muted">No surveys yet. Drop a YAML below to import, or start a new survey in the editor.</td></tr>';
    return;
  }
  for (const s of surveys) {
    const tr = document.createElement("tr");
    tr.dataset.slug = s.slug;
    tr.innerHTML = `
      <td><code>${s.slug}</code></td>
      <td>${s.name}</td>
      <td>${s.page_count}</td>
      <td class="row">
        <button class="secondary" data-action="edit">Edit</button>
        <button class="secondary" data-action="duplicate">Duplicate</button>
        <button class="secondary" data-action="rename">Rename</button>
        <button class="danger" data-action="delete">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

function setListStatus(msg, cls = "muted") {
  const el = document.getElementById("admin-survey-status");
  el.className = cls;
  el.textContent = msg;
}

function setEditorStatus(msg, cls = "muted") {
  const el = document.getElementById("editor-status");
  el.className = cls;
  el.textContent = msg;
}

async function postForm(url, params) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) body.append(k, v);
  const res = await fetch(url, { method: "POST", body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

async function deleteSurvey(slug) {
  const res = await fetch(`/api/surveys/${encodeURIComponent(slug)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function refreshSurveyList() {
  try {
    const surveys = await fetchSurveys();
    renderSurveyRows(surveys);
    setListStatus(`${surveys.length} survey(s).`);
  } catch (err) {
    setListStatus(`Failed to load: ${err.message}`, "error");
  }
}

function wireSurveyActions() {
  document.getElementById("admin-survey-rows").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = btn.closest("tr");
    const slug = row?.dataset.slug;
    if (!slug) return;
    const action = btn.dataset.action;
    btn.disabled = true;
    try {
      if (action === "delete") {
        if (!confirm(`Delete survey "${slug}"? This cannot be undone.`)) return;
        await deleteSurvey(slug);
        trackUmami("admin:survey-deleted");
        setListStatus(`Deleted ${slug}.`, "ok");
      } else if (action === "duplicate") {
        const newSlug = prompt(`Duplicate "${slug}" to which new slug?`);
        if (!newSlug) return;
        await postForm(`/api/surveys/${encodeURIComponent(slug)}/duplicate`, { new_slug: newSlug });
        trackUmami("admin:survey-duplicated");
        setListStatus(`Duplicated to ${newSlug}.`, "ok");
      } else if (action === "rename") {
        const newSlug = prompt(`Rename "${slug}" to:`, slug);
        if (!newSlug || newSlug === slug) return;
        await postForm(`/api/surveys/${encodeURIComponent(slug)}/rename`, { new_slug: newSlug });
        trackUmami("admin:survey-renamed");
        setListStatus(`Renamed ${slug} -> ${newSlug}.`, "ok");
      } else if (action === "edit") {
        await loadSurveyForEditing(slug);
        setListStatus(`Editing "${slug}".`, "ok");
      }
      if (action !== "edit") await refreshSurveyList();
    } catch (err) {
      setListStatus(`Action failed: ${err.message}`, "error");
    } finally {
      btn.disabled = false;
    }
  });
}

function wireYamlUpload() {
  const button = document.getElementById("admin-yaml-parse");
  const input = document.getElementById("admin-yaml-input");
  const log = document.getElementById("admin-yaml-log");
  button.addEventListener("click", async () => {
    log.textContent = "";
    const file = input.files?.[0];
    if (!file) {
      log.textContent = "Pick a .yaml file first.";
      return;
    }
    const text = await file.text();
    const body = new URLSearchParams();
    body.append("yaml", text);
    const res = await fetch("/admin/upload-yaml", { method: "POST", body });
    const result = await res.json().catch(() => null);
    if (!res.ok) {
      log.textContent = `Error ${res.status}: ${JSON.stringify(result, null, 2)}`;
      return;
    }
    log.textContent = JSON.stringify(result, null, 2);
  });
}

function refreshUniqueness() {
  const dups = collectDuplicateHeaders(state);
  const el = document.getElementById("editor-uniqueness");
  if (!dups.size) {
    el.className = "muted";
    el.textContent = "Headers OK.";
  } else {
    el.className = "error";
    el.textContent = `Duplicate header(s): ${[...dups].join(", ")}. Save will be blocked.`;
  }
  invalidatePrecheck();
}

// Any structural edit invalidates the last precheck result; hide the
// override button and clear the rendered report so the admin re-runs
// the check (manually or via the next Save click).
function invalidatePrecheck() {
  const reportEl = document.getElementById("editor-precheck-report");
  if (reportEl) {
    reportEl.hidden = true;
    reportEl.textContent = "";
    reportEl.className = "log";
  }
  const saveAnyway = document.getElementById("editor-save-anyway");
  if (saveAnyway) saveAnyway.hidden = true;
  const save = document.getElementById("editor-save");
  if (save) save.hidden = false;
}

function renderPrecheckReport(report) {
  const el = document.getElementById("editor-precheck-report");
  if (!el) return;
  el.textContent = formatPrecheckReport(report);
  el.className = report.ok ? (report.hasWarn ? "log warn" : "log ok") : "log error";
  el.hidden = false;
}

function onPrecheckClick() {
  const btn = document.getElementById("editor-precheck");
  btn.disabled = true;
  try {
    const report = runPrecheck(state);
    renderPrecheckReport(report);
    trackUmami(report.ok ? "admin:precheck-pass" : "admin:precheck-fail");
    setEditorStatus(
      report.ok
        ? (report.hasWarn ? "Precheck passed with warnings (see report)." : "Precheck passed.")
        : "Precheck found errors (see report).",
      report.ok ? (report.hasWarn ? "muted" : "ok") : "error",
    );
  } finally {
    btn.disabled = false;
  }
}

function ensureWorkspace() {
  if (state.workspace) return state.workspace;
  const wsEl = document.getElementById("editor-workspace");
  state.workspace = createWorkspace(wsEl, {
    onPageChange: (page, idx) => {
      setEditorStatus(`Active page: ${idx + 1} of ${state.pages.length}.`);
      renderOcrOverlayForPage(idx);
    },
  });
  state.boxEditor = wireBoxEditor(state, document.getElementById("editor-side-panel-body"), {
    onChange: refreshUniqueness,
  });
  document.getElementById("editor-draw-toggle").addEventListener("click", () => {
    state.boxEditor.setDrawMode(!state.boxEditor.drawMode);
  });
  document.getElementById("editor-ocr-run").addEventListener("click", () => {
    trackUmami("admin:ocr-rerun");
    runOcrOnActivePage();
  });
  const ocrToggle = document.getElementById("editor-ocr-overlay-toggle");
  if (ocrToggle) {
    ocrToggle.addEventListener("change", (e) => {
      state.workspace.setOcrVisible(e.target.checked);
      if (e.target.checked) renderOcrOverlayForPage(state.workspace.activeIndex);
    });
  }
  return state.workspace;
}

function renderOcrOverlayForPage(idx) {
  const ws = state.workspace;
  if (!ws) return;
  const wsPage = ws.pages[idx];
  const statePage = state.pages[idx];
  if (!wsPage || !statePage || !wsPage.ocrOverlay) return;
  const el = wsPage.ocrOverlay;
  el.innerHTML = "";
  for (const blk of statePage.ocrBlocks || []) {
    const div = document.createElement("div");
    div.className = "ocr-block-mark";
    div.title = `block: ${blk.text}`;
    const [x, y, w, h] = blk.bbox;
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.style.width = `${w}px`;
    div.style.height = `${h}px`;
    el.appendChild(div);
  }
  for (const tok of statePage.ocrTokens || []) {
    const div = document.createElement("div");
    div.className = "ocr-token-mark";
    const conf = Math.round((tok.confidence || 0) * 100);
    div.title = `${tok.text} (${conf}%)`;
    const [x, y, w, h] = tok.bbox;
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.style.width = `${w}px`;
    div.style.height = `${h}px`;
    el.appendChild(div);
  }
}

function formatClock(d) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function setOcrBusy(on) {
  state.ocrBusy = on;
  const btn = document.getElementById("editor-ocr-run");
  if (!btn) return;
  if (on) {
    state.ocrStartedAt = new Date();
    btn.disabled = true;
    btn.title = `Waiting for OCR started at ${formatClock(state.ocrStartedAt)} to finish.`;
  } else {
    state.ocrStartedAt = null;
    btn.disabled = false;
    btn.removeAttribute("title");
  }
}

async function runOcrForPageIndex(idx) {
  if (idx < 0 || idx >= state.pages.length) return false;
  const page = state.pages[idx];
  const statusEl = document.getElementById("editor-ocr-status");
  setOcrBusy(true);
  statusEl.className = "muted";
  statusEl.textContent = `Page ${idx + 1}: loading tesseract...`;
  try {
    const { ocrTokens, ocrBlocks } = await runOcrForPage(page, {
      onLog: (line) => { statusEl.textContent = `Page ${idx + 1}: ${line}`; },
    });
    page.ocrTokens = ocrTokens;
    page.ocrBlocks = ocrBlocks;
    statusEl.className = "ok";
    statusEl.textContent = `Page ${idx + 1}: ${ocrTokens.length} word(s), ${ocrBlocks.length} block(s).`;
    renderOcrOverlayForPage(idx);
    return true;
  } catch (err) {
    statusEl.className = "error";
    statusEl.textContent = `OCR failed: ${err.message}`;
    return false;
  } finally {
    setOcrBusy(false);
  }
}

async function runOcrOnActivePage() {
  const idx = state.workspace?.activeIndex ?? -1;
  await runOcrForPageIndex(idx);
}

async function runOcrAllPagesSequentially() {
  for (let i = 0; i < state.pages.length; i++) {
    await runOcrForPageIndex(i);
  }
}

function suggestSlug(filename) {
  const base = filename.replace(/\.[^.]+$/, "").toLowerCase();
  return base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "survey";
}

async function loadSurveyForEditing(slug) {
  setEditorStatus(`Loading "${slug}"...`);
  const res = await fetch(`/api/surveys/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  const surveyDoc = payload.survey;
  const urlMap = Object.fromEntries(payload.page_images.map((p) => [p.filename, p.url]));
  const pageDefs = await loadPagesFromUrls(surveyDoc.pages, urlMap);

  state.isEditing = true;
  state.name = surveyDoc.name;
  state.slug = surveyDoc.slug;
  state.presets = (surveyDoc.presets || []).map((p) => ({
    name: p.name,
    model: p.model,
    loadParams: p.load_params || {},
    sampleParams: p.sample_params || {},
    isDefault: !!p.is_default,
  }));
  state.pages = pageDefs.map((def) => {
    const yamlPage = surveyDoc.pages.find((p) => p.index === def.index);
    return {
      index: def.index,
      canvas: def.canvas,
      imageFilename: def.imageFilename,
      ocrTokens: (yamlPage.ocr_tokens || []).map((t) => ({ ...t })),
      ocrBlocks: (yamlPage.ocr_blocks || []).map((b) => ({
        ...b,
        words: (b.words || []).map((w) => ({ ...w })),
      })),
      boxes: (yamlPage.boxes || []).map((b) => ({ ...b })),
    };
  });

  const ws = ensureWorkspace();
  document.getElementById("editor-empty").hidden = true;
  document.getElementById("editor-layout").hidden = false;
  ws.setPages(state.pages.map((p) => ({
    index: p.index,
    canvas: p.canvas,
    imageFilename: p.imageFilename,
  })));
  state.boxEditor.refresh();
  refreshUniqueness();
  document.getElementById("editor-name").value = state.name;
  document.getElementById("editor-slug").value = state.slug;
  state.presetUi?.refresh();
  document.getElementById("editor-save").disabled = false;
  document.getElementById("editor-precheck").disabled = false;
  document.getElementById("editor-discard").disabled = false;
  invalidatePrecheck();
  const boxCount = state.pages.reduce((n, p) => n + p.boxes.length, 0);
  setEditorStatus(`Loaded "${slug}": ${state.pages.length} page(s), ${boxCount} box(es).`, "ok");
  refreshLlmTestPanel(state);
}

async function startNewSurveyFromFile(file) {
  setEditorStatus(`Rasterising "${file.name}"...`);
  try {
    const pageDefs = await rasteriseFileToPages(file);
    state.isEditing = false;
    state.pages = pageDefs.map((p) => ({
      index: p.index,
      canvas: p.canvas,
      imageFilename: p.imageFilename,
      ocrTokens: [],
      ocrBlocks: [],
      boxes: [],
    }));
    const ws = ensureWorkspace();
    document.getElementById("editor-empty").hidden = true;
    document.getElementById("editor-layout").hidden = false;
    ws.setPages(state.pages.map((p) => ({
      index: p.index,
      canvas: p.canvas,
      imageFilename: p.imageFilename,
    })));
    state.boxEditor.refresh();
    refreshUniqueness();
    state.name = document.getElementById("editor-name").value;
    state.slug = document.getElementById("editor-slug").value;
    state.presets = [];
    state.presetUi?.refresh();
    document.getElementById("editor-save").disabled = false;
    const nameEl = document.getElementById("editor-name");
    const slugEl = document.getElementById("editor-slug");
    if (!nameEl.value) nameEl.value = file.name.replace(/\.[^.]+$/, "");
    if (!slugEl.value) slugEl.value = suggestSlug(file.name);
    document.getElementById("editor-discard").disabled = false;
    document.getElementById("editor-precheck").disabled = false;
    invalidatePrecheck();
    setEditorStatus(`Loaded ${state.pages.length} page(s) from "${file.name}". OCR is running in the background; you can start drawing boxes now.`);
    refreshLlmTestPanel(state);
    // Fire-and-forget: OCR runs sequentially per page; the button stays
    // disabled with a started-at tooltip until each page finishes.
    runOcrAllPagesSequentially();
  } catch (err) {
    setEditorStatus(`Failed: ${err.message}`, "error");
  }
}

async function performSave() {
  const save = document.getElementById("editor-save");
  const anyway = document.getElementById("editor-save-anyway");
  state.name = document.getElementById("editor-name").value;
  state.slug = document.getElementById("editor-slug").value;
  save.disabled = true;
  anyway.disabled = true;
  try {
    const result = await saveSurvey(state, { overwrite: state.isEditing });
    trackUmami("admin:survey-saved");
    setEditorStatus(`Saved as "${result.slug}".`, "ok");
    await refreshSurveyList();
    state.isEditing = true;
    invalidatePrecheck();
  } catch (err) {
    const cls = err instanceof SaveValidationError ? "error" : "error";
    setEditorStatus(`Save failed: ${err.message}`, cls);
  } finally {
    save.disabled = false;
    anyway.disabled = false;
  }
}

async function onSaveClick() {
  const report = runPrecheck(state);
  renderPrecheckReport(report);
  if (!report.ok) {
    trackUmami("admin:precheck-fail");
    setEditorStatus("Precheck found errors. Review the report; use Save anyway to override.", "error");
    document.getElementById("editor-save").hidden = true;
    document.getElementById("editor-save-anyway").hidden = false;
    return;
  }
  if (report.hasWarn) {
    trackUmami("admin:precheck-pass");
    setEditorStatus("Precheck passed with warnings; saving.", "muted");
  } else {
    trackUmami("admin:precheck-pass");
  }
  await performSave();
}

async function onSaveAnywayClick() {
  trackUmami("admin:save-anyway");
  await performSave();
  // Reset the override after the attempt so the next edit/save cycle
  // re-runs the precheck from scratch.
  document.getElementById("editor-save-anyway").hidden = true;
  document.getElementById("editor-save").hidden = false;
}

function wireEditor() {
  const empty = document.getElementById("editor-empty");
  const input = document.getElementById("editor-files");
  empty.addEventListener("click", () => input.click());
  empty.addEventListener("dragover", (e) => { e.preventDefault(); empty.classList.add("dragover"); });
  empty.addEventListener("dragleave", () => empty.classList.remove("dragover"));
  empty.addEventListener("drop", async (e) => {
    e.preventDefault();
    empty.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (file) await startNewSurveyFromFile(file);
  });
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (file) await startNewSurveyFromFile(file);
  });
  document.getElementById("editor-save").addEventListener("click", onSaveClick);
  document.getElementById("editor-save-anyway").addEventListener("click", onSaveAnywayClick);
  document.getElementById("editor-precheck").addEventListener("click", onPrecheckClick);
  document.getElementById("editor-name").addEventListener("input", (e) => { state.name = e.target.value; });
  document.getElementById("editor-slug").addEventListener("input", (e) => { state.slug = e.target.value; });
  document.getElementById("editor-discard").addEventListener("click", () => {
    state.pages = [];
    state.isEditing = false;
    if (state.workspace) state.workspace.reset();
    if (state.boxEditor) state.boxEditor.refresh();
    document.getElementById("editor-layout").hidden = true;
    document.getElementById("editor-empty").hidden = false;
    document.getElementById("editor-discard").disabled = true;
    document.getElementById("editor-save").disabled = true;
    document.getElementById("editor-precheck").disabled = true;
    document.getElementById("editor-name").value = "";
    document.getElementById("editor-slug").value = "";
    state.presets = [];
    state.presetUi?.refresh();
    document.getElementById("editor-uniqueness").textContent = "";
    invalidatePrecheck();
    setEditorStatus("");
    refreshLlmTestPanel(state);
  });
}

async function refreshModelList() {
  const ul = document.getElementById("model-list");
  ul.innerHTML = "";
  try {
    const res = await fetch("/api/models");
    const body = await res.json();
    if (!body.models.length) {
      const li = document.createElement("li");
      li.className = "muted";
      li.textContent = "(none self-hosted; the client will fetch the default URL)";
      ul.appendChild(li);
      return;
    }
    for (const m of body.models) {
      const li = document.createElement("li");
      li.textContent = m.name;
      if (!m.mmproj_url) {
        const warn = document.createElement("span");
        warn.className = "warn-inline";
        warn.textContent = " no mmproj GGUF in this model's subdirectory; multimodal inference will fail";
        li.appendChild(warn);
        console.warn(
          `Model "${m.name}" has no mmproj GGUF in its MODELS_DIR subdirectory; ` +
          "multimodal inference will fail."
        );
      }
      if (isImatrixQuant(m.name)) {
        const warn = document.createElement("span");
        warn.className = "warn-inline";
        warn.textContent = " IQ imatrix quant: not recommended for wllama (slow)";
        li.appendChild(warn);
        warnIfImatrixQuant(m.name);
      }
      ul.appendChild(li);
    }
  } catch (err) {
    ul.innerHTML = `<li class="error">Failed to load models: ${err.message}</li>`;
  }
}

function init() {
  // Fire-and-forget: runs the SIMD/WASM/WebGPU/battery probes once now
  // so the report is in devtools before the operator clicks Test in the
  // LLM panel. Decoupled from model load.
  logRuntimeDiagnostics();
  wireSurveyActions();
  wireYamlUpload();
  wireEditor();
  state.presetUi = wirePresetSection(state, {
    onChange: () => {
      invalidatePrecheck();
      // Test panel reads from state.presets; keep its picker fresh.
      refreshLlmTestPanel(state);
    },
  });
  wireLlmTestPanel(state);
  refreshSurveyList();
  refreshModelList();
  // Pin the wllama OPFS cache so the test-panel model is not
  // redownloaded after the browser reclaims storage. Non-fatal on
  // failure; result is logged for the operator.
  requestPersistentStorage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

export { state };
