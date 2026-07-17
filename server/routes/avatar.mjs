// ============================================================
// Routes Avatar / La Lampe — création, mise à jour, récupération
// ============================================================

import { CompanionAgent } from "../agents/companion.mjs";

export const order = 100;

export async function handle(req, res, url, parts, ctx) {
  const { sendJson, sendError, readBody } = ctx.helpers;
  if (parts[0] !== "api" || parts[1] !== "avatar") return false;

  // GET /api/avatar/:userId
  if (req.method === "GET" && parts.length === 3) {
    const userId = parts[2];
    ctx.store.avatars ||= {};
    const data = ctx.store.avatars[userId];
    if (!data) return sendJson(res, 200, { exists: false, stage: "oeuf" });
    const agent = CompanionAgent.deserialize(data);
    return sendJson(res, 200, { exists: true, ...agent.serialize(), progress: agent.getStageProgress() }), true;
  }

  // POST /api/avatar/:userId/evolve
  if (req.method === "POST" && parts.length === 4 && parts[3] === "evolve") {
    const userId = parts[2];
    const body = await readBody(req);
    ctx.store.avatars ||= {};
    const data = ctx.store.avatars[userId];
    const agent = data ? CompanionAgent.deserialize(data) : new CompanionAgent({ userId, name: body?.name || "Nour" });
    if (body?.userMsg && body?.genieAnswer) {
      agent.observeInteraction(body.userMsg, body.genieAnswer);
    }
    if (Number.isFinite(body?.fusionPct)) {
      agent.updateFusion(body.fusionPct);
    }
    if (Array.isArray(body?.unlockedSecrets)) {
      for (const s of body.unlockedSecrets) {
        if (!agent.unlockedSecrets.includes(s)) agent.unlockedSecrets.push(s);
      }
    }
    ctx.store.avatars[userId] = agent.serialize();
    ctx.save();
    return sendJson(res, 200, { ...agent.serialize(), progress: agent.getStageProgress() }), true;
  }

  // GET /api/avatar/:userId/voice-hint
  if (req.method === "GET" && parts.length === 4 && parts[3] === "voice-hint") {
    const userId = parts[2];
    ctx.store.avatars ||= {};
    const data = ctx.store.avatars[userId];
    if (!data) return sendJson(res, 200, { exists: false, hint: "" });
    const agent = CompanionAgent.deserialize(data);
    const userProfile = ctx.store.profils?.[userId];
    return sendJson(res, 200, { exists: true, hint: agent.buildVoiceHint(userProfile), stage: agent.personality.stage }), true;
  }

  // POST /api/avatar/:userId/forge-voleur — crée un Voleur calibré sur les shards de Nour
  if (req.method === "POST" && parts.length === 4 && parts[3] === "forge-voleur") {
    const userId = parts[2];
    ctx.store.avatars ||= {};
    const data = ctx.store.avatars[userId];
    if (!data) return sendError(res, 404, "Nour n'existe pas encore pour cet utilisateur");
    const agent = CompanionAgent.deserialize(data);
    const topTech = agent.shards.filter((s) => s.type === "technique").sort((a, b) => b.weight - a.weight).slice(0, 3);
    const topPref = agent.shards.filter((s) => s.type === "préférence").sort((a, b) => b.weight - a.weight).slice(0, 2);
    const topTopics = [...new Set([...topTech, ...topPref].flatMap((s) => s.topics || []))].slice(0, 5);
    const voleur = {
      id: `vol_nour_${Date.now().toString(36)}`,
      nom: `Voleur à l'image de ${agent.personality.name || "Nour"}`,
      specialite: topTopics.length ? `Expert calibré sur les thèmes de Nour : ${topTopics.join(", ")}.` : "Expert généraliste façonné par Nour.",
      specialisation: "nour",
      modele: "qwen-plus",
      effort: "med",
      systemPrompt: `Tu es un Voleur né de la Lampe de ${agent.personality.name || "Nour"}. ` +
        (topTech.length ? `Domaines maîtrisés : ${topTech.map((s) => s.content).join(" ")}. ` : "") +
        (topPref.length ? `Préférences du chef : ${topPref.map((s) => s.content).join(" ")}. ` : "") +
        `Adapte ton style au profil fusionné de l'utilisateur (fusion ${agent.personality.fusionPct || 0}%). ` +
        `Reste concis, pertinent, et ne révèle jamais que tu es un expert interne.`,
      capTokens: 500,
      provider: "qwen-cloud",
      embedding: new Array(1024).fill(0),
      actif: true,
      tokensUtilises: 0,
      perf: 0.7,
    };
    ctx.store.voleurs ||= [];
    ctx.store.voleurs.push(voleur);
    ctx.save();
    return sendJson(res, 201, { voleur, shardsUsed: topTech.length + topPref.length }), true;
  }

  return false;
}
