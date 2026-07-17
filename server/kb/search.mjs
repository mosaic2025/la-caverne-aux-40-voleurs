// ============================================================
// L18 — Recherche sémantique hybride KB
// ============================================================

import { embedText } from "./embeddings.mjs";
import { searchVectors } from "./vectorStore.mjs";

export async function searchKb(query, { k = 5, minScore = 0.0, provider = "qwen-cloud" } = {}) {
  const { embedding } = await embedText(query, provider);
  return searchVectors(embedding, k, minScore);
}
