// Anchor self-test for the admin survey editor.
//
// Two passes per page:
//
//   1. Identity self-test. Feeds each template page's own ocr_tokens
//      back through the anchor matcher (app/static/app/user-anchor.js)
//      as if they were the user image's OCR output. Template == user,
//      so every block should match itself, the affine fit should be
//      ~identity, and every box should round-trip to its original
//      bbox. Any deviation predicts the same kind of failure on real
//      user uploads.
//   2. Warp self-test. Applies a handful of synthetic affine warps
//      (scale + rotation + lateral offset, around the page centre) to
//      the page's ocr_tokens, feeds the warped tokens to the matcher,
//      and compares each recovered box bbox against the ground-truth
//      warped bbox. This stresses the page-level affine fit on the
//      shape of distortion a real scan typically introduces (a scanner
//      crop is slightly different in size, slightly rotated, and
//      offset).
//
// Outputs a structured report so the orchestrator (admin.js) can render
// it inline and gate Save with a force-save override.
//
// Thresholds match the matcher's own tolerances loosely: the identity
// self-test should be essentially exact, so even small drift is
// suspicious. The warp self-test uses a looser tolerance to allow for
// the per-anchor noise that the affine least-squares fit smooths out.

import { matchPage } from "/static/app/user-anchor.js";

const DRIFT_WARN_PX = 2;
const RMS_WARN_PX = 1;
const MIN_BLOCKS_FOR_AFFINE = 3;

const WARP_DRIFT_WARN_PX = 8;
const WARP_RMS_WARN_PX = 4;

// Synthetic warps to stress-test the matcher against realistic scan
// distortion. Each scenario combines a uniform scale, a rotation (in
// degrees, around the page centre), and a lateral offset in pixels.
// Keep this list short: every scenario rebuilds the OCR stream and
// runs the matcher, so 4 covers the corners (shrink/grow, rotation
// sign, translation magnitude) without bloating the precheck runtime.
const WARP_SCENARIOS = [
  { name: "shrink+rotate+shift", scale: 0.85, rotationDeg: -8, dx: 50, dy: -30 },
  { name: "grow+rotate+shift", scale: 1.15, rotationDeg: 8, dx: -40, dy: 60 },
  { name: "rotation-heavy+shift", scale: 1.02, rotationDeg: 15, dx: 20, dy: 20 },
  { name: "shift-heavy", scale: 1.0, rotationDeg: 2, dx: 150, dy: -100 },
];

function centre(bbox) {
  return [bbox[0] + bbox[2] / 2, bbox[1] + bbox[3] / 2];
}

function centreDrift(a, b) {
  const [ax, ay] = centre(a);
  const [bx, by] = centre(b);
  return Math.hypot(ax - bx, ay - by);
}

// Build the same shape the user pipeline emits, from a template page's
// stored ocrTokens. The matcher only reads { text, bbox } per token, so
// we drop confidence to keep the input minimal.
function selfOcr(page) {
  return {
    ocrTokens: (page.ocrTokens || []).map((t) => ({ text: t.text, bbox: t.bbox })),
  };
}

// Build an affine transform that rotates by thetaRad and scales by
// `scale` around (cx, cy), then translates by (dx, dy). Expressed as
// the same { a, b, c, d, tx, ty } shape that user-anchor.js produces,
// so applyWarp matches applyAffine.
function buildWarp({ scale, rotationDeg, dx, dy }, cx, cy) {
  const theta = (rotationDeg * Math.PI) / 180;
  const cs = Math.cos(theta);
  const sn = Math.sin(theta);
  const a = scale * cs;
  const b = -scale * sn;
  const c = scale * sn;
  const d = scale * cs;
  return {
    a,
    b,
    c,
    d,
    tx: cx + dx - a * cx - b * cy,
    ty: cy + dy - c * cx - d * cy,
  };
}

function applyWarp(W, [x, y]) {
  return [W.a * x + W.b * y + W.tx, W.c * x + W.d * y + W.ty];
}

// Axis-aligned bbox of the four warped corners. Matches the convention
// user-anchor.js's transformBoxAffine uses, so a warped ground-truth
// bbox is directly comparable to the matcher's output.
function warpBboxAA(W, [x, y, w, h]) {
  const corners = [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ].map((p) => applyWarp(W, p));
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const x1 = Math.max(...xs);
  const y1 = Math.max(...ys);
  return [x0, y0, x1 - x0, y1 - y0];
}

