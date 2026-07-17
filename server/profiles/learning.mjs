// ============================================================
// L29 — Apprentissage par renforcement explicite/implicit
// ============================================================

export function recordFeedback(store, { userId, runId, rating, comment = "" }) {
  store.profils ||= {};
  const p = store.profils[userId] ||= { userId, interactions: 0, lenUser: 0, lenGenie: 0, lexUser: {}, lexGenie: {}, fusionPct: 0 };
  p.feedback ||= [];
  p.feedback.push({ runId, rating: Math.max(-1, Math.min(1, rating)), comment: comment.slice(0, 500), ts: Date.now() });
  // Met à jour la perf implicite des voleurs si runId fourni
  if (runId && store.runs) {
    const run = store.runs.find((r) => r.id === runId);
    if (run) {
      for (const f of run.fragments || []) {
        const v = store.voleurs?.find((x) => x.id === f.voleurId);
        if (v && typeof v.perf === "number") {
          v.perf = Number((v.perf * 0.8 + rating * 0.2).toFixed(4));
        }
      }
    }
  }
  return p;
}

export function getAverageRating(store, userId) {
  const p = store.profils?.[userId];
  if (!p?.feedback?.length) return 0;
  return p.feedback.reduce((s, f) => s + f.rating, 0) / p.feedback.length;
}

export function getTopRatedVoleurs(store, n = 3) {
  return (store.voleurs || [])
    .filter((v) => typeof v.perf === "number")
    .sort((a, b) => b.perf - a.perf)
    .slice(0, n);
}
