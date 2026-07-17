// ============================================================
// L11 — Mémoire long-terme : résumés compressés et rappel contextuel
// ============================================================

import { MemoryAgent } from "../agents/memory.mjs";
import { detectTone, empathyHint } from "./empathy.mjs";

export async function recallContext(store, { userId, query, k = 3 }) {
  const agent = new MemoryAgent();
  const memories = await agent.recall(store, query, k);
  if (!memories.length) return "";
  return `Contexte pertinent tiré de la mémoire collective :\n${memories.map((m, i) => `${i + 1}. ${m.text.slice(0, 300)}`).join("\n")}\n`;
}

export function compressHistory(messages, maxChars = 2000) {
  const all = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  if (all.length <= maxChars) return all;
  const headLen = Math.floor(maxChars * 0.4) - 3;
  const tailLen = Math.floor(maxChars * 0.6) - 3;
  const head = all.slice(0, headLen);
  const tail = all.slice(-tailLen);
  return `${head}\n...\n${tail}`;
}

export function summarizeForLongTerm(messages, { userId = "chef", maxChars = 400 } = {}) {
  const tone = detectTone(messages.filter((m) => m.role === "user").map((m) => m.content).join(" "));
  const summary = compressHistory(messages, maxChars);
  return {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    tone,
    empathyHint: empathyHint(tone),
    summary,
    ts: Date.now(),
  };
}

export function storeLongTerm(store, memory) {
  store.longTermMemories ||= [];
  store.longTermMemories.push(memory);
  if (store.longTermMemories.length > 500) {
    store.longTermMemories = store.longTermMemories.slice(-500);
  }
}

export function recallLongTerm(store, query, k = 3) {
  const memories = store.longTermMemories || [];
  if (!memories.length || !query) return [];
  const q = query.toLowerCase();
  const scored = memories
    .map((m) => ({
      ...m,
      score: (m.summary?.toLowerCase().includes(q) ? 2 : 0) +
             ((m.topics || []).some((t) => q.includes(t) || t.includes(q)) ? 1 : 0) +
             (m.tone === "frustré" ? 0.5 : 0),
    }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return scored;
}
