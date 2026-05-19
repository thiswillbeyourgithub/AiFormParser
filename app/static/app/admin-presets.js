// Admin UI for per-survey LLM presets. Each preset bundles a model
// name plus the wllama load/sample params an admin wants the
// researcher to default to. The reusable llm-options dropdown is
// embedded inside the per-preset editor form so the admin tweaks the
// same surfaces a researcher will see later.
//
// State lives on the shared editor state object (state.presets); the
// preset editor mutates it in place and the existing admin-save flow
// serialises the result into the YAML. Exactly one preset must carry
// is_default=true; the UI surfaces that as a radio across the list.

import { mountLlmOptions } from "/static/app/llm-options.js";
import { isImatrixQuant } from "/static/app/model-quant.js";
import { trackUmami } from "/static/app/analytics.js";
import {
  DEFAULT_EDITOR_LOAD_PARAMS,
  DEFAULT_EDITOR_SAMPLE_PARAMS,
} from "/static/app/llm-defaults.js";

let modelCatalog = null;

async function fetchModelCatalog() {
  if (modelCatalog) return modelCatalog;
  const res = await fetch("/api/models");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  modelCatalog = body.models || [];
  return modelCatalog;
}

function suggestUniqueName(state, base = "Preset") {
  const used = new Set((state.presets || []).map((p) => p.name));
  if (!used.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const cand = `${base} ${i}`;
    if (!used.has(cand)) return cand;
  }
  return `${base} ${Date.now()}`;
}

function setStatus(el, text, cls = "muted") {
  if (!el) return;
  el.className = cls === "ok" ? "ok" : cls === "error" ? "error" : "muted";
  el.textContent = text;
}

function createModelPicker(currentValue) {
  const select = document.createElement("select");
  select.className = "preset-model-picker";
  const models = modelCatalog || [];
  if (!models.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(no self-hosted models)";
    select.appendChild(opt);
    select.disabled = true;
    return select;
  }
  // Surface a "free-form" sentinel so admins on instances whose
  // catalogue lacks the desired model can still type a name out by
  // hand (the YAML stays portable to a researcher who DOES have it).
  let foundCurrent = false;
  for (const m of models) {
    const opt = document.createElement("option");
    opt.value = m.name;
    const tags = [];
    if (!m.mmproj_url) tags.push("no mmproj");
    if (isImatrixQuant(m.name)) tags.push("IQ quant: slow on wllama");
    opt.textContent = tags.length ? `${m.name} (${tags.join(", ")})` : m.name;
    if (m.name === currentValue) {
      opt.selected = true;
      foundCurrent = true;
    }
    select.appendChild(opt);
  }
  // If the preset references a model this instance does not host,
  // keep it in the dropdown (so the value round-trips) with a tag.
  if (currentValue && !foundCurrent) {
    const opt = document.createElement("option");
    opt.value = currentValue;
    opt.textContent = `${currentValue} (not on this instance)`;
    opt.selected = true;
    select.insertBefore(opt, select.firstChild);
  }
  return select;
}

