// /test page diagnostic. Runs entirely in the browser:
//
//   1. Capability detection + the pdf.js / tesseract.js smoke test
//      (relocated from the admin and researcher pages).
//   2. LLM diagnostic: load any model from /api/models, generate a
//      handful of tokens for a tok/s baseline, force a structured
//      tool call to confirm JSON-schema output works, then OCR a
//      canvas-rendered phrase to confirm multimodal extraction.
//
// Each LLM step has its own Run button and can be re-run on its own;
// every run appends a fresh row to the results table. Editing the
// Model-options YAML automatically unloads the worker so the next run
// picks up the new load-time settings. Sampling-options YAML applies
// per-completion (temperature, top_k, ...) and does NOT require a
// reload. In either textarea, a value of "model_default" deletes that
// key before the request, so wllama / llama.cpp falls back to its own
// default for that parameter. Step labels and analytics event names
// are static strings per CLAUDE.md §2.

import { trackUmami } from "/static/app/analytics.js";
import { wireCapabilityBanner, wireSmokePanel } from "/static/app/smoke.js";
import { logRuntimeDiagnostics } from "/static/app/diagnostics.js";
import {
  DEFAULT_MODEL_LOAD_OPTIONS,
  loadModel,
  inferBox,
  getLoadedSource,
  shutdown as shutdownLlm,
} from "/static/app/user-llm.js";
import { isImatrixQuant, warnIfImatrixQuant } from "/static/app/model-quant.js";
import {
  stripModelDefaults,
  parseYamlObject,
  dumpYamlObject,
  getJsYamlSync,
} from "/static/app/llm-options.js";
import { DEFAULT_EDITOR_SAMPLE_PARAMS } from "/static/app/llm-defaults.js";

// Step 4 (pure multimodal OCR) renders this phrase diagonally over a
// gradient background so a passing run actually requires the vision
// encoder to do work. A plain horizontal black-on-white render passed
// even with a broken encoder.
const SYNTHETIC_PHRASE = "BANANA";
const SYNTHETIC_PHRASE_EXPECTED = "banana";

const STATUS_CLASSES = {
  ok: "status-pill ok",
  warn: "status-pill warn",
  error: "status-pill error",
};

// The model_default sentinel, stripModelDefaults, parseYamlObject, and
// dumpYamlObject are shared with the admin / researcher editors and live
// in llm-options.js (sentinel value in llm-defaults.js). The diagnostic
// page leaves thinking on by default so the operator can see how
// reasoning models actually behave; the thinking budget knobs in
// TEST_PAGE_EXTRA_MODEL_OPTS still cap how long the model can stay inside
// <think>...</think>. Add `chat_template_kwargs: {enable_thinking:
// false, reasoning: false}` to the sampling textarea to disable thinking
// outright. The sampling prefill uses the shared
// DEFAULT_EDITOR_SAMPLE_PARAMS (temperature: model_default).

// Step definitions: every entry shows up as a row in the steps strip
// with its own Run button. `needsModel` marks steps that auto-load the
// model first if no instance is live.
const STEPS = [
  { id: "load",       label: "1. Load model",                 needsModel: false, fn: runStepLoad },
  { id: "textgen",    label: "2. Text generation",            needsModel: true,  fn: runStepTextGen },
  { id: "structured", label: "3. Structured JSON output",     needsModel: true,  fn: runStepStructured },
  { id: "ocr",        label: "4. Multimodal OCR (synthetic image)", needsModel: true, fn: runStepOcr },
  { id: "vchoice",    label: "5. Multimodal + constrained choice",  needsModel: true, fn: runStepVisionChoice },
  { id: "textgenfree", label: "6. Text generation (no max_tokens)",   needsModel: true, fn: runStepTextGenFree },
];

// Step 5 exercises the full per-box code path: an image goes in, the
// model must answer via a tool whose value is constrained to an enum.
// This is the closest analogue to the production user pipeline that
// the diagnostic page can reproduce without a real survey scan.
const VISION_CHOICE_PHRASE = "YES";
const VISION_CHOICES = ["yes", "no", "maybe"];
const VISION_CHOICE_EXPECTED = "yes";

let modelCatalog = null;
let activeAborter = null;
let lastReport = null;
let lastResultsById = {};
// Live results-table row while a step is generating tokens. Set by each
// step function, cleared (null) when the row is finalized. Lets the
// abort handlers finalize the row in-place instead of appending a new one.
let currentLiveRow = null;
// Step ids that have passed (res.ok === true) since the most recent
// model load. Run All skips any step in this set, since re-running it
// against the same model would only repeat a known-good result. The
// set is cleared whenever the wllama instance is torn down (Unload,
// model picker change, model-options edit) or the user explicitly
// clicks "Clear results".
const passedSinceLoad = new Set();

function resetPassedSinceLoad() {
  passedSinceLoad.clear();
}

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

function setStatus(text, cls = "muted", { spinner = false } = {}) {
  const el = document.getElementById("llm-diag-status");
  if (!el) return;
  el.className = `status-banner ${cls === "ok" ? "ok" : cls === "error" ? "err" : "warn"}`;
  el.textContent = "";
  if (spinner) {
    const s = document.createElement("span");
    s.className = "spinner";
    s.setAttribute("aria-hidden", "true");
    el.appendChild(s);
  }
  el.appendChild(document.createTextNode(text));
}

function clearTable() {
  const tbody = document.getElementById("llm-diag-tbody");
  if (tbody) tbody.innerHTML = "";
  lastResultsById = {};
}

// Cache the pre-load snapshot so the post-load callback can fold in
// "wllama active backend" without re-probing.
let runtimeSnapshot = null;

function setBackendBanner(elId, text, cls) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = `status-banner ${cls}`;
  el.textContent = text;
}

function renderBackendJson() {
  const el = document.getElementById("runtime-backend-json");
  if (!el) return;
  // Pre-load only. The post-load object (model metadata, hparams) is
  // verbose and not useful for diagnosing acceleration-backend issues.
  el.textContent = JSON.stringify(runtimeSnapshot?.preLoad || {}, null, 2);
}

// Mirror of devtools console so the operator can copy the load-time
// trace (wllama wrapper, llama.cpp native log from suppressNativeLog:
// false, diagnostics) without opening devtools. Installed once at
// init() time, before any other code logs.
const LOG_CAPTURE_LIMIT = 5000;
const logBuffer = [];
let logEl = null;
let consoleInstalled = false;

function formatLogArg(a) {
  if (a instanceof Error) return a.stack || a.message || String(a);
  if (typeof a === "string") return a;
  try { return JSON.stringify(a); } catch (_) { return String(a); }
}

function appendLogLine(line) {
  logBuffer.push(line);
  if (logBuffer.length > LOG_CAPTURE_LIMIT) {
    logBuffer.splice(0, logBuffer.length - LOG_CAPTURE_LIMIT);
  }
  if (!logEl) return;
  const wasNearBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 40;
  logEl.textContent += line + "\n";
  if (wasNearBottom) logEl.scrollTop = logEl.scrollHeight;
}

function installConsoleCapture(targetEl) {
  if (consoleInstalled) { logEl = targetEl; return; }
  consoleInstalled = true;
  logEl = targetEl;
  const methods = ["log", "info", "warn", "error", "debug"];
  for (const m of methods) {
    const orig = console[m] ? console[m].bind(console) : () => {};
    console[m] = (...args) => {
      try { orig(...args); } catch (_) {}
      try {
        const ts = new Date().toISOString().slice(11, 23);
        const line = `${ts} [${m}] ` + args.map(formatLogArg).join(" ");
        appendLogLine(line);
      } catch (_) { /* never let logging break the page */ }
    };
  }
}

function renderPreLoadBackend(snapshot) {
  runtimeSnapshot = { ...(runtimeSnapshot || {}), preLoad: snapshot };
  const { caps, browser, gpu, verdict } = snapshot;
  const parts = [];
  parts.push(`SIMD ${caps.simd ? "yes" : "NO"}`);
  parts.push(`threads ${caps.threads ? "yes" : "NO"}`);
  parts.push(`COI ${browser.crossOriginIsolated ? "yes" : "NO"}`);
  parts.push(`cores ${browser.hardwareConcurrency ?? "?"}`);
  if (gpu.available) {
    const adapter = gpu.description || gpu.device || gpu.vendor || "(adapter, no description)";
    parts.push(`WebGPU ${gpu.isFallbackAdapter ? "FALLBACK" : "ok"}: ${adapter}`);
  } else {
    parts.push(`WebGPU NO (${gpu.reason})`);
  }
  const cls = verdict?.length ? "warn" : "ok";
  setBackendBanner("runtime-backend-pre", `Browser: ${parts.join(" | ")}`, cls);
  renderBackendJson();
}

function renderPostLoadBackend(postLoad) {
  runtimeSnapshot = { ...(runtimeSnapshot || {}), postLoad };
  const { multithread, numThreads, webgpuReported, loadElapsedMs, compat } = postLoad || {};
  const bundleDesc = compat === true
    ? "BUNDLE: COMPAT (CPU-only, no WebGPU)"
    : compat === false
      ? "BUNDLE: MAIN (WebGPU/JSPI/mem64)"
      : "BUNDLE: unknown";
  const threadDesc = multithread === false
    ? "WASM single-thread"
    : multithread === true
      ? `WASM multi-thread (${numThreads ?? "?"} threads)`
      : `threads=${numThreads ?? "?"}`;
  const gpuDesc = webgpuReported === true
    ? "wllama reports WebGPU support: yes"
    : webgpuReported === false
      ? "wllama reports WebGPU support: NO"
      : "wllama WebGPU support: unknown";
  const loadDesc = typeof loadElapsedMs === "number"
    ? `loaded in ${(loadElapsedMs / 1000).toFixed(1)}s`
    : "";
  const cls = compat === true ? "warn" : multithread === false ? "warn" : "ok";
  setBackendBanner(
    "runtime-backend-post",
    `wllama active: ${bundleDesc} | ${threadDesc} | ${gpuDesc}${loadDesc ? " | " + loadDesc : ""}`,
    cls,
  );
  renderBackendJson();
}

function fmtTime(ms) {
  if (!Number.isFinite(ms)) return "--";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  // Under 10s the tenths-of-a-second digit is still meaningful (loads,
  // first-token latency on a small model); past 10s it is noise and a
  // round figure reads faster.
  if (s >= 10) return `${Math.round(s)} s`;
  return `${s.toFixed(1)} s`;
}

