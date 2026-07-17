      // PATCH /api/voleurs/:id
      if (req.method === "PATCH" && parts.length === 3) {
        const voleur = store.voleurs.find((v) => v.id === parts[2]);
        if (!voleur) return sendError(res, 404, "Voleur introuvable");
        const patch = await readBody(req);
        let needRecompute = false;

        if (patch.nom !== undefined) {
          if (typeof patch.nom !== "string" || !patch.nom.trim()) return sendError(res, 400, "nom invalide");
          voleur.nom = patch.nom.trim();
        }
        if (patch.modele !== undefined) {
          if (!QWEN_MODELS.includes(patch.modele)) return sendError(res, 400, "modele invalide");
          voleur.modele = patch.modele;
        }
        if (patch.effort !== undefined) {
          if (!EFFORTS.includes(patch.effort)) return sendError(res, 400, "effort invalide");
          voleur.effort = patch.effort;
        }
        if (patch.systemPrompt !== undefined) {
          if (typeof patch.systemPrompt !== "string") return sendError(res, 400, "systemPrompt invalide");
          voleur.systemPrompt = patch.systemPrompt;
        }
        if (patch.provider !== undefined) {
          // Validate provider? For now accept any string.
          voleur.provider = patch.provider;
          needRecompute = true;
        }
        if (patch.capTokens !== undefined) {
          if (!Number.isFinite(patch.capTokens) || patch.capTokens < 32) return sendError(res, 400, "capTokens invalide");
          voleur.capTokens = Math.floor(patch.capTokens);
        }
        if (patch.actif !== undefined) {
          voleur.actif = Boolean(patch.actif);
        }
        if (patch.perf !== undefined) {
          if (!Number.isFinite(patch.perf)) return sendError(res, 400, "perf invalide");
          voleur.perf = Math.max(0, Math.min(1, patch.perf));
        }
        if (patch.specialite !== undefined) {
          if (typeof patch.specialite !== "string" || !patch.specialite.trim()) {
            return sendError(res, 400, "specialite invalide");
          }
          voleur.specialite = patch.specialite.trim();
          needRecompute = true;
        }
        if (needRecompute) {
          // Recalcul embedding réel (la spécialité pilote le routing) using the voleur's current provider
          const { embedding } = await embedText(voleur.specialite, voleur.provider);
          voleur.embedding = embedding;
        }
        save();
        return sendJson(res, 200, voleur);
      }
