// Smoke test: prove pdf.js + tesseract.js + the vendored language packs all
// work in the user's browser. Also runs capability detection up front and
// reports gracefully when threads or SIMD are missing.

const PDF_SCRIPT_URL = "/static/vendor/pdfjs/pdf.min.mjs";
const PDF_WORKER_URL = "/static/vendor/pdfjs/pdf.worker.min.mjs";
const TESSERACT_ESM_URL = "/static/vendor/tesseract/tesseract.esm.min.js";
const TESSERACT_WORKER_URL = "/static/vendor/tesseract/worker.min.js";
const TESSERACT_CORE_DIR = "/static/vendor/tesseract/";
const TESSERACT_LANG_DIR = "/static/vendor/tesseract-lang/";

// Tiny 360x120 PDF that renders "Hello AiFormParser" in Helvetica.
const TEST_PDF_BASE64 =
  "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAzNjAgMTIwXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA4NCA+PgpzdHJlYW0KQlQKL0YxIDMyIFRmCjIwIDYwIFRkCihIZWxsbyBBaUZvcm1QYXJzZXIpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI0MSAwMDAwMCBuIAowMDAwMDAwMzM5IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNiAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNDA5CiUlRU9GCg==";

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function detectSimd() {
  // Canonical wasm-feature-detect SIMD probe: a function returning v128 that
  // executes i32.const 0; i8x16.splat (0xfd 0x0f); i8x16.popcnt (0xfd 0x62).
  // Earlier versions of this probe were off by one byte and rejected on every
  // engine, hiding real SIMD support behind a false negative.
  try {
    return WebAssembly.validate(new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123,
      3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
    ]));
  } catch (_) {
    return false;
  }
}

function detectThreads() {
  try {
    return typeof SharedArrayBuffer === "function" && (window.crossOriginIsolated ?? false);
  } catch (_) {
    return false;
  }
}

export function checkCapabilities() {
  const wasm = typeof WebAssembly === "object";
  const simd = wasm ? detectSimd() : false;
  const threads = detectThreads();
  const webgpu = "gpu" in navigator;
  const ok = wasm && simd; // tesseract.js needs WASM + SIMD for the vendored core.

  let banner = "";
  let cls = "ok";
  if (!wasm) {
    banner = "WebAssembly is not available in this browser. The OCR and LLM features will not work.";
    cls = "err";
  } else if (!simd) {
    banner = "This browser does not support WASM SIMD. OCR may fall back to a slower path or fail.";
    cls = "warn";
  } else if (!threads) {
    banner = "WASM threads unavailable (need crossOriginIsolated + SharedArrayBuffer). OCR will run single-threaded.";
    cls = "warn";
  } else if (!webgpu) {
    banner = "Capabilities OK. WebGPU not detected; the LLM step will fall back to CPU once wired up.";
    cls = "ok";
  } else {
    banner = "All capabilities present (WASM + SIMD + threads + WebGPU).";
    cls = "ok";
  }
  return { ok, wasm, simd, threads, webgpu, banner, cls };
}

let pdfjsLoading = null;
function loadPdfJs() {
  if (pdfjsLoading) return pdfjsLoading;
  pdfjsLoading = import(PDF_SCRIPT_URL).then((mod) => {
    const lib = mod.default ?? mod;
    if (typeof lib.getDocument !== "function") {
      throw new Error("pdf.js loaded but getDocument is missing from the export");
    }
    lib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
    return lib;
  });
  return pdfjsLoading;
}

// A plain image dropped into the admin or user UI has no DPI metadata, so
// a small scan or thumbnail (e.g. 640x640) can drop below tesseract's text
// segmentation floor — the whole page collapses into a single "word". We
// upscale anything whose long side is below this target, preserving aspect
// ratio, so the OCR has enough pixels to split lines and words.
const MIN_IMAGE_LONG_SIDE_PX = 2000;

export async function rasteriseImageFile(file, { minLongSide = MIN_IMAGE_LONG_SIDE_PX } = {}) {
  const bitmap = await createImageBitmap(file);
  try {
    const longSide = Math.max(bitmap.width, bitmap.height);
    const scale = longSide < minLongSide ? minLongSide / longSide : 1;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (scale !== 1) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      console.info("[rasterise] upscaling image", {
        from: `${bitmap.width}x${bitmap.height}`,
        to: `${w}x${h}`,
        scale: Math.round(scale * 100) / 100,
      });
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas;
  } finally {
    bitmap.close?.();
  }
}

export async function rasterisePdf(bytes, { dpi = 200 } = {}) {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const scale = dpi / 72; // PDF user space defaults to 72 DPI.
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas);
  }
  return pages;
}

