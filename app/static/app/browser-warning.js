const BANNER_ID = "browser-warning-banner";
const DISMISS_KEY = "aifp-browser-warning-dismissed";
const COMPAT_URL = "https://github.com/ngxson/wllama/blob/master/compat/README.md";

function detectNonChromium() {
  const ua = navigator.userAgent || "";
  if (/Firefox\/|FxiOS\//.test(ua)) return "Firefox";
  if (/CriOS\/|EdgiOS\//.test(ua)) return "iOS WebKit";
  if (/Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg\/|OPR\//.test(ua)) {
    return "Safari";
  }
  return null;
}

function buildBanner(name) {
  const div = document.createElement("div");
  div.id = BANNER_ID;
  div.className = "status-banner warn";
  div.setAttribute("role", "alert");
  div.style.margin = "0";
  div.style.borderRadius = "0";
  div.style.display = "flex";
  div.style.alignItems = "center";
  div.style.gap = "1rem";
  div.style.padding = "0.5rem 2rem";

  const text = document.createElement("span");
  text.style.flex = "1 1 auto";
  text.innerHTML =
    `You are using <strong>${name}</strong>. ` +
    `wllama (the in-browser LLM runtime) runs noticeably slower or in a degraded ` +
    `compatibility mode outside Chromium. For best results please switch to a ` +
    `Chromium-based browser (Chromium, Chrome, Brave, Edge, Opera). ` +
    `See the <a href="${COMPAT_URL}" target="_blank" rel="noopener">wllama compatibility notes</a>.`;

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "secondary";
  dismiss.textContent = "Dismiss";
  dismiss.addEventListener("click", () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch (_) {}
    div.remove();
  });

  div.appendChild(text);
  div.appendChild(dismiss);
  return div;
}

function init() {
  try {
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
  } catch (_) {}
  const name = detectNonChromium();
  if (!name) return;
  if (document.getElementById(BANNER_ID)) return;
  const banner = buildBanner(name);
  document.body.insertBefore(banner, document.body.firstChild);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
