// ============================================================
// L60 — KB universelle de savoir partagé
// Un seul grand corpus, 1B → 1T tokens, indexé localement.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chunkText } from "../kb/chunks.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UNIVERSAL_DIR = path.join(__dirname, "../../universal_kb");

export function ensureUniversalDir() {
  fs.mkdirSync(UNIVERSAL_DIR, { recursive: true });
}

export function ingest(store, { title, text, source = "shared", tags = [] }) {
  ensureUniversalDir();
  const chunks = chunkText(text);
  const docId = `ukb_${Date.now()}`;
  const doc = { id: docId, title, source, tags, chunks: chunks.length, ts: Date.now() };
  store.sharedKnowledge ||= { contributions: [], concepts: [], graph: {} };
  store.sharedKnowledge.concepts.push(doc);
  const file = path.join(UNIVERSAL_DIR, `${docId}.json`);
  fs.writeFileSync(file, JSON.stringify({ ...doc, chunks }, null, 2), "utf8");
  return doc;
}

export function listUniversalDocs(store) {
  return store.sharedKnowledge?.concepts || [];
}
