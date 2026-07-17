// T10 — Duel au Sabre : la bande (MoE) vs un agent unique. Type SabreDuel.
export const order = 100;
export async function handle(req, res, url, parts, ctx) {
  const { sendJson, sendError, readBody } = ctx.helpers;
  if (parts[0] !== "api" || parts[1] !== "arene" || parts[2] !== "sabre") return false;
  if (req.method === "GET") {
    ctx.store.sabres ||= [];
    const recent = ctx.store.sabres.slice(-50).reverse();
    const wins = recent.filter((d) => d.gagnant === "bande").length;
    sendJson(res, 200, { duels: recent, total: recent.length, bandeWins: wins, soloWins: recent.length - wins });
    return true;
  }
  if (req.method !== "POST") return false;
  const body = await readBody(req);
  const query = String(body?.query || body?.question || "").trim();
  const genie = ctx.store.genies.find((g) => g.id === body?.genieId);
  if (!query || !genie) { sendError(res, 400, "genieId et query requis"); return true; }
  try {
    const { run } = await ctx.moe.runMoe({ genie, voleurs: ctx.store.voleurs, query });
    const solo = await ctx.moe.runBaseline({ model: "qwen-max", query, maxTokens: 700 });
    const jr = await ctx.moe.chatCompletion({
      model: "qwen-max", temperature: 0.1, maxTokens: 200,
      messages: [{ role: "user", content: `Question:\n${query}\n\nRéponse SOLO:\n${solo.text}\n\nRéponse BANDE:\n${run.answer}\n\nNote chaque réponse sur 10. Réponds STRICT JSON {"solo":n,"bande":n}.` }],
    });
    let s = 5, b = 5;
    try { const j = JSON.parse(jr.text.match(/\{[^}]+\}/)?.[0] || "{}"); s = +j.solo || 5; b = +j.bande || 5; } catch {}
    const duel = { query, solo: solo.text, bande: run.answer, gagnant: b >= s ? "bande" : "solo", ecartQualite: Number((b - s).toFixed(2)) };
    ctx.store.sabres ||= []; ctx.store.sabres.push({ ...duel, ts: Date.now() }); ctx.save();
    sendJson(res, 200, duel);
  } catch (e) { sendError(res, 500, String(e.message || e)); }
  return true;
}
