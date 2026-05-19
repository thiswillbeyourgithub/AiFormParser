// Canvas workspace for the admin survey editor.
//
// Owns one HTMLCanvasElement per template page (drawn at 200 DPI), an
// overlay layer for boxes, a page picker, and zoom/pan controls. Box
// coordinates handled by other modules are always in the canvas's full
// pixel space; zoom is purely a CSS transform applied to the stage so we
// never lose resolution.

import { rasterisePdf, rasteriseImageFile } from "/static/app/smoke.js";

const DPI = 200;
const ZOOM_STEPS = [0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0];
const DEFAULT_ZOOM = 0.25;

export function createWorkspace(rootEl, { onPageChange } = {}) {
  const subscribers = onPageChange ? [onPageChange] : [];
  rootEl.innerHTML = `
    <div class="workspace-toolbar row">
      <label>Page
        <select class="page-picker"></select>
      </label>
      <span class="muted page-dims"></span>
      <span class="grow"></span>
      <div class="zoom-controls row">
        <button type="button" class="secondary zoom-out" title="Zoom out">-</button>
        <span class="zoom-label">100%</span>
        <button type="button" class="secondary zoom-in" title="Zoom in">+</button>
        <button type="button" class="secondary zoom-fit" title="Fit to width">Fit</button>
        <button type="button" class="secondary zoom-100" title="Actual size">1:1</button>
      </div>
    </div>
    <div class="canvas-frame">
      <div class="canvas-stage"></div>
    </div>
  `;

  const picker = rootEl.querySelector(".page-picker");
  const dims = rootEl.querySelector(".page-dims");
  const frame = rootEl.querySelector(".canvas-frame");
  const stage = rootEl.querySelector(".canvas-stage");
  const zoomLabel = rootEl.querySelector(".zoom-label");

  const ws = {
    rootEl,
    frame,
    stage,
    pages: [],          // { index, canvas, overlay, ocrOverlay, imageFilename }
    activeIndex: -1,
    zoom: DEFAULT_ZOOM,
    ocrVisible: false,
  };

  const applyZoom = () => {
    stage.style.transform = `scale(${ws.zoom})`;
    zoomLabel.textContent = `${Math.round(ws.zoom * 100)}%`;
  };

  const fitToFrame = () => {
    const active = ws.pages[ws.activeIndex];
    if (!active) return;
    const frameW = frame.clientWidth - 16;
    ws.zoom = Math.max(0.05, Math.min(1.0, frameW / active.canvas.width));
    applyZoom();
  };

  const setActive = (idx) => {
    if (idx < 0 || idx >= ws.pages.length) return;
    ws.activeIndex = idx;
    for (const [i, p] of ws.pages.entries()) {
      const show = i === idx;
      p.canvas.style.display = show ? "block" : "none";
      p.overlay.style.display = show ? "block" : "none";
      p.ocrOverlay.style.display = show && ws.ocrVisible ? "block" : "none";
      if (show) {
        stage.style.width = `${p.canvas.width}px`;
        stage.style.height = `${p.canvas.height}px`;
        dims.textContent = `${p.canvas.width}x${p.canvas.height}px @ ${DPI} DPI`;
      }
    }
    picker.value = String(idx);
    for (const fn of subscribers) fn(ws.pages[idx], idx);
  };

  picker.addEventListener("change", () => setActive(parseInt(picker.value, 10)));
  rootEl.querySelector(".zoom-in").addEventListener("click", () => stepZoom(+1));
  rootEl.querySelector(".zoom-out").addEventListener("click", () => stepZoom(-1));
  rootEl.querySelector(".zoom-fit").addEventListener("click", fitToFrame);
  rootEl.querySelector(".zoom-100").addEventListener("click", () => { ws.zoom = 1; applyZoom(); });
  frame.addEventListener("wheel", (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    stepZoom(e.deltaY < 0 ? +1 : -1);
  }, { passive: false });

  function stepZoom(dir) {
    const i = nearestZoomStep(ws.zoom);
    const next = Math.max(0, Math.min(ZOOM_STEPS.length - 1, i + dir));
    ws.zoom = ZOOM_STEPS[next];
    applyZoom();
  }

  ws.fitToFrame = fitToFrame;
  ws.setActive = setActive;
  ws.onPageChange = (fn) => { subscribers.push(fn); };
  ws.setOcrVisible = (visible) => {
    ws.ocrVisible = !!visible;
    for (const [i, p] of ws.pages.entries()) {
      const show = i === ws.activeIndex;
      p.ocrOverlay.style.display = show && ws.ocrVisible ? "block" : "none";
    }
  };
  ws.reset = () => {
    stage.innerHTML = "";
    ws.pages = [];
    ws.activeIndex = -1;
    picker.innerHTML = "";
  };

  ws.setPages = (pageDefs) => {
    ws.reset();
    for (const def of pageDefs) {
      const ocrOverlay = document.createElement("div");
      ocrOverlay.className = "canvas-overlay ocr-overlay";
      ocrOverlay.style.width = `${def.canvas.width}px`;
      ocrOverlay.style.height = `${def.canvas.height}px`;
      const overlay = document.createElement("div");
      overlay.className = "canvas-overlay";
      overlay.style.width = `${def.canvas.width}px`;
      overlay.style.height = `${def.canvas.height}px`;
      def.canvas.classList.add("page-canvas");
      stage.appendChild(def.canvas);
      // OCR overlay sits below the box overlay so user-drawn boxes stay on top
      // and the box overlay still receives mouse events.
      stage.appendChild(ocrOverlay);
      stage.appendChild(overlay);
      ws.pages.push({
        index: def.index,
        canvas: def.canvas,
        overlay,
        ocrOverlay,
        imageFilename: def.imageFilename,
      });
      const opt = document.createElement("option");
      opt.value = String(def.index);
      opt.textContent = `Page ${def.index + 1} of ${pageDefs.length}`;
      picker.appendChild(opt);
    }
    setActive(0);
    fitToFrame();
  };

  applyZoom();
  return ws;
}

