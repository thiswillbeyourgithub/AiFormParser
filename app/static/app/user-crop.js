// Crop one box region out of a user-page canvas.
// Returns both a PNG Blob (fed to the LLM) and a data-URL (used as the
// thumbnail in the review queue). Coordinates are clamped to the
// canvas bounds; out-of-frame crops return null.

export async function cropPage(canvas, bbox, { padding = 4 } = {}) {
  const [bx, by, bw, bh] = bbox.map((v) => Math.round(v));
  const sx = Math.max(0, bx - padding);
  const sy = Math.max(0, by - padding);
  const sw = Math.min(canvas.width - sx, bw + padding * 2);
  const sh = Math.min(canvas.height - sy, bh + padding * 2);
  if (sw <= 0 || sh <= 0) return null;
  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  out.getContext("2d").drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  const dataUrl = out.toDataURL("image/png");
  const blob = await new Promise((resolve) => out.toBlob(resolve, "image/png"));
  return { blob, dataUrl, width: sw, height: sh };
}
