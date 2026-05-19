// Reusable "model options" dropdown shared by the admin preset editor,
// the admin LLM test panel, and the researcher pipeline. Mirrors the
// two YAML textareas from the /test page but packaged as a collapsed
// <details> block so it can drop into any section.
//
// Two YAML mappings are exposed:
//
//   load_params:   merged into the user-pipeline defaults at model load
//                  time (n_ctx, image_min_tokens, ...). Editing these
//                  unloads the cached wllama instance via onChange so
//                  the next call reloads with the new values.
//
//   sample_params: passed per-completion (temperature, top_k,
//                  chat_template_kwargs, ...). No reload needed.
//
// In either textarea, a value of "model_default" deletes that key from
// the parsed object before it reaches wllama, so llama.cpp's own
// baked-in default for that parameter wins. Documented inline next to
// each textarea so the operator can see the contract.

import {
  MODEL_DEFAULT_SENTINEL,
  DEFAULT_EDITOR_LOAD_PARAMS,
  DEFAULT_EDITOR_SAMPLE_PARAMS,
} from "/static/app/llm-defaults.js";

// Re-exported so callers that already import the sentinel from this
// module keep working.
export { MODEL_DEFAULT_SENTINEL };

const JSYAML_URL = "/static/vendor/js-yaml/js-yaml.mjs";

let jsyamlPromise = null;
// Cached module ref, filled once jsyamlPromise resolves. Lets callers
// (e.g. the /test gray-out logic) do a synchronous YAML parse on every
// keystroke without paying for an `await`, which would defer to the next
// microtask and feel laggy while typing.
let cachedJsYaml = null;
export function loadJsYaml() {
  if (!jsyamlPromise) {
    jsyamlPromise = import(JSYAML_URL).then((m) => { cachedJsYaml = m; return m; });
  }
  return jsyamlPromise;
}

// The cached js-yaml module if it has already loaded, else null. Use for
// best-effort synchronous parsing where an async path is not acceptable.
export function getJsYamlSync() {
  return cachedJsYaml;
}

// Walk a parsed YAML object and remove any key whose value equals the
// MODEL_DEFAULT_SENTINEL, recursing into nested mappings. Translates
// "param: model_default" entries into "param absent" so wllama falls
// through to its own default for that key.
export function stripModelDefaults(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === MODEL_DEFAULT_SENTINEL) delete obj[k];
    else if (v && typeof v === "object") stripModelDefaults(v);
  }
  return obj;
}