// Format inference speed without decimals: tok/s when >= 1, s/tok otherwise.
// "Token" here means one streaming delta, which approximates one BPE
// token in practice (wllama emits one delta per generated token in
// stream mode); the value is the right order of magnitude to compare
// across models even if it is not the exact tokeniser count.
function fmtSpeed(tps) {
  if (!Number.isFinite(tps) || tps <= 0) return "";
  if (tps >= 10) return `${Math.round(tps)} tok/s`;
  if (tps >= 1) return `${tps.toFixed(1)} tok/s`;
  return `${Math.max(1, Math.round(1 / tps))} s/tok`;
}

function appendRow({ step, statusText, statusCls, time, detail }) {
  const tbody = document.getElementById("llm-diag-tbody");
  if (!tbody) return;
  const tr = document.createElement("tr");

  const tdStep = document.createElement("td");
  tdStep.textContent = step;
  tr.appendChild(tdStep);

  const tdStatus = document.createElement("td");
  const pill = document.createElement("span");
  pill.className = STATUS_CLASSES[statusCls] || "status-pill";
  pill.textContent = statusText;
  tdStatus.appendChild(pill);
  tr.appendChild(tdStatus);

  const tdTime = document.createElement("td");
  tdTime.textContent = time != null ? fmtTime(time) : "";
  tr.appendChild(tdTime);

  const tdDetail = document.createElement("td");
  const pre = document.createElement("pre");
  pre.className = "llm-test-raw";
  pre.textContent = detail || "";
  tdDetail.appendChild(pre);
  tr.appendChild(tdDetail);

  tbody.appendChild(tr);
}

// Creates a placeholder row immediately (shows "running...") and returns
// { updateSpeed(tps), finalize({ statusText, statusCls, time, detail }) }
// so the caller can update it live and finalize it in place.
function appendLiveRow(step) {
  const tbody = document.getElementById("llm-diag-tbody");
  if (!tbody) return null;
  const tr = document.createElement("tr");

  const tdStep = document.createElement("td");
  tdStep.textContent = step;
  tr.appendChild(tdStep);

  const tdStatus = document.createElement("td");
  const pill = document.createElement("span");
  pill.className = "status-pill";
  pill.textContent = "...";
  tdStatus.appendChild(pill);
  tr.appendChild(tdStatus);

  const tdTime = document.createElement("td");
  tr.appendChild(tdTime);

  const tdDetail = document.createElement("td");
  const pre = document.createElement("pre");
  pre.className = "llm-test-raw";
  pre.textContent = "running...";
  tdDetail.appendChild(pre);
  tr.appendChild(tdDetail);

  tbody.appendChild(tr);

  return {
    updateSpeed(tps) {
      pre.textContent = `running... ${fmtSpeed(tps)}`;
    },
    finalize({ statusText, statusCls, time, detail }) {
      pill.className = STATUS_CLASSES[statusCls] || "status-pill";
      pill.textContent = statusText;
      tdTime.textContent = time != null ? fmtTime(time) : "";
      pre.textContent = detail || "";
    },
  };
}

// Wraps an onToken callback to also call onSpeed(tps) with the running
// average tok/s after each token. Used to feed live speed into a live row.
function wrapWithSpeedTracking(baseOnToken, onSpeed) {
  let chunks = 0;
  let firstTokenTime = null;
  return (ev) => {
    baseOnToken?.(ev);
    chunks++;
    const now = performance.now();
    if (firstTokenTime === null) firstTokenTime = now;
    const elapsed = now - firstTokenTime;
    if (elapsed > 0 && chunks > 1) {
      onSpeed((chunks - 1) / (elapsed / 1000));
    }
  };
}

// Object URLs minted for the in-stream image thumbnails. Kept around so
// previously-rendered sections stay viewable across step runs, revoked
// only when the operator clicks "Clear results" or the page unloads.
const trackedObjectUrls = [];
function makeImageUrl(blob) {
  const url = URL.createObjectURL(blob);
  trackedObjectUrls.push(url);
  return url;
}
function revokeImageUrls() {
  while (trackedObjectUrls.length) {
    try { URL.revokeObjectURL(trackedObjectUrls.pop()); } catch {}
  }
}

function openImageLightbox(src) {
  const overlay = document.createElement("div");
  overlay.className = "stream-lightbox";
  const img = document.createElement("img");
  img.src = src;
  img.alt = "Prompt image (full size)";
  overlay.appendChild(img);
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
}

function appendStreamSection(stepLabel) {
  const root = document.getElementById("llm-diag-stream");
  if (!root) return null;
  const section = document.createElement("div");
  section.className = "stream-section";
  const header = document.createElement("div");
  header.className = "stream-header";
  header.textContent = `=== ${stepLabel} ===`;
  section.appendChild(header);
  root.appendChild(section);
  root.scrollTop = root.scrollHeight;
  return section;
}

function appendStreamLine(section, text) {
  if (!section) return;
  const root = document.getElementById("llm-diag-stream");
  const div = document.createElement("div");
  div.className = "stream-text";
  div.textContent = text;
  section.appendChild(div);
  if (root) root.scrollTop = root.scrollHeight;
}

// Append a new section to the cumulative stream that renders the
// chat-completion messages (system / user payload), then return an
// onToken callback that streams response deltas into the response area
// of that section. When `imageUrl` is supplied, the first
// `{type:"image"}` part is rendered as a clickable thumbnail at that
// URL instead of the textual "[image: N bytes]" placeholder.
function renderPromptAndStream(stepLabel, messages, { imageUrl } = {}) {
  const root = document.getElementById("llm-diag-stream");
  if (!root) return null;
  const section = appendStreamSection(stepLabel);
  if (!section) return null;
  let imageUsed = false;
  for (const m of messages || []) {
    const role = document.createElement("div");
    role.className = "stream-role";
    role.textContent = `[${m.role}]`;
    section.appendChild(role);
    if (typeof m.content === "string") {
      const tx = document.createElement("div");
      tx.className = "stream-text";
      tx.textContent = m.content;
      section.appendChild(tx);
    } else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (!part) continue;
        if (part.type === "text") {
          const tx = document.createElement("div");
          tx.className = "stream-text";
          tx.textContent = part.text || "";
          section.appendChild(tx);
        } else if (part.type === "image") {
          if (imageUrl && !imageUsed) {
            const img = document.createElement("img");
            img.className = "stream-image";
            img.alt = "Prompt image (click to zoom)";
            img.title = "Click to zoom";
            img.src = imageUrl;
            img.addEventListener("click", () => openImageLightbox(imageUrl));
            section.appendChild(img);
            imageUsed = true;
          } else {
            const n = part.data?.byteLength;
            const tx = document.createElement("div");
            tx.className = "stream-text";
            tx.textContent = `[image: ${Number.isFinite(n) ? `${n} bytes` : "binary payload"}]`;
            section.appendChild(tx);
          }
        } else {
          const tx = document.createElement("div");
          tx.className = "stream-text";
          tx.textContent = `[${part.type || "part"}]`;
          section.appendChild(tx);
        }
      }
    }
  }
  const respLabel = document.createElement("div");
  respLabel.className = "stream-role";
  respLabel.textContent = "[response]";
  section.appendChild(respLabel);
  const respText = document.createElement("div");
  respText.className = "stream-text stream-response";
  section.appendChild(respText);
  root.scrollTop = root.scrollHeight;
  return ({ accumulated }) => {
    respText.textContent = accumulated;
    root.scrollTop = root.scrollHeight;
  };
}

function clearStream() {
  const el = document.getElementById("llm-diag-stream");
  if (el) el.innerHTML = "";
  revokeImageUrls();
}

function makeAbortError() {
  const err = new Error("cancelled");
  err.name = "AbortError";
  return err;
}

async function populateModelPicker() {
  const picker = document.getElementById("llm-diag-model");
  const meta = document.getElementById("llm-diag-model-meta");
  if (!picker) return;
  try {
    await fetchModelCatalog();
  } catch (err) {
    picker.innerHTML = `<option value="">Failed: ${err.message}</option>`;
    picker.disabled = true;
    return;
  }
  picker.innerHTML = "";
  const models = modelCatalog?.models || [];
  if (!models.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(default URL, no self-hosted models)";
    picker.appendChild(opt);
    if (meta) meta.textContent = "Falls back to the operator-configured default URL.";
    return;
  }
  for (const m of models) {
    const opt = document.createElement("option");
    opt.value = m.name;
    const tags = [];
    if (!m.mmproj_url) tags.push("no mmproj");
    if (isImatrixQuant(m.name)) tags.push("IQ quant: slow on wllama");
    opt.textContent = tags.length ? `${m.name} (${tags.join(", ")})` : m.name;
    warnIfImatrixQuant(m.name);
    picker.appendChild(opt);
  }
  if (meta) {
    meta.textContent = `${models.length} self-hosted model(s) available.`;
  }
}

// /test-only additions on top of the pipeline defaults. The diagnostic
// page exposes these so the operator can probe how reasoning behaves
// under a tight budget; the production user pipeline disables thinking
// via the chat template instead, so it does not ship these knobs.
const TEST_PAGE_EXTRA_MODEL_OPTS = Object.freeze({
  reasoning_budget_tokens: 256,
  reasoning_budget_message: "\nWait... This isn't so hard at all. I'm overthinking this   and can actually answer right away.",
});

async function prefillEditors() {
  const modelTa = document.getElementById("llm-diag-model-opts");
  const sampTa = document.getElementById("llm-diag-sampling-opts");
  if (modelTa) {
    modelTa.value = await dumpYamlObject({
      ...DEFAULT_MODEL_LOAD_OPTIONS,
      ...TEST_PAGE_EXTRA_MODEL_OPTS,
    });
  }
  if (sampTa) {
    sampTa.value = await dumpYamlObject({ ...DEFAULT_EDITOR_SAMPLE_PARAMS });
  }
}

async function readModelOptions() {
  const ta = document.getElementById("llm-diag-model-opts");
  return stripModelDefaults(await parseYamlObject(ta?.value, "Model options"));
}

async function readSamplingOptions() {
  const ta = document.getElementById("llm-diag-sampling-opts");
  return stripModelDefaults(await parseYamlObject(ta?.value, "Sampling options"));
}

