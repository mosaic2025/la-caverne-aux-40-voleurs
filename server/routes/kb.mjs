// T02 — KB / datasets (Runes du Coffre). Chunk maison + embeddings avec fallback Qwen → Ollama → hash.
import { ingestDocument, deleteDocument, searchVectors, stats } from "../kb/vectorStore.mjs";
import { embedText } from "../kb/embeddings.mjs";

export const order = 100;
export async function handle(req, res, url, parts, ctx) {
  const { sendJson, sendError, readBody, newId } = ctx.helpers;
  if (parts[0] !== "api" || parts[1] !== "kb") return false;
  ctx.store.kb ||= [];

  // GET /api/kb — liste des docs + stats vector store
  if (req.method === "GET" && parts.length === 2) {
    return sendJson(res, 200, { docs: ctx.store.kb, vectorStats: stats() }), true;
  }

  // POST /api/kb — { nom, text } -> chunk + embed + index
  if (req.method === "POST" && parts.length === 2) {
    const body = await readBody(req);
    const nom = String(body?.nom || "").trim();
    const text = String(body?.text || "");
    const provider = body?.provider || ctx.defaultProvider || "qwen-cloud";
    if (!nom || !text.trim()) { sendError(res, 400, "nom et text requis"); return true; }
    const docId = newId("kb");
    const added = await ingestDocument({ docId, text, embedFn: (p) => embedText(p, provider), metadata: { nom } });
    const doc = { id: docId, nom, taille: text.length, chunks: added.length, ts: Date.now() };
    ctx.store.kb.push(doc);
    ctx.save();
    return sendJson(res, 201, { doc, indexed: added.length }), true;
  }

  // POST /api/kb/search — { query, k?, minScore? } -> top-k chunks
  if (req.method === "POST" && parts[2] === "search") {
    const body = await readBody(req);
    const query = String(body?.query || "");
    if (!query.trim()) { sendError(res, 400, "query requise"); return true; }
    const k = Number.isFinite(body?.k) ? Math.max(1, Math.floor(body.k)) : 5;
    const minScore = Number.isFinite(body?.minScore) ? body.minScore : 0.0;
    const provider = body?.provider || ctx.defaultProvider || "qwen-cloud";
    const { embedding } = await embedText(query, provider);
    const scored = searchVectors(embedding, k, minScore);
    return sendJson(res, 200, { query, hits: scored }), true;
  }

  // GET /api/kb/stats
  if (req.method === "GET" && parts[2] === "stats") {
    return sendJson(res, 200, { docs: ctx.store.kb.length, vectorStats: stats() }), true;
  }

  // DELETE /api/kb/:id
  if (req.method === "DELETE" && parts.length === 3) {
    const id = parts[2];
    ctx.store.kb = ctx.store.kb.filter((d) => d.id !== id);
    deleteDocument(id);
    ctx.save();
    res.writeHead(204); res.end();
    return true;
  }
  return false;
}
