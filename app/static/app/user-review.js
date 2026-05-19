// Review queue for boxes that failed the hard rules in user-llm.js
// (or never anchored, or whose crop was out of frame). One card per
// flagged box across all uploads. The researcher can save a typed
// value or skip the cell entirely; pipeline:done re-renders the queue
// after the inference loop finishes.

export function renderReviewQueue(state, container, onChange = () => {}) {
  container.innerHTML = "";
  const flagged = collectUnresolved(state);
  if (!flagged.length) {
    container.innerHTML = '<p class="muted">No boxes need review.</p>';
    onChange();
    return;
  }
  const header = document.createElement("p");
  header.className = "muted";
  header.textContent = `${flagged.length} box(es) flagged. Save a value or skip each one before exporting.`;
  container.appendChild(header);
  for (const item of flagged) {
    container.appendChild(renderCard(item, () => renderReviewQueue(state, container, onChange)));
  }
  onChange();
}

export function allResolved(state) {
  for (const upload of state.uploads) {
    if (!upload.perBoxResults) continue;
    for (const entry of upload.perBoxResults.values()) {
      if (!entry.ok && !entry.resolution) return false;
    }
  }
  return true;
}

function collectUnresolved(state) {
  const list = [];
  for (const upload of state.uploads) {
    if (!upload.perBoxResults) continue;
    for (const entry of upload.perBoxResults.values()) {
      if (!entry.ok && !entry.resolution) list.push({ upload, entry });
    }
  }
  return list;
}

function renderCard({ upload, entry }, rerender) {
  const card = document.createElement("div");
  card.className = "review-card";
  card.innerHTML = `
    <div class="review-card-head">
      <strong class="review-header"></strong>
      <span class="review-source muted"></span>
      <span class="review-reason status-pill error"></span>
    </div>
    <p class="review-meta muted"></p>
    <div class="review-body">
      <img class="review-crop" alt="cropped box image" />
      <div class="review-editor">
        <p class="muted"><span>Raw model output: </span><code class="review-raw"></code></p>
        <div class="review-input"></div>
        <div class="row review-actions">
          <button data-action="save">Save value</button>
          <button data-action="skip" class="secondary">Skip</button>
        </div>
      </div>
    </div>
  `;
  card.querySelector(".review-header").textContent = entry.header;
  card.querySelector(".review-source").textContent = upload.file.name;
  card.querySelector(".review-reason").textContent = entry.reason || "review";
  card.querySelector(".review-meta").textContent = formatMeta(entry);
  if (entry.cropDataUrl) card.querySelector(".review-crop").src = entry.cropDataUrl;
  card.querySelector(".review-raw").textContent = formatRaw(entry.raw);

  const inputHost = card.querySelector(".review-input");
  const input = buildInput(entry);
  inputHost.appendChild(input.el);

  card.querySelector(".review-actions").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "save") {
      const value = input.read();
      if (value === undefined) return; // input rejected; let the field show its own validation
      entry.value = value;
      entry.resolution = "edit";
    } else if (btn.dataset.action === "skip") {
      entry.value = null;
      entry.resolution = "skip";
    }
    rerender();
  });
  return card;
}

function formatMeta(entry) {
  const parts = [entry.type];
  if (entry.choices?.length) parts.push(`choices: ${entry.choices.join(", ")}`);
  if (entry.description) parts.push(entry.description);
  return parts.join(" | ");
}

function formatRaw(raw) {
  if (raw == null) return "(empty)";
  if (typeof raw === "string") return raw;
  try { return JSON.stringify(raw); } catch { return String(raw); }
}

function buildInput(entry) {
  switch (entry.type) {
    case "text":   return buildText(entry);
    case "number": return buildNumber(entry);
    case "checkbox": return buildCheckbox(entry);
    case "date":   return buildDate(entry);
    case "multi-choice": return buildMultiChoice(entry);
    case "multi-select": return buildMultiSelect(entry);
    default:       return buildText(entry);
  }
}

function preselectString(entry) {
  if (typeof entry.raw === "string") return entry.raw;
  if (entry.raw && typeof entry.raw === "object" && "value" in entry.raw) {
    return String(entry.raw.value);
  }
  return "";
}

function buildText(entry) {
  const el = document.createElement("input");
  el.type = "text";
  el.value = preselectString(entry);
  return { el, read: () => el.value };
}

function buildNumber(entry) {
  const el = document.createElement("input");
  el.type = "number";
  el.step = "any";
  const pre = preselectString(entry);
  const parsed = Number(pre);
  if (Number.isFinite(parsed)) el.value = String(parsed);
  return {
    el,
    read: () => {
      if (el.value === "") return null;
      const v = Number(el.value);
      return Number.isFinite(v) ? v : undefined;
    },
  };
}

function buildCheckbox(entry) {
  const wrap = document.createElement("label");
  const el = document.createElement("input");
  el.type = "checkbox";
  const raw = preselectString(entry).toLowerCase();
  el.checked = ["true", "yes", "1", "on", "x"].includes(raw);
  wrap.appendChild(el);
  wrap.appendChild(document.createTextNode(" ticked"));
  return { el: wrap, read: () => el.checked };
}

function buildDate(entry) {
  const el = document.createElement("input");
  el.type = "date";
  const pre = preselectString(entry);
  if (/^\d{4}-\d{2}-\d{2}$/.test(pre)) el.value = pre;
  return {
    el,
    read: () => (el.value ? el.value : null),
  };
}

function buildMultiChoice(entry) {
  const el = document.createElement("select");
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "-- pick --";
  el.appendChild(blank);
  for (const c of entry.choices || []) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    el.appendChild(opt);
  }
  const pre = preselectString(entry);
  if (entry.choices?.includes(pre)) el.value = pre;
  return {
    el,
    read: () => (el.value ? el.value : null),
  };
}

function buildMultiSelect(entry) {
  const wrap = document.createElement("div");
  wrap.className = "review-multiselect";
  const preset = new Set();
  if (Array.isArray(entry.raw)) for (const r of entry.raw) preset.add(String(r));
  else if (entry.raw && typeof entry.raw === "object" && Array.isArray(entry.raw.value)) {
    for (const r of entry.raw.value) preset.add(String(r));
  }
  const checkboxes = [];
  for (const c of entry.choices || []) {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = c;
    if (preset.has(c)) cb.checked = true;
    checkboxes.push(cb);
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + c));
    wrap.appendChild(label);
  }
  return {
    el: wrap,
    read: () => checkboxes.filter((cb) => cb.checked).map((cb) => cb.value),
  };
}