export async function parseYamlObject(text, label) {
  const t = (text || "").trim();
  if (!t) return {};
  const jsyaml = await loadJsYaml();
  let parsed;
  try {
    parsed = jsyaml.load(t);
  } catch (err) {
    throw new Error(`Invalid YAML in ${label}: ${err.message}`);
  }
  if (parsed == null) return {};
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a YAML mapping.`);
  }
  return parsed;
}

export async function dumpYamlObject(obj) {
  const jsyaml = await loadJsYaml();
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "";
  return jsyaml.dump(obj, { lineWidth: 120 });
}

const SUMMARY_TEXT = "Advanced model parameters";

const DEFAULT_OPTIONS = {
  summaryText: SUMMARY_TEXT,
  initiallyOpen: false,
  loadParams: null,
  sampleParams: null,
  // Fired when either textarea's "change" event fires (i.e. on blur or
  // an explicit value-set). Lets callers tear down the cached wllama
  // worker so the next run picks up new load-time options.
  onChange: null,
  // Fired with a Promise that resolves once the textareas are
  // pre-filled. Useful for callers that want to read initial values
  // immediately after mounting.
  onReady: null,
};

const HELP_LOAD = `Load options merged into the pipeline defaults at model load time. Editing these unloads the current model so the next run reloads. <a href="https://github.ngxson.com/wllama/docs/interfaces/LoadModelParams.html" target="_blank" rel="noopener">Available parameters</a>. Set a value to <code>model_default</code> to drop the key and fall back to the model's own default.`;

const HELP_SAMPLE = `Completion options passed per call (no reload needed). Includes <code>temperature</code> plus any <a href="https://github.ngxson.com/wllama/docs/interfaces/SamplingParams.html" target="_blank" rel="noopener">SamplingParams</a>. Use <code>chat_template_kwargs: {enable_thinking: false, reasoning: false}</code> to disable thinking. Set a value to <code>model_default</code> to drop the key.`;

let mountCounter = 0;

// Mount a collapsed dropdown into `container`. Returns a handle with
// read/write helpers and a `setLocked(bool)` for disabling the textareas
// while inference is in flight.
export function mountLlmOptions(container, opts = {}) {
  const cfg = { ...DEFAULT_OPTIONS, ...opts };
  const id = ++mountCounter;
  const loadId = `llm-opts-load-${id}`;
  const sampleId = `llm-opts-sample-${id}`;

  const details = document.createElement("details");
  details.className = "llm-options";
  if (cfg.initiallyOpen) details.open = true;

  const summary = document.createElement("summary");
  summary.textContent = cfg.summaryText;
  details.appendChild(summary);

  const inner = document.createElement("div");
  inner.className = "llm-options-body";

  const loadLabel = document.createElement("label");
  loadLabel.className = "grow";
  loadLabel.htmlFor = loadId;
  const loadHelp = document.createElement("span");
  loadHelp.className = "muted llm-options-help";
  loadHelp.innerHTML = `<strong>Load parameters</strong>. ${HELP_LOAD}`;
  const loadTa = document.createElement("textarea");
  loadTa.id = loadId;
  loadTa.rows = 8;
  loadTa.spellcheck = false;
  loadTa.className = "llm-options-textarea";
  loadLabel.appendChild(loadHelp);
  loadLabel.appendChild(loadTa);

  const sampleLabel = document.createElement("label");
  sampleLabel.className = "grow";
  sampleLabel.htmlFor = sampleId;
  const sampleHelp = document.createElement("span");
  sampleHelp.className = "muted llm-options-help";
  sampleHelp.innerHTML = `<strong>Sample parameters</strong>. ${HELP_SAMPLE}`;
  const sampleTa = document.createElement("textarea");
  sampleTa.id = sampleId;
  sampleTa.rows = 6;
  sampleTa.spellcheck = false;
  sampleTa.className = "llm-options-textarea";
  sampleLabel.appendChild(sampleHelp);
  sampleLabel.appendChild(sampleTa);

  inner.appendChild(loadLabel);
  inner.appendChild(sampleLabel);
  details.appendChild(inner);
  container.appendChild(details);

  const readyPromise = (async () => {
    // When the caller passes nothing (null/undefined), prefill with the
    // shared portable defaults so the editor is easy to tweak. An explicit
    // (even empty) object is respected as-is so a saved preset round-trips
    // faithfully.
    const initialLoad = cfg.loadParams ?? DEFAULT_EDITOR_LOAD_PARAMS;
    const initialSample = cfg.sampleParams ?? DEFAULT_EDITOR_SAMPLE_PARAMS;
    loadTa.value = await dumpYamlObject(initialLoad);
    sampleTa.value = await dumpYamlObject(initialSample);
  })();

  if (typeof cfg.onChange === "function") {
    loadTa.addEventListener("change", () => cfg.onChange("load"));
    sampleTa.addEventListener("change", () => cfg.onChange("sample"));
  }

  if (typeof cfg.onReady === "function") {
    readyPromise.then(() => cfg.onReady()).catch(() => {});
  }

  async function setLoadParams(obj) {
    loadTa.value = await dumpYamlObject(obj ?? {});
  }
  async function setSampleParams(obj) {
    sampleTa.value = await dumpYamlObject(obj ?? {});
  }
  async function readLoadParamsRaw() {
    return await parseYamlObject(loadTa.value, "Load parameters");
  }
  async function readSampleParamsRaw() {
    return await parseYamlObject(sampleTa.value, "Sample parameters");
  }
  async function readLoadParams() {
    return stripModelDefaults(await readLoadParamsRaw());
  }
  async function readSampleParams() {
    return stripModelDefaults(await readSampleParamsRaw());
  }
  function setLocked(locked) {
    loadTa.disabled = !!locked;
    sampleTa.disabled = !!locked;
  }
  function setOpen(open) {
    details.open = !!open;
  }

  return {
    root: details,
    readyPromise,
    setLoadParams,
    setSampleParams,
    readLoadParams,
    readSampleParams,
    readLoadParamsRaw,
    readSampleParamsRaw,
    setLocked,
    setOpen,
  };
}
