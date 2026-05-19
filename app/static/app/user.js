import { trackUmami } from "/static/app/analytics.js";
import { rasterisePdf, rasteriseImageFile, wireCapabilityBanner } from "/static/app/smoke.js";
import { logRuntimeDiagnostics } from "/static/app/diagnostics.js";
import { runOcrForPage } from "/static/app/admin-ocr.js";
import { matchPage, __internals as anchorInternals } from "/static/app/user-anchor.js";
import { cropPage } from "/static/app/user-crop.js";
import {
  loadModel,
  inferBox,
  getLoadedSource,
  shutdown as shutdownLlm,
  DEFAULT_MODEL_LOAD_OPTIONS,
} from "/static/app/user-llm.js";
import { renderReviewQueue, allResolved } from "/static/app/user-review.js";
import { exportCsv, exportXlsx, triggerDownload } from "/static/app/user-export.js";
import { mountLlmOptions, stripModelDefaults } from "/static/app/llm-options.js";
import {
  DEFAULT_EDITOR_LOAD_PARAMS,
  DEFAULT_EDITOR_SAMPLE_PARAMS,
} from "/static/app/llm-defaults.js";
import { requestPersistentStorage } from "/static/app/persistent-storage.js";
import { acquireWakeLock } from "/static/app/wake-lock.js";

// Per-upload pipeline state. Each upload is one filled-in copy of the
// selected template. Later pipeline steps (OCR, anchor match, LLM
// inference, review, export) plug into this object via the same
// state.uploads list.
const state = {
  template: null,         // { slug, survey, pageImages }
  uploads: [],            // see ingestFiles()
  nextUploadId: 1,
  modelCatalog: null,     // { models: [{ name, url }] }
  pipelineRunning: false,
  pipelineAborter: null,  // AbortController fed to inferBox so Cancel can cut the loop
  allTemplates: null,     // Map<slug, { survey, page_images }>, populated lazily for autodetect
  autodetectPromise: null, // shared across uploads dropped in the same batch
  optionsHandle: null,    // Handle to mountLlmOptions for the override dropdown
  selectedPresetName: "", // currently selected preset name within the loaded template
};

const UPLOAD_STATUSES = {
  queued: { label: "queued", cls: "muted" },
  rasterising: { label: "rasterising", cls: "muted" },
  "page-count-mismatch": { label: "page count mismatch", cls: "error" },
  ocr: { label: "OCR", cls: "muted" },
  anchor: { label: "anchor", cls: "muted" },
  infer: { label: "inferring", cls: "muted" },
  ready: { label: "ready", cls: "ok" },
  review: { label: "needs review", cls: "warn" },
  error: { label: "error", cls: "error" },
};

const LAST_SURVEY_KEY = "aifp:user:last-survey-slug";
const AUTODETECT_VALUE = "__autodetect__";
// Cap the strings fed to Levenshtein so detection over many large surveys
// stays under ~100ms. Lev is O(n*m) and a typical OCR page is well under
// this length, so the cap rarely truncates real signal.
const AUTODETECT_TEXT_CAP = 3000;

async function refreshSurveyPicker() {
  const select = document.getElementById("survey-picker");
  const meta = document.getElementById("survey-meta");
  select.innerHTML = '<option value="">Loading...</option>';
  meta.textContent = "";
  try {
    const res = await fetch("/api/surveys");
    const body = await res.json();
    select.innerHTML = "";
    if (!body.surveys.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No surveys available";
      select.appendChild(opt);
      meta.textContent = "Ask an administrator to publish a survey template.";
      return;
    }
    const auto = document.createElement("option");
    auto.value = AUTODETECT_VALUE;
    auto.textContent = "Auto-detect from upload";
    select.appendChild(auto);
    for (const s of body.surveys) {
      const opt = document.createElement("option");
      opt.value = s.slug;
      opt.textContent = `${s.name} (${s.page_count} page${s.page_count === 1 ? "" : "s"})`;
      select.appendChild(opt);
    }
    const remembered = readLastSurveySlug();
    if (remembered && remembered !== AUTODETECT_VALUE && body.surveys.some((s) => s.slug === remembered)) {
      select.value = remembered;
      loadTemplate(remembered);
    } else {
      // Default to autodetect when the user has not previously chosen a
      // template (or when their remembered choice no longer exists).
      select.value = AUTODETECT_VALUE;
      enterAutodetectMode();
    }
  } catch (err) {
    meta.textContent = `Failed to load surveys: ${err.message}`;
  }
}

