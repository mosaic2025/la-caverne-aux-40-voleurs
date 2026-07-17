// ============================================================
// L59-L66 — Connecteur de pensée / connaissance partagée
// Objectif : agréger les savoirs de tous les utilisateurs en un corpus commun
// Cible : 1B → 1T tokens de savoir collectif
// ============================================================

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHARED_KB_DIR = path.join(__dirname, "../../shared_kb");

export function ensureSharedKbDir() {
  fs.mkdirSync(SHARED_KB_DIR, { recursive: true });
}

function anonymize(userId) {
  const h = crypto.createHash("sha256").update(String(userId)).digest("hex");
  return `anon_${h.slice(0, 12)}`;
}

function formatTokens(n) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)} K`;
  return `${n}`;
}

function extractKeywords(text, n = 5) {
  const stop = new Set("le la les de des du un une et à en que qui pour dans sur avec pas plus est sont ce cette ces son ses mon mes ton tes nos vos leur au aux par ou où si mais donc car".split(" "));
  const words = String(text).toLowerCase().match(/[a-zà-ÿ0-9]{4,}/g) || [];
  const counts = {};
  for (const w of words) {
    if (stop.has(w)) continue;
    counts[w] = (counts[w] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}

export function contribute(store, { userId, text, source = "chat", tags = [] }) {
  ensureSharedKbDir();
  const entry = {
    id: `contrib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: anonymize(userId),
    text: String(text).slice(0, 10000),
    keywords: extractKeywords(text),
    source,
    tags,
    ts: Date.now(),
  };
  store.sharedKnowledge ||= { contributions: [], concepts: [], graph: {} };
  store.sharedKnowledge.contributions.push(entry);
  const file = path.join(SHARED_KB_DIR, "contributions.ndjson");
  fs.appendFileSync(file, JSON.stringify(entry) + "\n", "utf8");
  return entry;
}

export function sharedStats(store) {
  store.sharedKnowledge ||= { contributions: [], concepts: [], graph: {} };
  const totalChars = store.sharedKnowledge.contributions.reduce((s, c) => s + c.text.length, 0);
  const estimatedTokens = Math.floor(totalChars / 4);
  return {
    entries: store.sharedKnowledge.contributions.length,
    estimatedTokens,
    estimatedTokensLabel: formatTokens(estimatedTokens),
  };
}

export function searchShared(store, query, k = 5) {
  store.sharedKnowledge ||= { contributions: [], concepts: [], graph: {} };
  const q = String(query).toLowerCase();
  const qWords = extractKeywords(q, 5);
  const scored = store.sharedKnowledge.contributions.map((c) => {
    let score = 0;
    if (c.text.toLowerCase().includes(q)) score += 3;
    for (const w of qWords) {
      if (c.keywords?.includes(w)) score += 2;
      if (c.tags?.some((t) => t.toLowerCase().includes(w))) score += 1;
    }
    return { ...c, score };
  });
  return scored.filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}
