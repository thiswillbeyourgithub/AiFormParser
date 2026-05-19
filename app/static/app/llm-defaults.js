// Single source of truth for the default LLM load + sample parameters
// and the "model_default" sentinel. Shared by the user pipeline
// (user-llm.js), the reusable options editor (llm-options.js), the admin
// preset editor (admin-presets.js), the admin LLM test panel
// (admin-llm-test.js), and the /test diagnostic page (test.js).
//
// Keeping the defaults in one module means every editor prefills with
// exactly the values the pipeline actually ships, and there is only one
// place to change them. This module imports nothing app-specific so any
// page can pull it in without dragging the wllama runtime along.

// Sentinel a user can type for any parameter in an options textarea to
// say "don't pass this; let the model's own default win". Stripped from
// the parsed YAML before the value reaches wllama / llama.cpp (via
// stripModelDefaults in llm-options.js), so the runtime never sees a
// literal "model_default" string.
export const MODEL_DEFAULT_SENTINEL = "model_default";

// image_min_tokens / image_max_tokens cap the patch budget the vision
// encoder assigns to each crop. Per-box crops are small (one survey
// field), so a VL model's default budget is overkill: latency scales
// roughly linearly with this number and we pay it once per box. Kept low
// to favour throughput; the caller can override per load via
// loadModel({ imageMinTokens, imageMaxTokens, ... }). These only bound
// per-inference image processing, NOT the one-off warmup pass.
export const DEFAULT_IMAGE_MIN_TOKENS = 24;
export const DEFAULT_IMAGE_MAX_TOKENS = 256;
export const IMAGE_TOKENS_MIN = 8;
export const IMAGE_TOKENS_MAX = 1024;

const hwThreads = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 2;

// llama.cpp / wllama runtime options forwarded to wllama at model load.
//
// n_ctx is sized tightly for one box at a time: ~200 prompt tokens + up
// to DEFAULT_IMAGE_MAX_TOKENS image tokens + generated output, with
// headroom. n_threads defaults in wllama to floor(hardwareConcurrency/2);
// we target CPU-only browsers so we use all cores but one, leaving a
// thread free for the UI plus tesseract workers. n_ctx_checkpoints trades
// RAM and per-step bookkeeping for KV-cache rollback during long chats;
// we do single-shot box inferences with no history reuse, so it is pure
// overhead and stays off. flash_attn is a small speedup on its own.
export const MODEL_RUNTIME_OPTS = Object.freeze({
  n_ctx: 4096,
  n_threads: Math.max(1, hwThreads - 1),
  n_ctx_checkpoints: false,
  flash_attn: true,
});

// The actual load options the user pipeline ships. n_threads is computed
// for THIS machine. Frozen so consumers cannot mutate the shared baseline
// by accident.
export const DEFAULT_MODEL_LOAD_OPTIONS = Object.freeze({
  ...MODEL_RUNTIME_OPTS,
  image_min_tokens: DEFAULT_IMAGE_MIN_TOKENS,
  image_max_tokens: DEFAULT_IMAGE_MAX_TOKENS,
});

// Keys whose value is specific to the machine running the editor. We
// never want to bake these into a saved survey preset (which then ships
// to researchers on different hardware), so the editor prefill shows them
// as the model_default sentinel: visible as a knob, but dropped before
// the load so llama.cpp picks the value per machine.
const HARDWARE_SPECIFIC_KEYS = new Set(["n_threads"]);

// Portable defaults used to prefill the admin preset editor and the
// researcher override editor. Same as DEFAULT_MODEL_LOAD_OPTIONS but with
// hardware-specific keys replaced by the model_default sentinel.
export const DEFAULT_EDITOR_LOAD_PARAMS = Object.freeze(
  Object.fromEntries(
    Object.entries(DEFAULT_MODEL_LOAD_OPTIONS).map(([k, v]) => [
      k,
      HARDWARE_SPECIFIC_KEYS.has(k) ? MODEL_DEFAULT_SENTINEL : v,
    ]),
  ),
);

// Default sampling options used to prefill the editors. temperature ships
// as the sentinel so the knob is visible without pinning a value the
// model author may have tuned. Replace with a number to override.
export const DEFAULT_EDITOR_SAMPLE_PARAMS = Object.freeze({
  temperature: MODEL_DEFAULT_SENTINEL,
});