// Two orthogonal faint gradients as the background, then `phrase`
// drawn diagonally in the bottom-left corner. The non-trivial layout
// and low-contrast canvas force the vision encoder to actually localise
// and read the text, instead of trivially OCRing a centred black line
// on white that even a broken model could fake.
function renderSyntheticImage(phrase) {
  const W = 800;
  const H = 500;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const gh = ctx.createLinearGradient(0, 0, W, 0);
  gh.addColorStop(0, "#ffe4d6");
  gh.addColorStop(1, "#ffffff");
  ctx.fillStyle = gh;
  ctx.fillRect(0, 0, W, H);
  const gv = ctx.createLinearGradient(0, 0, 0, H);
  gv.addColorStop(0, "rgba(214, 226, 255, 0)");
  gv.addColorStop(1, "rgba(214, 226, 255, 1)");
  ctx.fillStyle = gv;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(90, H - 80);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 64px sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(phrase, 0, 0);
  ctx.restore();
  return canvas;
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("canvas.toBlob returned null"));
    }, "image/png");
  });
}

// Drive a wllama streaming completion to completion, returning the
// merged assistant message (concatenated content + tool_calls) plus the
// number of generated chunks and the time the first chunk landed.
//
// Reasoning content (delta.reasoning_content, emitted by Qwen3 / DeepSeek
// when thinking is enabled) is counted toward the chunk total and
// surfaced in the live stream so the operator never sees a blank panel
// while the model is mid-think. It is kept in a separate `reasoning`
// field on the assistant message so downstream consumers (tool-call
// parsing, JSON validation) still see the same content shape as before.
async function consumeStream(stream, onToken) {
  const message = { role: "assistant", content: "", reasoning: "", tool_calls: [] };
  let visible = "";
  let chunks = 0;
  let firstTokenAt = null;
  for await (const chunk of stream) {
    const delta = chunk?.choices?.[0]?.delta;
    if (!delta) continue;
    let added = "";
    if (typeof delta.reasoning_content === "string" && delta.reasoning_content.length) {
      message.reasoning += delta.reasoning_content;
      added += delta.reasoning_content;
    }
    if (typeof delta.content === "string" && delta.content.length) {
      message.content += delta.content;
      added += delta.content;
    }
    if (Array.isArray(delta.tool_calls)) {
      for (const tc of delta.tool_calls) {
        const idx = typeof tc.index === "number" ? tc.index : 0;
        let slot = message.tool_calls[idx];
        if (!slot) {
          slot = { id: tc.id || "", type: tc.type || "function", function: { name: "", arguments: "" } };
          message.tool_calls[idx] = slot;
        }
        if (tc.id) slot.id = tc.id;
        if (tc.type) slot.type = tc.type;
        if (tc.function?.name) {
          slot.function.name += tc.function.name;
          added += tc.function.name;
        }
        if (typeof tc.function?.arguments === "string" && tc.function.arguments.length) {
          slot.function.arguments += tc.function.arguments;
          added += tc.function.arguments;
        }
      }
    }
    if (added) {
      if (firstTokenAt === null) firstTokenAt = performance.now();
      visible += added;
      chunks += 1;
      onToken?.({ delta: added, accumulated: visible });
    }
  }
  return { message, visible, chunks, firstTokenAt };
}

async function runStepLoad(ctx) {
  const { signal } = ctx;
  const stepLabel = "1. Load model";
  const preferred = document.getElementById("llm-diag-model")?.value || "";
  setStatus("Loading model...", "muted", { spinner: true });
  const loadSection = appendStreamSection(stepLabel);
  appendStreamLine(loadSection, "Downloading and initialising weights...");
  const start = performance.now();
  let wllama;
  try {
    wllama = await loadModel({
      catalog: modelCatalog,
      preferredName: preferred,
      loadOptionsOverride: ctx.modelOpts,
      disableVision: ctx.disableVision,
      forceCompat: ctx.forceCompat,
      compatFallback: ctx.compatFallback,
      onDiagnostics: renderPostLoadBackend,
      onProgress: ({ loaded, total, source }) => {
        if (signal?.aborted) return;
        if (!total) return;
        const pct = Math.min(100, Math.floor((loaded / total) * 100));
        const name = source?.name || "model";
        if (pct >= 100) {
          setStatus(
            `Warming up ${name} (vision encoder, can take a minute on CPU)...`,
            "muted",
            { spinner: true },
          );
        } else {
          setStatus(`Loading ${name}: ${pct}%`, "muted", { spinner: true });
        }
      },
    });
  } catch (err) {
    if (signal?.aborted || err?.name === "AbortError") throw makeAbortError();
    const elapsed = performance.now() - start;
    appendRow({
      step: stepLabel,
      statusText: "FAIL",
      statusCls: "error",
      time: elapsed,
      detail: String(err?.message || err),
    });
    throw err;
  }
  if (signal?.aborted) throw makeAbortError();
  const elapsed = performance.now() - start;
  const source = getLoadedSource();
  appendStreamLine(loadSection, `Loaded ${source?.name || "model"} in ${fmtTime(elapsed)}.`);
  appendRow({
    step: stepLabel,
    statusText: "ok",
    statusCls: "ok",
    time: elapsed,
    detail: `Loaded ${source?.name || "model"}.`,
  });
  return { ok: true, wllama, source, loadMs: elapsed, elapsedMs: elapsed };
}

async function ensureModel(ctx) {
  const { signal } = ctx;
  const preferred = document.getElementById("llm-diag-model")?.value || "";
  return await loadModel({
    catalog: modelCatalog,
    preferredName: preferred,
    loadOptionsOverride: ctx.modelOpts,
    disableVision: ctx.disableVision,
    forceCompat: ctx.forceCompat,
    compatFallback: ctx.compatFallback,
    onDiagnostics: renderPostLoadBackend,
    onProgress: ({ loaded, total, source }) => {
      if (signal?.aborted) return;
      if (!total) return;
      const pct = Math.min(100, Math.floor((loaded / total) * 100));
      const name = source?.name || "model";
      if (pct >= 100) {
        setStatus(`Warming up ${name}...`, "muted", { spinner: true });
      } else {
        setStatus(`Loading ${name}: ${pct}%`, "muted", { spinner: true });
      }
    },
  });
}

async function runStepTextGen(ctx) {
  const stepLabel = "2. Text generation";
  const { signal } = ctx;
  const wllama = await ensureModel(ctx);
  setStatus(`Running ${stepLabel}...`, "muted", { spinner: true });
  const messages = [
    {
      role: "system",
      content:
        "You are a diagnostic helper running in a browser tab. " +
        "Follow instructions exactly. DO NOT think, deliberate, or write any " +
        "preamble. Answer at the very first token with the literal text the " +
        "user asks for, nothing else. Any extra reasoning is wasted time.",
    },
    { role: "user", content: 'Reply with the single word: "ready".' },
  ];
  currentLiveRow = appendLiveRow(stepLabel);
  const onToken = wrapWithSpeedTracking(
    renderPromptAndStream(stepLabel, messages),
    (tps) => currentLiveRow?.updateSpeed(tps),
  );
  const start = performance.now();
  let result;
  try {
    const stream = await wllama.createChatCompletion({
      messages,
      max_tokens: 1024,
      ...ctx.samplingOpts,
      stream: true,
      abortSignal: signal,
    });
    result = await consumeStream(stream, onToken);
  } catch (err) {
    if (signal?.aborted) throw makeAbortError();
    const elapsed = performance.now() - start;
    currentLiveRow?.finalize({ statusText: "FAIL", statusCls: "error", time: elapsed, detail: String(err?.message || err) });
    currentLiveRow = null;
    return { ok: false };
  }
  const elapsed = performance.now() - start;
  const text = result.message.content || result.visible || "";
  // chunks is an underestimate of token count (each chunk can carry
  // multiple chars or one BPE token); for a 1024-token completion this
  // is the only reliable counter wllama exposes here. Reasoning deltas
  // are now folded into the chunk total so thinking-mode runs still
  // report a real tok/s figure.
  const tokensApprox = Math.max(1, result.chunks);
  // tok/s is timed from first token to last, not from request start, so
  // a slow first-token latency does not drag the throughput number down.
  // TTFT (start -> first token) is reported separately.
  const ttftMs = Number.isFinite(result.firstTokenAt) ? result.firstTokenAt - start : null;
  const genMs = ttftMs != null ? Math.max(1, elapsed - ttftMs) : elapsed;
  const tps = tokensApprox / (genMs / 1000);
  const ok = text.trim().length > 0;
  const speed = fmtSpeed(tps);
  const ttftStr = ttftMs != null ? `, TTFT ${fmtTime(ttftMs)}` : "";
  currentLiveRow?.finalize({
    statusText: ok ? "ok" : "FAIL",
    statusCls: ok ? "ok" : "error",
    time: elapsed,
    detail: `${tokensApprox} tok${speed ? `, ${speed}` : ""}${ttftStr}. Output: ${JSON.stringify(text)}`,
  });
  currentLiveRow = null;
  return { ok, tps, ttftMs, output: text, elapsedMs: elapsed };
}

