import { generateProposal, applyChanges } from "../maxi/assistant.mjs";

export async function handleMaxiRoutes(req, res, url, parts, ctx) {
  if (parts[0] !== "api" || parts[1] !== "maxi") return false;
  const { sendJson, sendError, readBody } = ctx.helpers;
  const registry = ctx.maxi.registry;
  if (req.method === "GET" && parts.length === 2) return sendJson(res, 200, { contracts: registry.list() });
  if (req.method === "GET" && parts.length === 3) {
    const contract = registry.get(decodeURIComponent(parts[2]));
    if (!contract) return sendError(res, 404, "Contrat Maxi introuvable");
    return sendJson(res, 200, contract);
  }
  if (req.method === "POST" && url.pathname === "/api/maxi/preview") {
    const body = await readBody(req);
    const naturalPrompt = body.naturalPrompt || body.prompt;
    if (typeof naturalPrompt !== "string" || !naturalPrompt.trim()) return sendError(res, 400, "naturalPrompt requis");
    const proposal = await generateProposal(naturalPrompt, body.currentManifest || null, {
      chatCompletion: ctx.moe.chatCompletion,
      model: body.model || "qwen-plus",
      context: body.context || null,
    });
    return sendJson(res, 200, proposal);
  }
  if (req.method === "POST" && url.pathname === "/api/maxi/apply") {
    const body = await readBody(req);
    if (!body.id || !body.manifest) return sendError(res, 400, "id et manifest requis");
    const result = await applyChanges(body, registry);
    ctx.store.maxiContracts = registry.list();
    ctx.save();
    return sendJson(res, 200, result);
  }
  return sendError(res, 404, "Route Maxi inconnue");
}

