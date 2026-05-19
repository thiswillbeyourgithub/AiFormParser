// Loads eruda (mobile devtools) on every page, in either of two modes:
//   A. Phone + admin: the browser looks like a phone or small touch device
//      AND localStorage flag "afp_eruda_enabled" is "1" (set when a session
//      successfully reaches /admin, cleared on /admin/login).
//   B. Explicit override: the URL contains "?debug=1" (or "&debug=1"). This
//      bypasses both the phone check and the admin flag so the devtools can
//      be opened on any page from any device.
//
// "Looks like a phone" used to be a strict Android UA match. That missed
// iOS, Samsung Internet quirks, and any browser running in desktop-site
// mode. The check is now an OR across UA tokens, touch capability, and
// viewport size, with a console log explaining each skip so it is
// debuggable from the device itself.

const FLAG_KEY = "afp_eruda_enabled";
const DEBUG_PARAM = "debug";

function looksLikePhone() {
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return true;
  if (/iPhone|iPod/i.test(ua)) return true;
  // iPadOS 13+ reports as desktop Safari. Treat any touch-capable Mac as
  // an iPad in disguise.
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  // Catch-all for desktop-site mode and less common phones: coarse
  // pointer (touch) + narrow viewport.
  const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  if (coarse && window.innerWidth <= 900) return true;
  return false;
}

function isEnabled() {
  try {
    return localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function hasDebugQuery() {
  try {
    return new URLSearchParams(window.location.search).get(DEBUG_PARAM) === "1";
  } catch {
    return false;
  }
}

const debugOverride = hasDebugQuery();

if (!debugOverride && !looksLikePhone()) {
  console.info("[eruda] skipped: not detected as a phone (UA=" + (navigator.userAgent || "") + "). Append ?debug=1 to force-enable.");
} else if (!debugOverride && !isEnabled()) {
  console.info("[eruda] skipped: localStorage flag '" + FLAG_KEY + "' not set. Visit /admin and log in on this device to enable, or append ?debug=1 to the URL.");
} else {
  if (debugOverride) console.info("[eruda] ?debug=1 override active");
  console.info("[eruda] loading...");
  const script = document.createElement("script");
  script.src = "/static/vendor/eruda/eruda.js";
  script.onload = () => {
    if (window.eruda && typeof window.eruda.init === "function") {
      window.eruda.init();
      console.info("[eruda] initialised");
    } else {
      console.warn("[eruda] script loaded but window.eruda missing");
    }
  };
  script.onerror = (e) => {
    console.error("[eruda] failed to load /static/vendor/eruda/eruda.js", e);
  };
  document.head.appendChild(script);
}