async function runStepStructured(ctx) {
  const stepLabel = "3. Structured JSON output";
  const { signal } = ctx;
  const wllama = await ensureModel(ctx);
  setStatus(`Running ${stepLabel}...`, "muted", { spinner: true });
  const messages = [
    {
      role: "system",
      content:
        "You are a diagnostic helper that must respond by calling the " +
        "provided tool exactly once. DO NOT think, deliberate, plan, or " +
        "write any prose, preamble, or reasoning. Emit the tool call on " +
        "your very first token. There is nothing to reason about: the user " +
        "tells you the exact arguments to pass.",
    },
    {
      role: "user",
      content:
        "Call the `diagnostic_answer` tool with fruit=\"banana\" and number=7.",
    },
  ];
  currentLiveRow = appendLiveRow(stepLabel);
  const onToken = wrapWithSpeedTracking(
    renderPromptAndStream(stepLabel, messages),
    (tps) => currentLiveRow?.updateSpeed(tps),
  );
  const tool = {
    type: "function",
    function: {
      name: "diagnostic_answer",
      description: "Return the literal answer the user asked for.",
      parameters: {
        type: "object",
        properties: {
          fruit: { type: "string", enum: ["apple", "banana", "cherry"] },
          number: { type: "integer", minimum: 1, maximum: 10 },
        },
        required: ["fruit", "number"],
        additionalProperties: false,
      },
      strict: true,
    },
  };
  const start = performance.now();
  let result;
  try {
    const stream = await wllama.createChatCompletion({
      messages,
      tools: [tool],
      tool_choice: "required",
      max_tokens: 128,
      ...ctx.samplingOpts,
      stream: true,
      abortSignal: signal,
    });
    result = await consumeStream(stream, onToken);
  } catch (err) {
    if (signal?.aborted) throw makeAbortError();
    const elapsed = performance.now() - start;
    currentLiveRow?.finalize({ statusText: "FAIL", statusCls: "error", time: elapsed, detail: String(err?.message || err) });
    currentLiveRow = null;
    return { ok: false };
  }
  const elapsed = performance.now() - start;
  const tokensApprox = Math.max(1, result.chunks);
  const ttftMs = Number.isFinite(result.firstTokenAt) ? result.firstTokenAt - start : null;
  const genMs = ttftMs != null ? Math.max(1, elapsed - ttftMs) : elapsed;
  const tps = tokensApprox / (genMs / 1000);
  const speed = fmtSpeed(tps);
  const ttftStr = ttftMs != null ? `, TTFT ${fmtTime(ttftMs)}` : "";
  const tc = result.message.tool_calls?.[0];
  const rawArgs = tc?.function?.arguments || "";
  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(rawArgs);
  } catch (err) {
    parseError = err.message;
  }
  let ok = false;
  let detail = `${tokensApprox} tok${speed ? `, ${speed}` : ""}${ttftStr}. Raw: ${rawArgs || "(empty)"}`;
  if (parseError) {
    detail += `\nJSON parse error: ${parseError}`;
  } else if (!parsed || typeof parsed !== "object") {
    detail += "\nReturned value is not an object.";
  } else {
    const fruit = parsed.fruit;
    const number = parsed.number;
    const fruitOk = ["apple", "banana", "cherry"].includes(fruit);
    const numberOk = Number.isInteger(number) && number >= 1 && number <= 10;
    ok = fruitOk && numberOk;
    detail += `\nfruit=${JSON.stringify(fruit)} number=${JSON.stringify(number)}`;
    if (!fruitOk) detail += "\nfruit outside enum.";
    if (!numberOk) detail += "\nnumber outside [1,10].";
  }
  currentLiveRow?.finalize({
    statusText: ok ? "ok" : "FAIL",
    statusCls: ok ? "ok" : "error",
    time: elapsed,
    detail,
  });
  currentLiveRow = null;
  return { ok, parsed, raw: rawArgs, tps, ttftMs, elapsedMs: elapsed };
}

// Step 4: pure multimodal OCR with no tool calling. The model receives
// an image + a plain text instruction and must reply with the text it
// reads as ordinary assistant content. Isolates the vision encoder /
// text decoder path from the JSON-schema tool-calling path that step 3
// (no image) and step 5 (image + tool) cover.
async function runStepOcr(ctx) {
  const stepLabel = "4. Multimodal OCR (synthetic image)";
  const { signal } = ctx;
  const wllama = await ensureModel(ctx);
  setStatus(`Running ${stepLabel}...`, "muted", { spinner: true });
  const canvas = renderSyntheticImage(SYNTHETIC_PHRASE);
  const blob = await canvasToPngBlob(canvas);
  const imageData = await blob.arrayBuffer();
  const imageUrl = makeImageUrl(blob);
  const messages = [
    {
      role: "system",
      content:
        "You are a diagnostic helper running in a browser tab. " +
        "Read text from an image and reply with only that text, " +
        "no preamble, no explanation, no quotes. DO NOT think, deliberate, " +
        "or reason: emit the text at the very first token. Any extra " +
        "reasoning is wasted time and never improves accuracy here.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: "Read the text printed in this image. Reply with only the text, nothing else." },
        { type: "image", data: imageData },
      ],
    },
  ];
  currentLiveRow = appendLiveRow(stepLabel);
  const onToken = wrapWithSpeedTracking(
    renderPromptAndStream(stepLabel, messages, { imageUrl }),
    (tps) => currentLiveRow?.updateSpeed(tps),
  );
  const start = performance.now();
  let result;
  try {
    const stream = await wllama.createChatCompletion({
      messages,
      max_tokens: 256,
      ...ctx.samplingOpts,
      stream: true,
      abortSignal: signal,
    });
    result = await consumeStream(stream, onToken);
  } catch (err) {
    if (signal?.aborted) throw makeAbortError();
    const elapsed = performance.now() - start;
    currentLiveRow?.finalize({ statusText: "FAIL", statusCls: "error", time: elapsed, detail: String(err?.message || err) });
    currentLiveRow = null;
    return { ok: false };
  }
  const elapsed = performance.now() - start;
  const output = String(result.message.content || result.visible || "").trim();
  const tokensApprox = Math.max(1, result.chunks);
  const ttftMs = Number.isFinite(result.firstTokenAt) ? result.firstTokenAt - start : null;
  const genMs = ttftMs != null ? Math.max(1, elapsed - ttftMs) : elapsed;
  const tps = tokensApprox / (genMs / 1000);
  const speed = fmtSpeed(tps);
  const ttftStr = ttftMs != null ? `, TTFT ${fmtTime(ttftMs)}` : "";
  const statsPrefix = `${tokensApprox} tok${speed ? `, ${speed}` : ""}${ttftStr}. `;
  const lowered = output.toLowerCase();
  const ok = lowered.includes(SYNTHETIC_PHRASE_EXPECTED);
  const statusText = ok ? "ok" : output.length === 0 ? "FAIL: empty" : "FAIL: text mismatch";
  const detail = ok
    ? `${statsPrefix}Read back: "${output}"`
    : `${statsPrefix}Expected output to contain "${SYNTHETIC_PHRASE_EXPECTED}" (case-insensitive)\nGot: "${output}"`;
  currentLiveRow?.finalize({
    statusText,
    statusCls: ok ? "ok" : "error",
    time: elapsed,
    detail,
  });
  currentLiveRow = null;
  return { ok, output, tps, ttftMs, elapsedMs: elapsed };
}

// Step 5: image + constrained-enum tool call. Renders a clear "YES" on
// a white canvas and asks the model to pick one of [yes, no, maybe] via
// the standard inferBox tool schema. Verifies that the multimodal path
// and the JSON-schema enum constraint cooperate end to end, which is
// exactly what the production user pipeline does for every multi-choice
// box on a real survey.
async function runStepVisionChoice(ctx) {
  const stepLabel = "5. Multimodal + constrained choice";
  const { signal } = ctx;
  const wllama = await ensureModel(ctx);
  setStatus(`Running ${stepLabel}...`, "muted", { spinner: true });
  const canvas = renderSyntheticImage(VISION_CHOICE_PHRASE);
  const blob = await canvasToPngBlob(canvas);
  const imageUrl = makeImageUrl(blob);
  currentLiveRow = appendLiveRow(stepLabel);
  let baseStreamOnToken = null;
  const onPrompt = (messages) => {
    baseStreamOnToken = renderPromptAndStream(stepLabel, messages, { imageUrl });
  };
  const onToken = wrapWithSpeedTracking(
    (ev) => baseStreamOnToken?.(ev),
    (tps) => currentLiveRow?.updateSpeed(tps),
  );
  const timeoutSeconds = Number(modelCatalog?.llmTimeoutSeconds) || 300;
  const start = performance.now();
  let result;
  try {
    result = await inferBox({
      cropBlob: blob,
      header: "answer",
      description:
        "Pick the option whose label matches the text printed in the image.",
      type: "multi-choice",
      choices: VISION_CHOICES,
      wllama,
      onPrompt,
      onToken,
      abortSignal: signal,
      timeoutSeconds,
      samplingParams: ctx.samplingOpts,
    });
  } catch (err) {
    if (signal?.aborted) throw makeAbortError();
    const elapsed = performance.now() - start;
    currentLiveRow?.finalize({ statusText: "FAIL", statusCls: "error", time: elapsed, detail: String(err?.message || err) });
    currentLiveRow = null;
    return { ok: false };
  }
  const elapsed = performance.now() - start;
  const stats = result.stats || {};
  const tokensApprox = Math.max(1, stats.chunks || 0);
  const ttftMs = Number.isFinite(stats.firstTokenAt) ? stats.firstTokenAt - start : null;
  const genMs = ttftMs != null ? Math.max(1, elapsed - ttftMs) : elapsed;
  const tps = tokensApprox / (genMs / 1000);
  const speed = fmtSpeed(tps);
  const ttftStr = ttftMs != null ? `, TTFT ${fmtTime(ttftMs)}` : "";
  const statsPrefix = `${tokensApprox} tok${speed ? `, ${speed}` : ""}${ttftStr}. `;
  if (!result.ok) {
    currentLiveRow?.finalize({
      statusText: `FAIL: ${result.reason}`,
      statusCls: "error",
      time: elapsed,
      detail: `${statsPrefix}Expected: "${VISION_CHOICE_EXPECTED}" (from [${VISION_CHOICES.join(", ")}]). Raw: ${
        typeof result.raw === "string" ? result.raw : JSON.stringify(result.raw)
      }`,
    });
    currentLiveRow = null;
    return { ok: false, tps, ttftMs };
  }
  if (result.missing) {
    currentLiveRow?.finalize({
      statusText: "FAIL: missing",
      statusCls: "error",
      time: elapsed,
      detail: `${statsPrefix}Model signalled MISSING; expected "${VISION_CHOICE_EXPECTED}".`,
    });
    currentLiveRow = null;
    return { ok: false, tps, ttftMs };
  }
  const value = String(result.value || "");
  const ok = value.toLowerCase() === VISION_CHOICE_EXPECTED;
  const detail = ok
    ? `${statsPrefix}Picked: "${value}"`
    : `${statsPrefix}Expected: "${VISION_CHOICE_EXPECTED}"\nGot: "${value}"`;
  currentLiveRow?.finalize({
    statusText: ok ? "ok" : "FAIL: wrong choice",
    statusCls: ok ? "ok" : "error",
    time: elapsed,
    detail,
  });
  currentLiveRow = null;
  return { ok, output: value, tps, ttftMs, elapsedMs: elapsed };
}

