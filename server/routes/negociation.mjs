// T07 — Négociation / résolution de conflits entre voleurs. Type NegoSession.
export const order = 100;
export async function handle(req, res, url, parts, ctx) {
  const { sendJson, sendError, readBody, newId } = ctx.helpers;
  if (parts[0] !== "api" || parts[1] !== "negociation") return false;
  if (req.method !== "POST") return false;
  const body = await readBody(req);
  const query = String(body?.query || body?.question || "").trim();
  const voleurIds = Array.isArray(body?.voleurIds) ? body.voleurIds : [];
  const pool = ctx.store.voleurs.filter((v) => voleurIds.includes(v.id) && v.actif);
  if (!query || pool.length < 2) { sendError(res, 400, "query + voleurIds[] (min 2) requis"); return true; }
  try {
    // 1) positions initiales (1 appel / voleur)
    const tours = [];
    for (const v of pool) {
      const r = await ctx.moe.chatCompletion({
        model: v.modele, temperature: 0.5, maxTokens: Math.min(v.capTokens, 220),
        messages: [{ role: "system", content: `${v.systemPrompt}\nDéfends ta position en 2-3 phrases.` }, { role: "user", content: query }],
      });
      tours.push({ voleurId: v.id, position: r.text });
    }
    // 2) tour de concession : chacun voit les autres et concède/ajuste
    for (const v of pool) {
      const autres = tours.filter((t) => t.voleurId !== v.id).map((t) => t.position).join("\n---\n");
      const r = await ctx.moe.chatCompletion({
        model: v.modele, temperature: 0.4, maxTokens: 160,
        messages: [{ role: "system", content: `${v.systemPrompt}\nAu vu des autres positions, indique EN 1 phrase la concession que tu acceptes.` }, { role: "user", content: `Question: ${query}\nAutres positions:\n${autres}` }],
      });
      const t = tours.find((x) => x.voleurId === v.id);
      if (t) t.concession = r.text;
    }
    // 3) accord final synthétisé
    const acc = await ctx.moe.chatCompletion({
      model: "qwen-max", temperature: 0.2, maxTokens: 400,
      messages: [{ role: "user", content: `Synthétise un accord commun résolvant les tensions.\nQuestion: ${query}\nPositions + concessions:\n${tours.map((t) => `- ${t.position} [concession: ${t.concession || "—"}]`).join("\n")}\nDonne l'accord final, puis sur la dernière ligne "RESOLU: oui|non".` }],
    });
    const resolu = /RESOLU:\s*oui/i.test(acc.text);
    const session = { id: newId("nego"), query, tours, accord: acc.text.replace(/RESOLU:.*$/i, "").trim(), resolu, ts: Date.now() };
    ctx.store.negos ||= []; ctx.store.negos.push(session); ctx.save();
    sendJson(res, 200, session);
  } catch (e) { sendError(res, 500, String(e.message || e)); }
  return true;
}
