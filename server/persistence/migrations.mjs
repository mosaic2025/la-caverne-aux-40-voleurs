// ============================================================
// L3 — Migrations de schéma data.json
// ============================================================

export const SCHEMA_VERSION = 2;

export const DEFAULT_STORE = {
  version: SCHEMA_VERSION,
  voleurs: [],
  genies: [],
  runs: [],
  profils: {},
  kb: [],
  kbChunks: [],
  missions: [],
  negos: [],
  debats: [],
  tournois: [],
  pipelines: [],
  etoileJobs: [],
  unlocked: [],
  sabres: [],
  traitorVerdicts: [],
  balanceStats: { requetes: 0, tokensBande: 0, tokensSolo: 0, economiePct: 0, echantillons: 0, ratioEchantillonnage: 5 },
  dinars: [],
  dinarLedger: [],
  maxiContracts: [],
  avatars: {},
  sharedKnowledge: { contributions: [], concepts: [], graph: {} },
  journalPointer: 0,
};

const MIGRATIONS = [
  // v1 -> v2
  (s) => {
    s.avatars = s.avatars || {};
    s.sharedKnowledge = s.sharedKnowledge || { contributions: [], concepts: [], graph: {} };
    s.journalPointer = s.journalPointer || 0;
    s.version = 2;
    return s;
  },
];

export function migrate(parsed) {
  if (!parsed || typeof parsed !== "object") return structuredClone(DEFAULT_STORE);
  let v = parsed.version || 1;
  const out = { ...DEFAULT_STORE, ...parsed, version: v };
  for (const m of MIGRATIONS) {
    const nv = m(out);
    if (nv.version > v) v = nv.version;
  }
  out.version = v;
  for (const k of Object.keys(DEFAULT_STORE)) {
    if (!(k in out)) out[k] = DEFAULT_STORE[k];
  }
  return out;
}