// Step 6: text generation with no max_tokens cap. Useful as a sanity
// check that the model emits EOS on its own (some quantised builds
// keep going until they hit n_ctx, which is a different failure mode
// from "thinking budget eaten up"). The user can still cancel via the
// shared abort button, and llama.cpp's n_ctx (4096 by default) acts
// as a hard ceiling.
async function runStepTextGenFree(ctx) {
  const stepLabel = "6. Text generation (no max_tokens)";
  const { signal } = ctx;
  const wllama = await ensureModel(ctx);
  setStatus(`Running ${stepLabel}...`, "muted", { spinner: true });
  const messages = [
    {
      role: "system",
      content:
        "You are a diagnostic helper running in a browser tab. " +
        "Reply briefly and stop. DO NOT think, deliberate, or write any " +
        "preamble. Start the reply at the very first token and stop as " +
        "soon as the short answer is complete. Any extra reasoning is " +
        "wasted time.",
    },
    {
      role: "user",
      content:
        "Greet the user with a short, friendly good-morning sentence, then stop.",
    },
  ];
  // Record the timestamp of every streamed delta so we can compute
  // tok/s for the early / middle / late windows of the generation.
  // Throughput on CPU-only wllama tends to drop as the KV cache fills,
  // so a single average hides the real cost of long replies.
  currentLiveRow = appendLiveRow(stepLabel);
  const tokenTimes = [];
  const baseUpdater = renderPromptAndStream(stepLabel, messages);
  const onToken = wrapWithSpeedTracking(
    (ev) => {
      tokenTimes.push(performance.now());
      baseUpdater?.(ev);
    },
    (tps) => currentLiveRow?.updateSpeed(tps),
  );
  const start = performance.now();
  let result;
  try {
    const stream = await wllama.createChatCompletion({
      messages,
      // Intentionally no max_tokens: rely on the model emitting EOS.
      // n_ctx (4096) is the hard cap if the model never stops.
      ...ctx.samplingOpts,
      stream: true,
      abortSignal: signal,
    });
    result = await consumeStream(stream, onToken);
  } catch (err) {
    if (signal?.aborted) throw makeAbortError();
    const elapsed = performance.now() - start;
    currentLiveRow?.finalize({ statusText: "FAIL", statusCls: "error", time: elapsed, detail: String(err?.message || err) });
    currentLiveRow = null;
    return { ok: false };
  }
  const elapsed = performance.now() - start;
  const text = result.message.content || result.visible || "";
  const tokensApprox = Math.max(1, result.chunks);
  const ttftMs = Number.isFinite(result.firstTokenAt) ? result.firstTokenAt - start : null;
  const genMs = ttftMs != null ? Math.max(1, elapsed - ttftMs) : elapsed;
  const tps = tokensApprox / (genMs / 1000);
  const windowed = windowedThroughput(tokenTimes);
  const ok = text.trim().length > 0;
  const speed = fmtSpeed(tps);
  const ttftStr = ttftMs != null ? `, TTFT ${fmtTime(ttftMs)}` : "";
  let detail = `${tokensApprox} tok${speed ? `, ${speed}` : ""}${ttftStr}. Output: ${JSON.stringify(text)}`;
  if (windowed) {
    detail += `\nThroughput by phase (window: ${windowed.windowSize} tok):`;
    detail += `\n  early:  ${fmtSpeed(windowed.early)}`;
    detail += `\n  middle: ${fmtSpeed(windowed.middle)}`;
    detail += `\n  late:   ${fmtSpeed(windowed.late)}`;
  }
  currentLiveRow?.finalize({
    statusText: ok ? "ok" : "FAIL",
    statusCls: ok ? "ok" : "error",
    time: elapsed,
    detail,
  });
  currentLiveRow = null;
  return { ok, tps, ttftMs, output: text, windowed, elapsedMs: elapsed };
}

// Compute tok/s over the first, middle, and last windows of a token
// timestamp series. Returns null when there are not enough tokens to
// form three non-overlapping windows of meaningful size, in which case
// the caller falls back to the single overall figure.
function windowedThroughput(times) {
  const n = times.length;
  // Need at least 15 tokens (3 windows x 5) before splitting is useful;
  // below that the noise dominates and the overall tok/s is all we can
  // report honestly.
  if (n < 15) return null;
  // Cap each window at 20 tokens, scale down on shorter runs so the
  // windows do not overlap.
  const windowSize = Math.max(2, Math.min(20, Math.floor(n / 3)));
  const rate = (start) => {
    const dt = times[start + windowSize - 1] - times[start];
    if (!(dt > 0)) return NaN;
    return (windowSize - 1) / (dt / 1000);
  };
  const midStart = Math.max(
    windowSize,
    Math.min(n - 2 * windowSize, Math.floor(n / 2) - Math.floor(windowSize / 2)),
  );
  return {
    windowSize,
    early: rate(0),
    middle: rate(midStart),
    late: rate(n - windowSize),
  };
}

// --- Benchmarking suite ------------------------------------------------
//
// Sweeps thread count x compute offload to find the combination that
// maximises tok/s on this device. Each combination unloads any live
// instance, reloads with the combo's options, runs a 10-token text
// generation, then a 10-token multimodal OCR on the synthetic image,
// recording TTFT and tok/s per task. Rows are appended live and then
// re-sorted by OCR tok/s descending at the end (multimodal is the
// production workload). Reuses the model picker and the Model /
// Completion options textareas from the diagnostic above.
const BENCH_MAX_TOKENS = 10;
// The CPU-only combo (n_gpu_layers=0) runs on the ggml-cpu backend. On a
// capable browser the WebGPU/memory64 main bundle traps ("unreachable")
// when GPU offload is disabled, so benchLoadModel forces the ASYNCIFY
// compat bundle for this combo (forceCompat, same path real CPU-only
// browsers take via needCompat()). These two timeouts still guard the
// combo: a generous per-step watchdog so a merely-slow CPU run completes,
// and a short teardown guard so a wedged exit() can't block the next combo.
const BENCH_STEP_TIMEOUT_MS = 240000;
const BENCH_SHUTDOWN_TIMEOUT_MS = 5000;
const BENCH_OFFLOAD_MODES = Object.freeze([
  { id: "gpu-all", label: "GPU all", overlay: {} },
  { id: "cpu-all", label: "CPU only", overlay: { n_gpu_layers: 0 } },
  { id: "gpu-no-mmproj", label: "GPU, vision on CPU", overlay: { mmproj_use_gpu: false } },
]);

// The CPU-only combo runs on the compat bundle (forceCompat). If it still
// fails, tag the row so the operator knows it exercised the compat
// (ASYNCIFY, CPU-only) path, not the WebGPU main bundle, before hunting a
// broken model or bad load options. Other modes pass their raw message
// through unchanged.
function annotateBenchError(err, mode) {
  const msg = String(err?.message || err);
  if (mode?.id === "cpu-all") {
    return `${msg} [CPU-only ran on the compat bundle (forceCompat)]`;
  }
  return msg;
}

// A combo that crashed its worker (CPU-only exit(142)) can leave
// inst.exit() unable to settle. shutdown() nulls its instance handle
// synchronously before awaiting exit(), so the next loadModel always
// starts fresh; we only need to stop a hung exit() from blocking the
// loop. Race it against a short deadline and move on.
async function shutdownLlmGuarded() {
  await Promise.race([
    shutdownLlm().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, BENCH_SHUTDOWN_TIMEOUT_MS)),
  ]);
}

