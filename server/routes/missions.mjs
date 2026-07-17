// T08 — Décomposition de missions complexes en sous-tâches assignées. Type MissionPlan.
export const order = 100;
export async function handle(req, res, url, parts, ctx) {
  const { sendJson, sendError, readBody, newId } = ctx.helpers;
  if (parts[0] !== "api" || parts[1] !== "missions") return false;
  ctx.store.missions ||= [];

  // GET /api/missions/:id
  if (req.method === "GET" && parts[2]) {
    const m = ctx.store.missions.find((x) => x.id === parts[2]);
    return m ? (sendJson(res, 200, m), true) : (sendError(res, 404, "mission introuvable"), true);
  }
  // POST /api/missions/decompose { mission, voleurIds }
  if (req.method === "POST" && parts[2] === "decompose") {
    const body = await readBody(req);
    const mission = String(body?.mission || body?.objectif || "").trim();
    const voleurIds = Array.isArray(body?.voleurIds) ? body.voleurIds : [];
    if (!mission) { sendError(res, 400, "mission requise"); return true; }
    const pool = ctx.store.voleurs.filter((v) => voleurIds.includes(v.id) && v.actif);
    const roster = pool.length ? pool : ctx.store.voleurs.filter((v) => v.actif);
    if (!roster.length) { sendError(res, 400, "aucun voleur actif"); return true; }
    try {
      const r = await ctx.moe.chatCompletion({
        model: "qwen-max", temperature: 0.3, maxTokens: 600,
        messages: [{ role: "user", content: `Décompose cette mission en 3 à 5 sous-tâches concrètes et ordonnées.\nMission : ${mission}\nRéponds STRICT JSON: {"sousTaches":["...","..."]}` }],
      });
      let list = [];
      try { list = JSON.parse(r.text.match(/\{[\s\S]*\}/)?.[0] || "{}").sousTaches || []; } catch {}
      if (!list.length) list = [mission];
      const sousTaches = list.slice(0, 6).map((desc, i) => ({
        id: newId("st"), description: String(desc), voleurId: roster[i % roster.length].id,
      }));
      const plan = { id: newId("mis"), mission, sousTaches, ts: Date.now() };
      ctx.store.missions.push(plan); ctx.save();
      sendJson(res, 201, plan);
    } catch (e) { sendError(res, 500, String(e.message || e)); }
    return true;
  }
  // POST /api/missions/:id/run — exécute chaque sous-tâche par son voleur
  if (req.method === "POST" && parts[3] === "run") {
    const plan = ctx.store.missions.find((x) => x.id === parts[2]);
    if (!plan) { sendError(res, 404, "mission introuvable"); return true; }
    try {
      for (const st of plan.sousTaches) {
        const v = ctx.store.voleurs.find((x) => x.id === st.voleurId);
        const r = await ctx.moe.chatCompletion({
          model: v?.modele || "qwen-plus", temperature: 0.4, maxTokens: v?.capTokens || 400,
          messages: [{ role: "system", content: v?.systemPrompt || "" }, { role: "user", content: `Mission globale: ${plan.mission}\nTa sous-tâche: ${st.description}` }],
        });
        st.resultat = r.text;
      }
      const syn = await ctx.moe.chatCompletion({
        model: "qwen-plus", temperature: 0.4, maxTokens: 600,
        messages: [{ role: "user", content: `Synthétise le résultat global de la mission "${plan.mission}" à partir des sous-résultats:\n${plan.sousTaches.map((s) => "- " + s.description + ": " + (s.resultat || "").slice(0, 300)).join("\n")}` }],
      });
      plan.synthese = syn.text; ctx.save();
      sendJson(res, 200, plan);
    } catch (e) { sendError(res, 500, String(e.message || e)); }
    return true;
  }
  return false;
}
