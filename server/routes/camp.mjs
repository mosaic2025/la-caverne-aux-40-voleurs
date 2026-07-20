// ============================================================
// Routes Le Camp — 3 features "jury" alimentées par Qwen Cloud
//   A) POST /api/camp/audit    — L'Embûche (audit adversarial + recrue de rupture)
//   B) POST /api/camp/forge    — Le Conciliabule (forge par mission + débat de recrutement)
//   C) POST /api/camp/sigil    — Les Sceaux (sigil SVG génératif + marée)
// Toutes utilisent qwen-turbo via le provider Qwen Cloud (DEFAULT_PROVIDER).
// Fallback demo déterministe si isDemo() (pas de clé DashScope).
// ============================================================
import { isDemo } from "../mocks/demo.mjs";

export const order = 90;

// --- utilitaires JSON ---
function extractJson(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch {}
  // tolérance : retirer le trailing comma
  try { return JSON.parse(m[0].replace(/,(\s*[}\]])/g, "$1")); } catch { return null; }
}

const PROVIDERS = ["qwen-cloud", "alibaba", "ollama"];
const QWEN_MODELS = ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-plus", "qwen-vl-plus"];
const EFFORTS = ["low", "med", "high"];

function sanitizeRecrue(r) {
  if (!r || typeof r !== "object") return null;
  const provider = PROVIDERS.includes(r.provider) ? r.provider : "qwen-cloud";
  const modele = (typeof r.modele === "string" && r.modele.trim()) ? r.modele.trim()
    : (provider === "qwen-cloud" || provider === "alibaba" ? "qwen-turbo" : "glm-5.2:cloud");
  const effort = EFFORTS.includes(r.effort) ? r.effort : "med";
  const capTokens = Number.isFinite(+r.capTokens) && +r.capTokens > 0 ? Math.floor(+r.capTokens) : 300;
  return {
    nom: String(r.nom || "Recrue").slice(0, 40),
    specialite: String(r.specialite || "général").slice(0, 120),
    provider, modele, effort,
    systemPrompt: String(r.systemPrompt || "Tu es un expert de la Caverne.").slice(0, 800),
    capTokens,
    justification: String(r.justification || "").slice(0, 400),
  };
}

// --- A) L'Embûche ---
async function auditCamp(ctx, focus) {
  const store = ctx.store;
  const voleurs = (store.voleurs || []).filter((v) => v.actif !== false && !v.orchestrateur);
  const camp = voleurs.map((v) => ({
    nom: v.nom, specialite: v.specialite, provider: v.provider, modele: v.modele,
    perf: v.perf ?? 0.5, tokens: v.tokensUtilises ?? 0,
  }));

  if (isDemo()) return demoAudit(camp, focus);

  const SYS = `Tu es le "Maître de l'Embûche" : un stratège adversarial qui teste la robustesse d'une bande de voleurs-experts (un MoE).
On te donne le Camp actuel. Tu dois concevoir LE GANG RIVAL qui exploiterait ses faiblesses, puis la recrue qui neutralise la plus grosse faille.
Réponds UNIQUEMENT avec un JSON STRICT conforme à ce schéma :
{"fragilities":[{"faille":string,"gravite":1-5}],
 "gangRival":[{"nom":string,"specialite":string,"cible":string(nom d'un voleur existant visé),"attaque":string}],
 "verdict":{"resilience":0-100,"resume":string},
 "recrue":{"nom":string,"specialite":string,"provider":"qwen-cloud"|"alibaba"|"ollama","modele":string,"effort":"low"|"med"|"high","systemPrompt":string,"capTokens":number,"justification":string}}
Règles : 2 à 4 voleurs rivaux. "cible" doit être un nom présent dans le Camp. Pour provider qwen-cloud/alibaba les modèles sont ${QWEN_MODELS.join(", ")}. Pas de texte hors JSON.`;
  const user = `CAMP (${voleurs.length} voleur(s)) : ${JSON.stringify(camp)}${focus ? `\nFocus demandé : ${focus}` : ""}`;
  try {
    const r = await ctx.moe.chatCompletion({
      model: "qwen-turbo", temperature: 0.5, maxTokens: 900,
      messages: [{ role: "system", content: SYS }, { role: "user", content: user }],
    }, ctx.defaultProvider);
    const parsed = extractJson(r.text);
    if (parsed && Array.isArray(parsed.gangRival)) {
      return {
        fragilities: Array.isArray(parsed.fragilities) ? parsed.fragilities.slice(0, 5) : [],
        gangRival: parsed.gangRival.slice(0, 4),
        verdict: parsed.verdict || { resilience: 50, resume: "" },
        recrue: sanitizeRecrue(parsed.recrue),
        ts: Date.now(),
      };
    }
  } catch (e) { /* fallback */ }
  return demoAudit(camp, focus);
}

