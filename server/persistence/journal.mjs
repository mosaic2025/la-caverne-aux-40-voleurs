// ============================================================
// L1 — Journal d'événements append-only
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JOURNAL_FILE = path.join(__dirname, "../../server/journal.ndjson");

export function appendJournal(record) {
  fs.mkdirSync(path.dirname(JOURNAL_FILE), { recursive: true });
  const line = JSON.stringify({ ts: Date.now(), ...record }) + "\n";
  fs.appendFileSync(JOURNAL_FILE, line, "utf8");
}

export function readJournal({ since = 0, limit = 1000, type = null } = {}) {
  if (!fs.existsSync(JOURNAL_FILE)) return [];
  const lines = fs.readFileSync(JOURNAL_FILE, "utf8").split("\n").filter(Boolean);
  const out = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const r = JSON.parse(lines[i]);
      if (r.ts < since) continue;
      if (type && r.type !== type) continue;
      out.unshift(r);
      if (out.length >= limit) break;
    } catch { /* ignore corrupt line */ }
  }
  return out;
}

export function journalStats() {
  if (!fs.existsSync(JOURNAL_FILE)) return { entries: 0, firstTs: null, lastTs: null };
  const lines = fs.readFileSync(JOURNAL_FILE, "utf8").split("\n").filter(Boolean);
  let first = null, last = null;
  for (const l of lines) {
    try {
      const r = JSON.parse(l);
      if (first === null || r.ts < first) first = r.ts;
      if (last === null || r.ts > last) last = r.ts;
    } catch {}
  }
  return { entries: lines.length, firstTs: first, lastTs: last };
}
