// T02 — KB / datasets (Runes du Coffre). 0 dépendance. Chunk maison + embeddings Qwen.
const CHUNK = 600, OVERLAP = 80;

function chunkText(text) {
  const clean = String(text).replace(/\r/g, "").trim();
  const out = [];
  for (let i = 0; i < clean.length; i += CHUNK - OVERLAP) {
    const piece = clean.slice(i, i + CHUNK).trim();
    if (piece) out.push(piece);
    if (i + CHUNK >= clean.length) break;
  }
  return out.length ? out : [clean].filter(Boolean);
}
function cosine(a, b) {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return d / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export const order = 100;
export async function handle(req, res, url, parts, ctx) {
  const { sendJson, sendError, readBody, newId } = ctx.helpers;
  if (parts[0] !== "api" || parts[1] !== "kb") return false;
  ctx.store.kb ||= [];
  ctx.store.kbChunks ||= [];

  // GET /api/kb — liste des docs
  if (req.method === "GET" && parts.length === 2) {
    return sendJson(res, 200, ctx.store.kb), true;
  }
  // POST /api/kb — { nom, text } -> chunk + embed
  if (req.method === "POST" && parts.length === 2) {
    const body = await readBody(req);
    const nom = String(body?.nom || "").trim();
    const text = String(body?.text || "");
    if (!nom || !text.trim()) { sendError(res, 400, "nom et text requis"); return true; }
    const docId = newId("kb");
    const pieces = chunkText(text);
    for (const p of pieces) {
      const { embedding } = await ctx.moe.embedText(p);
      ctx.store.kbChunks.push({ id: newId("chk"), docId, text: p, embedding });
    }
    const doc = { id: docId, nom, taille: text.length, chunks: pieces.length, ts: Date.now() };
    ctx.store.kb.push(doc);
    ctx.save();
    return sendJson(res, 201, doc), true;
  }
  // POST /api/kb/search — { query, k? } -> top-k chunks
  if (req.method === "POST" && parts[2] === "search") {
    const body = await readBody(req);
    const query = String(body?.query || "");
    if (!query.trim()) { sendError(res, 400, "query requise"); return true; }
    const k = Number.isFinite(body?.k) ? Math.max(1, Math.floor(body.k)) : 5;
    const { embedding: qe } = await ctx.moe.embedText(query);
    const scored = ctx.store.kbChunks
      .filter((c) => Array.isArray(c.embedding))
      .map((c) => ({ chunkId: c.id, docId: c.docId, text: c.text, score: Number(cosine(qe, c.embedding).toFixed(4)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
    return sendJson(res, 200, scored), true;
  }
  // DELETE /api/kb/:id
  if (req.method === "DELETE" && parts.length === 3) {
    const id = parts[2];
    ctx.store.kb = ctx.store.kb.filter((d) => d.id !== id);
    ctx.store.kbChunks = ctx.store.kbChunks.filter((c) => c.docId !== id);
    ctx.save();
    res.writeHead(204); res.end();
    return true;
  }
  return false;
}