function benchHwThreads() {
  return (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 2;
}

// Mirror of the n_threads default in user-llm.js so the sweep always
// includes whatever the production code picks on this device. Kept in
// sync by hand: a divergence here is a benign benchmark gap, not a
// correctness bug.
function benchUserPipelineThreads() {
  return Math.max(1, benchHwThreads() - 1);
}

function benchThreadCounts() {
  const set = new Set([1, 3, benchUserPipelineThreads()]);
  return [...set].sort((a, b) => a - b);
}

function setBenchStatus(text, cls = "muted", { spinner = false } = {}) {
  const el = document.getElementById("llm-bench-status");
  if (!el) return;
  el.className = `status-banner ${cls === "ok" ? "ok" : cls === "error" ? "err" : "warn"}`;
  el.textContent = "";
  if (spinner) {
    const s = document.createElement("span");
    s.className = "spinner";
    s.setAttribute("aria-hidden", "true");
    el.appendChild(s);
  }
  el.appendChild(document.createTextNode(text));
}

function clearBenchTable() {
  const tbody = document.getElementById("llm-bench-tbody");
  if (tbody) tbody.innerHTML = "";
}

function fmtBenchTtft(ms) {
  return Number.isFinite(ms) ? fmtTime(ms) : "--";
}

function fmtBenchTps(tps) {
  return Number.isFinite(tps) && tps > 0 ? fmtSpeed(tps) : "--";
}

function benchComboLabel(threads, mode) {
  return `threads=${threads}, ${mode.label}`;
}

function appendBenchRow(row) {
  const tbody = document.getElementById("llm-bench-tbody");
  if (!tbody) return;
  const tr = document.createElement("tr");
  const cells = [
    benchComboLabel(row.threads, row.mode),
    row.text.error ? `error: ${row.text.error}` : fmtBenchTtft(row.text.ttftMs),
    row.text.error ? "--" : fmtBenchTps(row.text.tps),
    row.ocr.error ? `error: ${row.ocr.error}` : fmtBenchTtft(row.ocr.ttftMs),
    row.ocr.error ? "--" : fmtBenchTps(row.ocr.tps),
  ];
  for (const text of cells) {
    const td = document.createElement("td");
    td.textContent = text;
    tr.appendChild(td);
  }
  tbody.appendChild(tr);
}

// Append a row immediately when a combination starts, so the operator
// can see which combo is in flight and watch each metric land as soon as
// it is computed (TTFT on the first token, tok/s when the short
// generation completes). Returns handles the runner calls per phase. The
// final renderBenchTableSorted() pass replaces these live rows with the
// sorted static set, so this is display-only.
function appendBenchLiveRow(threads, mode) {
  const tbody = document.getElementById("llm-bench-tbody");
  if (!tbody) return null;
  const tr = document.createElement("tr");
  tr.className = "bench-row-active";
  const baseLabel = benchComboLabel(threads, mode);
  const tdCombo = document.createElement("td");
  tdCombo.textContent = baseLabel;
  const tdTextTtft = document.createElement("td");
  const tdTextTps = document.createElement("td");
  const tdOcrTtft = document.createElement("td");
  const tdOcrTps = document.createElement("td");
  for (const td of [tdTextTtft, tdTextTps, tdOcrTtft, tdOcrTps]) td.textContent = "...";
  tr.append(tdCombo, tdTextTtft, tdTextTps, tdOcrTtft, tdOcrTps);
  tbody.appendChild(tr);
  const renderText = (text) => {
    tdTextTtft.textContent = text.error ? `error: ${text.error}` : fmtBenchTtft(text.ttftMs);
    tdTextTps.textContent = text.error ? "--" : fmtBenchTps(text.tps);
  };
  const renderOcr = (ocr) => {
    tdOcrTtft.textContent = ocr.error ? `error: ${ocr.error}` : fmtBenchTtft(ocr.ttftMs);
    tdOcrTps.textContent = ocr.error ? "--" : fmtBenchTps(ocr.tps);
  };
  return {
    setPhase(phase) {
      tdCombo.textContent = phase ? `${baseLabel} (${phase})` : baseLabel;
    },
    setText: renderText,
    setOcr: renderOcr,
    done() {
      tr.classList.remove("bench-row-active");
      tdCombo.textContent = baseLabel;
    },
  };
}

function renderBenchTableSorted(rows) {
  clearBenchTable();
  // Sort by OCR tok/s descending. Combinations where OCR failed sink to
  // the bottom (treated as 0). Stable sort keeps insertion order for
  // ties, which keeps the lowest-thread combination first within a tie.
  const ranked = rows
    .map((r, i) => ({ r, i, key: Number.isFinite(r.ocr.tps) && !r.ocr.error ? r.ocr.tps : -1 }))
    .sort((a, b) => (b.key - a.key) || (a.i - b.i))
    .map(({ r }) => r);
  for (const r of ranked) appendBenchRow(r);
}

async function benchRunChat({ wllama, signal, samplingOpts, messages, onFirstToken }) {
  const start = performance.now();
  // Abort the stream if the operator cancels (global signal) or the
  // watchdog fires. The local controller lets the watchdog tear down a
  // single wedged step without tripping the global "cancelled" path.
  const localController = new AbortController();
  const onGlobalAbort = () => localController.abort();
  if (signal) {
    if (signal.aborted) localController.abort();
    else signal.addEventListener("abort", onGlobalAbort, { once: true });
  }
  let watchdog = null;
  const deadline = new Promise((_, reject) => {
    watchdog = setTimeout(() => {
      localController.abort();
      reject(new Error(
        `step exceeded ${Math.round(BENCH_STEP_TIMEOUT_MS / 1000)}s watchdog ` +
        `(worker may have exited)`,
      ));
    }, BENCH_STEP_TIMEOUT_MS);
  });
  try {
    const stream = await wllama.createChatCompletion({
      messages,
      max_tokens: BENCH_MAX_TOKENS,
      ...samplingOpts,
      stream: true,
      abortSignal: localController.signal,
    });
    // Fire onFirstToken the instant the first delta lands so the live row
    // can show TTFT without waiting for the remaining tokens to generate.
    let firstFired = false;
    const streamPromise = consumeStream(stream, () => {
      if (firstFired) return;
      firstFired = true;
      onFirstToken?.(performance.now() - start);
    });
    // A dead worker can leave consumeStream pending even after we abort
    // its signal, so race it against the deadline to guarantee we unblock.
    // If the watchdog wins, the abandoned stream may still reject later;
    // swallow that so it does not surface as an unhandled rejection.
    streamPromise.catch(() => {});
    const result = await Promise.race([streamPromise, deadline]);
    // A crashed or stalled CPU-only worker can return an empty stream
    // (zero deltas) instead of throwing. Treat that as a failure rather
    // than reporting a fabricated single-token throughput.
    if (!result.chunks) {
      throw new Error("no tokens produced (model emitted empty output)");
    }
    const elapsed = performance.now() - start;
    const tokens = result.chunks;
    const ttftMs = Number.isFinite(result.firstTokenAt) ? result.firstTokenAt - start : null;
    const genMs = ttftMs != null ? Math.max(1, elapsed - ttftMs) : elapsed;
    const tps = tokens / (genMs / 1000);
    return { ttftMs, tps, tokens, elapsedMs: elapsed };
  } catch (err) {
    // Operator cancel: propagate as an abort so the sweep ends cleanly
    // instead of recording a spurious per-combo error.
    if (signal?.aborted) throw makeAbortError();
    throw err;
  } finally {
    if (watchdog !== null) clearTimeout(watchdog);
    if (signal) signal.removeEventListener("abort", onGlobalAbort);
  }
}

async function benchTextGen({ wllama, signal, samplingOpts, onFirstToken }) {
  // Kept identical-looking to runStepTextGen's prompt so the benchmark
  // measures the same "warm path" the diagnostic exercises, just capped
  // at 10 tokens.
  const messages = [
    {
      role: "system",
      content:
        "You are a benchmark helper running in a browser tab. " +
        "Emit a short reply starting at the first token. Brevity matters.",
    },
    { role: "user", content: "Say hello." },
  ];
  return benchRunChat({ wllama, signal, samplingOpts, messages, onFirstToken });
}

async function benchOcr({ wllama, signal, samplingOpts, onFirstToken }) {
  const canvas = renderSyntheticImage(SYNTHETIC_PHRASE);
  const blob = await canvasToPngBlob(canvas);
  const imageData = await blob.arrayBuffer();
  const messages = [
    {
      role: "system",
      content:
        "You are a benchmark helper running in a browser tab. " +
        "Read the text in the image and reply with that text. Brevity matters.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: "What text is printed in this image?" },
        { type: "image", data: imageData },
      ],
    },
  ];
  return benchRunChat({ wllama, signal, samplingOpts, messages, onFirstToken });
}

async function benchLoadModel({ signal, modelOpts, threads, mode }) {
  const preferred = document.getElementById("llm-diag-model")?.value || "";
  return await loadModel({
    catalog: modelCatalog,
    preferredName: preferred,
    loadOptionsOverride: modelOpts,
    // CPU-only must run on the compat bundle: the WebGPU main bundle traps
    // when GPU offload is disabled. Mirror the diagnostic page's behaviour.
    forceCompat: mode?.id === "cpu-all",
    // Vision must stay on for the OCR task; the offload picker controls
    // where it runs.
    disableVision: false,
    onDiagnostics: renderPostLoadBackend,
    onProgress: ({ loaded, total }) => {
      if (signal.aborted) return;
      if (!total) return;
      // wllama's progress callback can hand `loaded` / `total` as BigInt
      // on memory64 / WebGPU builds. Math.floor(BigInt) throws "Cannot
      // convert a BigInt value to a number", which previously surfaced
      // as a load error and tanked every combination. Coerce both via
      // Number() so the existing arithmetic stays valid.
      const loadedN = typeof loaded === "bigint" ? Number(loaded) : loaded;
      const totalN = typeof total === "bigint" ? Number(total) : total;
      if (!totalN) return;
      const pct = Math.min(100, Math.floor((loadedN / totalN) * 100));
      setBenchStatus(
        `${benchComboLabel(threads, mode)}: loading ${pct}%`,
        "muted",
        { spinner: true },
      );
    },
  });
}

async function runBenchCombo({ signal, baseOpts, samplingOpts, threads, mode, liveRow }) {
  const row = {
    threads,
    mode,
    text: { ttftMs: null, tps: null, error: null },
    ocr: { ttftMs: null, tps: null, error: null },
  };
  // Build the load options: baseline from the textarea, then override
  // n_threads and the mode-specific keys. The mode overlay wins so a
  // textarea-declared `n_gpu_layers` does not silently force every CPU
  // row into a GPU run.
  const modelOpts = { ...baseOpts, n_threads: threads, ...mode.overlay };
  setBenchStatus(
    `${benchComboLabel(threads, mode)}: loading model...`,
    "muted",
    { spinner: true },
  );
  liveRow?.setPhase("loading model");
  let wllama;
  try {
    wllama = await benchLoadModel({ signal, modelOpts, threads, mode });
  } catch (err) {
    if (signal.aborted) throw makeAbortError();
    // Log the full Error object so the script's [pageerror] /
    // [console:error] mirror surfaces a stack trace pointing at the
    // exact wllama frame that threw. Without this the bench only saw
    // `err.message` and BigInt-style failures gave no actionable hint.
    console.error(
      `[bench] load failed for ${benchComboLabel(threads, mode)}`,
      err,
    );
    const msg = annotateBenchError(err, mode);
    row.text.error = `load: ${msg}`;
    row.ocr.error = `load: ${msg}`;
    liveRow?.setText(row.text);
    liveRow?.setOcr(row.ocr);
    liveRow?.done();
    return row;
  }
  if (signal.aborted) throw makeAbortError();
  setBenchStatus(
    `${benchComboLabel(threads, mode)}: text gen (max ${BENCH_MAX_TOKENS} tok)...`,
    "muted",
    { spinner: true },
  );
  liveRow?.setPhase(`text gen, max ${BENCH_MAX_TOKENS} tok`);
  try {
    const r = await benchTextGen({
      wllama,
      signal,
      samplingOpts,
      onFirstToken: (ttftMs) => { row.text.ttftMs = ttftMs; liveRow?.setText(row.text); },
    });
    row.text = { ttftMs: r.ttftMs, tps: r.tps, error: null };
  } catch (err) {
    if (signal.aborted) throw makeAbortError();
    row.text.error = annotateBenchError(err, mode);
  }
  liveRow?.setText(row.text);
  if (signal.aborted) throw makeAbortError();
  setBenchStatus(
    `${benchComboLabel(threads, mode)}: multimodal OCR (max ${BENCH_MAX_TOKENS} tok)...`,
    "muted",
    { spinner: true },
  );
  liveRow?.setPhase(`OCR, max ${BENCH_MAX_TOKENS} tok`);
  try {
    const r = await benchOcr({
      wllama,
      signal,
      samplingOpts,
      onFirstToken: (ttftMs) => { row.ocr.ttftMs = ttftMs; liveRow?.setOcr(row.ocr); },
    });
    row.ocr = { ttftMs: r.ttftMs, tps: r.tps, error: null };
  } catch (err) {
    if (signal.aborted) throw makeAbortError();
    row.ocr.error = annotateBenchError(err, mode);
  }
  liveRow?.setOcr(row.ocr);
  liveRow?.done();
  return row;
}

