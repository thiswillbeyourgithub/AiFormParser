// Build a Survey object from the in-memory editor state, serialise it
// to YAML via the vendored js-yaml ESM build, snapshot every page as a
// PNG blob, and POST the whole bundle to /api/surveys as multipart
// form-data. Mirrors the pydantic Survey schema in app/schema.py.

import { CANVAS_DPI } from "/static/app/admin-canvas.js";
import { collectDuplicateHeaders } from "/static/app/admin-boxes.js";

const JSYAML_URL = "/static/vendor/js-yaml/js-yaml.mjs";

let jsyamlPromise = null;
function loadJsYaml() {
  if (!jsyamlPromise) jsyamlPromise = import(JSYAML_URL);
  return jsyamlPromise;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class SaveValidationError extends Error {}

export function buildSurvey(state) {
  const name = (state.name || "").trim();
  const slug = (state.slug || "").trim();
  if (!name) throw new SaveValidationError("Survey name is required.");
  if (!SLUG_RE.test(slug)) {
    throw new SaveValidationError(
      "Slug must be lowercase kebab-case (letters, digits, hyphens; no leading or trailing hyphen)."
    );
  }
  if (!state.pages.length) throw new SaveValidationError("Add at least one page.");

  const dups = collectDuplicateHeaders(state);
  if (dups.size) {
    throw new SaveValidationError(`Duplicate header(s) across pages: ${[...dups].join(", ")}`);
  }

  const presets = (state.presets || []).map((p) => normalisePreset(p));
  validatePresets(presets);
  const survey = {
    name,
    slug,
    created_at: new Date().toISOString(),
    pages: state.pages.map((p) => ({
      index: p.index,
      image: p.imageFilename,
      width: p.canvas.width,
      height: p.canvas.height,
      rasterised_dpi: CANVAS_DPI,
      ocr_tokens: (p.ocrTokens || []).map((t) => ({
        text: t.text,
        bbox: t.bbox,
        confidence: t.confidence,
      })),
      ocr_blocks: (p.ocrBlocks || []).map((b) => ({
        id: b.id,
        text: b.text,
        bbox: b.bbox,
        words: (b.words || []).map((w) => ({ text: w.text, bbox: w.bbox })),
      })),
      boxes: p.boxes.map((b) => {
        const out = {
          id: b.id,
          header: b.header,
          description: b.description || "",
          type: b.type,
          bbox: b.bbox,
        };
        if (b.type === "multi-choice" || b.type === "multi-select") {
          out.choices = (b.choices || []).slice();
        }
        if (b.missing_is_empty) out.missing_is_empty = true;
        return out;
      }),
    })),
  };
  if (presets.length) survey.presets = presets;
  return survey;
}

function normalisePreset(preset) {
  return {
    name: String(preset.name || "").trim(),
    model: String(preset.model || "").trim(),
    load_params: preset.loadParams && typeof preset.loadParams === "object"
      ? { ...preset.loadParams }
      : {},
    sample_params: preset.sampleParams && typeof preset.sampleParams === "object"
      ? { ...preset.sampleParams }
      : {},
    is_default: !!preset.isDefault,
  };
}

function validatePresets(presets) {
  const seen = new Set();
  let defaults = 0;
  for (const p of presets) {
    if (!p.name) throw new SaveValidationError("Each preset needs a name.");
    if (!p.model) throw new SaveValidationError(`Preset "${p.name}" needs a model.`);
    if (seen.has(p.name)) {
      throw new SaveValidationError(`Duplicate preset name "${p.name}".`);
    }
    seen.add(p.name);
    if (p.is_default) defaults += 1;
  }
  if (presets.length && defaults !== 1) {
    throw new SaveValidationError(
      `Exactly one preset must be marked default (currently ${defaults}).`,
    );
  }
}

export async function saveSurvey(state, { overwrite } = {}) {
  const survey = buildSurvey(state);
  const jsyaml = await loadJsYaml();
  const yamlText = jsyaml.dump(survey, { noRefs: true, lineWidth: 120 });

  const fd = new FormData();
  fd.append("yaml", yamlText);
  fd.append("overwrite", overwrite ? "true" : "false");
  for (const page of state.pages) {
    const blob = await canvasToBlob(page.canvas);
    fd.append("images", blob, page.imageFilename);
  }

  const res = await fetch("/api/surveys", { method: "POST", body: fd });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b); else reject(new Error("canvas.toBlob returned null"));
    }, "image/png");
  });
}
