// ============================================================
// L77 — Agrégation de réponses multiples + consensus
// ============================================================

export function aggregateResponses(responses) {
  if (!responses.length) return null;
  if (responses.length === 1) return responses[0];

  // Vote par longueur + tokens : simple heuristique
  const best = responses.reduce((acc, r) => {
    const score = (r.text?.length || 0) + (r.totalTokens || 0);
    return score > acc.score ? { r, score } : acc;
  }, { r: responses[0], score: 0 });

  return {
    ...best.r,
    ensemble: responses.map((r) => ({ model: r.model, text: r.text, tokens: r.totalTokens })),
    note: "Réponse choisie par vote simple parmi les modèles Fable 5 (Qwen Cloud).",
  };
}