async function runBenchmark() {
  if (activeAborter) return;
  let baseOpts;
  let samplingOpts;
  try {
    baseOpts = await readModelOptions();
    samplingOpts = await readSamplingOptions();
  } catch (err) {
    setBenchStatus(err.message, "error");
    return;
  }
  clearBenchTable();
  // The bench reloads the wllama instance many times; reset the
  // diagnostic's "already passed" set so a later Run All re-runs every
  // step against the final loaded model.
  resetPassedSinceLoad();
  trackUmami("test:llm-bench-started");
  activeAborter = new AbortController();
  const signal = activeAborter.signal;
  setBusy(true);

  const threadCounts = benchThreadCounts();
  const total = threadCounts.length * BENCH_OFFLOAD_MODES.length;
  const rows = [];
  let idx = 0;
  try {
    for (const threads of threadCounts) {
      for (const mode of BENCH_OFFLOAD_MODES) {
        idx += 1;
        // Each combo needs a fresh instance: load-time options like
        // n_threads, n_gpu_layers, and mmproj_use_gpu only take effect
        // at load. shutdownLlm() also clears chosenSource so the next
        // load picks up the current picker selection cleanly.
        await shutdownLlmGuarded();
        setBenchStatus(
          `Combination ${idx}/${total}: ${benchComboLabel(threads, mode)}`,
          "muted",
          { spinner: true },
        );
        const liveRow = appendBenchLiveRow(threads, mode);
        const row = await runBenchCombo({ signal, baseOpts, samplingOpts, threads, mode, liveRow });
        rows.push(row);
      }
    }
    renderBenchTableSorted(rows);
    setBenchStatus(
      `Benchmark complete. ${rows.length} combinations measured. Sorted by OCR tok/s.`,
      "ok",
    );
    trackUmami("test:llm-bench-pass");
  } catch (err) {
    if (err?.name === "AbortError") {
      setBenchStatus(
        `Cancelled after ${rows.length} combination(s). Partial results shown sorted.`,
        "warn",
      );
      if (rows.length) renderBenchTableSorted(rows);
    } else {
      setBenchStatus(`Benchmark failed: ${err.message}`, "error");
    }
    trackUmami("test:llm-bench-fail");
  } finally {
    // Leave the last-loaded instance live; the operator may want to
    // poke at it via the diagnostic above. They can press Unload to
    // free workers when done.
    activeAborter = null;
    setBusy(false);
  }
}

function wireBenchmark() {
  const runBtn = document.getElementById("llm-bench-run");
  const cancelBtn = document.getElementById("llm-bench-cancel");
  const clearBtn = document.getElementById("llm-bench-clear");
  if (runBtn) runBtn.addEventListener("click", () => {
    if (activeAborter) return;
    runBenchmark();
  });
  if (cancelBtn) cancelBtn.addEventListener("click", () => {
    if (!activeAborter) return;
    setBenchStatus("Cancelling after current step...", "muted", { spinner: true });
    activeAborter.abort();
  });
  if (clearBtn) clearBtn.addEventListener("click", () => {
    if (activeAborter) return;
    clearBenchTable();
    setBenchStatus("Bench results cleared.", "muted");
  });
}

function summariseReport() {
  const source = getLoadedSource();
  const load = lastResultsById.load;
  const text = lastResultsById.textgen;
  const structured = lastResultsById.structured;
  const ocr = lastResultsById.ocr;
  const vchoice = lastResultsById.vchoice;
  const textfree = lastResultsById.textgenfree;
  const lines = [];
  const fmtStats = (r) => {
    const parts = [];
    if (r?.tps) parts.push(fmtSpeed(r.tps));
    if (Number.isFinite(r?.ttftMs)) parts.push(`TTFT ${fmtTime(r.ttftMs)}`);
    return parts.length ? ` ${parts.join(" ")}` : "";
  };
  lines.push(`# AiFormParser LLM diagnostic`);
  lines.push(`model: ${source?.name || "(unknown)"}`);
  lines.push(`load: ${fmtTime(load?.loadMs)}`);
  lines.push(`text-gen: ${text?.ok ? "ok" : "FAIL"} ${fmtTime(text?.elapsedMs)}${fmtStats(text)}`);
  lines.push(`structured: ${structured?.ok ? "ok" : "FAIL"} ${fmtTime(structured?.elapsedMs)}${fmtStats(structured)}`);
  lines.push(`ocr: ${ocr?.ok ? "ok" : "FAIL"} ${fmtTime(ocr?.elapsedMs)}${fmtStats(ocr)}`);
  lines.push(`vchoice: ${vchoice?.ok ? "ok" : "FAIL"} ${fmtTime(vchoice?.elapsedMs)}${fmtStats(vchoice)}`);
  lines.push(`text-gen-free: ${textfree?.ok ? "ok" : "FAIL"} ${fmtTime(textfree?.elapsedMs)}${fmtStats(textfree)}`);
  if (textfree?.windowed) {
    const w = textfree.windowed;
    lines.push(
      `  by-phase (${w.windowSize} tok): early ${fmtSpeed(w.early)}, middle ${fmtSpeed(w.middle)}, late ${fmtSpeed(w.late)}`,
    );
  }
  if (text?.output) lines.push(`text-gen output: ${JSON.stringify(text.output)}`);
  if (structured?.raw) lines.push(`structured raw: ${structured.raw}`);
  if (ocr?.output) lines.push(`ocr output: ${ocr.output}`);
  if (vchoice?.output) lines.push(`vchoice output: ${vchoice.output}`);
  if (textfree?.output) lines.push(`text-gen-free output: ${JSON.stringify(textfree.output)}`);
  return lines.join("\n");
}

// Keys the compute-offload picker writes into modelOpts. Each option
// owns one key; if the YAML textarea defines that same key, the
// textarea wins and the picker option is disabled (see
// refreshOffloadPickerState).
const OFFLOAD_PICKER_OWNED_KEYS = {
  "cpu-all": "n_gpu_layers",
  "gpu-no-mmproj": "mmproj_use_gpu",
};

function getOffloadPickerValue() {
  return document.getElementById("llm-diag-compute-offload")?.value || "gpu-all";
}

function getVisionEnabled() {
  const el = document.getElementById("llm-diag-enable-vision");
  return el ? !!el.checked : true;
}

// When unchecked, a CPU-only run does NOT fall back to the compat bundle:
// loadModel attempts the WebGPU main bundle directly with GPU offload off
// (it currently traps), so the operator can test a custom wllama build.
function getCompatFallbackEnabled() {
  const el = document.getElementById("llm-diag-compat-fallback");
  return el ? !!el.checked : true;
}

// Drops the picker selection into modelOpts only when the textarea has
// not already declared the same key. Mutates the passed object.
function applyOffloadPickerToModelOpts(modelOpts) {
  const choice = getOffloadPickerValue();
  if (choice === "cpu-all" && !("n_gpu_layers" in modelOpts)) {
    modelOpts.n_gpu_layers = 0;
  } else if (choice === "gpu-no-mmproj" && !("mmproj_use_gpu" in modelOpts)) {
    modelOpts.mmproj_use_gpu = false;
  }
  return modelOpts;
}

async function buildContext() {
  const [modelOpts, samplingOpts] = await Promise.all([
    readModelOptions(),
    readSamplingOptions(),
  ]);
  applyOffloadPickerToModelOpts(modelOpts);
  // CPU-only normally runs on the compat bundle: the WebGPU main bundle
  // traps ("unreachable") when GPU offload is disabled. forceCompat routes
  // this run through the vendored compat (ASYNCIFY, CPU-only) bundle even
  // on a browser that would otherwise pick the main bundle. The operator
  // can disable that fallback to probe the main bundle directly (see
  // getCompatFallbackEnabled); compatFallback also suppresses loadModel's
  // own auto-reroute when n_gpu_layers:0 is typed straight into the YAML.
  const compatFallback = getCompatFallbackEnabled();
  const forceCompat = getOffloadPickerValue() === "cpu-all" && compatFallback;
  return { modelOpts, samplingOpts, disableVision: !getVisionEnabled(), forceCompat, compatFallback };
}

async function runStep(step) {
  if (activeAborter) return;
  let ctx;
  try {
    ctx = await buildContext();
  } catch (err) {
    setStatus(err.message, "error");
    return;
  }
  activeAborter = new AbortController();
  ctx.signal = activeAborter.signal;
  setBusy(true);
  trackUmami(`test:llm-diag-step-${step.id}`);
  try {
    const res = await step.fn(ctx);
    lastResultsById[step.id] = res;
    if (res?.ok) passedSinceLoad.add(step.id);
    setStatus(
      res?.ok === false ? `${step.label}: failed.` : `${step.label}: done.`,
      res?.ok === false ? "error" : "ok",
    );
  } catch (err) {
    if (err?.name === "AbortError") {
      if (currentLiveRow) {
        currentLiveRow.finalize({ statusText: "cancelled", statusCls: "warn", time: null, detail: "" });
        currentLiveRow = null;
      } else {
        appendRow({ step: step.label, statusText: "cancelled", statusCls: "warn", time: null, detail: "" });
      }
      setStatus("Cancelled by user.", "warn");
    } else {
      setStatus(`${step.label} failed: ${err.message}`, "error");
    }
  } finally {
    lastReport = summariseReport();
    activeAborter = null;
    setBusy(false);
  }
}

async function runAll() {
  if (activeAborter) return;
  let ctx;
  try {
    ctx = await buildContext();
  } catch (err) {
    setStatus(err.message, "error");
    return;
  }
  setStatus("Running diagnostic...", "muted", { spinner: true });
  trackUmami("test:llm-diag-started");
  activeAborter = new AbortController();
  ctx.signal = activeAborter.signal;
  setBusy(true);
  let skipped = 0;
  let ran = 0;
  let currentStep = null;
  try {
    for (const step of STEPS) {
      // Skip steps that already passed against the currently-loaded
      // model. The set is cleared whenever the wllama instance is
      // unloaded, so a fresh load re-runs everything.
      if (passedSinceLoad.has(step.id)) {
        skipped += 1;
        continue;
      }
      currentStep = step;
      const res = await step.fn(ctx);
      lastResultsById[step.id] = res;
      if (res?.ok) passedSinceLoad.add(step.id);
      ran += 1;
      if (step.id === "load" && !res?.ok) break;
    }
    const text = lastResultsById.textgen;
    const structured = lastResultsById.structured;
    const ocr = lastResultsById.ocr;
    const vchoice = lastResultsById.vchoice;
    const textfree = lastResultsById.textgenfree;
    const allOk = text?.ok && structured?.ok && ocr?.ok && vchoice?.ok && textfree?.ok;
    const skippedTag = skipped ? ` (${skipped} skipped, already passed since last load)` : "";
    let msg;
    if (ran === 0) {
      msg = `Diagnostic: nothing to run, all ${skipped} step(s) already passed since the last model load.`;
    } else {
      msg = (allOk ? "Diagnostic passed." : "Diagnostic finished with failures.") + skippedTag;
    }
    setStatus(msg, allOk ? "ok" : "error");
    trackUmami(allOk ? "test:llm-diag-pass" : "test:llm-diag-fail");
  } catch (err) {
    if (err?.name === "AbortError") {
      if (currentLiveRow) {
        currentLiveRow.finalize({ statusText: "cancelled", statusCls: "warn", time: null, detail: "" });
        currentLiveRow = null;
      } else if (currentStep) {
        appendRow({ step: currentStep.label, statusText: "cancelled", statusCls: "warn", time: null, detail: "" });
      }
      setStatus("Cancelled by user.", "warn");
    } else {
      setStatus(`Diagnostic failed: ${err.message}`, "error");
    }
    trackUmami("test:llm-diag-fail");
  } finally {
    lastReport = summariseReport();
    activeAborter = null;
    setBusy(false);
  }
}

