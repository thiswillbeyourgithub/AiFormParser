// Browser-side runtime diagnostics, dumped to the console right before
// the wllama model loads. The goal is to make "why is this machine
// slower than that one" answerable from devtools alone: hardware,
// browser capabilities, WASM feature set, WebGPU adapter identity, and
// the load-time knobs wllama is about to receive.
//
// Everything here runs in the page (not in a worker), uses no patient
// data, and never leaves the device. The output goes through
// `console.group` so the user can collapse the block once they have
// copied it.

import { checkCapabilities } from "/static/app/smoke.js";

// Standalone WASM feature probes. SIMD/threads already live in
// smoke.js; the rest are cheap byte-level validates that catch
// differences between Chromium/Firefox/Safari builds without pulling
// in another dependency.
function validateWasm(bytes) {
  try { return WebAssembly.validate(new Uint8Array(bytes)); } catch (_) { return false; }
}

function detectBulkMemory() {
  // memory.copy opcode (0xfc 0x0a) inside a tiny module body. Section length
  // is 14 and body length is 12; earlier numbers (11 / 9) were short and made
  // every engine reject the module as malformed regardless of feature support.
  return validateWasm([
    0, 97, 115, 109, 1, 0, 0, 0,
    1, 4, 1, 96, 0, 0,
    3, 2, 1, 0,
    5, 3, 1, 0, 1,
    10, 14, 1, 12, 0, 65, 0, 65, 0, 65, 0, 252, 10, 0, 0, 11,
  ]);
}

function detectExceptions() {
  // Canonical wasm-feature-detect probe: a legacy (try ... rethrow ... end)
  // body. No tag section, so the previous bug (a tag section with id 13
  // placed before the function section id 3, violating the "section IDs
  // ascend" rule) is gone and the module validates on engines that ship the
  // exception-handling proposal.
  return validateWasm([
    0, 97, 115, 109, 1, 0, 0, 0,
    1, 4, 1, 96, 0, 0,
    3, 2, 1, 0,
    10, 8, 1, 6, 0, 6, 64, 25, 11, 11,
  ]);
}

function detectJSPI() {
  // wllama uses this to decide whether the asyncify "compat" build is needed.
  return typeof WebAssembly !== "undefined"
    && typeof WebAssembly.Suspending === "function";
}

function detectMemory64() {
  // memtype with the 64-bit flag (0x04) set. wllama also gates compat on this.
  return validateWasm([
    0, 97, 115, 109, 1, 0, 0, 0,
    5, 4, 1, 4, 1, 1,
  ]);
}

function browserInfo() {
  const nav = typeof navigator !== "undefined" ? navigator : {};
  const uaData = nav.userAgentData || null;
  const info = {
    userAgent: nav.userAgent || "(unavailable)",
    platform: uaData?.platform || nav.platform || "(unavailable)",
    mobile: typeof uaData?.mobile === "boolean" ? uaData.mobile : null,
    brands: Array.isArray(uaData?.brands)
      ? uaData.brands.map((b) => `${b.brand} ${b.version}`).join(", ")
      : null,
    languages: Array.isArray(nav.languages) ? nav.languages.join(", ") : nav.language || null,
    hardwareConcurrency: nav.hardwareConcurrency ?? null,
    deviceMemoryGb: nav.deviceMemory ?? null,
    crossOriginIsolated: typeof window !== "undefined" ? !!window.crossOriginIsolated : false,
    sharedArrayBuffer: typeof SharedArrayBuffer === "function",
  };
  // Chromium-only: performance.memory. Useful to spot a JS heap already
  // half-eaten by an earlier tab session before the model is loaded.
  const pm = (typeof performance !== "undefined" && performance.memory) || null;
  if (pm) {
    info.jsHeapLimitMb = Math.round(pm.jsHeapSizeLimit / 1048576);
    info.jsHeapUsedMb = Math.round(pm.usedJSHeapSize / 1048576);
  }
  return info;
}

function wasmFeatureInfo(caps) {
  return {
    wasm: caps.wasm,
    simd: caps.simd,
    threads: caps.threads,
    bulkMemory: detectBulkMemory(),
    exceptions: detectExceptions(),
    jspi: detectJSPI(),
    memory64: detectMemory64(),
  };
}

// WebGPU adapter probe. This is what tells us whether the laptop is
// actually wired up for GPU offload: a missing adapter, a CPU fallback
// (`isFallbackAdapter: true`), or a software backend in `description`
// all explain why a beefy machine ends up slower than a phone.
async function webgpuInfo() {
  if (typeof navigator === "undefined" || !navigator.gpu) {
    return { available: false, reason: "navigator.gpu missing" };
  }
  let adapter = null;
  try {
    adapter = await navigator.gpu.requestAdapter();
  } catch (err) {
    return { available: false, reason: `requestAdapter threw: ${err?.message || err}` };
  }
  if (!adapter) return { available: false, reason: "requestAdapter returned null" };
  const out = {
    available: true,
    isFallbackAdapter: !!adapter.isFallbackAdapter,
    features: Array.from(adapter.features || []).sort(),
  };
  // adapter.info is the modern API; requestAdapterInfo() the older fallback.
  let adapterInfo = adapter.info || null;
  if (!adapterInfo && typeof adapter.requestAdapterInfo === "function") {
    try { adapterInfo = await adapter.requestAdapterInfo(); } catch (_) { /* ignore */ }
  }
  if (adapterInfo) {
    out.vendor = adapterInfo.vendor || null;
    out.architecture = adapterInfo.architecture || null;
    out.device = adapterInfo.device || null;
    out.description = adapterInfo.description || null;
  }
  // A handful of limits that actually matter for LLM compute kernels.
  if (adapter.limits) {
    out.limits = {
      maxBufferSize: adapter.limits.maxBufferSize ?? null,
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize ?? null,
      maxComputeWorkgroupSizeX: adapter.limits.maxComputeWorkgroupSizeX ?? null,
      maxComputeInvocationsPerWorkgroup: adapter.limits.maxComputeInvocationsPerWorkgroup ?? null,
    };
  }
  return out;
}