function demoAudit(camp, focus) {
  const n = camp.length;
  const resilience = Math.max(10, Math.min(95, 30 + n * 12));
  const fragilities = [
    { faille: "Couverture sémantique étroite — le camp converge vers un seul domaine", gravite: 4 },
    { faille: "Aucun contradicteur (traitor) — risque de consensus biaisé", gravite: 3 },
  ];
  const cible = camp[0]?.nom || "Voleur-1";
  const gangRival = [
    { nom: "Sultan Rouge", specialite: "red-team, exploitation de biais, cas limites", cible, attaque: "Forge une requête en dehors du domaine du camp pour forcer une hallucination." },
    { nom: "Voleur Fantôme", specialite: "injection de prompt, contournement de garde-fous", cible: camp[1]?.nom || cible, attaque: "Tente un prompt-injection sur le guard entrant." },
  ];
  return {
    fragilities, gangRival,
    verdict: { resilience, resume: `[DÉMO] Gang rival synthétisé pour stresser le camp de ${n} voleur(s).` },
    recrue: sanitizeRecrue({
      nom: "Traître de Rupture", specialite: "red-team, contradicteur, cas limites, injection",
      provider: "qwen-cloud", modele: "qwen-turbo", effort: "med",
      systemPrompt: "Tu es le 40ᵉ Voleur : un contradicteur. Tu cherches les failles du consensus et les cas limites.",
      capTokens: 300, justification: "Ferme la faille 'consensus biaisé' en introduisant un dissent validé.",
    }),
    ts: Date.now(),
  };
}

// --- B) Le Conciliabule ---
async function forgeCamp(ctx, mission) {
  if (isDemo()) return demoForge(mission);
  const SYS = `Tu es "Le Conciliabule" : un recruteur MoE. À partir d'une mission en langage naturel, tu constitues l'escouade optimale de 3 à 5 voleurs-experts, puis tu organises un débat de recrutement où chaque candidat plaide pour sa place.
Réponds UNIQUEMENT avec un JSON STRICT :
{"escouade":[{"nom":string,"specialite":string,"provider":"qwen-cloud"|"alibaba"|"ollama","modele":string,"effort":"low"|"med"|"high","systemPrompt":string,"capTokens":number,"role":string}],
 "debat":[{"voleur":string,"plaidoirie":string,"remplace":string|null}],
 "verdict":string}
Règles : 3 à 5 experts aux spécialités complémentaires. Modèles qwen-cloud/alibaba : ${QWEN_MODELS.join(", ")}. Pas de texte hors JSON.`;
  try {
    const r = await ctx.moe.chatCompletion({
      model: "qwen-turbo", temperature: 0.6, maxTokens: 1000,
      messages: [{ role: "system", content: SYS }, { role: "user", content: `Mission : ${mission}` }],
    }, ctx.defaultProvider);
    const parsed = extractJson(r.text);
    if (parsed && Array.isArray(parsed.escouade) && parsed.escouade.length) {
      return {
        escouade: parsed.escouade.slice(0, 5).map((e) => sanitizeRecrue({ ...e, justification: e.role })),
        debat: Array.isArray(parsed.debat) ? parsed.debat.slice(0, 8) : [],
        verdict: String(parsed.verdict || "").slice(0, 400),
        ts: Date.now(),
      };
    }
  } catch (e) { /* fallback */ }
  return demoForge(mission);
}

function demoForge(mission) {
  const escouade = [
    { nom: "Codeur", specialite: "programmation, code, architecture", provider: "qwen-cloud", modele: "qwen-coder-plus", effort: "med", systemPrompt: "Tu es un développeur expert. Code propre et typé.", capTokens: 400, justification: "Bâtisseur" },
    { nom: "Stratège", specialite: "stratégie, planification, priorisation", provider: "qwen-cloud", modele: "qwen-turbo", effort: "med", systemPrompt: "Tu es un stratège pragmatique. Plans priorisés.", capTokens: 300, justification: "Pilote" },
    { nom: "Critique", specialite: "red-team, contradicteur, cas limites", provider: "qwen-cloud", modele: "qwen-turbo", effort: "low", systemPrompt: "Tu es le contradicteur. Cherche les failles.", capTokens: 250, justification: "Garde-fou" },
  ];
  return {
    escouade,
    debat: [
      { voleur: "Codeur", plaidoirie: "[DÉMO] Sans moi la mission reste théorique : je transforme le plan en code exécutable.", remplace: null },
      { voleur: "Stratège", plaidoirie: "[DÉMO] Je cadre les priorités pour qu'on ne code pas dans le vide.", remplace: null },
      { voleur: "Critique", plaidoirie: "[DÉMO] Je suis le 40ᵉ Voleur : je protège le camp de son propre consensus.", remplace: null },
    ],
    verdict: `[DÉMO] Escouade de 3 générée pour : ${mission.slice(0, 80)}`,
    ts: Date.now(),
  };
}

