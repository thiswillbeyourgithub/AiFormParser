// Screen Wake Lock helper. Keeps the screen awake (and, on most OSes,
// the machine from suspending) while a long-running local job like the
// LLM pipeline is in flight. This is the only sleep-prevention lever a
// browser exposes; there is no API to block OS suspend directly.
//
// Two safety rails:
//   - A hard cap (default 1h) auto-releases the lock so a stuck or
//     forgotten pipeline cannot pin the screen on forever.
//   - The lock is re-acquired on visibilitychange, because the browser
//     silently drops it whenever the tab is hidden or the device locks.
//
// Acquisition is reference-counted so nested or overlapping callers
// share a single underlying sentinel; the lock only really releases
// once every holder has called release().

const DEFAULT_MAX_MS = 60 * 60 * 1000; // 1 hour

let sentinel = null;       // the active WakeLockSentinel, or null
let holders = 0;           // outstanding acquire() calls not yet released
let capTimer = null;       // hard-cap timeout handle
let visibilityBound = false;

function supported() {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

async function requestSentinel() {
  if (sentinel) return;
  try {
    sentinel = await navigator.wakeLock.request("screen");
    // The browser releases the lock on tab-hide; null our handle so a
    // later re-acquire knows it must request a fresh one.
    sentinel.addEventListener("release", () => {
      sentinel = null;
    });
  } catch (err) {
    // NotAllowedError (tab hidden, low battery, policy) is non-fatal:
    // the pipeline still runs, the screen just may sleep.
    console.warn("[wake-lock] request failed:", err?.message || err);
    sentinel = null;
  }
}

async function onVisibilityChange() {
  if (holders > 0 && document.visibilityState === "visible" && !sentinel) {
    await requestSentinel();
  }
}

function bindVisibility() {
  if (visibilityBound || typeof document === "undefined") return;
  document.addEventListener("visibilitychange", onVisibilityChange);
  visibilityBound = true;
}

async function dropSentinel() {
  if (capTimer) {
    clearTimeout(capTimer);
    capTimer = null;
  }
  if (sentinel) {
    try {
      await sentinel.release();
    } catch {
      // already gone; ignore
    }
    sentinel = null;
  }
}

/**
 * Acquire a screen wake lock. Returns a release function; call it (or the
 * returned handle's release()) when the work is done. The lock is held until
 * every acquirer releases, or `maxMs` elapses, whichever comes first.
 *
 * @param {{ maxMs?: number }} [opts]
 * @returns {Promise<{ release: () => Promise<void>, supported: boolean }>}
 */
export async function acquireWakeLock({ maxMs = DEFAULT_MAX_MS } = {}) {
  if (!supported()) {
    console.info("[wake-lock] Screen Wake Lock API unavailable; screen may sleep during processing.");
    return { release: async () => {}, supported: false };
  }

  holders += 1;
  bindVisibility();
  await requestSentinel();

  // Arm the hard cap on the first holder so the longest possible hold is
  // bounded regardless of how the pipeline behaves.
  if (holders === 1 && !capTimer) {
    capTimer = setTimeout(() => {
      console.info(`[wake-lock] ${Math.round(maxMs / 60000)}min cap reached; releasing screen lock.`);
      holders = 0;
      dropSentinel();
    }, maxMs);
  }

  let released = false;
  const release = async () => {
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    if (holders === 0) {
      if (capTimer) {
        clearTimeout(capTimer);
        capTimer = null;
      }
      await dropSentinel();
    }
  };

  return { release, supported: true };
}
