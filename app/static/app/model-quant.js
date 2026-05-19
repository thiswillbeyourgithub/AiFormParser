// Helpers for flagging GGUF quantisations that are known-bad under
// wllama. The upstream wllama README warns that IQ imatrix quants
// (IQ1_*, IQ2_*, IQ3_*, IQ4_*) are significantly slower than the
// classic K-quants and not recommended. We surface this in the model
// pickers, in the admin self-hosted list, and in the browser console
// when one is actually picked for inference.
//
// The regex requires "IQ" preceded by a separator (start of string,
// dash, dot, or underscore) and immediately followed by a digit. It is
// intentionally case-sensitive: the standard llama.cpp / HuggingFace
// naming always upper-cases IQ, and a case-insensitive match would
// false-positive on plenty of English words.

const IMATRIX_QUANT_RE = /(?:^|[-._])IQ\d/;

export function isImatrixQuant(name) {
  if (!name || typeof name !== "string") return false;
  return IMATRIX_QUANT_RE.test(name);
}

export const IMATRIX_WARNING =
  "IQ imatrix quant detected: per the wllama README " +
  "(https://github.com/ngxson/wllama), these quants are significantly " +
  "slower than the classic K-quants and are not recommended.";

export function warnIfImatrixQuant(name) {
  if (!isImatrixQuant(name)) return false;
  console.warn(`Model "${name}": ${IMATRIX_WARNING}`);
  return true;
}