function renderViewMode(card, preset, ctx) {
  card.innerHTML = "";
  card.classList.toggle("is-default", !!preset.isDefault);
  const head = document.createElement("div");
  head.className = "preset-row-head";

  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "preset-default-radio";
  radio.checked = !!preset.isDefault;
  radio.title = "Mark this preset as the default";
  radio.addEventListener("change", () => {
    if (radio.checked) {
      for (const p of ctx.state.presets) p.isDefault = (p === preset);
      ctx.render();
      ctx.onChange?.();
      trackUmami("admin:preset-default-set");
    }
  });
  head.appendChild(radio);

  const nameSpan = document.createElement("span");
  nameSpan.className = "preset-name";
  nameSpan.textContent = preset.name;
  head.appendChild(nameSpan);

  if (preset.isDefault) {
    const tag = document.createElement("span");
    tag.className = "status-pill ok";
    tag.textContent = "default";
    head.appendChild(tag);
  }

  const modelSpan = document.createElement("span");
  modelSpan.className = "preset-model";
  modelSpan.textContent = preset.model || "(no model)";
  head.appendChild(modelSpan);

  const grow = document.createElement("span");
  grow.className = "grow";
  head.appendChild(grow);

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "secondary";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () => {
    ctx.editing = preset;
    ctx.render();
  });
  head.appendChild(editBtn);

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "danger";
  delBtn.textContent = "Delete";
  delBtn.addEventListener("click", () => {
    if (!confirm(`Delete preset "${preset.name}"?`)) return;
    const idx = ctx.state.presets.indexOf(preset);
    if (idx < 0) return;
    ctx.state.presets.splice(idx, 1);
    // If we deleted the default and others remain, promote the first.
    if (preset.isDefault && ctx.state.presets.length) {
      ctx.state.presets[0].isDefault = true;
    }
    ctx.render();
    ctx.onChange?.();
    trackUmami("admin:preset-deleted");
  });
  head.appendChild(delBtn);

  card.appendChild(head);

  // Show a compact summary of the parameter counts so the admin can
  // tell presets apart without expanding the editor.
  const loadKeys = Object.keys(preset.loadParams || {}).length;
  const sampleKeys = Object.keys(preset.sampleParams || {}).length;
  const summary = document.createElement("p");
  summary.className = "muted";
  summary.style.margin = "0.3rem 0 0 0";
  summary.textContent = `load params: ${loadKeys}, sample params: ${sampleKeys}`;
  card.appendChild(summary);
}

function renderEditMode(card, preset, ctx) {
  card.innerHTML = "";
  card.classList.toggle("is-default", !!preset.isDefault);

  const form = document.createElement("div");
  form.className = "preset-form";

  const formRow = document.createElement("div");
  formRow.className = "preset-form-row";

  const nameLabel = document.createElement("label");
  const nameSpan = document.createElement("span");
  nameSpan.textContent = "Name";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = preset.name;
  nameInput.placeholder = "Fast / Quality / Default";
  nameLabel.appendChild(nameSpan);
  nameLabel.appendChild(nameInput);
  formRow.appendChild(nameLabel);

  const modelLabel = document.createElement("label");
  const modelSpan = document.createElement("span");
  modelSpan.textContent = "Model";
  const modelPicker = createModelPicker(preset.model);
  modelLabel.appendChild(modelSpan);
  modelLabel.appendChild(modelPicker);
  formRow.appendChild(modelLabel);

  const defaultLabel = document.createElement("label");
  defaultLabel.title = "Mark this preset as the survey's default";
  const defaultInput = document.createElement("input");
  defaultInput.type = "checkbox";
  defaultInput.checked = !!preset.isDefault;
  const defaultText = document.createElement("span");
  defaultText.textContent = " Default";
  defaultLabel.appendChild(defaultInput);
  defaultLabel.appendChild(defaultText);
  formRow.appendChild(defaultLabel);

  form.appendChild(formRow);

  const opts = mountLlmOptions(form, {
    summaryText: "Load + sample parameters",
    initiallyOpen: true,
    loadParams: preset.loadParams || {},
    sampleParams: preset.sampleParams || {},
  });

  const errorRow = document.createElement("p");
  errorRow.className = "muted";
  errorRow.style.margin = "0.3rem 0";
  form.appendChild(errorRow);

  const buttons = document.createElement("div");
  buttons.className = "row";
  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save preset";
  buttons.appendChild(saveBtn);
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "secondary";
  cancelBtn.textContent = "Cancel";
  buttons.appendChild(cancelBtn);
  form.appendChild(buttons);

  card.appendChild(form);

  saveBtn.addEventListener("click", async () => {
    const newName = nameInput.value.trim();
    if (!newName) {
      setStatus(errorRow, "Name is required.", "error");
      return;
    }
    const collision = ctx.state.presets.find((p) => p !== preset && p.name === newName);
    if (collision) {
      setStatus(errorRow, `Preset name "${newName}" already used.`, "error");
      return;
    }
    const model = modelPicker.value.trim();
    if (!model) {
      setStatus(errorRow, "Model is required.", "error");
      return;
    }
    let loadParams, sampleParams;
    try {
      // Read the RAW values (sentinels preserved) so the admin's
      // "model_default" entries round-trip back into the YAML.
      loadParams = await opts.readLoadParamsRaw();
      sampleParams = await opts.readSampleParamsRaw();
    } catch (err) {
      setStatus(errorRow, err.message, "error");
      return;
    }
    preset.name = newName;
    preset.model = model;
    preset.loadParams = loadParams;
    preset.sampleParams = sampleParams;
    if (defaultInput.checked) {
      for (const p of ctx.state.presets) p.isDefault = (p === preset);
    } else if (preset.isDefault) {
      // Unchecked: if nothing else is default, refuse so we always
      // keep the invariant.
      const others = ctx.state.presets.filter((p) => p !== preset && p.isDefault);
      if (!others.length) {
        setStatus(errorRow, "At least one preset must remain the default.", "error");
        return;
      }
      preset.isDefault = false;
    }
    ctx.editing = null;
    ctx.render();
    ctx.onChange?.();
    trackUmami("admin:preset-saved");
  });

  cancelBtn.addEventListener("click", () => {
    ctx.editing = null;
    // If we cancelled the editor for a freshly created (unsaved-shape)
    // preset, drop it from state so the list does not retain a noise row.
    if (preset.__isNew) {
      const idx = ctx.state.presets.indexOf(preset);
      if (idx >= 0) ctx.state.presets.splice(idx, 1);
    }
    ctx.render();
  });

  // Mark new presets so cancel can clean them up; the flag is dropped
  // on the first successful save.
  if (preset.__isNew) {
    // Remove the marker after the first save success.
    const origSave = saveBtn.onclick;
    saveBtn.addEventListener("click", () => {
      delete preset.__isNew;
    });
    void origSave;
  }
}