function warpedOcr(page, W) {
  return {
    ocrTokens: (page.ocrTokens || []).map((t) => ({
      text: t.text,
      bbox: warpBboxAA(W, t.bbox),
    })),
  };
}

function runWarpScenario(page, scenario) {
  const cx = (page.width || 0) / 2;
  const cy = (page.height || 0) / 2;
  const W = buildWarp(scenario, cx, cy);
  const { transformBox, diagnostics } = matchPage(page, warpedOcr(page, W));

  const result = {
    name: scenario.name,
    scale: scenario.scale,
    rotationDeg: scenario.rotationDeg,
    dx: scenario.dx,
    dy: scenario.dy,
    mode: diagnostics.mode,
    rms: diagnostics.rms,
    matchedBlocks: diagnostics.matchedBlocks,
    anchorPairs: diagnostics.anchorPairs,
    worstDriftPx: 0,
    worstBoxId: null,
    severity: null,
    message: null,
  };

  let worst = -1;
  let worstId = null;
  for (const box of page.boxes) {
    const truth = warpBboxAA(W, box.bbox);
    const got = transformBox(box.bbox);
    const drift = centreDrift(got.bbox, truth);
    if (drift > worst) {
      worst = drift;
      worstId = box.id;
    }
  }
  if (worst >= 0) {
    result.worstDriftPx = worst;
    result.worstBoxId = worstId;
  }

  if (page.boxes.length && diagnostics.mode === "no-anchor") {
    result.severity = "warn";
    result.message = "Matcher could not anchor warped tokens. The page will likely fail under a real scan.";
  } else if (page.boxes.length && diagnostics.mode !== "affine") {
    result.severity = "warn";
    result.message = `Matcher fell back to ${diagnostics.mode} on this warp; affine recovery failed.`;
  } else if (typeof diagnostics.rms === "number" && diagnostics.rms > WARP_RMS_WARN_PX) {
    result.severity = "warn";
    result.message = `Affine RMS ${diagnostics.rms.toFixed(2)} px exceeds ${WARP_RMS_WARN_PX} px on this warp.`;
  } else if (worst > WARP_DRIFT_WARN_PX) {
    result.severity = "warn";
    result.message = `Worst box centre drift ${worst.toFixed(2)} px (box ${worstId}) exceeds ${WARP_DRIFT_WARN_PX} px.`;
  }

  return result;
}

