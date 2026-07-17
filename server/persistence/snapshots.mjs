// ============================================================
// L2 — Snapshots horodatés pour rollback
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = path.join(__dirname, "../../server/snapshots");

export function snapshot(store, label = "auto") {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const file = path.join(SNAPSHOT_DIR, `${Date.now()}_${label}.json`);
  fs.writeFileSync(file, JSON.stringify(store, null, 2), "utf8");
  return file;
}

export function listSnapshots() {
  if (!fs.existsSync(SNAPSHOT_DIR)) return [];
  return fs.readdirSync(SNAPSHOT_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const [ts, label] = f.replace(".json", "").split("_");
      return { file: path.join(SNAPSHOT_DIR, f), ts: Number(ts), label: label || "unknown" };
    })
    .sort((a, b) => b.ts - a.ts);
}

export function restoreSnapshot(file) {
  if (!fs.existsSync(file)) throw new Error(`Snapshot introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
