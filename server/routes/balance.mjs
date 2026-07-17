export const order = 100;

export async function handle(req, res, url, parts, ctx) {
  if (req.method !== 'GET' || parts[0] !== 'api' || parts[1] !== 'balance') {
    return false;
  }

  // Initialiser le store si nécessaire
  ctx.store.balanceStats ||= {
    requetes: 0,
    tokensBande: 0,
    tokensSolo: 0,
    economiePct: 0,
    echantillons: 0,
    ratioEchantillonnage: 5 // 1 échantillon sur 5 par défaut
  };

  const stats = ctx.store.balanceStats;

  // Calculer le gain estimé
  if (stats.tokensBande > 0 && stats.tokensSolo > 0) {
    stats.economiePct = Math.round(
      (1 - stats.tokensBande / stats.tokensSolo) * 100
    );
  }

  ctx.helpers.sendJson(res, 200, {
    requetes: stats.requetes,
    tokensBande: stats.tokensBande,
    tokensSolo: stats.tokensSolo,
    economiePct: stats.economiePct,
    echantillons: stats.echantillons
  });

  return true;
}

// Hook pour accumuler les statistiques après chaque run MoE
export function onMoeRunComplete(run, ctx) {
  ctx.store.balanceStats ||= {
    requetes: 0,
    tokensBande: 0,
    tokensSolo: 0,
    economiePct: 0,
    echantillons: 0,
    ratioEchantillonnage: 5
  };

  const stats = ctx.store.balanceStats;

  // Accumuler les stats de la bande
  stats.requetes += 1;
  stats.tokensBande += run.tokens.total;

  // Échantillonnage pour estimer le coût solo
  if (stats.requetes % stats.ratioEchantillonnage === 0) {
    estimateSoloCost(run.query, ctx)
      .then(tokens => {
        stats.tokensSolo += tokens;
        stats.echantillons += 1;
        ctx.save();
      })
      .catch(err => {
        console.error('Erreur estimation coût solo:', err);
      });
  }

  ctx.save();
}

async function estimateSoloCost(query, ctx) {
  // Estimation avec qwen-max comme baseline
  const response = await ctx.moe.chatCompletion({
    model: 'qwen-max',
    messages: [
      { role: 'system', content: 'Réponds de manière concise et précise.' },
      { role: 'user', content: query }
    ],
    maxTokens: 2000,
    temperature: 0.7
  });

  return response.totalTokens;
}
