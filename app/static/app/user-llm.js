// Per-box LLM inference using wllama (vendored under
// /static/vendor/wllama). The model is loaded lazily on first use.
// The model source is a self-hosted GGUF served from /api/models; the
// admin places the file under MODELS_DIR on the data volume.
//
// Every call to inferBox() builds a fresh OpenAI-compatible
// chat.completions request: a short text instruction plus the
// cropped box image, with a single tool the model is forced to call.
// The tool's parameter schema encodes the box `type` and `choices`,
// so a well-behaved model returns a typed value directly. Anything
// that fails the hard rules from CLAUDE.md §6 step 7 is reported
// with {ok: false, reason, raw} for the review queue.

import { warnIfImatrixQuant } from "/static/app/model-quant.js";
import { logPostLoadDiagnostics } from "/static/app/diagnostics.js";
import {
  MODEL_RUNTIME_OPTS,
  DEFAULT_IMAGE_MIN_TOKENS,
  DEFAULT_IMAGE_MAX_TOKENS,
  IMAGE_TOKENS_MIN,
  IMAGE_TOKENS_MAX,
  DEFAULT_MODEL_LOAD_OPTIONS,
} from "/static/app/llm-defaults.js";
// Re-exported so existing importers (test.js, user.js, admin-llm-test.js)
// keep resolving these names through user-llm.js unchanged.
export { IMAGE_TOKENS_MIN, IMAGE_TOKENS_MAX, DEFAULT_MODEL_LOAD_OPTIONS };

const WLLAMA_ESM = "/static/vendor/wllama/index.min.js";
// wllama v3.x reads `default` as the absolute URL of the wasm binary
// itself (not a directory). The runtime hands this exact URL to the
// worker, which compiles it as WebAssembly. Pointing it at a directory
// returns the FastAPI 404 JSON and fails compileStreaming. The user
// pipeline is gated behind a capabilities banner that already requires
// SIMD + crossOriginIsolated, so the multi-thread binary is the default.
// The compat bundle below is also vendored, as the automatic fallback on
// browsers without JSPI/wasm64 and as the forced CPU-only path (see
// forceCompat in loadModel).
const WLLAMA_PATH_CONFIG = {
  default: "/static/vendor/wllama/multi-thread/wllama.wasm",
};
// Compat (ASYNCIFY, no memory64, no JSPI) bundle for browsers without
// JSPI or wasm64 support, e.g. mobile Safari and current mobile Chrome.
// Produced by scripts/build-wllama.sh's compat stage and vendored locally
// so we never fall back to wllama's default CDN bundle (privacy posture).
const WLLAMA_COMPAT_PATHS = {
  worker: "/static/vendor/wllama/compat/wllama.js",
  wasm: "/static/vendor/wllama/compat/wllama.wasm",
};

// llama.cpp runtime options forwarded to wllama at model load. Defined
// once here so the admin test panel (which calls loadModel from this
// same module) runs under identical settings to the user pipeline.
//
// n_ctx is sized tightly for one box at a time: ~200 prompt tokens +
// up to DEFAULT_IMAGE_MAX_TOKENS image tokens + MAX_OUTPUT_TOKENS
// generated, with headroom. Larger contexts cost RAM and slow per-token
// attention even when most of the window is unused.
//
// n_threads defaults in wllama to floor(hardwareConcurrency/2). We
// target CPU-only browsers, so we use all cores but one, leaving a
// thread free for the UI plus tesseract workers.
//
// n_ubatch (the physical micro-batch the vision/text encoders process
// at once) is left at wllama's default. We previously raised it to
// 1024 to push the image-token prefill through in fewer rounds, but on
// CPU that mostly trades more memory and longer single-step latency
// for no real speedup, since per-box image budgets sit at or below
// the default 512 anyway.
//
// n_ctx_checkpoints (and checkpoint_every_nt) trade extra RAM and
// per-step bookkeeping for the ability to roll the KV cache back during
// long chats. We do single-shot box inferences with no history reuse,
// so the checkpoints are pure overhead: disabled.
//
// flash_attn is a small speedup on its own and is also the gate that
// would unlock KV-cache quantisation. We deliberately leave cache_type_k
// and cache_type_v unset (wllama default = f16) because any K/V
// quantisation has been observed to degrade structured/tool-call
// reliability, which matters a lot here. Re-enable per-call only if a
// caller explicitly opts in.
//
// The runtime constants themselves (n_ctx, n_threads, image token
// budgets) and the default load options live in llm-defaults.js so the
// editors prefill with exactly what the pipeline ships. The warmup pass
// is NOT bounded by image_min/max_tokens: it picks its size from the
// GGUF's clip.vision.image_max_pixels, and wllama exposes no load-time
// option for image_max_pixels or --no-warmup, so reducing the warmup
// cost from JS isn't currently possible.
const MAX_OUTPUT_TOKENS = 256;

