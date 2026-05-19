const LOCK_NAME = "aifp-active-tab";
const MODAL_ID = "single-tab-guard-modal";

let releaseLock = null;

function acquireLock() {
  return new Promise((resolve) => {
    navigator.locks.request(LOCK_NAME, { ifAvailable: true }, (lock) => {
      if (lock) {
        resolve(true);
        return new Promise((release) => {
          releaseLock = release;
        });
      }
      resolve(false);
      return null;
    });
  });
}

function buildModal() {
  const overlay = document.createElement("div");
  overlay.id = MODAL_ID;
  overlay.className = "modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", `${MODAL_ID}-title`);
  overlay.innerHTML = `
    <div class="modal-panel">
      <h2 id="${MODAL_ID}-title">Another AiFormParser tab is open</h2>
      <p>
        Running AiFormParser in multiple tabs at once will load several
        copies of the OCR engine and the LLM into your browser. That can
        freeze this page, exhaust memory, and produce wrong results.
      </p>
      <p class="muted">
        Close the other tab and reload this one, or continue anyway if
        you know what you are doing.
      </p>
      <div class="modal-actions">
        <button type="button" class="secondary" data-action="continue">Continue anyway</button>
        <button type="button" data-action="reload">Reload this tab</button>
      </div>
    </div>
  `;
  overlay.addEventListener("click", (e) => {
    const action = e.target?.dataset?.action;
    if (action === "reload") {
      window.location.reload();
    } else if (action === "continue") {
      overlay.remove();
    }
  });
  return overlay;
}

function showModal() {
  if (document.getElementById(MODAL_ID)) return;
  document.body.appendChild(buildModal());
}

function dismissModal() {
  document.getElementById(MODAL_ID)?.remove();
}

async function init() {
  if (typeof navigator === "undefined" || !navigator.locks) return;
  const acquired = await acquireLock();
  if (acquired) {
    dismissModal();
  } else {
    showModal();
  }
}

// Release the lock when this page is hidden so intra-tab navigation
// (and bfcache eviction) does not look like a second tab to the next page.
window.addEventListener("pagehide", () => {
  if (releaseLock) {
    releaseLock();
    releaseLock = null;
  }
});

// Restored from bfcache: the lock was released on pagehide, so re-acquire.
window.addEventListener("pageshow", (e) => {
  if (e.persisted) init();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