export function wirePresetSection(state, { onChange } = {}) {
  const root = document.getElementById("preset-list");
  const addBtn = document.getElementById("preset-add");
  const status = document.getElementById("preset-status");
  if (!root || !addBtn) return null;

  state.presets = state.presets || [];
  const ctx = { state, editing: null, onChange, render: null };

  function render() {
    root.innerHTML = "";
    if (!state.presets.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No presets yet. Add one so the researcher can run this survey.";
      root.appendChild(empty);
    }
    for (const preset of state.presets) {
      const card = document.createElement("div");
      card.className = "preset-row";
      root.appendChild(card);
      if (ctx.editing === preset) {
        renderEditMode(card, preset, ctx);
      } else {
        renderViewMode(card, preset, ctx);
      }
    }
    setStatus(status, `${state.presets.length} preset(s).`);
  }
  ctx.render = render;

  addBtn.addEventListener("click", async () => {
    try {
      await fetchModelCatalog();
    } catch (err) {
      setStatus(status, `Could not fetch models: ${err.message}`, "error");
      return;
    }
    const preset = {
      name: suggestUniqueName(state),
      model: modelCatalog?.[0]?.name || "",
      // Seed with the shared portable defaults so a new preset starts from
      // the values the pipeline ships, ready to tweak. Cloned so the
      // frozen shared objects are never mutated.
      loadParams: { ...DEFAULT_EDITOR_LOAD_PARAMS },
      sampleParams: { ...DEFAULT_EDITOR_SAMPLE_PARAMS },
      isDefault: state.presets.length === 0,
      __isNew: true,
    };
    state.presets.push(preset);
    ctx.editing = preset;
    render();
    trackUmami("admin:preset-add");
  });

  // Try to populate the catalogue eagerly so the picker is ready
  // when the admin opens an editor. Silently ignore failures; the
  // editor will retry on click.
  fetchModelCatalog().catch(() => {});

  // Initial render uses whatever presets were already on the state
  // object (loaded from a survey YAML, set by a YAML upload, ...).
  render();

  return {
    refresh: render,
    // Used by admin.js to repopulate state when loading a survey.
    setPresets(list) {
      state.presets = list || [];
      ctx.editing = null;
      render();
    },
  };
}