function readLastSurveySlug() {
  try {
    return window.localStorage.getItem(LAST_SURVEY_KEY) || "";
  } catch {
    return "";
  }
}

function writeLastSurveySlug(slug) {
  try {
    if (slug) window.localStorage.setItem(LAST_SURVEY_KEY, slug);
    else window.localStorage.removeItem(LAST_SURVEY_KEY);
  } catch {
    // localStorage can throw in private-mode browsers; the convenience
    // feature degrades to no-op rather than breaking the picker.
  }
}

async function loadTemplate(slug) {
  const meta = document.getElementById("survey-meta");
  state.template = null;
  meta.className = "muted";
  if (!slug) {
    meta.textContent = "";
    return;
  }
  meta.textContent = "Loading template...";
  try {
    const res = await fetch(`/api/surveys/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    state.template = { slug, survey: body.survey, pageImages: body.page_images };
    const pageCount = body.survey.pages.length;
    const boxCount = body.survey.pages.reduce((acc, p) => acc + p.boxes.length, 0);
    meta.textContent = `Template loaded: ${pageCount} page(s), ${boxCount} box(es). Each uploaded survey must have exactly ${pageCount} page(s).`;
    await refreshPresetPicker();
    trackUmami("user:template-loaded");
  } catch (err) {
    meta.className = "error";
    meta.textContent = `Failed to load template: ${err.message}`;
  }
}

function enterAutodetectMode() {
  state.template = null;
  state.autodetectPromise = null;
  const meta = document.getElementById("survey-meta");
  if (meta) {
    meta.className = "muted";
    meta.textContent = "We'll detect the survey from your first upload.";
  }
}

function joinOcrText(blocks) {
  const parts = [];
  for (const b of blocks || []) {
    if (b && b.text) parts.push(b.text);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim().toLowerCase().slice(0, AUTODETECT_TEXT_CAP);
}

function templateMatchText(survey) {
  const blocks = [];
  for (const page of survey?.pages || []) {
    for (const b of page.ocr_blocks || []) blocks.push(b);
  }
  return joinOcrText(blocks);
}

function uploadMatchText(pageOcr) {
  const blocks = [];
  for (const page of pageOcr || []) {
    for (const b of page.ocrBlocks || []) blocks.push(b);
  }
  return joinOcrText(blocks);
}

async function loadAllTemplates() {
  if (state.allTemplates) return state.allTemplates;
  const listRes = await fetch("/api/surveys");
  if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);
  const listBody = await listRes.json();
  const templates = new Map();
  await Promise.all(
    listBody.surveys.map(async (s) => {
      const r = await fetch(`/api/surveys/${encodeURIComponent(s.slug)}`);
      if (!r.ok) return;
      const body = await r.json();
      templates.set(s.slug, body);
    }),
  );
  state.allTemplates = templates;
  return templates;
}

function pickBestTemplate(pageOcr, templates) {
  const userText = uploadMatchText(pageOcr);
  if (!userText) throw new Error("Uploaded file had no OCR text to match against");
  let best = null;
  for (const [slug, body] of templates) {
    const tplText = templateMatchText(body.survey);
    if (!tplText) continue;
    const dist = anchorInternals.levenshtein(userText, tplText);
    const max = Math.max(userText.length, tplText.length);
    const sim = max ? 1 - dist / max : 0;
    if (!best || sim > best.sim) best = { slug, body, sim };
  }
  if (!best) throw new Error("No stored template has OCR text to match against");
  return best;
}

async function ensureTemplate(upload) {
  if (state.template) return;
  if (!state.autodetectPromise) {
    state.autodetectPromise = (async () => {
      const templates = await loadAllTemplates();
      if (!templates.size) throw new Error("No surveys available on the server");
      const match = pickBestTemplate(upload.pageOcr, templates);
      state.template = {
        slug: match.slug,
        survey: match.body.survey,
        pageImages: match.body.page_images,
      };
      const picker = document.getElementById("survey-picker");
      if (picker) picker.value = match.slug;
      const meta = document.getElementById("survey-meta");
      if (meta) {
        const pageCount = match.body.survey.pages.length;
        const pct = Math.round(match.sim * 100);
        meta.className = "muted";
        meta.textContent = `Auto-detected: ${match.body.survey.name} (${pageCount} page${pageCount === 1 ? "" : "s"}, similarity ${pct}%).`;
      }
      await refreshPresetPicker();
      trackUmami("user:template-autodetected");
    })().catch((err) => {
      // Reset so the next upload can retry with its own OCR.
      state.autodetectPromise = null;
      throw err;
    });
  }
  await state.autodetectPromise;
}

async function refreshModelCatalog() {
  try {
    const res = await fetch("/api/models");
    const body = await res.json();
    state.modelCatalog = {
      models: body.models,
      llmTimeoutSeconds: body.llm_timeout_seconds,
    };
  } catch (err) {
    console.warn("[user] failed to load model catalogue", err);
    state.modelCatalog = { models: [], llmTimeoutSeconds: 300 };
  }
}

// Rebuild the preset picker from the currently loaded template and
// pre-fill the override dropdown with the chosen preset's params.
// Disables the run button when the survey has no presets (admin must
// define at least one).
async function refreshPresetPicker() {
  const picker = document.getElementById("user-preset");
  if (!picker) return;
  const presets = state.template?.survey?.presets || [];
  const previous = picker.value;
  picker.innerHTML = "";
  if (!state.template) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Pick a survey first";
    picker.appendChild(opt);
    picker.disabled = true;
    state.selectedPresetName = "";
    await applyPresetToOptions(null);
    updatePipelineButton();
    return;
  }
  if (!presets.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No presets defined for this survey";
    picker.appendChild(opt);
    picker.disabled = true;
    state.selectedPresetName = "";
    await applyPresetToOptions(null);
    updatePipelineButton();
    return;
  }
  picker.disabled = false;
  for (const p of presets) {
    const opt = document.createElement("option");
    opt.value = p.name;
    const tag = p.is_default ? " (default)" : "";
    opt.textContent = `${p.name} - ${p.model}${tag}`;
    picker.appendChild(opt);
  }
  const def = presets.find((p) => p.is_default) || presets[0];
  const target = presets.some((p) => p.name === previous) ? previous : def.name;
  picker.value = target;
  state.selectedPresetName = target;
  await applyPresetToOptions(presets.find((p) => p.name === target));
  updatePipelineButton();
}

function selectedPreset() {
  if (!state.template || !state.selectedPresetName) return null;
  const presets = state.template.survey.presets || [];
  return presets.find((p) => p.name === state.selectedPresetName) || null;
}

async function applyPresetToOptions(preset) {
  const handle = state.optionsHandle;
  if (!handle) return;
  if (!preset) {
    // No preset selected: fall back to the shared portable defaults so the
    // override editor mirrors what a fresh preset would start from.
    await handle.setLoadParams({ ...DEFAULT_EDITOR_LOAD_PARAMS });
    await handle.setSampleParams({ ...DEFAULT_EDITOR_SAMPLE_PARAMS });
    return;
  }
  await handle.setLoadParams(preset.load_params || {});
  await handle.setSampleParams(preset.sample_params || {});
  updatePresetMeta();
}

function updatePresetMeta() {
  const meta = document.getElementById("user-preset-meta");
  if (!meta) return;
  const preset = selectedPreset();
  if (!preset) {
    meta.textContent = "";
    return;
  }
  const available = (state.modelCatalog?.models || []).some((m) => m.name === preset.model);
  meta.textContent = available
    ? `model: ${preset.model}`
    : `model: ${preset.model} (not present on this instance; ask the admin to install it)`;
}

function uploadsContainer() {
  return document.getElementById("uploads-list");
}

function renderUploadRow(upload) {
  let row = document.querySelector(`[data-upload-id="${upload.id}"]`);
  if (!row) {
    row = document.createElement("div");
    row.className = "upload-row";
    row.dataset.uploadId = String(upload.id);
    row.innerHTML = `
      <div class="upload-head">
        <strong class="upload-name"></strong>
        <span class="upload-pages muted"></span>
        <span class="upload-status status-pill"></span>
      </div>
      <div class="upload-detail muted"></div>
    `;
    uploadsContainer().appendChild(row);
  }
  row.querySelector(".upload-name").textContent = upload.file.name;
  const pageInfo = upload.pages ? `${upload.pages.length} page${upload.pages.length === 1 ? "" : "s"}` : "...";
  row.querySelector(".upload-pages").textContent = pageInfo;
  const meta = UPLOAD_STATUSES[upload.status] || { label: upload.status, cls: "muted" };
  const pill = row.querySelector(".upload-status");
  pill.textContent = meta.label;
  pill.className = `upload-status status-pill ${meta.cls}`;
  row.querySelector(".upload-detail").textContent = upload.detail || "";
}

function setUploadStatus(upload, status, detail = "") {
  upload.status = status;
  upload.detail = detail;
  renderUploadRow(upload);
}

function resetLlmStream(headerLine) {
  const el = document.getElementById("llm-stream");
  if (!el) return;
  el.textContent = headerLine ? `${headerLine}\n` : "";
}

function makeLlmStreamUpdater(headerLine) {
  const el = document.getElementById("llm-stream");
  if (!el) return null;
  const prefix = headerLine ? `${headerLine}\n` : "";
  return ({ delta, accumulated }) => {
    el.textContent = `${prefix}[${accumulated.length} chars] ${accumulated}`;
    el.scrollTop = el.scrollHeight;
  };
}

function clearUploadsPanel() {
  state.uploads = [];
  state.nextUploadId = 1;
  uploadsContainer().innerHTML = "";
  setLlmStatus("Model not loaded.", "muted");
  resetLlmStream("");
  // If the user is in autodetect mode, clear the previously detected
  // template too so the next batch re-runs detection. A potentially
  // different survey could be on the way.
  const picker = document.getElementById("survey-picker");
  if (picker?.value === AUTODETECT_VALUE) enterAutodetectMode();
  updatePipelineButton();
  const section = document.getElementById("review-section");
  if (section) section.hidden = true;
  const queue = document.getElementById("review-queue");
  if (queue) queue.innerHTML = "";
  const exp = document.getElementById("export-section");
  if (exp) exp.hidden = true;
}

async function rasteriseFile(file) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const buf = new Uint8Array(await file.arrayBuffer());
    return await rasterisePdf(buf);
  }
  // Image file: wrap as a single-page canvas, upscaling small inputs (see
  // rasteriseImageFile) so OCR has enough resolution to segment lines.
  return [await rasteriseImageFile(file)];
}

async function processUpload(upload) {
  setUploadStatus(upload, "rasterising");
  try {
    upload.pages = await rasteriseFile(upload.file);
  } catch (err) {
    setUploadStatus(upload, "error", `Could not read file: ${err.message}`);
    return;
  }
  // With a template already selected, validate page count up front. In
  // autodetect mode, defer the check until OCR has identified the
  // matching template.
  if (state.template && !checkPageCount(upload)) return;
  // Start OCR immediately so it runs in parallel with the user picking
  // more files or waiting for the model to load. processUploadInference
  // awaits this same promise instead of re-running tesseract.
  setUploadStatus(upload, "ocr", "Running OCR...");
  updatePipelineButton();
  upload.ocrPromise = (async () => {
    const pageOcr = [];
    const totalPages = upload.pages.length;
    for (let i = 0; i < totalPages; i++) {
      const pageLabel = totalPages > 1 ? `Page ${i + 1}/${totalPages}: ` : "";
      const ocr = await runOcrForPage({ canvas: upload.pages[i] }, {
        onLog: (line) => {
          if (upload.status === "ocr") {
            setUploadStatus(upload, "ocr", `${pageLabel}${line}`);
          }
        },
      });
      pageOcr.push(ocr);
    }
    return pageOcr;
  })();
  try {
    upload.pageOcr = await upload.ocrPromise;
  } catch (err) {
    setUploadStatus(upload, "error", `OCR failed: ${err.message}`);
    return;
  }
  if (!state.template) {
    setUploadStatus(upload, "ocr", "Auto-detecting survey...");
    try {
      await ensureTemplate(upload);
    } catch (err) {
      setUploadStatus(upload, "error", `Auto-detect failed: ${err.message}`);
      return;
    }
    if (!checkPageCount(upload)) return;
  }
  if (upload.status === "ocr") {
    setUploadStatus(upload, "queued", "Ready to process.");
  }
  updatePipelineButton();
}

function checkPageCount(upload) {
  const expectedPages = state.template.survey.pages.length;
  if (upload.pages.length === expectedPages) return true;
  setUploadStatus(
    upload,
    "page-count-mismatch",
    `Expected ${expectedPages} page(s), got ${upload.pages.length}. Skipping this file.`,
  );
  trackUmami("user:page-count-mismatch");
  return false;
}

function formatDownloadSpeed(bytesPerSec) {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return "-- KB/s";
  const mb = bytesPerSec / 1_000_000;
  if (mb >= 1) return `${mb.toFixed(1)} MB/s`;
  const kb = bytesPerSec / 1_000;
  return `${Math.round(kb)} KB/s`;
}

function formatDownloadEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--:--";
  const total = Math.min(Math.round(seconds), 99 * 3600 + 59 * 60 + 59);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function createDownloadProgressTracker() {
  // Sliding-window average over the last WINDOW_MS of download samples.
  // The status string is only refreshed every UPDATE_INTERVAL_MS so the
  // displayed speed and ETA stop flickering on every wllama progress
  // callback.
  const WINDOW_MS = 2000;
  const UPDATE_INTERVAL_MS = 2000;
  const samples = [];
  let lastEmit = 0;
  let cached = null;
  return {
    update(loaded, total) {
      const now = performance.now();
      samples.push({ time: now, loaded });
      while (samples.length > 1 && now - samples[0].time > WINDOW_MS) {
        samples.shift();
      }
      if (cached && now - lastEmit < UPDATE_INTERVAL_MS) {
        return cached;
      }
      const first = samples[0];
      const dt = (now - first.time) / 1000;
      const db = loaded - first.loaded;
      const rate = dt > 0 && db > 0 ? db / dt : 0;
      const remaining = Math.max(0, total - loaded);
      const etaSec = rate > 0 ? remaining / rate : Infinity;
      cached = {
        pct: Math.min(100, Math.floor((loaded / total) * 100)),
        speed: formatDownloadSpeed(rate),
        eta: formatDownloadEta(etaSec),
      };
      lastEmit = now;
      return cached;
    },
  };
}

function setLlmStatus(text, cls = "muted", { spinner = false } = {}) {
  const el = document.getElementById("llm-status");
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

function updatePipelineButton() {
  const btn = document.getElementById("pipeline-start");
  const cancel = document.getElementById("pipeline-cancel");
  if (!btn) return;
  const hasPreset = !!selectedPreset();
  const ready = state.template
    && hasPreset
    && state.uploads.some((u) => u.status === "queued" || u.status === "ocr");
  btn.disabled = state.pipelineRunning || !ready;
  if (cancel) cancel.disabled = !state.pipelineRunning;
}

async function buildLoadOptions(preset) {
  const base = { ...DEFAULT_MODEL_LOAD_OPTIONS };
  // Drop the preset's "model_default" sentinels before layering so a key
  // parked on model_default falls through to the pipeline default rather
  // than reaching wllama as the literal string. Clone so the template's
  // preset object is not mutated.
  const presetLoad = stripModelDefaults(structuredClone(preset.load_params || {}));
  for (const [k, v] of Object.entries(presetLoad)) base[k] = v;
  if (state.optionsHandle) {
    const live = await state.optionsHandle.readLoadParams();
    for (const [k, v] of Object.entries(live)) base[k] = v;
  }
  return base;
}

async function buildSampleParams(preset) {
  const base = stripModelDefaults(structuredClone(preset.sample_params || {}));
  if (state.optionsHandle) {
    const live = await state.optionsHandle.readSampleParams();
    for (const [k, v] of Object.entries(live)) base[k] = v;
  }
  return base;
}

async function runPipeline() {
  if (state.pipelineRunning) return;
  if (!state.template) return;
  const preset = selectedPreset();
  if (!preset) {
    setLlmStatus("Pick a preset before starting (the survey has none defined; ask the admin).", "error");
    return;
  }
  state.pipelineRunning = true;
  state.pipelineAborter = new AbortController();
  updatePipelineButton();
  // Keep the screen (and, on most OSes, the machine) awake for the duration
  // of local processing. Hard-capped at 1h so a stuck run cannot pin it on.
  const wakeLock = await acquireWakeLock({ maxMs: 60 * 60 * 1000 });
  try {
  setLlmStatus("Preparing model (checking cache)...", "muted", { spinner: true });
  const picker = document.getElementById("user-preset");
  // Lock the picker and the override dropdown once a load kicks off:
  // wllama's instancePromise is module-cached, so the load options
  // land at load time and switching requires a page reload.
  if (picker) picker.disabled = true;
  state.optionsHandle?.setLocked(true);
  const loadOptionsOverride = await buildLoadOptions(preset);
  let wllama;
  try {
    const downloadProgress = createDownloadProgressTracker();
    wllama = await loadModel({
      catalog: state.modelCatalog,
      preferredName: preset.model,
      loadOptionsOverride,
      onProgress: ({ loaded, total, source }) => {
        if (!total) return;
        const { pct, speed, eta } = downloadProgress.update(loaded, total);
        const name = source?.name || "model";
        if (pct >= 100) {
          // After the bytes are on disk wllama runs llama.cpp's warmup
          // and (for multimodal) a synthetic-image pass through the
          // vision encoder. That step is not user-tunable (wllama
          // exposes no warmup flag) and the image size comes from the
          // GGUF, not the slider above, so even a low Max-image-tokens
          // setting will not shorten this step. On a CPU-only browser
          // it can take a minute or more for a Qwen3-VL model.
          setLlmStatus(
            `Warming up ${name} (vision encoder, first time only, can take a minute on CPU)...`,
            "muted",
            { spinner: true },
          );
        } else {
          setLlmStatus(
            `Downloading model (${name}): ${pct}%, ${speed}, ETA ${eta}`,
            "muted",
          );
        }
      },
    });
    const src = getLoadedSource();
    setLlmStatus(`Model ready: ${src?.name || "loaded"}.`, "ok");
  } catch (err) {
    setLlmStatus(`Model failed to load: ${err.message}`, "error");
    if (picker) picker.disabled = false;
    state.optionsHandle?.setLocked(false);
    state.pipelineRunning = false;
    updatePipelineButton();
    return;
  }
  const samplingParams = await buildSampleParams(preset);
  const signal = state.pipelineAborter.signal;
  const timeoutSeconds = Number(state.modelCatalog?.llmTimeoutSeconds) || 300;
  let cancelled = false;
  for (const upload of state.uploads) {
    if (signal.aborted) { cancelled = true; break; }
    if (upload.status !== "queued" && upload.status !== "ocr") continue;
    try {
      await processUploadInference(upload, wllama, { samplingParams, signal, timeoutSeconds });
    } catch (err) {
      if (err?.name === "AbortError") {
        cancelled = true;
        setUploadStatus(upload, "error", "Cancelled by user.");
        break;
      }
      throw err;
    }
  }
  state.pipelineRunning = false;
  state.pipelineAborter = null;
  updatePipelineButton();
  if (cancelled) setLlmStatus("Cancelled.", "error");
  refreshReviewQueue();
  document.dispatchEvent(new CustomEvent("pipeline:done"));
  } finally {
    await wakeLock.release();
  }
}

function cancelPipeline() {
  if (!state.pipelineAborter) return;
  setLlmStatus("Cancelling...", "muted", { spinner: true });
  state.pipelineAborter.abort();
}

function refreshReviewQueue() {
  const section = document.getElementById("review-section");
  const queue = document.getElementById("review-queue");
  if (!section || !queue) return;
  const hasFlagged = state.uploads.some((u) => u.flagged?.size);
  section.hidden = !hasFlagged;
  if (hasFlagged) {
    renderReviewQueue(state, queue, () => {
      updateExportButton();
      document.dispatchEvent(new CustomEvent("review:changed", { detail: { complete: allResolved(state) } }));
    });
  }
  refreshExportSection();
}

function refreshExportSection() {
  const section = document.getElementById("export-section");
  if (!section) return;
  const hasResults = state.uploads.some((u) => u.perBoxResults);
  section.hidden = !hasResults;
  updateExportButton();
}

function updateExportButton() {
  const btn = document.getElementById("export-download");
  if (!btn) return;
  btn.disabled = !allResolved(state) || !state.uploads.some((u) => u.perBoxResults);
}

async function doExport() {
  const fmt = document.getElementById("export-format").value;
  const status = document.getElementById("export-status");
  status.className = "muted";
  status.textContent = "Building file...";
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const base = `${state.template.slug}-${stamp}`;
    if (fmt === "csv") {
      const blob = exportCsv(state);
      triggerDownload(blob, `${base}.csv`);
    } else {
      const blob = await exportXlsx(state);
      triggerDownload(blob, `${base}.xlsx`);
    }
    status.className = "ok";
    status.textContent = "Downloaded.";
    trackUmami(`user:export-${fmt}`);
  } catch (err) {
    status.className = "error";
    status.textContent = `Export failed: ${err.message}`;
  }
}

function makeAbortError() {
  const err = new Error("cancelled");
  err.name = "AbortError";
  return err;
}

async function processUploadInference(upload, wllama, { samplingParams = null, signal = null, timeoutSeconds = 300 } = {}) {
  upload.perBoxResults = new Map();
  upload.flagged = new Set();
  upload.perPageDiagnostics = [];
  try {
    if (!upload.pageOcr) {
      setUploadStatus(upload, "ocr", "Waiting for OCR to finish...");
      upload.pageOcr = await upload.ocrPromise;
    }
    const pageOcr = upload.pageOcr;
    setUploadStatus(upload, "anchor");
    const perPageMatch = [];
    for (let i = 0; i < upload.pages.length; i++) {
      const templatePage = state.template.survey.pages[i];
      const match = matchPage(templatePage, pageOcr[i]);
      perPageMatch.push(match);
      upload.perPageDiagnostics.push(match.diagnostics);
    }
    setUploadStatus(upload, "infer");
    for (let i = 0; i < upload.pages.length; i++) {
      if (signal?.aborted) throw makeAbortError();
      const templatePage = state.template.survey.pages[i];
      const userCanvas = upload.pages[i];
      const match = perPageMatch[i];
      for (const box of templatePage.boxes) {
        if (signal?.aborted) throw makeAbortError();
        const transformed = match.transformBox(box.bbox);
        const crop = await cropPage(userCanvas, transformed.bbox);
        if (!crop) {
          recordBoxResult(upload, box, {
            ok: false,
            reason: "crop-out-of-frame",
            raw: null,
          }, null, transformed);
          continue;
        }
        const label = `${upload.file.name} | Page ${i + 1} / ${box.id}`;
        resetLlmStream(label);
        const onToken = makeLlmStreamUpdater(label);
        let res;
        try {
          res = await inferBox({
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
          res = { ok: false, reason: "inference-error", raw: String(err?.message || err) };
        }
        if (!transformed.anchored) {
          // If we never anchored, flag even a "successful" parse since the
          // crop location is unreliable. A "missing" signal from the LLM
          // is equally untrustworthy here, so it also lands in review.
          res = {
            ok: false,
            reason: "no-anchor",
            raw: res.ok ? (res.missing ? res.raw : res.value) : res.raw,
          };
        }
        recordBoxResult(upload, box, res, crop.dataUrl, transformed);
      }
    }
    if (upload.flagged.size) {
      setUploadStatus(upload, "review", `${upload.flagged.size} box(es) need review.`);
    } else {
      setUploadStatus(upload, "ready", "All boxes parsed cleanly.");
    }
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    setUploadStatus(upload, "error", `Pipeline failed: ${err.message}`);
  }
}

function recordBoxResult(upload, box, result, cropDataUrl, transformed) {
  const entry = {
    boxId: box.id,
    header: box.header,
    description: box.description,
    type: box.type,
    choices: box.choices,
    cropDataUrl,
    transformed,
    ok: result.ok,
    value: null,
    reason: result.ok ? null : result.reason,
    raw: result.raw ?? null,
    resolution: result.ok ? "auto" : null, // "auto" | "accept" | "edit" | "skip"
    missing: false,
  };
  if (result.ok && result.missing) {
    entry.missing = true;
    entry.value = box.missing_is_empty ? typedEmpty(box.type) : "MISSING";
  } else if (result.ok) {
    entry.value = result.value;
  }
  upload.perBoxResults.set(box.id, entry);
  if (!result.ok) upload.flagged.add(box.id);
}

function typedEmpty(type) {
  switch (type) {
    case "checkbox": return false;
    case "text": return "";
    case "multi-select": return [];
    case "number":
    case "date":
    case "multi-choice":
    default: return null;
  }
}

function ingestFiles(fileList) {
  const picker = document.getElementById("survey-picker");
  const isAutodetect = picker?.value === AUTODETECT_VALUE;
  if (!state.template && !isAutodetect) {
    alert("Pick a survey template first.");
    return;
  }
  const files = Array.from(fileList || []);
  if (!files.length) return;
  for (const file of files) {
    const upload = {
      id: state.nextUploadId++,
      file,
      pages: null,
      status: "queued",
      detail: "",
      perBoxResults: null,
      flagged: new Set(),
      errors: [],
    };
    state.uploads.push(upload);
    renderUploadRow(upload);
    processUpload(upload);
  }
  trackUmami("user:files-ingested");
}

function wireDropzone() {
  const zone = document.getElementById("user-dropzone");
  const input = document.getElementById("user-files");
  if (!zone || !input) return;
  zone.addEventListener("click", () => input.click());
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    ingestFiles(e.dataTransfer?.files);
  });
  input.addEventListener("change", () => ingestFiles(input.files));
  document.getElementById("uploads-clear")?.addEventListener("click", clearUploadsPanel);
  document.getElementById("pipeline-start")?.addEventListener("click", () => {
    trackUmami("user:pipeline-started");
    runPipeline();
  });
  document.getElementById("pipeline-cancel")?.addEventListener("click", () => {
    trackUmami("user:pipeline-cancelled");
    cancelPipeline();
  });
  document.getElementById("export-download")?.addEventListener("click", doExport);
}

// Page lifecycle hook: aborts any running pipeline and tells wllama to
// tear down its workers when the tab is hidden, navigated, or closed.
// pagehide covers iOS Safari and bfcache restores; visibilitychange to
// "hidden" catches mobile background. We don't await shutdown here:
// browsers terminate JS as soon as unload returns, so the best-effort
// abort/terminate is what actually matters.
function wireUnloadHooks() {
  const teardown = () => {
    try { state.pipelineAborter?.abort(); } catch {}
    shutdownLlm();
  };
  window.addEventListener("pagehide", teardown);
  window.addEventListener("beforeunload", teardown);
}

function wireSurveyPicker() {
  const select = document.getElementById("survey-picker");
  select.addEventListener("change", () => {
    if (select.value === AUTODETECT_VALUE) trackUmami("user:survey-autodetect");
    else if (select.value) trackUmami("user:survey-picked");
    writeLastSurveySlug(select.value);
    clearUploadsPanel();
    if (select.value === AUTODETECT_VALUE) enterAutodetectMode();
    else loadTemplate(select.value);
  });
}

function wirePresetPicker() {
  const picker = document.getElementById("user-preset");
  if (!picker) return;
  picker.addEventListener("change", async () => {
    state.selectedPresetName = picker.value;
    trackUmami("user:preset-picked");
    const preset = selectedPreset();
    await applyPresetToOptions(preset);
    updatePresetMeta();
    updatePipelineButton();
  });
}

function init() {
  wireCapabilityBanner(document.getElementById("capability-banner"));
  // Fire-and-forget: runs the SIMD/WASM/WebGPU/battery probes once now
  // so devtools has them well before the user clicks Start processing.
  // Decoupled from model load so a slow first inference is not the
  // first hint that the browser is missing acceleration.
  logRuntimeDiagnostics();
  wireSurveyPicker();
  const optionsHost = document.getElementById("user-options");
  if (optionsHost) {
    state.optionsHandle = mountLlmOptions(optionsHost, {
      summary: "Override load and sample parameters",
      onChange: () => updatePresetMeta(),
    });
  }
  wirePresetPicker();
  wireDropzone();
  wireUnloadHooks();
  refreshSurveyPicker();
  refreshModelCatalog();
  // Fire-and-forget: pins the wllama OPFS cache so a multi-GB GGUF
  // does not get evicted between visits. Result is logged; failure
  // is non-fatal.
  requestPersistentStorage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