const TOOL_NAME = "record_value";
const MISSING_SENTINEL = "__missing__";
// Static, role-defining instructions live in a system message so the
// chat template tags them as such. Per-box context (header,
// description, type, choices, the image) goes in the user message. The
// split lets chat templates that weight system prompts more heavily
// (Qwen, Llama-3) anchor on the rules; templates that do not promote
// the system role still see the instructions before the user content.
const SYSTEM_INTRO = [
  "You are reading one bounding-box crop from a paper survey scanned by a researcher.",
  "Extract exactly one value from the cropped image and return it via the `" + TOOL_NAME + "` tool.",
  "MISSING is the default answer. The patient often leaves boxes blank, and you",
  "MUST signal MISSING whenever the answer is not clearly present. Specifically,",
  "signal MISSING if ANY of the following is true:",
  "the patient did not write anything in the box;",
  "the checkbox is not ticked (no cross, no check, no fill);",
  "no choice is circled, ticked, or otherwise marked;",
  "the paper is untouched, blank, or only shows the printed template;",
  "the answer is illegible, ambiguous, or you are not sure what was marked;",
  "the crop only shows printed question text, lines, or empty boxes.",
  "Do NOT invent a value to avoid MISSING. Do NOT guess a default. Do NOT pick",
  "the first choice just because nothing else is marked. An untouched paper",
  "MUST return MISSING for every field.",
  "How to signal MISSING:",
  "for multi-choice and multi-select, pick the special `" + MISSING_SENTINEL + "` value;",
  "for other types, set the `missing` field to true (then `value` is ignored).",
  "Only when you can clearly see a handwritten or marked answer, return that",
  "value and set missing=false (or omit the sentinel for multi-choice/select).",
  // Per-call latency reminder: this prompt is repeated for every box of
  // every uploaded survey, so any reasoning the model does costs the
  // researcher in wall time. Browser-side wllama with thinking enabled
  // has been observed to spend tens of minutes per box; the visible
  // crop is small enough that extra reasoning rarely changes the answer.
  "CRITICAL: do not think, do not deliberate, do not plan, do not write any",
  "reasoning or preamble. The crop is a single small region with at most one",
  "answer; there is nothing to reason about. Look at the image, decide, and",
  "emit the tool call on your very first response. Answer at the earliest",
  "possible token. Any extra thinking is wasted: it never improves accuracy",
  "on a crop this small, and every token of reasoning costs the researcher",
  "real wall-clock time, repeated for every box of every uploaded survey.",
  "When two clearly marked values are both plausible, pick the more likely one",
  "and emit the tool call now rather than reasoning further. But if no answer",
  "is clearly marked at all, the correct call is MISSING, not a guess.",
].join(" ");

let modulePromise = null;
let instancePromise = null;
let chosenSource = null;

async function loadWllamaModule() {
  if (!modulePromise) modulePromise = import(WLLAMA_ESM);
  return modulePromise;
}

function absolutiseUrl(url) {
  // wllama fetches the model from inside a Worker, where the base URL is
  // the worker script's location, not the page. A site-relative path like
  // /static/models/foo.gguf fails to parse there, so resolve against the
  // current document origin before handing it off.
  return new URL(url, window.location.href).toString();
}

