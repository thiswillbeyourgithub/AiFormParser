// Box drawing layer + side-panel editor for the admin survey UI.
//
// Boxes live in state.pages[i].boxes as plain JS objects matching the
// pydantic schema (Box: id, header, description, type, choices, bbox).
// All coordinates are in canvas pixel space (200 DPI). Zoom is a CSS
// transform owned by admin-canvas.js; this module reads the workspace's
// current zoom factor to map mouse events back into pixel space.

import { eventToCanvasXY } from "/static/app/admin-canvas.js";

const BOX_TYPES = ["text", "number", "checkbox", "date", "multi-choice", "multi-select"];

// Public: bind drawing + side-panel behaviour to a state object.
// state shape (see admin.js):
//   state.workspace -> workspace from createWorkspace
//   state.pages[i].boxes -> Box[]
// onChange is invoked after any structural box change (add/delete/move/edit)
// so the orchestrator can recompute header-uniqueness etc.
export function wireBoxEditor(state, sidePanelEl, { onChange } = {}) {
  const editor = {
    state,
    sidePanelEl,
    onChange: onChange || (() => {}),
    drawMode: false,
    selectedPageIndex: -1,
    selectedBoxId: null,
  };

  renderSidePanel(editor);

  window.addEventListener("keydown", (e) => {
    if (e.key !== "Delete") return;
    if (editor.selectedBoxId == null) return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    deleteSelected(editor);
    e.preventDefault();
  });
  // Refresh overlay bindings whenever the active page changes.
  state.workspace.onPageChange(() => {
    bindActiveOverlay(editor);
    renderOverlay(editor);
  });

  bindActiveOverlay(editor);
  renderOverlay(editor);

  editor.setDrawMode = (on) => {
    editor.drawMode = on;
    refreshDrawModeUI(editor);
  };
  editor.refresh = () => {
    bindActiveOverlay(editor);
    renderOverlay(editor);
    renderSidePanel(editor);
  };
  editor.selectBox = (boxId) => {
    editor.selectedBoxId = boxId;
    renderOverlay(editor);
    renderSidePanel(editor);
  };

  return editor;
}

function activePageIndex(editor) {
  return editor.state.workspace.activeIndex;
}
function activePage(editor) {
  const i = activePageIndex(editor);
  return i >= 0 ? editor.state.pages[i] : null;
}
function activeOverlay(editor) {
  const i = activePageIndex(editor);
  if (i < 0) return null;
  return editor.state.workspace.pages[i]?.overlay || null;
}

function bindActiveOverlay(editor) {
  const overlay = activeOverlay(editor);
  if (!overlay || overlay.dataset.bound === "1") return;
  overlay.dataset.bound = "1";
  overlay.addEventListener("mousedown", (e) => onOverlayMouseDown(editor, e));
}

function onOverlayMouseDown(editor, event) {
  if (event.button !== 0) return;
  const overlay = activeOverlay(editor);
  if (!overlay) return;
  const start = eventToCanvasXY(editor.state.workspace, event);
  if (!start) return;

  if (editor.drawMode) {
    event.preventDefault();
    beginDraw(editor, start);
    return;
  }

  // Click on an existing box -> select. Drag -> move.
  // Click on empty area -> deselect and start drawing a new box (a click
  // without drag just deselects, since beginDraw discards rectangles
  // smaller than 4x4).
  const page = activePage(editor);
  if (!page) return;
  const hit = topmostBoxAt(page.boxes, start.x, start.y);
  if (hit) {
    editor.selectedPageIndex = activePageIndex(editor);
    editor.selectedBoxId = hit.id;
    renderOverlay(editor);
    renderSidePanel(editor);
    beginMove(editor, hit, start);
  } else {
    editor.selectedBoxId = null;
    renderOverlay(editor);
    renderSidePanel(editor);
    event.preventDefault();
    beginDraw(editor, start);
  }
}

function topmostBoxAt(boxes, x, y) {
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    const [bx, by, bw, bh] = b.bbox;
    if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) return b;
  }
  return null;
}