// Best-effort battery / power state. Some browsers gate this behind a
// permission; others have dropped the API entirely. A 0.0 charge level
// or a `charging: false` on a laptop sometimes correlates with the OS
// putting the CPU into a low-power state, which is exactly the kind of
// surprise we want surfaced.
async function batteryInfo() {
  if (typeof navigator === "undefined" || typeof navigator.getBattery !== "function") {
    return { available: false };
  }
  try {
    const b = await navigator.getBattery();
    return {
      available: true,
      charging: b.charging,
      level: b.level,
    };
  } catch (_) {
    return { available: false };
  }
}

export async function logRuntimeDiagnostics({ loadOptions, source } = {}) {
  const caps = checkCapabilities();
  const browser = browserInfo();
  const wasm = wasmFeatureInfo(caps);
  const [gpu, battery] = await Promise.all([webgpuInfo(), batteryInfo()]);

  const verdict = [];
  if (!caps.simd) verdict.push("SIMD missing: WASM inference will be much slower");
  if (!caps.threads) verdict.push("WASM threads disabled: wllama will run single-threaded");
  if (!gpu.available) verdict.push(`WebGPU unavailable (${gpu.reason}): GPU offload disabled`);
  else if (gpu.isFallbackAdapter) verdict.push("WebGPU adapter is a CPU/software fallback: expect no GPU speedup");
  if (browser.hardwareConcurrency && browser.hardwareConcurrency < 4) {
    verdict.push(`Only ${browser.hardwareConcurrency} logical cores reported`);
  }

  try { console.groupCollapsed("[diagnostics] runtime acceleration snapshot"); } catch (_) {}
  console.info("[diagnostics] browser", browser);
  console.info("[diagnostics] wasm features", wasm);
  console.info("[diagnostics] webgpu", gpu);
  console.info("[diagnostics] battery", battery);
  console.info("[diagnostics] planned load options", loadOptions || null);
  if (source) {
    console.info("[diagnostics] model source", {
      name: source.name,
      url: source.url,
      mmprojUrl: source.mmprojUrl || null,
    });
  }
  if (verdict.length) {
    console.warn("[diagnostics] heads-up:\n  - " + verdict.join("\n  - "));
  } else {
    console.info("[diagnostics] all acceleration paths look healthy");
  }
  try { console.groupEnd(); } catch (_) {}

  return { caps, browser, wasm, gpu, battery, verdict };
}

// Post-load summary: what wllama actually settled on. Useful when the
// pre-load plan said "use 7 threads" but wllama silently dropped to 1
// because the multi-thread build did not initialise, or when the model
// metadata reveals a context size or layer count that differs from
// what the user expected.
export function logPostLoadDiagnostics(wllama, { loadElapsedMs } = {}) {
  if (!wllama) return null;
  const out = {};
  try { out.multithread = wllama.isMultithread(); } catch (_) { out.multithread = null; }
  try { out.numThreads = wllama.getNumThreads(); } catch (_) { out.numThreads = null; }
  try { out.webgpuReported = wllama.isSupportWebGPU(); } catch (_) { out.webgpuReported = null; }
  // Which wllama bundle actually loaded: the compat (ASYNCIFY, CPU-only,
  // no WebGPU) bundle or the main (WebGPU/JSPI/memory64) bundle. wllama
  // sets this.useCompat at load time covering both the automatic fallback
  // and the forceCompat override.
  out.compat = (typeof wllama.useCompat === "boolean") ? wllama.useCompat : null;
  try {
    const meta = wllama.getModelMetadata();
    out.modelMetadata = meta && {
      hparams: meta.hparams || null,
      meta: meta.meta || null,
    };
  } catch (_) {
    out.modelMetadata = null;
  }
  if (typeof loadElapsedMs === "number") out.loadElapsedMs = Math.round(loadElapsedMs);
  // Prominent, unmissable line so the active bundle is obvious at a glance
  // in the console without expanding the structured object above.
  if (out.compat === true) {
    console.warn("[diagnostics] >>> wllama running on the COMPAT bundle (ASYNCIFY, CPU-only, NO WebGPU) <<<");
  } else if (out.compat === false) {
    console.info("[diagnostics] >>> wllama running on the MAIN bundle (WebGPU / JSPI / memory64) <<<");
  } else {
    console.warn("[diagnostics] >>> wllama bundle UNKNOWN (instance did not report useCompat) <<<");
  }
  console.info("[diagnostics] wllama post-load", out);
  return out;
}
