// ============================================================
// L0-L6 — Couches de persistance
// Store atomique JSON : load/save, journal, snapshots, migrations, cache, intégrité
// ============================================================

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { migrate, DEFAULT_STORE } from "./persistence/migrations.mjs";
import { appendJournal, journalStats } from "./persistence/journal.mjs";
import { snapshot, listSnapshots, restoreSnapshot } from "./persistence/snapshots.mjs";
import { cacheGet, cacheSet, cacheStats } from "./persistence/cache.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data.json");

function checksum(data) {
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 16);
}

export function loadStore() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const store = migrate(parsed);
    if (store.version !== parsed.version) {
      const tmp = DATA_FILE + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
      fs.renameSync(tmp, DATA_FILE);
    }
    return store;
  } catch {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_STORE, null, 2), "utf8");
    return structuredClone(DEFAULT_STORE);
  }
}

export function createStore(initial = loadStore()) {
  let saveTimer = null;
  const subscribers = [];

  function persist() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const tmp = DATA_FILE + ".tmp";
      const payload = JSON.stringify(store, null, 2);
      fs.writeFileSync(tmp, payload, "utf8");
      fs.renameSync(tmp, DATA_FILE);
      appendJournal({ type: "save", checksum: checksum(payload) });
      const snap = { ts: Date.now(), checksum: checksum(payload) };
      for (const cb of subscribers) cb("save", snap);
    }, 50);
  }

  function forceSave() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    const tmp = DATA_FILE + ".tmp";
    const payload = JSON.stringify(store, null, 2);
    fs.writeFileSync(tmp, payload, "utf8");
    fs.renameSync(tmp, DATA_FILE);
    appendJournal({ type: "force_save", checksum: checksum(payload) });
  }

  function createSnapshot(label = "manual") {
    return snapshot(store, label);
  }

  const store = initial;

  return {
    get data() { return store; },
    save: persist,
    forceSave,
    appendJournal,
    snapshot: createSnapshot,
    listSnapshots,
    restoreSnapshot,
    cacheGet,
    cacheSet,
    journalStats,
    cacheStats: () => cacheStats(),
    checksum: () => checksum(JSON.stringify(store)),
    subscribe(cb) {
      subscribers.push(cb);
      return () => {
        const i = subscribers.indexOf(cb);
        if (i >= 0) subscribers.splice(i, 1);
      };
    },
  };
}
