// ============================================================
// Routes Meta — orchestrateur multicouche, capacités, connaissance partagée
// ============================================================

import { MetaOrchestrator } from "../orchestrator.mjs";
import { contribute, sharedStats } from "../sharedMind/connector.mjs";
import { tts } from "../gen/tts.mjs";
import { analyzeImage } from "../vision/analyze.mjs";
import { Fable5Client } from "../fable5/fable5Client.mjs";
import { isDemo, demoFable5, demoOcr, demoTts, demoImage, demoVideo } from "../mocks/demo.mjs";
import { ingest } from "../sharedMind/universalKb.mjs";
import { buildGraph } from "../sharedMind/conceptGraph.mjs";
import { ocr } from "../vision/ocr.mjs";

export const order = 100;

export async function handle(req, res, url, parts, ctx) {
  const { sendJson, sendError, readBody } = ctx.helpers;

  // GET /api/meta/capabilities
  if (req.method === "GET" && url.pathname === "/api/meta/capabilities") {
    const orchestrator = new MetaOrchestrator(ctx.store);
    return sendJson(res, 200, { capabilities: orchestrator.listCapabilities() }), true;
  }

  // POST /api/meta/orchestrate
  if (req.method === "POST" && url.pathname === "/api/meta/orchestrate") {
    const body = await readBody(req);
    const orchestrator = new MetaOrchestrator(ctx.store);
    try {
      const route = await orchestrator.route(body);
      return sendJson(res, 200, route), true;
    } catch (e) { return sendError(res, 500, String(e.message || e)), true; }
  }

  // POST /api/shared-knowledge/contribute
  if (req.method === "POST" && url.pathname === "/api/shared-knowledge/contribute") {
    const body = await readBody(req);
    const userId = String(body?.userId || "anonymous");
    const text = String(body?.text || "");
    if (!text.trim()) return sendError(res, 400, "text requis");
    const entry = contribute(ctx.store, { userId, text, source: body?.source, tags: body?.tags });
    ctx.save();
    return sendJson(res, 201, entry), true;
  }

  // GET /api/shared-knowledge/stats
  if (req.method === "GET" && url.pathname === "/api/shared-knowledge/stats") {
    return sendJson(res, 200, sharedStats(ctx.store)), true;
  }

  // POST /api/shared-knowledge/ingest
  if (req.method === "POST" && url.pathname === "/api/shared-knowledge/ingest") {
    const body = await readBody(req);
    const title = String(body?.title || "").trim();
    const text = String(body?.text || "").trim();
    if (!title || !text) return sendError(res, 400, "title et text requis");
    const doc = ingest(ctx.store, { title, text, source: body?.source, tags: body?.tags });
    ctx.save();
    return sendJson(res, 201, doc), true;
  }

  // POST /api/shared-knowledge/search
  if (req.method === "POST" && url.pathname === "/api/shared-knowledge/search") {
    const body = await readBody(req);
    const query = String(body?.query || "").trim();
    if (!query) return sendError(res, 400, "query requis");
    const k = Number.isFinite(body?.k) ? Math.max(1, Math.floor(body.k)) : 5;
    const { searchKb } = await import("../kb/search.mjs");
    const provider = body?.provider || "qwen-cloud";
    const hits = await searchKb(query, { k, provider });
    return sendJson(res, 200, { query, hits }), true;
  }

  // GET /api/shared-knowledge/graph
  if (req.method === "GET" && url.pathname === "/api/shared-knowledge/graph") {
    return sendJson(res, 200, buildGraph(ctx.store)), true;
  }

  // POST /api/gen/image
  if (req.method === "POST" && url.pathname === "/api/gen/image") {
    const body = await readBody(req);
    try {
      if (isDemo()) return sendJson(res, 200, demoImage(String(body?.prompt || ""))), true;
      const { generateImage } = await import("../gen/image.mjs");
      const r = await generateImage(String(body?.prompt || ""));
      return sendJson(res, 200, r), true;
    } catch (e) { return sendError(res, 500, String(e.message || e)), true; }
  }

  // POST /api/gen/video
  if (req.method === "POST" && url.pathname === "/api/gen/video") {
    const body = await readBody(req);
    try {
      if (isDemo()) return sendJson(res, 200, demoVideo(String(body?.prompt || ""))), true;
      const { generateVideo } = await import("../gen/video.mjs");
      const r = await generateVideo(String(body?.prompt || ""));
      return sendJson(res, 200, r), true;
    } catch (e) { return sendError(res, 500, String(e.message || e)), true; }
  }

  // POST /api/vision/ocr
  if (req.method === "POST" && url.pathname === "/api/vision/ocr") {
    const body = await readBody(req);
    try {
      const r = await ocr(body?.imageUrl);
      return sendJson(res, 200, r), true;
    } catch (e) { return sendError(res, 500, String(e.message || e)), true; }
  }

  // POST /api/tts
  if (req.method === "POST" && url.pathname === "/api/tts") {
    const body = await readBody(req);
    try {
      if (isDemo()) return sendJson(res, 200, demoTts(String(body?.text || ""))), true;
      const r = await tts({ text: body?.text, voice: body?.voice });
      return sendJson(res, 200, r), true;
    } catch (e) { return sendError(res, 500, String(e.message || e)), true; }
  }

  // POST /api/vision/analyze
  if (req.method === "POST" && url.pathname === "/api/vision/analyze") {
    const body = await readBody(req);
    try {
      if (isDemo()) return sendJson(res, 200, demoOcr(body?.imageUrl)), true;
      const r = await analyzeImage({ imageUrl: body?.imageUrl, prompt: body?.prompt });
      return sendJson(res, 200, r), true;
    } catch (e) { return sendError(res, 500, String(e.message || e)), true; }
  }

  // POST /api/fable5
  if (req.method === "POST" && url.pathname === "/api/fable5") {
    const body = await readBody(req);
    const prompt = String(body?.prompt || "");
    const model = String(body?.model || "anthropic/claude-fable-5");
    if (!prompt) return sendError(res, 400, "prompt requis");
    try {
      if (isDemo()) return sendJson(res, 200, demoFable5(prompt)), true;
      const client = new Fable5Client(model);
      const r = await client.single(prompt, { system: body?.system, maxTokens: body?.maxTokens, temperature: body?.temperature });
      return sendJson(res, 200, r), true;
    } catch (e) { return sendError(res, 500, String(e.message || e)), true; }
  }

  return false;
}
