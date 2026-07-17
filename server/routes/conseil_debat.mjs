export const order = 100;

export async function handle(req, res, url, parts, ctx) {
  if (req.method !== 'POST' || parts[0] !== 'api' || parts[1] !== 'conseil' || parts[2] !== 'debat') {
    return false;
  }

  try {
    const body = await ctx.helpers.readBody(req);
    const { voleurIds, question, rounds = 2 } = body;

    if (!Array.isArray(voleurIds) || !voleurIds.length || !question || rounds > 3) {
      return ctx.helpers.sendError(res, 400, 'Paramètres invalides');
    }

    // Vérifie que les voleurs existent
    const voleurs = ctx.store.voleurs || [];
    const participants = voleurIds.map(id => voleurs.find(v => v.id === id)).filter(Boolean);
    if (participants.length !== voleurIds.length) {
      return ctx.helpers.sendError(res, 404, 'Un ou plusieurs voleurs introuvables');
    }

    const debatId = ctx.helpers.newId('debat');
    const debatRun = {
      id: debatId,
      query: question,
      rounds: [],
      synthese: '',
      ts: Date.now()
    };

    // Exécution des rounds
    let historique = '';
    for (let round = 1; round <= rounds; round++) {
      const contributions = [];
      
      for (const voleur of participants) {
        const messages = [
          { role: 'system', content: voleur.systemPrompt },
          { role: 'user', content: `Débat Round ${round}/${rounds}\nQuestion: ${question}\n${historique}` }
        ];

        const { text } = await ctx.moe.chatCompletion({
          model: voleur.modele,
          messages,
          maxTokens: voleur.capTokens,
          temperature: 0.7
        }, voleur.provider);

        contributions.push({ voleurId: voleur.id, text });
        historique += `[Round ${round}] ${voleur.nom}: ${text}\n\n`;
      }

      debatRun.rounds.push({ tour: round, contributions });
    }

    // Synthèse finale avec qwen-max
    const synthPrompt = `Synthétisez ce débat en 1 paragraphe:\nQuestion: ${question}\n\n${historique}`;
    const { text: synthese } = await ctx.moe.chatCompletion({
      model: 'qwen-max',
      messages: [{ role: 'user', content: synthPrompt }],
      maxTokens: 500,
      temperature: 0.3
    });

    debatRun.synthese = synthese;

    // Persistance
    ctx.store.debats ||= [];
    ctx.store.debats.push(debatRun);
    await ctx.save();

    return ctx.helpers.sendJson(res, 200, debatRun);
  } catch (err) {
    console.error('Erreur débat:', err);
    return ctx.helpers.sendError(res, 500, 'Erreur interne');
  }
}
