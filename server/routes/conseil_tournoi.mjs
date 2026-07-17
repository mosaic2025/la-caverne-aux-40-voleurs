export const order = 100;

export async function handle(req, res, url, parts, ctx) {
  if (parts[0] !== 'api' || parts[1] !== 'conseil' || parts[2] !== 'tournoi') {
    return false;
  }

  if (req.method !== 'POST') {
    return false;
  }

  try {
    const body = await ctx.helpers.readBody(req);
    const { voleurIds, question } = body;

    if (!Array.isArray(voleurIds) || voleurIds.length < 2 || !question) {
      ctx.helpers.sendError(res, 400, 'Requête invalide: voleurIds[] et question requis');
      return true;
    }

    // Vérifie que les voleurs existent
    const voleurs = ctx.store.voleurs || [];
    const validVoleurs = voleurIds.every(id => voleurs.some(v => v.id === id));
    if (!validVoleurs) {
      ctx.helpers.sendError(res, 404, 'Un ou plusieurs voleurs introuvables');
      return true;
    }

    // Crée le bracket de tournoi
    const matches = await createTournamentBracket(voleurIds, question, ctx);
    const champion = determineChampion(matches);

    const tournoiRun = {
      id: ctx.helpers.newId('tournoi'),
      query: question,
      matches,
      champion,
      ts: Date.now()
    };

    // Persiste le résultat
    ctx.store.tournois ||= [];
    ctx.store.tournois.push(tournoiRun);
    await ctx.save();

    ctx.helpers.sendJson(res, 200, tournoiRun);
    return true;
  } catch (err) {
    ctx.helpers.sendError(res, 500, `Erreur serveur: ${err.message}`);
    return true;
  }
}

async function createTournamentBracket(voleurIds, question, ctx) {
  const matches = [];
  let currentRound = [...voleurIds];

  while (currentRound.length > 1) {
    const nextRound = [];
    
    for (let i = 0; i < currentRound.length; i += 2) {
      if (i + 1 >= currentRound.length) {
        nextRound.push(currentRound[i]);
        continue;
      }

      const a = currentRound[i];
      const b = currentRound[i + 1];
      
      const duelResult = await runDuel(a, b, question, ctx);
      matches.push(duelResult);
      
      nextRound.push(duelResult.winner);
    }

    currentRound = nextRound;
  }

  return matches;
}

async function runDuel(voleurA, voleurB, question, ctx) {
  const voleurs = ctx.store.voleurs || [];
  const a = voleurs.find(v => v.id === voleurA);
  const b = voleurs.find(v => v.id === voleurB);

  if (!a || !b) {
    throw new Error('Voleur introuvable');
  }

  // Demande les réponses en parallèle
  const [responseA, responseB] = await Promise.all([
    getVoleurResponse(a, question, ctx),
    getVoleurResponse(b, question, ctx)
  ]);

  // Faire juger les réponses par un modèle neutre
  const judgeResponse = await ctx.moe.chatCompletion({
    model: 'qwen-plus',
    messages: [
      { role: 'system', content: 'Tu es un juge impartial. Évalue les deux réponses à la question suivante et donne un score entre 0 et 10 pour chaque.' },
      { role: 'user', content: `Question: ${question}\n\nRéponse A: ${responseA.text}\n\nRéponse B: ${responseB.text}` }
    ],
    maxTokens: 100,
    temperature: 0
  });

  // Parse les scores du juge
  const scores = parseJudgeScores(judgeResponse.text);
  const scoreA = scores.a || 5;
  const scoreB = scores.b || 5;

  return {
    a: voleurA,
    b: voleurB,
    winner: scoreA >= scoreB ? voleurA : voleurB,
    scoreA,
    scoreB
  };
}

async function getVoleurResponse(voleur, question, ctx) {
  const response = await ctx.moe.chatCompletion({
    model: voleur.modele,
    messages: [
      { role: 'system', content: voleur.systemPrompt },
      { role: 'user', content: question }
    ],
    maxTokens: voleur.capTokens,
    temperature: 0.7
  }, voleur.provider);

  // Mise à jour des tokens utilisés
  voleur.tokensUtilises = (voleur.tokensUtilises || 0) + response.totalTokens;
  await ctx.save();

  return response;
}

function parseJudgeScores(judgement) {
  // Essaye de parser les scores depuis le texte du juge
  const scorePattern = /(?:score|note|évaluation).*?([0-9]+).*?([0-9]+)/i;
  const match = judgement.match(scorePattern);
  
  if (match && match.length >= 3) {
    return {
      a: parseInt(match[1]),
      b: parseInt(match[2])
    };
  }

  // Fallback si le parsing échoue
  return { a: 5, b: 5 };
}

function determineChampion(matches) {
  const lastMatch = matches[matches.length - 1];
  return lastMatch.winner;
}
