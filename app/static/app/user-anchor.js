// Anchor matcher: map template-image box coordinates to user-image
// coordinates by fuzzy-matching ocr_blocks captured at admin time
// against the user page's OCR output.
//
// Layered, per CLAUDE.md §2:
//   1. For every template ocr_block, slide over the user OCR word
//      stream looking for the highest-similarity contiguous run.
//   2. Inside each matched block, pair template words to user words
//      (DP on word-similarity). Each pair contributes a (templateCentre,
//      userCentre) anchor.
//   3. Across all anchors, fit a single 2D affine. If the RMS residual
//      is below threshold AND the matched anchors cover a fair chunk of
//      the page in both axes, use it.
//   4. Otherwise fall back to per-box translation: for each box, pick
//      the nearest matched block and apply that block's local
//      translation only.
//
// Bbox convention everywhere: [x, y, w, h] in admin reference pixels
// (200 DPI). The same convention is used for template tokens, user
// tokens (admin-ocr.js does the XYWH conversion already), and boxes.

const SIMILARITY_THRESHOLD = 0.75;
const AFFINE_MAX_RESIDUAL_PX = 8;
const MIN_MATCHED_BLOCKS_FOR_AFFINE = 3;
const COVERAGE_MIN = 0.4;
const TRANSLATION_FALLBACK_RADIUS_PX = 400;
const WORD_PAIR_MIN_SIMILARITY = 0.5;

function normaliseText(s) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Int32Array(b.length + 1);
  const v1 = new Int32Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v0[b.length];
}

function similarity(a, b) {
  const A = normaliseText(a);
  const B = normaliseText(b);
  if (!A.length && !B.length) return 1;
  const max = Math.max(A.length, B.length);
  if (!max) return 0;
  return 1 - levenshtein(A, B) / max;
}

function centre(bbox) {
  return [bbox[0] + bbox[2] / 2, bbox[1] + bbox[3] / 2];
}

function averageCentre(words) {
  if (!words.length) return [0, 0];
  let sx = 0;
  let sy = 0;
  for (const w of words) {
    const c = centre(w.bbox);
    sx += c[0];
    sy += c[1];
  }
  return [sx / words.length, sy / words.length];
}

// Find the best contiguous user-token window whose joined text matches
// the template block text. Returns { start, end, score, words } or null
// when no window scores above threshold.
function findBlockMatch(blockText, userTokens) {
  const target = normaliseText(blockText);
  if (!target || !userTokens.length) return null;
  const targetWords = target.split(" ");
  const minWindow = Math.max(1, targetWords.length - 2);
  const maxWindow = Math.min(userTokens.length, targetWords.length + 2);
  let best = null;
  for (let len = minWindow; len <= maxWindow; len++) {
    for (let start = 0; start + len <= userTokens.length; start++) {
      const slice = userTokens.slice(start, start + len);
      const joined = slice.map((t) => t.text).join(" ");
      const score = similarity(joined, blockText);
      if (!best || score > best.score) {
        best = { start, end: start + len, score, words: slice };
      }
    }
  }
  return best && best.score >= SIMILARITY_THRESHOLD ? best : null;
}

// Align template words to user words by Needleman-Wunsch style DP
// over per-word similarity. Returns the pairs that scored above
// WORD_PAIR_MIN_SIMILARITY (so noisy alignments don't poison the fit).
function alignWords(templateWords, userWords) {
  const m = templateWords.length;
  const n = userWords.length;
  if (!m || !n) return [];
  const sim = Array.from({ length: m }, () => new Float32Array(n));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) sim[i][j] = similarity(templateWords[i].text, userWords[j].text);
  }
  const dp = Array.from({ length: m + 1 }, () => new Float32Array(n + 1));
  const back = Array.from({ length: m + 1 }, () => new Int8Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const matchScore = dp[i - 1][j - 1] + sim[i - 1][j - 1];
      const skipT = dp[i - 1][j];
      const skipU = dp[i][j - 1];
      if (matchScore >= skipT && matchScore >= skipU) {
        dp[i][j] = matchScore;
        back[i][j] = 0;
      } else if (skipT >= skipU) {
        dp[i][j] = skipT;
        back[i][j] = 1;
      } else {
        dp[i][j] = skipU;
        back[i][j] = 2;
      }
    }
  }
  const pairs = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (back[i][j] === 0) {
      if (sim[i - 1][j - 1] >= WORD_PAIR_MIN_SIMILARITY) {
        pairs.push({ template: templateWords[i - 1], user: userWords[j - 1] });
      }
      i--;
      j--;
    } else if (back[i][j] === 1) i--;
    else j--;
  }
  return pairs;
}

