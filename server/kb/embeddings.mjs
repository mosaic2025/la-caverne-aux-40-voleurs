// ============================================================
// L16 — Provider d'embeddings avec fallback Qwen → Ollama → random hash
// ============================================================

import { getProvider } from "../providers/providerFactory.js";
import crypto from "node:crypto";

const TARGET_DIM = 1024;

function deterministicHashEmbedding(text) {
  // Fallback de dernier recours : embedding déterministe à partir du hash du texte
  // Non sémantique, mais permet les tests offline.
  const hash = crypto.createHash("sha256").update(text).digest();
  const vec = new Array(TARGET_DIM).fill(0);
  for (let i = 0; i < hash.length; i++) {
    vec[i % TARGET_DIM] += hash[i] / 255;
  }
  // Normaliser grossièrement
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function embedText(text, providerName = "qwen-cloud") {
  const providers = [providerName, "ollama", "qwen-cloud"];
  for (const p of [...new Set(providers)]) {
    try {
      const provider = getProvider(p);
      const r = await provider.embedText(text);
      if (Array.isArray(r.embedding) && r.embedding.length > 0) return r;
    } catch (e) {
      // essai suivant
    }
  }
  return { embedding: deterministicHashEmbedding(text), tokens: Math.ceil(text.length / 4), fallback: true };
}
