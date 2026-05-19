// Per-page OCR for the admin survey editor.
//
// Runs tesseract over the active page canvas, then projects the raw
// tesseract output into the two anchor shapes our YAML stores:
//
//   ocr_tokens : { text, bbox: [x,y,w,h], confidence } per word
//   ocr_blocks : { id, text, bbox: [x,y,w,h], words: [{ text, bbox }] }
//                per line, with each line's constituent words inlined
//
// Confidences come back from tesseract as 0..100; the pydantic schema
// stores them as 0..1, so we divide before persisting.

import { ocrCanvas } from "/static/app/smoke.js";

export async function runOcrForPage(page, { langs = ["eng", "fra"], onLog = () => {} } = {}) {
  const canvas = page.canvas;
  const started = performance.now();
  console.info("[ocr] page start", {
    canvas: `${canvas.width}x${canvas.height}`,
    langs,
  });
  let data;
  try {
    data = await ocrCanvas(canvas, langs, onLog, { blocks: true });
  } catch (err) {
    console.error("[ocr] page failed", err);
    throw err;
  }

  const firstBlock = Array.isArray(data.blocks) ? data.blocks[0] : null;
  const firstPara = firstBlock?.paragraphs?.[0];
  const firstLine = firstPara?.lines?.[0];
  console.info("[ocr] raw shape", {
    topBlocks: Array.isArray(data.blocks) ? data.blocks.length : null,
    firstBlockKeys: firstBlock ? Object.keys(firstBlock) : null,
    firstBlockParagraphs: firstBlock?.paragraphs?.length,
    firstParaLines: firstPara?.lines?.length,
    firstLineWords: firstLine?.words?.length,
    firstLineText: typeof firstLine?.text === "string" ? firstLine.text.slice(0, 120) : null,
  });

  const ocrTokens = [];
  const ocrBlocks = [];
  let blockNum = 1;

  // tesseract.js v5 returns a tree under data.blocks -> paragraphs -> lines -> words.
  // It also exposes data.lines / data.words for convenience; we prefer the
  // tree so each line's constituent words are guaranteed in sync.
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  for (const block of blocks) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) {
        const lineWords = [];
        for (const word of line.words || []) {
          const tok = wordToToken(word);
          if (!tok) continue;
          ocrTokens.push(tok);
          lineWords.push({ text: tok.text, bbox: tok.bbox });
        }
        const text = (line.text || lineWords.map((w) => w.text).join(" ")).trim();
        if (!text || !lineWords.length) continue;
        ocrBlocks.push({
          id: `B${blockNum++}`,
          text,
          bbox: bboxRectToXYWH(line.bbox),
          words: lineWords,
        });
      }
    }
  }

  // Fallback: some tesseract builds emit only data.words / data.lines.
  if (!ocrTokens.length && Array.isArray(data.words)) {
    for (const word of data.words) {
      const tok = wordToToken(word);
      if (tok) ocrTokens.push(tok);
    }
  }
  if (!ocrBlocks.length && Array.isArray(data.lines)) {
    for (const line of data.lines) {
      const lineWords = (line.words || []).map((w) => {
        const tok = wordToToken(w);
        return tok ? { text: tok.text, bbox: tok.bbox } : null;
      }).filter(Boolean);
      const text = (line.text || lineWords.map((w) => w.text).join(" ")).trim();
      if (!text || !lineWords.length) continue;
      ocrBlocks.push({
        id: `B${blockNum++}`,
        text,
        bbox: bboxRectToXYWH(line.bbox),
        words: lineWords,
      });
    }
  }

  const rawText = data.text || "";
  const preview = rawText.replace(/\s+/g, " ").trim().slice(0, 200);
  console.info("[ocr] page done", {
    canvas: `${canvas.width}x${canvas.height}`,
    langs,
    tokens: ocrTokens.length,
    blocks: ocrBlocks.length,
    textLen: rawText.length,
    preview,
    elapsedMs: Math.round(performance.now() - started),
  });
  return { ocrTokens, ocrBlocks, rawText };
}

function wordToToken(word) {
  const text = (word.text || "").trim();
  if (!text || !word.bbox) return null;
  const conf = typeof word.confidence === "number" ? word.confidence / 100 : 0;
  return {
    text,
    bbox: bboxRectToXYWH(word.bbox),
    confidence: Math.max(0, Math.min(1, conf)),
  };
}

function bboxRectToXYWH(bbox) {
  // tesseract bboxes are {x0,y0,x1,y1}. pydantic Box.bbox is [x,y,w,h] ints.
  const x0 = Math.round(bbox.x0 ?? 0);
  const y0 = Math.round(bbox.y0 ?? 0);
  const x1 = Math.round(bbox.x1 ?? 0);
  const y1 = Math.round(bbox.y1 ?? 0);
  return [x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0)];
}