export function runPrecheck(state) {
  const report = { ok: true, hasWarn: false, pages: [] };

  for (const page of state.pages) {
    const blockCount = (page.ocrBlocks || []).length;
    const tokenCount = (page.ocrTokens || []).length;
    const boxCount = page.boxes.length;

    const { transformBox, diagnostics } = matchPage(page, selfOcr(page));

    const pageReport = {
      pageIndex: page.index,
      mode: diagnostics.mode,
      rms: diagnostics.rms,
      matchedBlocks: diagnostics.matchedBlocks,
      anchorPairs: diagnostics.anchorPairs,
      blockCount,
      tokenCount,
      boxCount,
      issues: [],
      boxes: [],
      hasError: false,
      hasWarn: false,
    };

    if (!boxCount) {
      pageReport.issues.push({
        severity: "warn",
        code: "no-boxes",
        message: "No boxes drawn on this page.",
      });
    }
    if (!tokenCount) {
      pageReport.issues.push({
        severity: "error",
        code: "no-ocr",
        message: "No OCR tokens captured. Re-run OCR on this page.",
      });
    } else if (!blockCount) {
      pageReport.issues.push({
        severity: "error",
        code: "no-blocks",
        message: "Tokens captured but no line-level blocks. Re-run OCR; the matcher needs ocr_blocks.",
      });
    } else if (blockCount < MIN_BLOCKS_FOR_AFFINE) {
      pageReport.issues.push({
        severity: "warn",
        code: "few-blocks",
        message: `Only ${blockCount} OCR block(s); affine alignment needs at least ${MIN_BLOCKS_FOR_AFFINE}. The page will rely on translation fallback at user time.`,
      });
    }
    if (boxCount && diagnostics.mode === "no-anchor") {
      pageReport.issues.push({
        severity: "error",
        code: "matcher-no-anchor",
        message: "Matcher could not anchor this page against its own OCR. Re-run OCR or use a clearer source image.",
      });
    } else if (boxCount && diagnostics.mode === "translation" && blockCount >= MIN_BLOCKS_FOR_AFFINE) {
      pageReport.issues.push({
        severity: "warn",
        code: "affine-rejected",
        message: "Affine fit rejected on self-test (low coverage or high residual). Real uploads will rely on translation fallback only.",
      });
    }
    if (typeof diagnostics.rms === "number" && diagnostics.rms > RMS_WARN_PX) {
      pageReport.issues.push({
        severity: "warn",
        code: "high-rms",
        message: `Affine RMS residual on self-test is ${diagnostics.rms.toFixed(2)} px (expected ~0).`,
      });
    }

    for (const box of page.boxes) {
      const r = transformBox(box.bbox);
      const driftPx = centreDrift(r.bbox, box.bbox);
      const boxReport = {
        id: box.id,
        header: box.header,
        anchored: r.anchored,
        mode: r.mode,
        driftPx,
        bboxIn: box.bbox,
        bboxOut: r.bbox.map((v) => Math.round(v * 100) / 100),
        severity: null,
        message: null,
      };
      if (!r.anchored) {
        boxReport.severity = "error";
        boxReport.message = "No matched OCR block within range. This box will not be anchored on user uploads.";
      } else if (driftPx > DRIFT_WARN_PX) {
        boxReport.severity = "warn";
        boxReport.message = `Self-test centre drift ${driftPx.toFixed(2)} px exceeds ${DRIFT_WARN_PX} px.`;
      }
      pageReport.boxes.push(boxReport);
    }

    pageReport.warps = [];
    if (boxCount && tokenCount && blockCount && diagnostics.mode !== "no-anchor") {
      for (const scenario of WARP_SCENARIOS) {
        pageReport.warps.push(runWarpScenario(page, scenario));
      }
    }

    pageReport.hasError =
      pageReport.issues.some((i) => i.severity === "error")
      || pageReport.boxes.some((b) => b.severity === "error");
    pageReport.hasWarn =
      pageReport.issues.some((i) => i.severity === "warn")
      || pageReport.boxes.some((b) => b.severity === "warn")
      || pageReport.warps.some((w) => w.severity === "warn");

    if (pageReport.hasError) report.ok = false;
    if (pageReport.hasWarn) report.hasWarn = true;
    report.pages.push(pageReport);
  }

  return report;
}

export function formatPrecheckReport(report) {
  if (!report.pages.length) return "No pages to check.";
  const out = [];
  for (const p of report.pages) {
    const summary = [
      `Page ${p.pageIndex + 1}`,
      `mode=${p.mode}`,
      `blocks=${p.matchedBlocks}/${p.blockCount}`,
      `anchors=${p.anchorPairs}`,
      `boxes=${p.boxCount}`,
    ];
    if (typeof p.rms === "number") summary.push(`rms=${p.rms.toFixed(2)}px`);
    out.push(summary.join("  "));
    for (const issue of p.issues) {
      out.push(`  [${issue.severity}] ${issue.message}`);
    }
    for (const b of p.boxes) {
      if (!b.severity) continue;
      const label = b.header && b.header !== b.id ? `${b.id} (${b.header})` : b.id;
      out.push(`  [${b.severity}] ${label}: ${b.message}`);
    }
    for (const w of p.warps || []) {
      const rmsTxt = typeof w.rms === "number" ? `${w.rms.toFixed(2)}px` : "n/a";
      const driftTxt = `${w.worstDriftPx.toFixed(2)}px`;
      const head = `  warp ${w.name} (s=${w.scale}, rot=${w.rotationDeg}deg, off=${w.dx},${w.dy}): mode=${w.mode} rms=${rmsTxt} worst-drift=${driftTxt}`;
      if (w.severity) {
        out.push(`${head}  [${w.severity}] ${w.message}`);
      } else {
        out.push(`${head}  ok`);
      }
    }
    if (
      !p.issues.length
      && !p.boxes.some((b) => b.severity)
      && !(p.warps || []).some((w) => w.severity)
    ) {
      out.push("  ok");
    }
  }
  if (report.ok) {
    out.push("");
    out.push(report.hasWarn ? "Precheck passed with warnings." : "Precheck passed.");
  } else {
    out.push("");
    out.push("Precheck FAILED: at least one error above.");
  }
  return out.join("\n");
}