function pickModelSource(catalog, preferredName) {
  if (!catalog?.models?.length) return null;
  const wanted = preferredName
    ? catalog.models.find((m) => m.name === preferredName)
    : null;
  const chosen = wanted || catalog.models[0];
  return {
    kind: "local",
    url: absolutiseUrl(chosen.url),
    mmprojUrl: chosen.mmproj_url ? absolutiseUrl(chosen.mmproj_url) : null,
    name: chosen.name,
  };
}

function clampImageTokens(v, fallback) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(IMAGE_TOKENS_MAX, Math.max(IMAGE_TOKENS_MIN, n));
}

export async function loadModel({
  catalog,
  preferredName = "",
  onProgress = () => {},
  imageMinTokens = DEFAULT_IMAGE_MIN_TOKENS,
  imageMaxTokens = DEFAULT_IMAGE_MAX_TOKENS,
  loadOptionsOverride = null,
  onDiagnostics = null,
  // Diagnostic-only knob from the /test page: when true the mmproj
  // projector is dropped from the source spec and wllama loads a
  // text-only model. Lets the operator measure decode-only throughput
  // and skip the (sometimes very expensive) CLIP graph on backends
  // with poor op coverage.
  disableVision = false,
  // Force the compat (ASYNCIFY, CPU-only, no WebGPU) bundle even on a
  // browser that supports JSPI + memory64. The WebGPU main bundle traps
  // ("unreachable") when GPU offload is disabled, so a genuine CPU-only
  // run on a capable browser has to go through compat. Used by the /test
  // diagnostic + benchmark "CPU only" modes; the normal user pipeline
  // leaves this false and lets wllama's needCompat() decide.
  forceCompat = false,
} = {}) {
  if (instancePromise) return instancePromise;
  instancePromise = (async () => {
    const source = pickModelSource(catalog, preferredName);
    if (!source) throw new Error("No model source available: drop a GGUF in MODELS_DIR on the server.");
    chosenSource = source;
    warnIfImatrixQuant(source.name);
    // Guard the documented WebGPU trap (CLAUDE.md §9): the main wasm bundle
    // is built with GGML_WEBGPU=ON and aborts with a bare "unreachable" when
    // GPU offload is disabled (n_gpu_layers: 0). The only working CPU-only
    // path is the compat bundle (WebGPU compiled out), reached via
    // forceCompat. The /test offload picker already pairs n_gpu_layers:0 with
    // forceCompat; this catches the footgun of someone typing n_gpu_layers
    // straight into the load-options textarea while the picker stays on GPU,
    // which would otherwise reach the WebGPU bundle and trap mid-load. We
    // route CPU-only requests through compat and warn instead. console.warn
    // is mirrored into the /test log panel, so the warning shows in the UI.
    let effectiveForceCompat = forceCompat;
    const reqGpuLayers = loadOptionsOverride ? loadOptionsOverride.n_gpu_layers : undefined;
    if (!effectiveForceCompat && reqGpuLayers != null) {
      if (Number(reqGpuLayers) === 0) {
        console.warn(
          "[diagnostics] n_gpu_layers:0 disables GPU offload, which traps the WebGPU " +
          'bundle with a bare "unreachable". Routing this load through the CPU-only ' +
          "compat bundle (forceCompat) instead. To run CPU-only deliberately, use the " +
          "'CPU only' offload option rather than setting n_gpu_layers by hand.",
        );
        effectiveForceCompat = true;
      } else {
        console.warn(
          `[diagnostics] n_gpu_layers:${reqGpuLayers} is not honoured by the WebGPU wasm ` +
          "bundle: partial GPU offload is untested and may trap. The supported choices are " +
          "full GPU (omit n_gpu_layers) or CPU-only (the 'CPU only' offload option).",
        );
      }
    }
    const { Wllama } = await loadWllamaModule();
    // suppressNativeLog: false forwards llama.cpp/ggml stderr to the JS
    // logger (default `console`) so model load, tokeniser, and tool-call
    // traces show up in the browser devtools.
    const wllama = new Wllama(WLLAMA_PATH_CONFIG, { suppressNativeLog: false, forceCompat: effectiveForceCompat });
    // Point wllama at our locally vendored compat bundle. wllama's own
    // needCompat() picks compat at runtime when JSPI or wasm64 are
    // missing (mobile Safari, current mobile Chrome). The non-compat
    // build is still preferred where supported, this only kicks in as a
    // fallback. We pass explicit local paths instead of 'default' so
    // wllama never reaches out to the jsdelivr CDN, keeping the load
    // behaviour aligned with the privacy posture in CLAUDE.md §2.
    if (typeof wllama.setCompat === "function") wllama.setCompat(WLLAMA_COMPAT_PATHS);
    // wllama accepts either a plain URL string or a {url, mmprojUrl} pair.
    // The mmproj projector is required for vision-capable models; without
    // it the multimodal path silently degrades to text-only. When the
    // caller passes disableVision=true we deliberately drop the projector
    // so we can benchmark decode-only.
    const sourceSpec = (source.mmprojUrl && !disableVision)
      ? { url: source.url, mmprojUrl: source.mmprojUrl }
      : source.url;
    const minTok = clampImageTokens(imageMinTokens, DEFAULT_IMAGE_MIN_TOKENS);
    const maxTokRaw = clampImageTokens(imageMaxTokens, DEFAULT_IMAGE_MAX_TOKENS);
    const maxTok = Math.max(minTok, maxTokRaw);
    const baseOpts = {
      ...MODEL_RUNTIME_OPTS,
      image_min_tokens: minTok,
      image_max_tokens: maxTok,
    };
    // Diagnostic / benchmarking callers (the /test page) supply a complete
    // options object parsed from the YAML textarea. Treat it as
    // authoritative: anything they removed from the textarea must actually
    // be absent from the load call so wllama / llama.cpp falls back to its
    // own default rather than ours. Merging over baseOpts would silently
    // re-inject keys the operator deliberately deleted.
    // progressCallback is reserved by the loader below so we strip it.
    const merged = loadOptionsOverride
      ? { ...loadOptionsOverride }
      : baseOpts;
    delete merged.progressCallback;
    console.info("[diagnostics] model load starting", { loadOptions: merged, source });
    const loadStart = performance.now();
    await wllama.loadModelFromUrl(sourceSpec, {
      ...merged,
      progressCallback: ({ loaded, total }) => onProgress({ loaded, total, source }),
    });
    const postLoad = logPostLoadDiagnostics(wllama, { loadElapsedMs: performance.now() - loadStart });
    if (typeof onDiagnostics === "function") {
      try { onDiagnostics(postLoad); } catch {}
    }
    return wllama;
  })().catch((err) => {
    instancePromise = null;
    throw err;
  });
  return instancePromise;
}