function beginDraw(editor, start) {
  const overlay = activeOverlay(editor);
  const ghost = document.createElement("div");
  ghost.className = "box ghost";
  overlay.appendChild(ghost);
  let last = start;

  const onMove = (e) => {
    const pt = eventToCanvasXY(editor.state.workspace, e);
    if (!pt) return;
    last = pt;
    const x = Math.min(start.x, pt.x);
    const y = Math.min(start.y, pt.y);
    const w = Math.abs(pt.x - start.x);
    const h = Math.abs(pt.y - start.y);
    Object.assign(ghost.style, {
      left: `${x}px`, top: `${y}px`,
      width: `${w}px`, height: `${h}px`,
    });
  };
  const onUp = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    ghost.remove();
    const x = Math.min(start.x, last.x);
    const y = Math.min(start.y, last.y);
    const w = Math.abs(last.x - start.x);
    const h = Math.abs(last.y - start.y);
    if (w < 4 || h < 4) {
      editor.setDrawMode(false);
      return;
    }
    const page = activePage(editor);
    const id = nextBoxId(editor.state);
    const box = {
      id,
      header: id,
      description: "",
      type: "text",
      bbox: [x, y, w, h],
    };
    page.boxes.push(box);
    editor.selectedPageIndex = activePageIndex(editor);
    editor.selectedBoxId = id;
    editor.setDrawMode(false);
    renderOverlay(editor);
    renderSidePanel(editor);
    editor.onChange();
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

function beginMove(editor, box, start) {
  const original = [...box.bbox];
  const overlay = activeOverlay(editor);
  const page = activePage(editor);
  if (!overlay || !page) return;

  const onMove = (e) => {
    const pt = eventToCanvasXY(editor.state.workspace, e);
    if (!pt) return;
    const dx = pt.x - start.x;
    const dy = pt.y - start.y;
    const newX = Math.max(0, Math.min(page.canvas.width - original[2], original[0] + dx));
    const newY = Math.max(0, Math.min(page.canvas.height - original[3], original[1] + dy));
    box.bbox = [Math.round(newX), Math.round(newY), original[2], original[3]];
    renderOverlay(editor);
  };
  const onUp = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    if (box.bbox[0] !== original[0] || box.bbox[1] !== original[1]) {
      editor.onChange();
    }
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

function deleteSelected(editor) {
  if (editor.selectedBoxId == null) return;
  const page = editor.state.pages[editor.selectedPageIndex];
  if (!page) return;
  page.boxes = page.boxes.filter((b) => b.id !== editor.selectedBoxId);
  editor.selectedBoxId = null;
  renderOverlay(editor);
  renderSidePanel(editor);
  editor.onChange();
}

const RESIZE_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

function renderOverlay(editor) {
  const overlay = activeOverlay(editor);
  const page = activePage(editor);
  if (!overlay || !page) return;
  overlay.innerHTML = "";
  for (const b of page.boxes) {
    const el = document.createElement("div");
    el.className = "box";
    const isSelected = b.id === editor.selectedBoxId && activePageIndex(editor) === editor.selectedPageIndex;
    if (isSelected) el.classList.add("selected");
    el.style.left = `${b.bbox[0]}px`;
    el.style.top = `${b.bbox[1]}px`;
    el.style.width = `${b.bbox[2]}px`;
    el.style.height = `${b.bbox[3]}px`;
    const label = document.createElement("span");
    label.className = "box-label";
    label.textContent = b.header || b.id;
    el.appendChild(label);
    if (isSelected) {
      for (const h of RESIZE_HANDLES) {
        const handle = document.createElement("div");
        handle.className = `resize-handle h-${h}`;
        handle.addEventListener("mousedown", (ev) => {
          if (ev.button !== 0) return;
          ev.stopPropagation();
          ev.preventDefault();
          const pt = eventToCanvasXY(editor.state.workspace, ev);
          if (!pt) return;
          beginResize(editor, b, h, pt);
        });
        el.appendChild(handle);
      }
    }
    overlay.appendChild(el);
  }
}

function beginResize(editor, box, handle, start) {
  const overlay = activeOverlay(editor);
  const page = activePage(editor);
  if (!overlay || !page) return;
  const original = [...box.bbox];
  const MIN = 4;
  const W = page.canvas.width;
  const H = page.canvas.height;

  const onMove = (e) => {
    const pt = eventToCanvasXY(editor.state.workspace, e);
    if (!pt) return;
    const dx = pt.x - start.x;
    const dy = pt.y - start.y;
    const [ox, oy, ow, oh] = original;
    let nx = ox, ny = oy, nw = ow, nh = oh;
    if (handle.includes("w")) { nx = ox + dx; nw = ow - dx; }
    if (handle.includes("e")) { nw = ow + dx; }
    if (handle.includes("n")) { ny = oy + dy; nh = oh - dy; }
    if (handle.includes("s")) { nh = oh + dy; }
    if (nw < MIN) {
      if (handle.includes("w")) nx = ox + ow - MIN;
      nw = MIN;
    }
    if (nh < MIN) {
      if (handle.includes("n")) ny = oy + oh - MIN;
      nh = MIN;
    }
    if (nx < 0) { nw += nx; nx = 0; }
    if (ny < 0) { nh += ny; ny = 0; }
    if (nx + nw > W) nw = W - nx;
    if (ny + nh > H) nh = H - ny;
    box.bbox = [Math.round(nx), Math.round(ny), Math.round(nw), Math.round(nh)];
    renderOverlay(editor);
  };
  const onUp = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    const [a, b, c, d] = original;
    if (box.bbox[0] !== a || box.bbox[1] !== b || box.bbox[2] !== c || box.bbox[3] !== d) {
      editor.onChange();
    }
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

function refreshDrawModeUI(editor) {
  const btn = document.getElementById("editor-draw-toggle");
  if (btn) btn.textContent = editor.drawMode ? "Drawing... (click and drag)" : "Add box";
  const overlay = activeOverlay(editor);
  if (overlay) overlay.classList.toggle("drawing", editor.drawMode);
}

function nextBoxId(state) {
  const used = new Set();
  for (const p of state.pages) for (const b of p.boxes) used.add(b.id);
  let n = 1;
  while (used.has(`Q${n}`)) n++;
  return `Q${n}`;
}

function collectDuplicateHeaders(state) {
  const seen = new Map();
  const dups = new Set();
  for (const p of state.pages) {
    for (const b of p.boxes) {
      const h = (b.header || "").trim();
      if (!h) continue;
      if (seen.has(h)) {
        dups.add(h);
      } else {
        seen.set(h, b.id);
      }
    }
  }
  return dups;
}

function renderSidePanel(editor) {
  const el = editor.sidePanelEl;
  if (!el) return;
  if (editor.selectedBoxId == null) {
    el.innerHTML = `
      <p class="muted">No box selected. Drag on an empty area of the page to create a new box (or use "Add box"). Click a box to edit it. Drag a handle on the selected box to resize, or drag anywhere inside to move.</p>
    `;
    return;
  }
  const page = editor.state.pages[editor.selectedPageIndex];
  const box = page?.boxes.find((b) => b.id === editor.selectedBoxId);
  if (!box) {
    el.innerHTML = `<p class="muted">Selection out of sync.</p>`;
    return;
  }
  const dups = collectDuplicateHeaders(editor.state);
  const isDup = dups.has((box.header || "").trim());
  const choicesText = (box.choices || []).join("\n");
  el.innerHTML = `
    <div class="side-panel-field">
      <label>ID <input type="text" class="sp-id" value="${escapeAttr(box.id)}"></label>
    </div>
    <div class="side-panel-field">
      <label>Header (CSV column) <input type="text" class="sp-header" value="${escapeAttr(box.header)}"></label>
      <span class="error sp-header-dup"${isDup ? "" : " hidden"}>Duplicate header across pages.</span>
    </div>
    <div class="side-panel-field">
      <label>Description (LLM instruction)<br>
        <textarea class="sp-description" rows="3">${escapeText(box.description)}</textarea>
      </label>
    </div>
    <div class="side-panel-field">
      <label>Type
        <select class="sp-type">
          ${BOX_TYPES.map((t) => `<option value="${t}"${t === box.type ? " selected" : ""}>${t}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="side-panel-field sp-choices-wrap" ${needsChoices(box.type) ? "" : "hidden"}>
      <label>Choices (one per line)<br>
        <textarea class="sp-choices" rows="4">${escapeText(choicesText)}</textarea>
      </label>
      <p class="muted">multi-select cells join picks with a delimiter (CLAUDE.md TODO: not yet picked).</p>
    </div>
    <div class="side-panel-field">
      <label><input type="checkbox" class="sp-missing-empty"${box.missing_is_empty ? " checked" : ""}> Treat "missing" as empty</label>
      <p class="muted">Off (default): a missing/untouched box exports as the literal cell "MISSING". On: missing maps to the type's empty value (false for checkbox, blank for text, [] for multi-select, empty for number/date/multi-choice).</p>
    </div>
    <div class="side-panel-field">
      <label><input type="checkbox" class="sp-test-include"${box._testInclude === false ? "" : " checked"}> Include in LLM test runs</label>
      <p class="muted">Session-only flag, not saved to YAML. Uncheck to skip this box in the "Test LLM on this survey" panel below.</p>
    </div>
    <div class="row">
      <button type="button" class="danger sp-delete">Delete box</button>
      <span class="muted">Page ${editor.selectedPageIndex + 1}, bbox ${box.bbox.join(",")}</span>
    </div>
  `;

  el.querySelector(".sp-id").addEventListener("change", (e) => {
    const newId = e.target.value.trim();
    if (!newId || newId === box.id) { e.target.value = box.id; return; }
    const clash = editor.state.pages.some((p) => p.boxes.some((b) => b !== box && b.id === newId));
    if (clash) {
      alert(`Box id "${newId}" already used.`);
      e.target.value = box.id;
      return;
    }
    box.id = newId;
    editor.selectedBoxId = newId;
    renderOverlay(editor);
    renderSidePanel(editor);
    editor.onChange();
  });
  el.querySelector(".sp-header").addEventListener("input", (e) => {
    box.header = e.target.value;
    renderOverlay(editor);
    const dupEl = el.querySelector(".sp-header-dup");
    if (dupEl) {
      const isNowDup = collectDuplicateHeaders(editor.state).has((box.header || "").trim());
      dupEl.hidden = !isNowDup;
    }
    editor.onChange();
  });
  el.querySelector(".sp-description").addEventListener("input", (e) => {
    box.description = e.target.value;
  });
  el.querySelector(".sp-type").addEventListener("change", (e) => {
    box.type = e.target.value;
    if (needsChoices(box.type) && !box.choices) box.choices = [];
    if (!needsChoices(box.type)) delete box.choices;
    renderSidePanel(editor);
    editor.onChange();
  });
  const choicesEl = el.querySelector(".sp-choices");
  if (choicesEl) {
    choicesEl.addEventListener("input", (e) => {
      const lines = e.target.value.split(/\n/).map((s) => s.trim()).filter(Boolean);
      box.choices = lines;
      editor.onChange();
    });
  }
  el.querySelector(".sp-missing-empty").addEventListener("change", (e) => {
    box.missing_is_empty = e.target.checked;
    editor.onChange();
  });
  el.querySelector(".sp-test-include").addEventListener("change", (e) => {
    box._testInclude = e.target.checked;
  });
  el.querySelector(".sp-delete").addEventListener("click", () => deleteSelected(editor));
}

function needsChoices(type) {
  return type === "multi-choice" || type === "multi-select";
}

function escapeAttr(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function escapeText(s) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
}

export { collectDuplicateHeaders };
