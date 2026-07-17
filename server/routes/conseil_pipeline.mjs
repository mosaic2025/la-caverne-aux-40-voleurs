export const order = 100;

export async function handle(req, res, url, parts, ctx) {
  if (req.method !== 'POST' || parts[0] !== 'api' || parts[1] !== 'conseil' || parts[2] !== 'pipeline') {
    return false;
  }

  try {
    const body = await ctx.helpers.readBody(req);
    if (!body.steps || !Array.isArray(body.steps) || !body.question) {
      return ctx.helpers.sendError(res, 400, 'Requête invalide: steps et question requis');
    }

    const runId = ctx.helpers.newId('pipe');
    const pipelineRun = {
      id: runId,
      query: body.question,
      steps: [],
      ts: Date.now()
    };

    let previousSummary = '';
    for (const step of body.steps) {
      if (!step.voleurId || !step.consigne) {
        continue;
      }

      const voleur = ctx.store.voleurs?.find(v => v.id === step.voleurId);
      if (!voleur) {
        continue;
      }

      // Compression du contexte précédent si nécessaire
      let compressedContext = previousSummary;
      if (previousSummary.length > 300) {
        const compressionRes = await ctx.moe.chatCompletion({
          model: 'qwen-turbo',
          messages: [
            { role: 'system', content: 'Compressez ce texte en <300 tokens sans perte de sens, pour servir de contexte à la prochaine étape.' },
            { role: 'user', content: previousSummary }
          ],
          maxTokens: 300,
          temperature: 0.2
        });
        compressedContext = compressionRes.text;
      }

      const prompt = `${step.consigne}\n\nContexte:\n${compressedContext}\n\nQuestion: ${body.question}`;
      
      const stepRes = await ctx.moe.chatCompletion({
        model: voleur.modele,
        messages: [
          { role: 'system', content: voleur.systemPrompt },
          { role: 'user', content: prompt }
        ],
        maxTokens: voleur.capTokens,
        temperature: 0.7
      }, voleur.provider);

      const stepResult = {
        voleurId: step.voleurId,
        role: step.consigne,
        input: compressedContext,
        output: stepRes.text
      };

      pipelineRun.steps.push(stepResult);
      previousSummary = stepRes.text;

      // Mise à jour des stats du voleur
      voleur.tokensUtilises += stepRes.totalTokens;
    }

    // Génération de la synthèse finale
    if (pipelineRun.steps.length > 0) {
      const syntheseRes = await ctx.moe.chatCompletion({
        model: 'qwen-coder-plus',
        messages: [
          { role: 'system', content: 'Synthétisez les résultats du pipeline en une réponse finale concise.' },
          { role: 'user', content: `Question: ${body.question}\n\nÉtapes:\n${pipelineRun.steps.map(s => `[${s.role}] ${s.output}`).join('\n\n')}` }
        ],
        maxTokens: 500,
        temperature: 0.5
      });

      pipelineRun.final = syntheseRes.text;
    }

    // Persistance
    ctx.store.pipelines ||= [];
    ctx.store.pipelines.push(pipelineRun);
    await ctx.save();

    return ctx.helpers.sendJson(res, 200, pipelineRun);
  } catch (err) {
    console.error('Pipeline error:', err);
    return ctx.helpers.sendError(res, 500, 'Erreur interne du pipeline');
  }
}