export function getLoadedSource() {
  return chosenSource;
}

function buildToolSchema(type, choices) {
  const parameters = {
    type: "object",
    properties: {},
    required: ["value"],
    additionalProperties: false,
  };
  const props = parameters.properties;
  const usesSentinel = type === "multi-choice" || type === "multi-select";
  switch (type) {
    case "text":
      props.value = { type: "string", description: "Verbatim handwritten text written in the box. Set missing=true if nothing was written." };
      break;
    case "number":
      props.value = { type: "number", description: "Handwritten numeric value written in the box. Set missing=true if no number was written." };
      break;
    case "checkbox":
      props.value = { type: "boolean", description: "True only if the box is clearly ticked (cross, check, fill). False only if the box is visibly empty AND you are sure the patient saw it. If unsure or the paper looks untouched, set missing=true instead." };
      break;
    case "date":
      props.value = { type: "string", description: "Handwritten date, normalised to ISO-8601 YYYY-MM-DD. Set missing=true if no date was written." };
      break;
    case "multi-choice":
      props.value = {
        type: "string",
        enum: [MISSING_SENTINEL, ...(choices || [])],
        description: "The single choice the patient circled, ticked, or otherwise marked. Use `" + MISSING_SENTINEL + "` whenever no choice is marked, the paper is untouched, or you are not sure which one was picked. Do not guess.",
      };
      break;
    case "multi-select":
      props.value = {
        type: "array",
        description: "Every choice the patient ticked or circled. Return [`" + MISSING_SENTINEL + "`] when no choice is marked, the paper is untouched, or you are not sure. Do not include choices that are merely printed on the form.",
        items: { type: "string", enum: [MISSING_SENTINEL, ...(choices || [])] },
      };
      break;
    default:
      props.value = { type: "string" };
  }
  if (!usesSentinel) {
    props.missing = {
      type: "boolean",
      description: "Set to true whenever the patient did not answer this field: nothing handwritten, no tick, no circle, paper untouched, blank, or illegible. When true, the `value` field is ignored, so still emit a placeholder of the right type. Only set to false when you can clearly see a handwritten or marked answer.",
    };
    parameters.required = ["value", "missing"];
  }
  return {
    type: "function",
    function: {
      name: TOOL_NAME,
      description: "Record the extracted value for this survey field.",
      parameters,
      strict: true,
    },
  };
}

