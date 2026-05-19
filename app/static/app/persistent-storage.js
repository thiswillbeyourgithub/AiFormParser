// Ask the browser to mark our origin's storage as persistent so the
// wllama OPFS cache (multi-GB GGUFs) does not get evicted under disk
// pressure. Without this, every visit can redownload the model.
//
// Browser behaviour (Storage Standard):
// - Chromium grants silently based on engagement heuristics (bookmarked,
//   installed as PWA, notification permission, etc); no prompt is shown.
// - Firefox prompts the user once; the answer is remembered.
// - Safari treats storage as session-only unless installed as a PWA, so
//   persist() typically resolves false there.
//
// Failure to obtain persistence is non-fatal: the cache still works for
// the current session, the user may just have to redownload later. We
// log the resulting quota / usage so operators can tell at a glance
// whether the model is actually pinned on disk.

export async function requestPersistentStorage() {
  const out = { available: false, persisted: null, quotaMb: null, usageMb: null };
  if (typeof navigator === "undefined" || !navigator.storage) {
    console.info("[storage] navigator.storage unavailable; model cache may be evicted");
    return out;
  }
  out.available = true;
  try {
    out.persisted = await navigator.storage.persisted();
  } catch (_) {
    out.persisted = null;
  }
  if (!out.persisted && typeof navigator.storage.persist === "function") {
    try {
      out.persisted = await navigator.storage.persist();
    } catch (err) {
      out.error = err?.message || String(err);
    }
  }
  try {
    const est = await navigator.storage.estimate();
    if (est.quota != null) out.quotaMb = Math.round(est.quota / 1048576);
    if (est.usage != null) out.usageMb = Math.round(est.usage / 1048576);
  } catch (_) { /* estimate is best-effort */ }
  console.info("[storage] persistent storage state", out);
  if (out.persisted === false) {
    console.warn(
      "[storage] storage is NOT persistent; the browser may evict cached " +
      "model weights and force a redownload. On Chromium, persistence is " +
      "usually granted automatically once the site is bookmarked or installed.",
    );
  }
  return out;
}
