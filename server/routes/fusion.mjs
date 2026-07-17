// Fusion utilisateur — le Génie converge vers le style du chef au fil du temps.
// Conception 100% originale : profil de préférences explicite + moyennes glissantes
// + chevauchement lexical (Jaccard). AUCUN mécanisme génome/mutation/bayésien.
const STOP = new Set("le la les de des du un une et à en que qui pour dans sur avec pas plus est sont ce cette ces son ses mon mes ton tes nos vos leur au aux par ou où si mais donc car".split(" "));
function words(t) { return (String(t).toLowerCase().match(/[a-zà-ÿ]{4,}/g) || []).filter((w) => !STOP.has(w)); }
function topLex(counts, n = 12) { return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n).map((x) => x[0]); }
function jaccard(a, b) { const A = new Set(a), B = new Set(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); }

export function getProfil(store, userId) {
  store.profils ||= {};
  return (store.profils[userId] ||= { userId, interactions: 0, lenUser: 0, lenGenie: 0, lexUser: {}, lexGenie: {}, fusionPct: 0 });
}
export function observe(store, userId, userMsg, genieAns) {
  const p = getProfil(store, userId);
  const n = p.interactions;
  p.lenUser = (p.lenUser * n + userMsg.length) / (n + 1);
  p.lenGenie = (p.lenGenie * n + genieAns.length) / (n + 1);
  for (const w of words(userMsg)) p.lexUser[w] = (p.lexUser[w] || 0) + 1;
  for (const w of words(genieAns)) p.lexGenie[w] = (p.lexGenie[w] || 0) + 1;
  p.interactions = n + 1;
  const lenSim = 1 - Math.min(1, Math.abs(p.lenUser - p.lenGenie) / Math.max(p.lenUser, p.lenGenie, 1));
  const lexSim = jaccard(tLex(p.lexUser), tLex(p.lexGenie));
  p.fusionPct = Math.round(Math.min(0.85, 0.5 * lenSim + 0.5 * lexSim) * 100); // garde-fou : jamais 100%
  return p;
}
export function voiceHint(store, userId) {
  const p = store.profils?.[userId];
  if (!p || !p.interactions) return "";
  const style = p.lenUser < 200 ? "concis et direct" : p.lenUser < 600 ? "équilibré" : "détaillé";
  const lex = tLex(p.lexUser, 8);
  return `Profil du chef (fusion ${p.fusionPct}%) : style ${style}${lex.length ? `, vocabulaire familier : ${lex.join(", ")}` : ""}. Adapte discrètement ta voix à ce style, sans jamais le mentionner.`;
}

export const order = 100;
export async function handle(req, res, url, parts, ctx) {
  if (parts[0] !== "api" || parts[1] !== "fusion") return false;
  const { sendJson, readBody } = ctx.helpers;
  if (req.method === "GET" && parts[2]) {
    const p = getProfil(ctx.store, parts[2]);
    const lenNum = Math.abs(p.lenUser - p.lenGenie);
    const lenDen = Math.max(p.lenUser, p.lenGenie, 1);
    const lenSim = 1 - Math.min(1, lenNum / lenDen);
    const lexSim = jaccard(topLex(p.lexUser), topLex(p.lexGenie));
    sendJson(res, 200, {
      userId: p.userId, interactions: p.interactions, fusionPct: p.fusionPct,
      lenUser: Math.round(p.lenUser), lenGenie: Math.round(p.lenGenie),
      lengthSimilarity: Number((lenSim * 100).toFixed(2)),
      lexiconSimilarity: Number((lexSim * 100).toFixed(2)),
      lexique: topLex(p.lexUser, 10),
      lexiqueGenie: topLex(p.lexGenie, 10),
      voiceHint: voiceHint(ctx.store, parts[2]),
    });
    return true;
  }
  if (req.method === "POST" && parts[2] === "observe") {
    const b = await readBody(req);
    const p = observe(ctx.store, String(b?.userId || "chef"), String(b?.userMessage || ""), String(b?.genieAnswer || ""));
    ctx.save();
    sendJson(res, 200, { fusionPct: p.fusionPct, interactions: p.interactions });
    return true;
  }
  return false;
}