
      // DELETE /api/voleurs/:id
      if (req.method === "DELETE" && parts.length === 3) {
        const idx = store.voleurs.findIndex((v) => v.id === parts[2]);
        if (idx === -1) return sendError(res, 404, "Voleur introuvable");
        const id = store.voleurs[idx].id;
        store.voleurs.splice(idx, 1);
        // Retire la référence dans les génies
        for (const g of store.genies) {
          g.voleursIds = g.voleursIds.filter((vid) => vid !== id);
        }
        save();
        res.writeHead(204);
        res.end();
        return;
      }
    }

    // ----- GENIES -----
    if (parts[0] === "api" && parts[1] === "genies") {
      if (req.method === "GET" && parts.length === 2) {
        return sendJson(res, 200, store.genies);
      }
      if (req.method === "POST" && parts.length === 2) {
        const body = await readBody(req);
        const errors = validateGenieInput(body, store);
        if (errors.length) return sendError(res, 400, errors.join(" ; "));
        // Determine provider from the first voleur (if any) else default
        let provider = DEFAULT_PROVIDER;
        if (Array.isArray(body.voleursIds) && body.voleursIds.length > 0) {
          const firstVoleur = store.voleurs.find(v => v.id === body.voleursIds[0]);
          if (firstVoleur) {
            provider = firstVoleur.provider;
          }
        }
        const genie = {
          id: newId("gen"),
          nom: body.nom.trim(),
          voleursIds: [...body.voleursIds],
          voiceCharter: body.voiceCharter,
          budgetTotal: Math.floor(body.budgetTotal),
          reliquat: Math.floor(body.budgetTotal),
          provider,
        };
        store.genies.push(genie);
        save();
        return sendJson(res, 201, genie);
      }

      // POST /api/genies/forge — crée N modèles (voleurs) + le Génie en un appel
      if (req.method === "POST" && parts.length === 3 && parts[2] === "forge") {
        const body = await readBody(req);
        const models = Array.isArray(body.models) ? body.models : [];
        if (typeof body.nom !== "string" || !body.nom.trim()) return sendError(res, 400, "nom du Génie requis");
        if (!models.length) return sendError(res, 400, "au moins un modèle requis");
        const created = [];
        let provider = null;
        for (const m of models) {
          const specialite = String(m.specialite || m.nom || "").trim();
          const input = {
            nom: m.nom, specialite, modele: m.modele,
            effort: m.effort || "med", systemPrompt: m.systemPrompt || "",
            capTokens: m.capTokens || 400,
            provider: m.provider,
          };
          const errs = validateVoleurInput(input);
          if (errs.length) return sendError(res, 400, `modèle "${m.nom}": ${errs.join(", ")}`);
          const providerForModel = input.provider || DEFAULT_PROVIDER;
          const { embedding } = await embedText(specialite, providerForModel);
          const voleur = {
            id: newId("vol"), nom: input.nom.trim(), specialite, modele: input.modele,
            effort: input.effort, systemPrompt: input.systemPrompt, capTokens: Math.floor(input.capTokens),
            embedding, actif: true, tokensUtilises: 0, perf: 0.5,
            provider: providerForModel,
          };
          store.voleurs.push(voleur);
          created.push(voleur);
          // Track provider consistency
          if (provider === null) {
            provider = providerForModel;
          } else if (provider !== providerForModel) {
            return sendError(res, 400, `Tous les modèles doivent utiliser le même fournisseur. Modèle "${m.nom}" utilise "${providerForModel}" alors que les précédents utilisent "${provider}".`);
          }
        }
        const budget = Math.floor(Number(body.budgetTotal) > 0 ? body.budgetTotal : 100000);
        const genie = {
          id: newId("gen"), nom: body.nom.trim(), voleursIds: created.map((v) => v.id),
          voiceCharter: typeof body.voiceCharter === "string" && body.voiceCharter.trim()
            ? body.voiceCharter : "Une seule voix, claire, directe, en français. Ne révèle jamais les experts internes.",
          budgetTotal: budget, reliquat: budget,
          k: Number.isFinite(body.k) ? Math.max(1, Math.floor(body.k)) : undefined,
          dominance: Number.isFinite(body.dominance) ? body.dominance : undefined,
          ml: body.ml !== false,
          provider, // Store the common provider in the genie
        };
        store.genies.push(genie);
        save();
        return sendJson(res, 201, { genie, voleurs: created });
      }
    }

    // ----- ASSISTANT CONTEXTUEL (chat repliable par onglet) -----
    if (req.method === "POST" && url.pathname === "/api/assistant") {
      const body = await readBody(req);
      const { tab, message, history, provider, model } = body;
      if (typeof message !== "string" || !message.trim()) return sendError(res, 400, "message requis");
      const selectedProvider = provider || DEFAULT_PROVIDER;
      const selectedModel = model || "qwen-turbo";
      // Validate model (for now only Qwen models are supported in assistant)
      if (!QWEN_MODELS.includes(selectedModel)) {
        return sendError(res, 400, `Modèle non supporté: ${selectedModel}. Modèles disponibles: ${QWEN_MODELS.join(", ")}`);
      }
      const HELP = {
        "Le Camp": "créer des Voleurs (experts Qwen) : nom, spécialité (pilote le routage par embedding), modèle Qwen, effort, prompt système.",
        "Le Repaire": "superviser le chef, le roster des Voleurs, la consommation de tokens en temps réel et le budget restant.",
        "Le Génie": "forger un Génie (assemblage de modèles Qwen fusionnés en une voix unique) et dialoguer avec lui.",
        "Le Conseil de Guerre": "faire s'affronter deux Voleurs sur une question, avec un juge impartial.",
        "Les Trésors": "mesurer le gain de la Caverne vs un agent unique (qualité, latence, coût, tokens).",
      };
      const ctx = HELP[tab] || "l'application La Caverne aux 40 Voleurs.";
      const messages = [
        { role: "system", content: `Tu es l'assistant de l'onglet « ${tab || "?"} ». Cet onglet sert à : ${ctx} Réponds bref, concret, en français, orienté action. N'invente pas de fonctions inexistantes.` },
        ...(Array.isArray(history) ? history.slice(-6).filter((h) => h && typeof h.content === "string") : []),
        { role: "user", content: String(message) },
      ];
      try {
        const r = await chatCompletion({ model: selectedModel, messages, maxTokens: 400, temperature: 0.5 }, selectedProvider);
        return sendJson(res, 200, { text: r.text, tokens: r.totalTokens });
      } catch (err) {
        return sendError(res, 500, String(err.message || err));
      }
    }

    // ----- CONSEIL DE GUERRE (duel : 2 voleurs, 1 juge) -----
    if (req.method === "POST" && url.pathname === "/api/conseil/duel") {
      const body = await readBody(req);
      const { voleurAId, voleurBId, query, judgeProvider } = body;
      if (!query || !String(query).trim()) return sendError(res, 400, "query requise");
      const A = store.voleurs.find((v) => v.id === voleurAId);
      const B = store.voleurs.find((v) => v.id === voleurBId);
      if (!A || !B) return sendError(res, 404, "Voleur(s) introuvable(s)");
      const gen = (v) => chatCompletion({
        model: v.modele,
        messages: [
          { role: "system", content: v.systemPrompt || `Tu es ${v.nom}, ${v.specialite}.` },
          { role: "user", content: String(query) },
        ],
        maxTokens: v.capTokens || 400,
        temperature: 0.6,
      }, v.provider); // Use voleur's provider
      try {
        const [ra, rb] = await Promise.all([gen(A), gen(B)]);
        const judgePrompt = `Question:\n${query}\n\nRéponse A (${A.nom}):\n${ra.text}\n\nRéponse B (${B.nom}):\n${rb.text}\n\nTu es juge impartial. Note A et B sur 30 (adéquation, fondement, clarté). Réponds STRICTEMENT en JSON: {"scoreA":n,"scoreB":n,"winner":"A"|"B","rationale":"court"}`;
        const jr = await chatCompletion({ model: "qwen-max", messages: [{ role: "user", content: judgePrompt }], maxTokens: 300, temperature: 0.1 }, judgeProvider || DEFAULT_PROVIDER);
        let verdict;
        try { verdict = JSON.parse(jr.text.match(/\{[\s\S]*\}/)?.[0] ?? "{}"); } catch { verdict = { rationale: jr.text }; }
        return sendJson(res, 200, {
          a: { voleurId: A.id, nom: A.nom, text: ra.text, tokens: ra.totalTokens },
          b: { voleurId: B.id, nom: B.nom, text: rb.text, tokens: rb.totalTokens },
          verdict,
        });
      } catch (err) {
        return sendError(res, 500, String(err.message || err));
      }
    }

    // ----- ASK (SSE) -----
    if (req.method === "POST" && url.pathname === "/api/ask") {
      const body = await readBody(req);
      const { genieId, query, k } = body;
      const userId = String(body.userId || "chef");
      if (typeof genieId !== "string" || typeof query !== "string" || !query.trim()) {
        return sendError(res, 400, "genieId et query requis");
      }
      const genie = store.genies.find((g) => g.id === genieId);
      if (!genie) return sendError(res, 404, "Génie introuvable");

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });

      const sse = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const keepAlive = setInterval(() => {
        try { res.write(": keep-alive\n\n"); } catch { /* connexion fermée */ }
      }, 15000);

      try {
        // Fusion utilisateur : le Génie adapte sa voix au style appris du chef.
        const hint = fusionVoiceHint(store, userId);
        const genieForRun = hint ? { ...genie, voiceCharter: genie.voiceCharter + "\n" + hint } : genie;
        const { run } = await runMoe({
          genie: genieForRun,
          voleurs: store.voleurs,
          query: query.trim(),
          k: Number.isFinite(k) && k >= 1 ? Math.floor(k) : 3,
          onEvent: (type, data) => {
            if (type !== "final") sse(type, data);
          },
        });
        store.runs.push(run);
        // Borne l'historique persisté
        if (store.runs.length > 500) store.runs = store.runs.slice(-500);
        fusionObserve(store, userId, query.trim(), run.answer); // apprentissage du style
        save();
        sse("final", run);
      } catch (err) {
        sse("error", { error: String(err.message || err) });
        save(); // les perfs/tokens peuvent avoir bougé même en erreur
      } finally {
        clearInterval(keepAlive);
        res.end();
      }
      return;
    }

    // ----- BENCHMARK -----
    if (req.method === "POST" && url.pathname === "/api/benchmark") {
      const body = await readBody(req);
      const { genieId, baseline, baselineProvider, questions } = body;
      if (typeof genieId !== "string") return sendError(res, 400, "genieId requis");
      if (!QWEN_MODELS.includes(baseline)) {
        return sendError(res, 400, `baseline invalide (attendu: ${QWEN_MODELS.join(", ")})`);
      }
      const provider = baselineProvider || DEFAULT_PROVIDER;
      const genie = store.genies.find((g) => g.id === genieId);
      if (!genie) return sendError(res, 404, "Génie introuvable");

      const questionList = Array.isArray(questions) && questions.length > 0 ? questions : BENCH_QUESTIONS;

      const baseLatencies = [];
      const cavLatencies = [];
      let baseTokens = 0, cavTokens = 0;
      let baseCost = 0, cavCost = 0;
      let baseQuality = 0, cavQuality = 0;
      let judged = 0;

      for (const q of questionList) {
        // Baseline (agent unique)
        const b = await runBaseline({ model: baseline, query: q, maxTokens: 1024, providerName: provider });
        baseLatencies.push(b.latencyMs);
        baseTokens += b.tokens;
        baseCost += b.cost;

        // Caverne (MoE réel — même série de questions)
        const t0 = Date.now();
        const { run, cost } = await runMoe({
          genie,
          voleurs: store.voleurs,
          query: q,
          k: 3,
          onEvent: () => {},
        });
        cavLatencies.push(Date.now() - t0);
        cavTokens += run.tokens.total;
        cavCost += cost;
        store.runs.push(run);
        if (store.runs.length > 500) store.runs = store.runs.slice(-500);

        // Juge qualité qwen-max (A = baseline, B = caverne, anonymisé)
        const j = await judgeQuality({
          query: q,
          baselineAnswer: b.text,
          caverneAnswer: run.answer,
        });
        baseQuality += j.baseline;
        cavQuality += j.caverne;
        judged++;
      }
      save();

      baseQuality = judged ? baseQuality / judged : 0;
      cavQuality = judged ? cavQuality / judged : 0;

      const baseP95 = percentile(baseLatencies, 95);
      const cavP95 = percentile(cavLatencies, 95);
      const baseAvgLatency = baseLatencies.length ? (baseLatencies.reduce((a, b) => a + b, 0) / baseLatencies.length) : 0;
      const cavgAvgLatency = cavLatencies.length ? (cavLatencies.reduce((a, b) => a + b, 0) / cavLatencies.length) : 0;
      const baseCostPer1k = baseTokens > 0 ? (baseCost / baseTokens) * 1000 : 0;
      const cavCostPer1k = cavTokens > 0 ? (cavCost / cavTokens) * 1000 : 0;
      const baseAvgTokens = baseTokens / questionList.length;
      const cavgAvgTokens = cavTokens / questionList.length;

      const gain = (b, c, lowerIsBetter) => {
        if (b === 0) return 0;
        const pct = lowerIsBetter ? ((b - c) / b) * 100 : ((c - b) / b) * 100;
        return Number(pct.toFixed(2));
      };

      const result = {
        baselineModel: baseline,
        metrics: [
          {
            label: "qualité",
            baseline: Number(baseQuality.toFixed(2)),
            caverne: Number(cavQuality.toFixed(2)),
            gainPct: gain(baseQuality, cavQuality, false),
          },
          {
            label: "latence p95",
            baseline: baseP95,
            caverne: cavP95,
            gainPct: gain(baseP95, cavP95, true),
          },
          {
            label: "latence moyenne",
            baseline: Number(baseAvgLatency.toFixed(2)),
            caverne: Number(cavgAvgLatency.toFixed(2)),
            gainPct: gain(baseAvgLatency, cavgAvgLatency, true),
          },
          {
            label: "coût/1k",
            baseline: Number(baseCostPer1k.toFixed(6)),
            caverne: Number(cavCostPer1k.toFixed(6)),
            gainPct: gain(baseCostPer1k, cavCostPer1k, true),
          },
          {
            label: "tokens",
            baseline: baseTokens,
            caverne: cavTokens,
            gainPct: gain(baseTokens, cavTokens, true),
          },
          {
            label: "tokens/moyenne",
            baseline: Number(baseAvgTokens.toFixed(2)),
            caverne: Number(cavgAvgTokens.toFixed(2)),
            gainPct: gain(baseAvgTokens, cavgAvgTokens, true),
          },
        ],
        ts: Date.now(),
      };

      return sendJson(res, 200, result);
    }

    // ----- RUNS (lecture pour Le Repaire / Les Trésors) -----
    if (req.method === "GET" && url.pathname === "/api/runs") {
      return sendJson(res, 200, store.runs);
    }

    return sendError(res, 404, `Route inconnue: ${req.method} ${url.pathname}`);
  } catch (err) {
    if (!res.headersSent) {
      return sendError(res, 500, String(err.message || err));
    }
    try { res.end(); } catch { /* déjà fermé */ }
  }
});

server.listen(PORT, () => {
  console.log(`🏔️  La Caverne aux 40 Voleurs — backend prêt sur http://localhost:${PORT}`);
  console.log(`    Données : ${DATA_FILE}`);
  console.log(`    Clé DashScope : ${process.env.DASHSCOPE_API_KEY ? "présente" : "⚠️  MANQUANTE (export DASHSCOPE_API_KEY=...)"}`);
});

process.on("SIGINT", () => {
  console.log("\nArrêt — sauvegarde finale…");
  try {
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) {
    console.error("Échec sauvegarde finale:", e.message);
  }
  process.exit(0);
});
