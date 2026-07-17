// ============================================================
// L20-L21 — KB partagée : contribution + résumé
// ============================================================

import { chunkText } from "./chunks.mjs";
import { embedText } from "./embeddings.mjs";
import { addVector, saveVectors } from "./vectorStore.mjs";

export async function ingestSharedDoc({ docId, title, text, metadata = {}, provider = "qwen-cloud" }) {
  const pieces = chunkText(text);
  for (const [i, p] of pieces.entries()) {
    const { embedding } = await embedText(p, provider);
    addVector({ id: `${docId}_chk_${i}`, docId, text: p, embedding, metadata: { ...metadata, title } });
  }
  saveVectors();
  return { docId, chunks: pieces.length };
}

export function summarizeDoc(text, maxLen = 400) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}