function setBusy(on) {
  document.getElementById("llm-diag-run-all").disabled = on;
  document.getElementById("llm-diag-cancel").disabled = !on;
  document.getElementById("llm-diag-model").disabled = on;
  document.getElementById("llm-diag-model-opts").disabled = on;
  document.getElementById("llm-diag-sampling-opts").disabled = on;
  document.getElementById("llm-diag-reset").disabled = on;
  document.getElementById("llm-diag-clear").disabled = on;
  for (const btn of document.querySelectorAll(".llm-diag-step-run")) {
    btn.disabled = on;
  }
  // Benchmark controls share activeAborter with the diagnostic, so
  // toggle them together to prevent the two from running concurrently.
  const benchRun = document.getElementById("llm-bench-run");
  const benchCancel = document.getElementById("llm-bench-cancel");
  const benchClear = document.getElementById("llm-bench-clear");
  if (benchRun) benchRun.disabled = on;
  if (benchCancel) benchCancel.disabled = !on;
  if (benchClear) benchClear.disabled = on;
}

function buildStepsStrip() {
  const root = document.getElementById("llm-diag-steps");
  if (!root) return;
  root.innerHTML = "";
  for (const step of STEPS) {
    const wrap = document.createElement("div");
    wrap.className = "llm-diag-step";
    const labelSpan = document.createElement("span");
    labelSpan.textContent = step.label;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "llm-diag-step-run secondary";
    btn.textContent = "Run";
    btn.addEventListener("click", () => runStep(step));
    wrap.appendChild(labelSpan);
    wrap.appendChild(btn);
    root.appendChild(wrap);
  }
}

async function unloadModel() {
  await shutdownLlm();
  resetPassedSinceLoad();
  setBackendBanner("runtime-backend-post", "Backend (post-load): load a model to populate.", "warn");
  if (runtimeSnapshot) { delete runtimeSnapshot.postLoad; renderBackendJson(); }
  setStatus("Model unloaded. The next run will reload from scratch.", "muted");
}

async function copyToClipboard(text, okMsg, errMsg) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus(okMsg, "ok");
  } catch (err) {
    setStatus(`${errMsg}: ${err.message}`, "error");
  }
}

function wireRuntimeButtons() {
  const snapBtn = document.getElementById("runtime-backend-copy");
  if (snapBtn) {
    snapBtn.addEventListener("click", () => {
      const text = JSON.stringify(runtimeSnapshot?.preLoad || {}, null, 2);
      copyToClipboard(text, "Pre-load snapshot copied.", "Clipboard failed");
    });
  }
  const logCopyBtn = document.getElementById("runtime-log-copy");
  if (logCopyBtn) {
    logCopyBtn.addEventListener("click", () => {
      copyToClipboard(logBuffer.join("\n"), "Console log copied.", "Clipboard failed");
    });
  }
  const logClearBtn = document.getElementById("runtime-log-clear");
  if (logClearBtn) {
    logClearBtn.addEventListener("click", () => {
      logBuffer.length = 0;
      if (logEl) logEl.textContent = "";
      setStatus("Console log cleared.", "muted");
    });
  }
}

async function copyReport() {
  if (!lastReport) {
    setStatus("Nothing to copy yet; run a check first.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(lastReport);
    setStatus("Report copied to clipboard.", "ok");
  } catch (err) {
    setStatus(`Clipboard failed: ${err.message}`, "error");
  }
}

function wireDiagnostic() {
  document.getElementById("llm-diag-run-all").addEventListener("click", () => {
    if (activeAborter) return;
    runAll();
  });
  document.getElementById("llm-diag-cancel").addEventListener("click", () => {
    if (!activeAborter) return;
    setStatus("Cancelling...", "muted", { spinner: true });
    activeAborter.abort();
  });
  document.getElementById("llm-diag-reset").addEventListener("click", () => {
    if (activeAborter) return;
    unloadModel();
  });
  document.getElementById("llm-diag-clear").addEventListener("click", () => {
    if (activeAborter) return;
    clearTable();
    resetPassedSinceLoad();
    clearStream();
    setStatus("Results cleared.", "muted");
  });
  document.getElementById("llm-diag-copy").addEventListener("click", copyReport);
  // The wllama instance is module-cached; a model swap or any load-time
  // option change only takes effect after we tear it down. Sampling
  // edits go in per completion, so they do NOT trigger an unload.
  document.getElementById("llm-diag-model").addEventListener("change", async () => {
    if (activeAborter) return;
    await shutdownLlm();
    resetPassedSinceLoad();
    setStatus("Model selection changed. Next run will reload.", "muted");
  });
  document.getElementById("llm-diag-model-opts").addEventListener("change", async () => {
    if (activeAborter) return;
    await shutdownLlm();
    resetPassedSinceLoad();
    setStatus("Model options changed. Next run will reload.", "muted");
  });
  // Same unload-on-change behavior for the vision toggle and the
  // compute-offload picker; both translate into load-time options.
  document.getElementById("llm-diag-enable-vision").addEventListener("change", async () => {
    if (activeAborter) return;
    await shutdownLlm();
    resetPassedSinceLoad();
    setStatus("Vision toggle changed. Next run will reload.", "muted");
  });
  document.getElementById("llm-diag-compute-offload").addEventListener("change", async () => {
    if (activeAborter) return;
    await shutdownLlm();
    resetPassedSinceLoad();
    setStatus("Compute offload changed. Next run will reload.", "muted");
  });
  // The compat-fallback toggle picks the wasm bundle for CPU-only runs, so
  // it is a load-time setting like the picker above and needs the same
  // unload-on-change teardown.
  document.getElementById("llm-diag-compat-fallback").addEventListener("change", async () => {
    if (activeAborter) return;
    await shutdownLlm();
    resetPassedSinceLoad();
    setStatus("Compat fallback toggled. Next run will reload.", "muted");
  });
  // Re-parse the Model options YAML on every input so we can disable
  // picker options whose key is already explicitly set in the textarea
  // (YAML wins; see CONFLICT POLICY in the plan). 'input' fires on
  // every keystroke, 'change' only on blur, and we want the picker to
  // update live as the operator edits.
  const modelOptsTa = document.getElementById("llm-diag-model-opts");
  modelOptsTa.addEventListener("input", () => { refreshOffloadPickerState(); });
  // First pass after prefill so the initial state is consistent.
  refreshOffloadPickerState();
}

// Best-effort YAML parse used only for the gray-out logic. We parse
// directly with js-yaml (not via parseYamlObject) because we need a
// synchronous failure path: on bad YAML we just leave the picker as it
// was rather than throwing.
function parseModelOptsKeysSync() {
  const ta = document.getElementById("llm-diag-model-opts");
  const raw = (ta?.value || "").trim();
  if (!raw) return new Set();
  const jsyaml = getJsYamlSync();
  if (!jsyaml) return new Set();
  try {
    const parsed = jsyaml.load(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return new Set();
    return new Set(Object.keys(parsed));
  } catch (_) {
    return new Set();
  }
}

// Disable picker options whose owned key is explicitly declared in
// the textarea YAML. If the currently-selected option becomes
// disabled, snap the picker back to "gpu-all" and trigger an unload
// so the next run reloads with the textarea value alone.
function refreshOffloadPickerState() {
  const picker = document.getElementById("llm-diag-compute-offload");
  if (!picker) return;
  const declared = parseModelOptsKeysSync();
  let snapped = false;
  for (const opt of picker.options) {
    const ownedKey = OFFLOAD_PICKER_OWNED_KEYS[opt.value];
    if (!ownedKey) {
      opt.disabled = false;
      opt.title = "";
      continue;
    }
    const conflict = declared.has(ownedKey);
    opt.disabled = conflict;
    opt.title = conflict ? `Overridden by '${ownedKey}' in Model options below.` : "";
    if (conflict && picker.value === opt.value) {
      picker.value = "gpu-all";
      snapped = true;
    }
  }
  if (snapped && !activeAborter) {
    // Same teardown path as a manual picker change so the load picks up
    // the textarea-driven value on the next run.
    shutdownLlm().then(() => {
      resetPassedSinceLoad();
      setStatus("Compute offload reset (overridden by Model options). Next run will reload.", "muted");
    });
  }
}

function wireUnloadHooks() {
  const teardown = () => {
    try { activeAborter?.abort(); } catch {}
    shutdownLlm();
  };
  window.addEventListener("pagehide", teardown);
  window.addEventListener("beforeunload", teardown);
}

function init() {
  // Install console capture first so the pre-load diagnostics and any
  // wllama / llama.cpp lines emitted later are mirrored into the
  // on-page log panel.
  installConsoleCapture(document.getElementById("runtime-log"));
  wireRuntimeButtons();
  wireCapabilityBanner(document.getElementById("capability-banner"));
  // Fire-and-forget: runs the SIMD/WASM/WebGPU/battery probes once now
  // so the snapshot lands in devtools before the operator runs any
  // step. Also rendered into the on-page Runtime acceleration panel so
  // the operator does not have to open devtools to see it.
  logRuntimeDiagnostics().then(renderPreLoadBackend).catch(() => {});
  const smokeBtn = document.getElementById("smoke-run");
  smokeBtn.addEventListener("click", () => trackUmami("test:smoke-test-run"));
  wireSmokePanel({
    buttonEl: smokeBtn,
    statusEl: document.getElementById("smoke-status"),
    logEl: document.getElementById("smoke-log"),
  });
  buildStepsStrip();
  prefillEditors().then(refreshOffloadPickerState).catch(() => {});
  populateModelPicker();
  wireDiagnostic();
  wireBenchmark();
  wireUnloadHooks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