function buildPrompt({ header, description, type, choices }) {
  const lines = [];
  lines.push(`Field header: ${header}`);
  if (description) lines.push(`Description: ${description}`);
  lines.push(`Field type: ${type}`);
  if (Array.isArray(choices) && choices.length) {
    lines.push(`Allowed choices: ${choices.join(" | ")}`);
  }
  const sentinel = type === "multi-choice" || type === "multi-select";
  lines.push(
    "Reminder: if the patient did not answer this field (nothing written, no tick, no circle, paper untouched, blank, or illegible), " +
    (sentinel
      ? "return `" + MISSING_SENTINEL + "`."
      : "set missing=true."),
  );
  lines.push("Do not guess. MISSING is the correct answer whenever the answer is not clearly visible.");
  return lines.join("\n");
}

function parseToolCallArguments(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "tool-call-missing", raw };
  const call = Array.isArray(raw.tool_calls) ? raw.tool_calls[0] : null;
  if (!call?.function?.arguments) return { ok: false, reason: "tool-call-missing", raw };
  let args;
  try {
    args = JSON.parse(call.function.arguments);
  } catch (err) {
    return { ok: false, reason: "invalid-json", raw: call.function.arguments };
  }
  return { ok: true, args };
}

function isParseableDate(s) {
  if (typeof s !== "string" || !s) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

function validateValue(type, choices, value) {
  switch (type) {
    case "text":
      if (typeof value !== "string") return "wrong-type";
      return null;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return "non-numeric";
      return null;
    case "checkbox":
      if (typeof value !== "boolean") return "wrong-type";
      return null;
    case "date":
      if (!isParseableDate(value)) return "non-parseable-date";
      return null;
    case "multi-choice":
      if (typeof value !== "string") return "wrong-type";
      if (!choices?.includes(value)) return "out-of-choices";
      return null;
    case "multi-select":
      if (!Array.isArray(value)) return "wrong-type";
      for (const v of value) if (!choices?.includes(v)) return "out-of-choices";
      return null;
    default:
      return null;
  }
}

function interpretArgs(type, args) {
  if (type === "multi-choice") {
    if (args.value === MISSING_SENTINEL) return { missing: true };
    return { value: args.value };
  }
  if (type === "multi-select") {
    if (Array.isArray(args.value) && args.value.includes(MISSING_SENTINEL)) {
      return { missing: true };
    }
    return { value: args.value };
  }
  if (args.missing === true) return { missing: true };
  return { value: args.value };
}

// Accumulate streaming deltas into an OpenAI-shaped assistant message
// the existing tool-call parser can consume, and into a single visible
// text stream for the UI. Text deltas come through `delta.content`;
// reasoning deltas (Qwen3 / DeepSeek thinking mode) arrive on
// `delta.reasoning_content` and are folded into the visible stream so
// the live panel never goes blank while the model is mid-think;
// tool-call argument deltas arrive as string fragments under
// `delta.tool_calls[].function.{name,arguments}`. The visible stream
// concatenates reasoning, content, and arguments in arrival order so a
// debugger sees exactly what the model is producing, including any
// `<think>` markers the chat template leaves in the text.
function makeStreamAccumulator() {
  const message = { role: "assistant", content: "", reasoning: "", tool_calls: [] };
  let visible = "";
  let chunks = 0;
  let firstTokenAt = null;
  return {
    message,
    get visible() { return visible; },
    get chunks() { return chunks; },
    get firstTokenAt() { return firstTokenAt; },
    handleChunk(chunk, onToken) {
      const delta = chunk?.choices?.[0]?.delta;
      if (!delta) return;
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
      return added;
    },
  };
}

// Watch the stream for runaway repetition. Some quantised models, when
// the tool-call path goes wrong, lock into emitting the same token (or
// short n-gram) over and over until max_tokens runs out, which costs
// minutes of wall time per box and produces no usable output anyway.
// Each `push(chunk)` tracks the chunk-level tail (chunks roughly equal
// tokens under wllama's streaming) and trips when the same unigram,
// bigram, or trigram has just repeated consecutively past a threshold.
export function makeRepetitionDetector({
  unigram = 12,
  bigram = 8,
  trigram = 6,
} = {}) {
  const tail = [];
  const need = Math.max(unigram, bigram * 2, trigram * 3);
  function tailRepeats(stride, count) {
    if (tail.length < stride * count) return false;
    const start = tail.length - stride * count;
    for (let i = 0; i < stride; i += 1) {
      const ref = tail[start + i];
      if (!ref) return false;
      for (let k = 1; k < count; k += 1) {
        if (tail[start + k * stride + i] !== ref) return false;
      }
    }
    return true;
  }
  return {
    push(text) {
      if (!text) return null;
      tail.push(text);
      if (tail.length > need + 4) tail.splice(0, tail.length - (need + 4));
      if (tailRepeats(1, unigram)) {
        return { pattern: "unigram", fragment: tail.slice(-unigram).join(""), count: unigram };
      }
      if (tailRepeats(2, bigram)) {
        return { pattern: "bigram", fragment: tail.slice(-bigram * 2).join(""), count: bigram };
      }
      if (tailRepeats(3, trigram)) {
        return { pattern: "trigram", fragment: tail.slice(-trigram * 3).join(""), count: trigram };
      }
      return null;
    },
  };
}

// Tear down the loaded wllama instance and free its workers. Safe to
// call multiple times: the second call sees a nulled instancePromise
// and is a no-op. Used by the page-unload hook and the user-driven
// Cancel button.
export async function shutdown() {
  if (!instancePromise) return;
  const p = instancePromise;
  instancePromise = null;
  chosenSource = null;
  try {
    const inst = await p;
    if (inst && typeof inst.exit === "function") await inst.exit();
  } catch {
    // Already failing or torn down: nothing to do.
  }
}

export async function inferBox({
  cropBlob,
  header,
  description,
  type,
  choices,
  wllama,
  maxTokens = MAX_OUTPUT_TOKENS,
  onToken,
  onPrompt,
  abortSignal,
  timeoutSeconds = 300,
  samplingParams = null,
}) {
  if (!wllama) throw new Error("inferBox requires a loaded wllama instance");
  // Combine an externally-supplied AbortSignal (cancel button, page
  // unload) with a per-call timeout. wllama's stream honours one signal,
  // so we merge them into a fresh controller and abort it when either
  // source fires.
  const localController = new AbortController();
  let timedOut = false;
  let canceled = false;
  const onExternalAbort = () => {
    canceled = true;
    localController.abort();
  };
  if (abortSignal) {
    if (abortSignal.aborted) onExternalAbort();
    else abortSignal.addEventListener("abort", onExternalAbort, { once: true });
  }
  const timeoutMs = Math.max(1, Math.floor(timeoutSeconds * 1000));
  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    localController.abort();
  }, timeoutMs);
  const imageData = await cropBlob.arrayBuffer();
  const tool = buildToolSchema(type, choices);
  const prompt = buildPrompt({ header, description, type, choices });
  const accumulator = makeStreamAccumulator();
  const repetitionDetector = makeRepetitionDetector();
  let repetitionTrip = null;
  // samplingParams entries set to the string "model_default" are dropped
  // entirely (key removed from completionOpts even if we hardcoded one),
  // so wllama / llama.cpp falls back to its own default for that key.
  // Used by the /test diagnostic page to let the operator opt out of any
  // single parameter without having to know its baked-in value.
  const sp = (samplingParams && typeof samplingParams === "object") ? samplingParams : {};
  const samplingDrop = new Set();
  const samplingApply = {};
  for (const [k, v] of Object.entries(sp)) {
    if (v === "model_default") samplingDrop.add(k);
    else samplingApply[k] = v;
  }
  const completionOpts = {
    messages: [
      { role: "system", content: SYSTEM_INTRO },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image", data: imageData },
        ],
      },
    ],
    tools: [tool],
    // wllama's underlying llama.cpp expects `tool_choice` as a plain
    // string ("auto" | "none" | "required"); the OpenAI-style object
    // form triggers a [json.exception.type_error.302] warning and the
    // field silently falls back to "auto". Only one tool is registered
    // per call, so "required" is equivalent to forcing this tool.
    tool_choice: "required",
    max_tokens: maxTokens,
    temperature: 0.7,
    ...samplingApply,
    // Stream so the UI can show live progress and operators can tell a
    // slow model apart from a hung worker. Each chunk is an
    // OpenAI-shaped ChatCompletionChunk with `choices[0].delta`.
    // wllama's stream mode returns an async iterator that we must drive
    // to completion: it only awaits the *creation* of the generator,
    // not the underlying inference.
    stream: true,
    abortSignal: localController.signal,
  };
  for (const k of samplingDrop) delete completionOpts[k];
  try {
    // Surface the assembled messages to the caller before the request
    // goes out so a diagnostic UI can render the full prompt (system +
    // user, with the image announced as a placeholder) above the
    // live-streaming response.
    if (typeof onPrompt === "function") {
      try { onPrompt(completionOpts.messages); } catch {}
    }
    const stream = await wllama.createChatCompletion(completionOpts);
    for await (const chunk of stream) {
      const added = accumulator.handleChunk(chunk, onToken);
      const trip = repetitionDetector.push(added);
      if (trip) {
        repetitionTrip = trip;
        localController.abort();
        break;
      }
    }
  } catch (err) {
    if (repetitionTrip) {
      // fall through to the post-loop handler so stats are still attached
    } else if (timedOut) {
      return { ok: false, reason: "timeout", raw: `Aborted after ${timeoutSeconds}s.` };
    } else if (canceled) {
      const e = new Error("cancelled");
      e.name = "AbortError";
      throw e;
    } else {
      return { ok: false, reason: "inference-error", raw: String(err?.message || err) };
    }
  } finally {
    clearTimeout(timeoutHandle);
    if (abortSignal) abortSignal.removeEventListener("abort", onExternalAbort);
  }
  // In stream mode wllama hands the deltas off via onData and returns
  // the trailing chunk, not a full assistant message. Reconstruct one
  // from what we accumulated and feed it to the existing parser.
  const message = accumulator.message;
  const stats = { chunks: accumulator.chunks, firstTokenAt: accumulator.firstTokenAt };
  if (repetitionTrip) {
    return {
      ok: false,
      reason: "repetition-gibberish",
      raw: `Aborted after ${repetitionTrip.count}x ${repetitionTrip.pattern} repetition of ${JSON.stringify(repetitionTrip.fragment)}.`,
      stats,
    };
  }
  const hasToolCall = message.tool_calls.length && message.tool_calls[0]?.function?.arguments;
  if (!hasToolCall && !message.content) {
    return { ok: false, reason: "no-message", raw: accumulator.visible || null, stats };
  }
  const parsed = parseToolCallArguments(message);
  if (!parsed.ok) return { ...parsed, stats };
  const interpreted = interpretArgs(type, parsed.args);
  if (interpreted.missing) return { ok: true, missing: true, raw: parsed.args, stats };
  const validation = validateValue(type, choices, interpreted.value);
  if (validation) return { ok: false, reason: validation, raw: parsed.args, stats };
  return { ok: true, value: interpreted.value, stats };
}
