// 40ᵉ Voleur — historique des verdicts et TTU (Taux de Trahison Utile)
export const order = 100;

export async function handle(req, res, url, parts, ctx) {
  const { sendJson, sendError } = ctx.helpers;
  if (parts[0] !== "api" || parts[1] !== "traitor") return false;

  ctx.store.traitorVerdicts ||= [];

  if (req.method === "GET" && parts.length === 2) {
    const total = ctx.store.traitorVerdicts.length;
    const founded = ctx.store.traitorVerdicts.filter((v) => v.verdict === "founded").length;
    const ttu = total > 0 ? Math.round((founded / total) * 100) : 0;
    return sendJson(res, 200, { verdicts: ctx.store.traitorVerdicts.slice(-50), total, founded, ttu });
  }

  if (req.method === "POST" && parts[2] === "judge") {
    const body = await ctx.helpers.readBody(req);
    const { runId, verdict } = body || {};
    if (!runId || !["founded", "unfounded"].includes(verdict)) {
      return sendError(res, 400, "runId et verdict (founded|unfounded) requis");
    }
    const v = ctx.store.traitorVerdicts.find((x) => x.runId === runId);
    if (v) v.verdict = verdict;
    else ctx.store.traitorVerdicts.push({ runId, verdict, ts: Date.now() });
    ctx.save();
    return sendJson(res, 200, { ok: true });
  }

  return sendError(res, 404, "Route traitor inconnue");
}