function det3(m) {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
    - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function solve3(M, rhs) {
  const D = det3(M);
  if (Math.abs(D) < 1e-9) return null;
  const result = [0, 0, 0];
  for (let col = 0; col < 3; col++) {
    const Mc = M.map((row) => row.slice());
    for (let r = 0; r < 3; r++) Mc[r][col] = rhs[r];
    result[col] = det3(Mc) / D;
  }
  return result;
}

// Least-squares fit of x' = a*x + b*y + tx, y' = c*x + d*y + ty.
function fitAffine(pairs) {
  const n = pairs.length;
  if (n < 3) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  let sxp_x = 0, syp_x = 0, sp_x = 0;
  let sxp_y = 0, syp_y = 0, sp_y = 0;
  for (const { from: [x, y], to: [xp, yp] } of pairs) {
    sx += x; sy += y;
    sxx += x * x; sxy += x * y; syy += y * y;
    sxp_x += x * xp; syp_x += y * xp; sp_x += xp;
    sxp_y += x * yp; syp_y += y * yp; sp_y += yp;
  }
  const M = [
    [sxx, sxy, sx],
    [sxy, syy, sy],
    [sx,  sy,  n],
  ];
  const xRow = solve3(M, [sxp_x, syp_x, sp_x]);
  const yRow = solve3(M, [sxp_y, syp_y, sp_y]);
  if (!xRow || !yRow) return null;
  const [a, b, tx] = xRow;
  const [c, d, ty] = yRow;
  let ssr = 0;
  for (const { from: [x, y], to: [xp, yp] } of pairs) {
    const dx = a * x + b * y + tx - xp;
    const dy = c * x + d * y + ty - yp;
    ssr += dx * dx + dy * dy;
  }
  const rms = Math.sqrt(ssr / n);
  return { a, b, c, d, tx, ty, rms };
}

function applyAffine(t, [x, y]) {
  return [t.a * x + t.b * y + t.tx, t.c * x + t.d * y + t.ty];
}

function transformBoxAffine(t, [x, y, w, h]) {
  const corners = [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ].map((c) => applyAffine(t, c));
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const x1 = Math.max(...xs);
  const y1 = Math.max(...ys);
  return [x0, y0, x1 - x0, y1 - y0];
}

export function matchPage(templatePage, userOcr) {
  const userTokens = userOcr?.ocrTokens || [];
  const templateBlocks = templatePage.ocr_blocks || templatePage.ocrBlocks || [];

  const blockMatches = [];
  const diagnostics = {
    matchedBlocks: 0,
    anchorPairs: 0,
    mode: "no-anchor",
    rms: null,
    blockMatches: [],
  };

  for (const block of templateBlocks) {
    const match = findBlockMatch(block.text, userTokens);
    if (!match) continue;
    const wordPairs = alignWords(block.words || [], match.words);
    const anchors = wordPairs.map((p) => ({
      from: centre(p.template.bbox),
      to: centre(p.user.bbox),
    }));
    if (!anchors.length) continue;
    blockMatches.push({
      block,
      score: match.score,
      anchors,
      userBlockCentre: averageCentre(match.words),
    });
    diagnostics.blockMatches.push({ templateId: block.id, score: match.score, pairs: anchors.length });
  }
  diagnostics.matchedBlocks = blockMatches.length;
  const allPairs = blockMatches.flatMap((b) => b.anchors);
  diagnostics.anchorPairs = allPairs.length;

  let affine = null;
  if (blockMatches.length >= MIN_MATCHED_BLOCKS_FOR_AFFINE) {
    const xs = allPairs.map((p) => p.from[0]);
    const ys = allPairs.map((p) => p.from[1]);
    const pageW = templatePage.width || (Math.max(...xs) - Math.min(...xs));
    const pageH = templatePage.height || (Math.max(...ys) - Math.min(...ys));
    const xSpan = (Math.max(...xs) - Math.min(...xs)) / Math.max(1, pageW);
    const ySpan = (Math.max(...ys) - Math.min(...ys)) / Math.max(1, pageH);
    if (xSpan >= COVERAGE_MIN && ySpan >= COVERAGE_MIN) {
      const fit = fitAffine(allPairs);
      if (fit && fit.rms <= AFFINE_MAX_RESIDUAL_PX) {
        affine = fit;
        diagnostics.mode = "affine";
        diagnostics.rms = fit.rms;
      }
    }
  }
  if (!affine && blockMatches.length) diagnostics.mode = "translation";

  function nearestBlockTranslation(boxCentre) {
    if (!blockMatches.length) return null;
    let best = null;
    for (const m of blockMatches) {
      const tCentre = centre(m.block.bbox);
      const dx = tCentre[0] - boxCentre[0];
      const dy = tCentre[1] - boxCentre[1];
      const d2 = dx * dx + dy * dy;
      if (!best || d2 < best.d2) {
        best = {
          d2,
          tdx: m.userBlockCentre[0] - tCentre[0],
          tdy: m.userBlockCentre[1] - tCentre[1],
        };
      }
    }
    if (!best) return null;
    if (Math.sqrt(best.d2) > TRANSLATION_FALLBACK_RADIUS_PX) return null;
    return { dx: best.tdx, dy: best.tdy };
  }

  function transformBox(bbox) {
    if (affine) return { bbox: transformBoxAffine(affine, bbox), anchored: true, mode: "affine" };
    const tr = nearestBlockTranslation(centre(bbox));
    if (!tr) return { bbox: [...bbox], anchored: false, mode: "no-anchor" };
    return {
      bbox: [bbox[0] + tr.dx, bbox[1] + tr.dy, bbox[2], bbox[3]],
      anchored: true,
      mode: "translation",
    };
  }

  return { transformBox, diagnostics };
}

// Exported for unit-testing once we add a JS test runner; currently
// unused in production code paths.
export const __internals = {
  similarity,
  levenshtein,
  findBlockMatch,
  alignWords,
  fitAffine,
  applyAffine,
  transformBoxAffine,
};
