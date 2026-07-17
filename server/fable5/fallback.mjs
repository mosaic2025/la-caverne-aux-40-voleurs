// ============================================================
// L75-L76 — Fallback intelligent + cost routing pour Fable 5 / OpenRouter
// ============================================================

import { Fable5Client, FABLE5_MODELS } from "./fable5Client.mjs";

// Prix indicatifs par 1k tokens (prompt + completion moyen)
const COSTS = {
  "anthropic/claude-fable-5": 0.006,
  "anthropic/claude-5-fable-20260609": 0.008,
};

export async function askWithFallback(prompt, { models = FABLE5_MODELS, system = "", maxTokens = 1024 } = {}) {
  const errors = [];
  for (const model of models) {
    try {
      const client = new Fable5Client(model);
      const r = await client.single(prompt, { system, maxTokens });
      return { ...r, model, errors };
    } catch (e) {
      errors.push({ model, error: e.message });
    }
  }
  throw new Error(`Tous les modèles Fable 5 ont échoué : ${errors.map((e) => e.model).join(", ")}`);
}

export function cheapestModel(models = FABLE5_MODELS) {
  return models.slice().sort((a, b) => (COSTS[a] || Infinity) - (COSTS[b] || Infinity))[0];
}
