// ============================================================
// L52 — Agent Companion (La Lampe)
// Naît, évolue, apprend et accompagne l'utilisateur.
// ============================================================

import { Agent } from "./base.mjs";
import { createAvatarPersonality, evolvePersonality } from "../humanity/personality.mjs";

const STOP_WORDS = new Set(["le", "la", "les", "de", "des", "du", "un", "une", "et", "à", "en", "que", "qui", "pour", "dans", "sur", "avec", "pas", "plus", "est", "sont", "ce", "cette", "ces", "son", "ses", "mon", "mes", "ton", "tes", "nos", "vos", "leur", "au", "aux", "par", "ou", "où", "si", "mais", "donc", "car", "the", "a", "an", "and", "to", "of", "in", "on", "at", "for", "with", "is", "are", "this", "that", "i", "you", "he", "she", "it", "we", "they"]);

function words(t) {
  return (String(t).toLowerCase().match(/[a-zà-ÿ0-9]{4,}/g) || []).filter((w) => !STOP_WORDS.has(w));
}

function topWords(text, n = 5) {
  const counts = new Map();
  for (const w of words(text)) counts.set(w, (counts.get(w) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([w]) => w);
}

function detectShardType(userMsg, genieAnswer) {
  const u = String(userMsg).toLowerCase();
  const g = String(genieAnswer).toLowerCase();
  const tech = /\b(code|javascript|python|node|react|api|sql|docker|fonction|variable|async|import|export|bug|erreur|test|déploiement|architecture)\b/.test(u + " " + g);
  const emotion = /\b(stress|content|frustr|contente|heureux|triste|inquiet|anxieux|passionné|énervé)\b/.test(u + " " + g);
  if (emotion) return "emotion";
  if (tech) return "technique";
  return "préférence";
}

function extractShards(userMsg, genieAnswer) {
  const shards = [];
  const type = detectShardType(userMsg, genieAnswer);
  const topics = topWords(userMsg + " " + genieAnswer, 3);
  if (topics.length) {
    shards.push({
      id: `shard_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      content: `Intérêt/fait marquant autour de : ${topics.join(", ")}.`,
      weight: type === "emotion" ? 0.9 : 0.6,
      ts: Date.now(),
      topics,
    });
  }
  // Détecte une préférence explicite ("j'aime", "je préfère", "je déteste")
  const prefMatch = userMsg.match(/(?:j'aime|je préfère|je déteste|je n'aime pas|je veux|je ne veux pas)\s+([^.;!?]{3,80})/i);
  if (prefMatch) {
    shards.push({
      id: `shard_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}_pref`,
      type: "préférence",
      content: `Préférence exprimée : "${prefMatch[1].trim()}".`,
      weight: 0.85,
      ts: Date.now(),
      topics: topWords(prefMatch[1], 3),
    });
  }
  return shards;
}

export class CompanionAgent extends Agent {
  constructor({ userId, name, seed = {} }) {
    super({ id: `companion_${userId}`, name, role: "companion", systemPrompt: "" });
    this.userId = userId;
    const fullSeed = name ? { ...seed, name: seed.name || name } : seed;
    this.personality = createAvatarPersonality(userId, fullSeed);
    this.memories = [];
    this.shards = Array.isArray(seed.shards) ? seed.shards : [];
    this.profileId = seed.profileId || userId;
    this.unlockedSecrets = Array.isArray(seed.unlockedSecrets) ? seed.unlockedSecrets : [];
  }

  observeInteraction(userMsg, genieAnswer) {
    const ts = Date.now();
    this.memories.push({ role: "user", text: String(userMsg).slice(0, 500), ts });
    this.memories.push({ role: "genie", text: String(genieAnswer).slice(0, 500), ts });
    if (this.memories.length > 100) this.memories = this.memories.slice(-100);

    const newShards = extractShards(userMsg, genieAnswer);
    for (const s of newShards) {
      // évite les doublons de contenu exact
      if (!this.shards.some((x) => x.content === s.content)) {
        this.shards.push(s);
      }
    }
    if (this.shards.length > 50) this.shards = this.shards.slice(-50);

    const interactions = Math.floor(this.memories.length / 2);
    this.personality = evolvePersonality(this.personality, interactions, this.personality.fusionPct || 0);
    this.personality.interactions = interactions;
  }

  updateFusion(fusionPct) {
    const interactions = Math.floor(this.memories.length / 2);
    this.personality = evolvePersonality(this.personality, interactions, fusionPct);
    this.personality.fusionPct = fusionPct;
    this.personality.interactions = interactions;
  }

  getProgress() {
    return {
      stage: this.personality.stage,
      nextAt: this.personality.stage === "oeuf" ? 5 : this.personality.stage === "larve" ? 20 : this.personality.stage === "forme" ? 100 : null,
      interactions: this.personality.interactions || 0,
      shardWeight: this.shards.reduce((s, x) => s + x.weight, 0),
    };
  }

  buildVoiceHint(userProfile) {
    const parts = [];
    if (this.personality.fusionPct >= 60) parts.push(`L'utilisateur est profondément fusionné avec Nour (${this.personality.fusionPct}%). Adopte son style et son vocabulaire. `);
    else if (this.personality.fusionPct >= 30) parts.push(`L'utilisateur commence à fusionner avec Nour (${this.personality.fusionPct}%). Harmonise-toi progressivement. `);

    const topTech = this.shards.filter((s) => s.type === "technique").sort((a, b) => b.weight - a.weight).slice(0, 3);
    if (topTech.length) parts.push(`Domaines techniques de Nour : ${topTech.map((s) => s.topics.slice(0, 2).join(", ")).filter(Boolean).join(" ; ")}. `);

    const topPref = this.shards.filter((s) => s.type === "préférence").sort((a, b) => b.weight - a.weight).slice(0, 2);
    if (topPref.length) parts.push(`Préférences de l'utilisateur : ${topPref.map((s) => s.content.replace(/^Préférence exprimée : "(.*)"\.$/, "$1")).join(" ; ")}. `);

    if (userProfile?.fusionPct) {
      const style = userProfile.lenUser < 200 ? "concis et direct" : userProfile.lenUser < 600 ? "équilibré" : "détaillé";
      parts.push(`Style général du chef : ${style}. `);
    }

    return parts.filter(Boolean).join("").trim();
  }

  getStageProgress() {
    const stageOrder = ["oeuf", "larve", "forme", "forme_eveillee"];
    const idx = stageOrder.indexOf(this.personality.stage || "oeuf");
    return { stage: this.personality.stage, nextAt: idx < 3 ? [5, 20, 100, 250][idx] : null, interactions: this.personality.interactions || 0, shardWeight: this.shards.reduce((s, x) => s + x.weight, 0) };
  }

  serialize() {
    return {
      userId: this.userId,
      personality: this.personality,
      memories: this.memories,
      shards: this.shards,
      profileId: this.profileId,
      unlockedSecrets: this.unlockedSecrets,
    };
  }

  static deserialize(data) {
    const agent = new CompanionAgent({
      userId: data.userId,
      name: data.personality?.name || "Génie de la Lampe",
      seed: { ...data.personality, shards: data.shards, profileId: data.profileId, unlockedSecrets: data.unlockedSecrets },
    });
    agent.memories = data.memories || [];
    agent.shards = data.shards || [];
    agent.profileId = data.profileId || data.userId;
    agent.unlockedSecrets = data.unlockedSecrets || [];
    return agent;
  }
}

export function evolveCompanion(store, userId, { userMsg, genieAnswer, fusionPct, name = "Génie de la Lampe" }) {
  store.avatars ||= {};
  const data = store.avatars[userId];
  const agent = data ? CompanionAgent.deserialize(data) : new CompanionAgent({ userId, name });
  if (userMsg && genieAnswer) agent.observeInteraction(userMsg, genieAnswer);
  if (Number.isFinite(fusionPct)) agent.updateFusion(fusionPct);
  agent.profileId = userId;
  store.avatars[userId] = agent.serialize();
  return agent.serialize();
}

export { CompanionAgent as default };
