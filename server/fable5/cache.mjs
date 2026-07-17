// ============================================================
// L78 — Cache OpenRouter / Fable 5 : évite les appels redondants
// ============================================================

import crypto from "node:crypto";

const cache = new Map();
const MAX_AGE_MS = 1000 * 60 * 60; // 1 heure

function key(prompt, model) {
  const hash = crypto.createHash("sha256").update(`${model}:${prompt}`).digest("hex");
  return hash.slice(0, 24);
}

export function cacheGet(prompt, model) {
  const k = key(prompt, model);
  const entry = cache.get(k);
  if (!entry) return null;
  if (Date.now() - entry.ts > MAX_AGE_MS) {
    cache.delete(k);
    return null;
  }
  return entry.value;
}

export function cacheSet(prompt, model, value) {
  const k = key(prompt, model);
  cache.set(k, { value, ts: Date.now() });
}

export function cacheStats() {
  return { size: cache.size };
}
