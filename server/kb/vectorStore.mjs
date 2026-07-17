// ============================================================
// L17 — Vector store disque + recherche sémantique
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chunkText } from "./chunks.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VECTORS_FILE = path.join(__dirname, "../../vectors.json");

let vectors = [];
try {
  vectors = JSON.parse(fs.readFileSync(VECTORS_FILE, "utf8"));
} catch { vectors = []; }

function saveToDisk() {
  fs.writeFileSync(VECTORS_FILE, JSON.stringify(vectors, null, 2), "utf8");
}

export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return d / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export function addVector(entry) {
  vectors.push({ ...entry, ts: Date.now() });
}

export function saveVectors() {
  saveToDisk();
}

export function searchVectors(queryEmbedding, k = 5, minScore = 0.0) {
  return vectors
    .filter((v) => Array.isArray(v.embedding))
    .map((v) => ({ ...v, score: Number(cosine(queryEmbedding, v.embedding).toFixed(4)) }))
    .filter((v) => v.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((v) => ({ id: v.id, docId: v.docId, text: v.text, score: v.score, metadata: v.metadata }));
}

export async function ingestDocument({ docId, text, embedFn, metadata = {} }) {
  const pieces = chunkText(text);
  const added = [];
  for (const [i, p] of pieces.entries()) {
    const { embedding } = await embedFn(p);
    const id = `${docId}_chk_${i}`;
    addVector({ id, docId, text: p, embedding, metadata });
    added.push({ id, text: p });
  }
  saveToDisk();
  return added;
}

export function deleteDocument(docId) {
  vectors = vectors.filter((v) => v.docId !== docId);
  saveToDisk();
}

export function stats() {
  return { vectors: vectors.length, file: VECTORS_FILE };
}
