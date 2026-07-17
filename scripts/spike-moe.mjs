#!/usr/bin/env node
// Spike Le Génie (MoE) — mesure réelle des tokens, pas une estimation de débat.
import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../../../working-mind-fusion/orchestrator/.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const KEY = process.env.DASHSCOPE_API_KEY;
const BASE = (process.env.DASHSCOPE_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1");

async function chat(model, system, user, maxTokens) {
  const t0 = Date.now();
  const r = await fetch(BASE + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + KEY },
    body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.2,
      messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  const d = await r.json();
  const text = d.choices?.[0]?.message?.content || "";
  return { text, tokens: d.usage?.total_tokens || 0, ms: Date.now() - t0 };
}

async function embed(text) {
  const t0 = Date.now();
  const r = await fetch(BASE + "/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + KEY },
    body: JSON.stringify({ model: "text-embedding-v3", input: text }),
  });
  const d = await r.json();
  if (!d.data) return { vec: null, err: JSON.stringify(d).slice(0, 200), ms: Date.now() - t0 };
  return { vec: d.data[0].embedding, ms: Date.now() - t0 };
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const VOLEURS = [
  { id: "v1", nom: "Scribe", specialite: "rédaction de documentation technique claire et concise" },
  { id: "v2", nom: "Auditeur", specialite: "audit de sécurité et détection de vulnérabilités dans du code" },
  { id: "v3", nom: "Refactoriste", specialite: "refactoring de code et amélioration de la lisibilité" },
];

const REQUETE = "Relis cette fonction Node.js et corrige les problèmes de sécurité évidents (injection, secrets en dur).";

(async () => {
  const budget = { routing: 0, embed: 0, enchere: 0, traitement: 0, total: 0 };
  console.log("=== ÉTAPE 1: embeddings voleurs + requête (une fois, amorti) ===");

  const eq = await embed(REQUETE);
  if (!eq.vec) {
    console.log(`⚠ embeddings indisponibles sur cette clé/région: ${eq.err}`);
    console.log("→ FALLBACK: routing par mots-clés (0 appel LLM), pas de coût embeddings.");
  } else {
    console.log(`embedding requête ok, dim=${eq.vec.length}, ${eq.ms}ms`);
  }

  let top3 = VOLEURS;
  if (eq.vec) {
    const scored = [];
    for (const v of VOLEURS) {
      const ev = await embed(v.specialite);
      scored.push({ v, score: ev.vec ? cosine(eq.vec, ev.vec) : 0 });
    }
    scored.sort((a, b) => b.score - a.score);
    top3 = scored.map(s => s.v);
    console.log("Ranking:", scored.map(s => `${s.v.nom}:${s.score.toFixed(3)}`).join(" | "));
  } else {
    // fallback mots-clés, 0 token
    top3 = [...VOLEURS].sort((a, b) => {
      const score = v => (REQUETE.toLowerCase().includes("sécur") && v.nom === "Auditeur") ? 1 : 0;
      return score(b) - score(a);
    });
  }

  console.log("\n=== ÉTAPE 2: enchères aveugles (qwen-turbo, entête only) ===");
  const enteteReq = REQUETE.slice(0, 120);
  const encheres = [];
  for (const v of top3) {
    const r = await chat("qwen-turbo",
      `Tu es ${v.nom}, spécialiste: ${v.specialite}. Réponds UNIQUEMENT un JSON {"confiance":0.0-1.0} sur ta capacité à traiter cette requête (entête seulement).`,
      enteteReq, 30);
    budget.enchere += r.tokens;
    let conf = 0;
    try { conf = JSON.parse(r.text.match(/\{[^}]+\}/)?.[0] || "{}").confiance || 0; } catch { conf = 0; }
    encheres.push({ v, conf, tokens: r.tokens, ms: r.ms });
    console.log(`  ${v.nom}: confiance=${conf} (${r.tokens}tok, ${r.ms}ms) raw="${r.text.slice(0,60)}"`);
  }
  encheres.sort((a, b) => b.conf - a.conf);
  const gagnant = encheres[0];
  console.log(`→ Gagnant enchère: ${gagnant.v.nom} (confiance ${gagnant.conf})`);

  console.log("\n=== ÉTAPE 3: traitement complet (qwen-plus, le gagnant seul) ===");
  const CODE = `app.get('/user', (req,res)=>{ db.query("SELECT * FROM users WHERE id="+req.query.id); const key="sk-live-abc123"; res.send('ok') })`;
  const trait = await chat("qwen-plus",
    `Tu es ${gagnant.v.nom}, spécialiste: ${gagnant.v.specialite}.`,
    REQUETE + "\n\n```js\n" + CODE + "\n```", 400);
  budget.traitement = trait.tokens;
  console.log(`traitement: ${trait.tokens}tok, ${trait.ms}ms`);
  console.log(trait.text.slice(0, 300));

  budget.total = budget.embed + budget.enchere + budget.traitement;
  console.log("\n=== BUDGET RÉEL MESURÉ ===");
  console.log(JSON.stringify(budget, null, 2));
  console.log(`\nComparé à l'estimation débat (750 tok/req): ${budget.total <= 750 ? "TENU ✅" : "DÉPASSÉ ⚠️ facteur " + (budget.total/750).toFixed(1) + "x"}`);
})();