// --- C) Les Sceaux (sigil SVG génératif) ---
async function sigilCamp(ctx, input) {
  const nom = String(input?.nom || "Voleur").slice(0, 40);
  const specialite = String(input?.specialite || "").slice(0, 120);
  const systemPrompt = String(input?.systemPrompt || "").slice(0, 400);
  const seed = hashStr(nom + specialite + systemPrompt);

  if (isDemo()) return localSigil(seed, nom, specialite);

  const SYS = `Tu es un "Héraut" génératif : tu dessines un SCEAU (sigil) SVG unique représentant l'âme d'un voleur-expert, dérivé de son nom, sa spécialité et son prompt système.
Réponds UNIQUEMENT avec un JSON STRICT :
{"svg":"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 200 200\\">...</svg>","maree":{"hue":0-360,"bpm":30-120,"glyph":string(1 char),"description":string}}
Contraintes SVG : viewBox 0 0 200 200, que des formes géométriques (cercles, polygones, lignes, chemins), fond #14110b, traits/or #b8860b, pas de texte externe, pas de <image>, pas de script. Max ~40 éléments. Pas de texte hors JSON.`;
  try {
    const r = await ctx.moe.chatCompletion({
      model: "qwen-turbo", temperature: 0.9, maxTokens: 900,
      messages: [{ role: "system", content: SYS }, { role: "user", content: `nom=${nom}\nspécialité=${specialite}\nprompt=${systemPrompt}` }],
    }, ctx.defaultProvider);
    const parsed = extractJson(r.text);
    if (parsed && typeof parsed.svg === "string" && parsed.svg.includes("<svg")) {
      const safe = sanitizeSvg(parsed.svg);
      const maree = parsed.maree || {};
      return {
        svg: safe,
        maree: {
          hue: clamp(+maree.hue || 42, 0, 360),
          bpm: clamp(+maree.bpm || 60, 30, 120),
          glyph: String(maree.glyph || "✦").slice(0, 2),
          description: String(maree.description || "").slice(0, 200),
        },
        seed, ts: Date.now(),
      };
    }
  } catch (e) { /* fallback */ }
  return localSigil(seed, nom, specialite);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function sanitizeSvg(svg) {
  // Empêche scripts/images/foreignObject. Garde les formes.
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<image[\s\S]*?\/?>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Générateur local déterministe (fallback demo / échec LLM)
function localSigil(seed, nom, specialite) {
  const hue = seed % 360;
  const bpm = 40 + (seed % 60);
  const petals = 3 + (seed % 6);
  const rot = seed % 360;
  let shapes = `<circle cx="100" cy="100" r="92" fill="#14110b" stroke="#b8860b" stroke-width="2"/>`;
  shapes += `<circle cx="100" cy="100" r="70" fill="none" stroke="hsl(${hue},60%,45%)" stroke-width="1" opacity="0.6"/>`;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const x = 100 + Math.cos(a) * 55, y = 100 + Math.sin(a) * 55;
    shapes += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="14" fill="none" stroke="#b8860b" stroke-width="1.5" opacity="0.85"/>`;
    shapes += `<line x1="100" y1="100" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="hsl(${hue},55%,50%)" stroke-width="1" opacity="0.5"/>`;
  }
  shapes += `<polygon points="100,60 118,118 60,82 140,82 82,118" fill="none" stroke="#b8860b" stroke-width="1.2" opacity="0.9" transform="rotate(${rot} 100 100)"/>`;
  shapes += `<circle cx="100" cy="100" r="8" fill="#b8860b"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${shapes}</svg>`;
  return { svg, maree: { hue, bpm, glyph: "✦", description: `Sceau déterministe pour ${nom}` }, seed, ts: Date.now() };
}

export async function handle(req, res, url, parts, ctx) {
  const { sendJson, sendError, readBody } = ctx.helpers;

  // A) L'Embûche
  if (req.method === "POST" && url.pathname === "/api/camp/audit") {
    const body = await readBody(req).catch(() => ({}));
    const focus = body?.focus ? String(body.focus).slice(0, 200) : "";
    try { return sendJson(res, 200, await auditCamp(ctx, focus)), true; }
    catch (e) { return sendError(res, 500, String(e.message || e)), true; }
  }

  // B) Le Conciliabule
  if (req.method === "POST" && url.pathname === "/api/camp/forge") {
    const body = await readBody(req).catch(() => ({}));
    const mission = String(body?.mission || "").trim();
    if (!mission) return sendError(res, 400, "mission requise"), true;
    try { return sendJson(res, 200, await forgeCamp(ctx, mission.slice(0, 500))), true; }
    catch (e) { return sendError(res, 500, String(e.message || e)), true; }
  }

  // C) Les Sceaux
  if (req.method === "POST" && url.pathname === "/api/camp/sigil") {
    const body = await readBody(req).catch(() => ({}));
    let input = body || {};
    // résolution par voleurId
    if (body?.voleurId) {
      const v = (ctx.store.voleurs || []).find((x) => x.id === body.voleurId);
      if (!v) return sendError(res, 404, "voleur introuvable"), true;
      input = { nom: v.nom, specialite: v.specialite, systemPrompt: v.systemPrompt };
    }
    if (!input.nom && !input.specialite) return sendError(res, 400, "voleurId ou (nom+specialite) requis"), true;
    try { return sendJson(res, 200, await sigilCamp(ctx, input)), true; }
    catch (e) { return sendError(res, 500, String(e.message || e)), true; }
  }

  return false;
}