async function loadTesseract() {
  // Dynamic import via ESM so the bundle is not parsed unless the user runs the smoke.
  // The vendored bundle re-exports a CJS module as `default` only, so unwrap it
  // here and return an object with the named helpers we use.
  const module = await import(TESSERACT_ESM_URL);
  const lib = module.default ?? module;
  if (typeof lib.createWorker !== "function") {
    throw new Error("tesseract.js loaded but createWorker is missing from the export");
  }
  return lib;
}

// Tesseract page segmentation mode. The default PSM 3 (auto) tends to
// collapse survey-form layouts (mixed font sizes, checkboxes, ruled lines)
// into a single text run, which leaves us with 1 line per page and the
// anchor matcher with nothing to work with. PSM 4 ("single column of text
// of variable sizes") skips layout analysis but still segments the column
// into per-line entries, which is what ocr_blocks needs.
const TESSERACT_PSM_SINGLE_COLUMN = "4";

export async function ocrCanvas(canvas, langs = ["eng", "fra"], onLog = () => {}, output) {
  const { createWorker } = await loadTesseract();
  const dims = `${canvas.width}x${canvas.height}`;
  console.info("[ocr] createWorker", {
    langs,
    canvas: dims,
    corePath: TESSERACT_CORE_DIR,
    langPath: TESSERACT_LANG_DIR,
    output: output || "(text only)",
    psm: TESSERACT_PSM_SINGLE_COLUMN,
  });
  const workerStart = performance.now();
  const worker = await createWorker(langs, 1, {
    workerPath: TESSERACT_WORKER_URL,
    corePath: TESSERACT_CORE_DIR,
    langPath: TESSERACT_LANG_DIR,
    // Disable the blob-URL wrapper so the worker's self.location.href is the
    // real worker.min.js URL. The vendored Emscripten core JS computes the
    // wasm path from self.location.href; with a blob: URL it cannot resolve
    // a base, so the wasm fetch fails with "Failed to parse URL".
    workerBlobURL: false,
    logger: (m) => {
      console.info("[tesseract]", m);
      const pct = typeof m.progress === "number" ? `${(m.progress * 100).toFixed(0)}%` : "";
      onLog(`[tesseract] ${m.status} ${pct}`.trim());
    },
    errorHandler: (e) => console.error("[tesseract] error", e),
  });
  await worker.setParameters({
    tessedit_pageseg_mode: TESSERACT_PSM_SINGLE_COLUMN,
  });
  console.info("[ocr] worker ready", { elapsedMs: Math.round(performance.now() - workerStart) });
  try {
    const recognizeStart = performance.now();
    const args = output ? [canvas, {}, output] : [canvas];
    const { data } = await worker.recognize(...args);
    console.info("[ocr] recognize done", {
      canvas: dims,
      elapsedMs: Math.round(performance.now() - recognizeStart),
      words: Array.isArray(data.words) ? data.words.length : null,
      lines: Array.isArray(data.lines) ? data.lines.length : null,
      blocks: Array.isArray(data.blocks) ? data.blocks.length : null,
      textLen: (data.text || "").length,
    });
    return data;
  } finally {
    await worker.terminate();
  }
}

export async function runSmokeTest({ onLog }) {
  const log = (line) => onLog(line);
  log("Loading pdf.js...");
  await loadPdfJs();
  log("Rasterising embedded test PDF...");
  const canvases = await rasterisePdf(base64ToBytes(TEST_PDF_BASE64));
  log(`Rasterised ${canvases.length} page(s) (${canvases[0].width}x${canvases[0].height} px).`);
  log("Loading tesseract.js + traineddata (eng + fra)...");
  const data = await ocrCanvas(canvases[0], ["eng", "fra"], log);
  log("OCR done. Recognised text:");
  log(data.text.trim() || "(empty)");
  return { canvases, ocr: data };
}

export function wireCapabilityBanner(bannerEl) {
  const caps = checkCapabilities();
  bannerEl.className = `status-banner ${caps.cls}`;
  bannerEl.textContent = caps.banner;
  return caps;
}

export function wireSmokePanel({ buttonEl, statusEl, logEl }) {
  const append = (line) => {
    logEl.textContent += (logEl.textContent ? "\n" : "") + line;
    logEl.scrollTop = logEl.scrollHeight;
  };
  buttonEl.addEventListener("click", async () => {
    buttonEl.disabled = true;
    statusEl.textContent = "running...";
    logEl.textContent = "";
    try {
      await runSmokeTest({ onLog: append });
      statusEl.textContent = "ok";
      statusEl.className = "ok";
    } catch (err) {
      statusEl.textContent = "failed";
      statusEl.className = "error";
      append(`ERROR: ${err && err.message ? err.message : err}`);
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      buttonEl.disabled = false;
    }
  });
}
