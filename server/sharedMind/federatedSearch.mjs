// ============================================================
// L64 — Recherche fédérée : locale + distante (placeholder)
// ============================================================

import { searchShared } from "./connector.mjs";

export function federatedSearch(store, query, { localK = 5, remoteK = 0 } = {}) {
  const local = searchShared(store, query, localK);
  return {
    query,
    local,
    remote: [], // ouvert aux connecteurs distants ultérieurement
    total: local.length,
  };
}
