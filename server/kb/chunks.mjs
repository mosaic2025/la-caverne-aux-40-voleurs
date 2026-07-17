// ============================================================
// L15 — Chunking maison
// ============================================================

const CHUNK = 600;
const OVERLAP = 80;

export function chunkText(text) {
  const clean = String(text).replace(/\r/g, "").trim();
  const out = [];
  for (let i = 0; i < clean.length; i += CHUNK - OVERLAP) {
    const piece = clean.slice(i, i + CHUNK).trim();
    if (piece) out.push(piece);
    if (i + CHUNK >= clean.length) break;
  }
  return out.length ? out : [clean].filter(Boolean);
}