function nearestZoomStep(z) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < ZOOM_STEPS.length; i++) {
    const d = Math.abs(ZOOM_STEPS[i] - z);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// Convert a DOM event to pixel coordinates inside the active page canvas.
// Returns null if the event did not happen over the stage.
export function eventToCanvasXY(ws, event) {
  const stage = ws.stage;
  const rect = stage.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const scaleX = stage.clientWidth / rect.width;
  const scaleY = stage.clientHeight / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  return { x: Math.round(x), y: Math.round(y) };
}

// Rasterise a PDF/image File to per-page canvases at 200 DPI.
// Returns [{ index, canvas, imageFilename }, ...] ready for ws.setPages.
export async function rasteriseFileToPages(file) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const canvases = await rasterisePdf(buf, { dpi: DPI });
    return canvases.map((canvas, i) => ({
      index: i,
      canvas,
      imageFilename: `page-${i + 1}.png`,
    }));
  }
  // Plain image: load onto a canvas, upscaling small inputs (see
  // rasteriseImageFile) so OCR has enough resolution to segment lines.
  const canvas = await rasteriseImageFile(file);
  return [{ index: 0, canvas, imageFilename: "page-1.png" }];
}

// Build a per-page list by loading images from URLs (used for the edit
// flow). pageMeta is the survey YAML's `pages` array (needs width, height,
// image), and urls maps page.image -> absolute URL.
export async function loadPagesFromUrls(pageMeta, urls) {
  const out = [];
  for (const p of pageMeta) {
    const url = urls[p.image];
    if (!url) throw new Error(`missing image URL for ${p.image}`);
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = p.width;
    canvas.height = p.height;
    canvas.getContext("2d").drawImage(img, 0, 0, p.width, p.height);
    out.push({ index: p.index, canvas, imageFilename: p.image });
  }
  return out;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load image ${url}`));
    img.src = url;
  });
}

export const CANVAS_DPI = DPI;
