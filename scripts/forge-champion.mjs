// ============================================================
// Forge le Génie "Champion" — experts spécialisés qwen-cloud,
// conçu pour démontrer un gain qualité mesurable vs un agent unique
// (qwen-turbo) sur des tâches difficiles multi-domaines.
// Usage : node scripts/forge-champion.mjs
// Nécessite le backend lancé. Idempotent : supprime un éventuel
// Génie "Champion de la Caverne" existant avant de le recréer.
// ============================================================
const API = process.env.CAVERNE_API || "http://localhost:8787";

const CHAMPION = {
  nom: "Champion de la Caverne",
  voiceCharter: "Une seule voix, experte, précise et actionnable, en français. Ne révèle jamais les experts internes.",
  budgetTotal: 200000,
  k: 3,
  dominance: 0.05,
  parSpecialisation: true,
  routingStrategy: "auto",
  ml: true,
  embeddingModel: "text-embedding-v3",
  models: [
    { nom: "Codeur", specialite: "programmation, code, typage, refactoring, tests, architecture logicielle", specialisation: "technique", modele: "qwen-coder-plus", effort: "high", systemPrompt: "Tu es un développeur senior. Code production-ready, typé, testé. Tu exposes les compromis techniques.", capTokens: 700, provider: "qwen-cloud" },
    { nom: "Architecte", specialite: "architecture, compromis, scalabilité, migration, microservices, performance, cohérence des données, CAP", specialisation: "technique", modele: "qwen-plus", effort: "med", systemPrompt: "Tu es un architecte logiciel. Tu analyses les compromis (CAP, cohérence vs disponibilité, latence vs coût) et proposes des plans concrets.", capTokens: 500, provider: "qwen-cloud" },
    { nom: "Sécuriste", specialite: "sécurité, injection, validation, OWASP, vulnérabilités, durcissement", specialisation: "technique", modele: "qwen-plus", effort: "med", systemPrompt: "Tu es un expert en sécurité applicative. Tu identifies les failles (injection, CSRF, authn/authz) et proposes des mitigations concrètes.", capTokens: 400, provider: "qwen-cloud" },
    { nom: "Critique", specialite: "red-team, cas limites, contradicteur, failles de raisonnement, edge cases", specialisation: "gouvernance", modele: "qwen-plus", effort: "med", systemPrompt: "Tu es le 40ᵉ Voleur : un contradicteur. Tu cherches les failles du consensus, les cas limites et les hypothèses implicites.", capTokens: 400, provider: "qwen-cloud" },
  ],
  orchestrateur: { modele: "qwen-max", provider: "qwen-cloud", effort: "med", systemPrompt: "Tu es l'orchestrateur. Tu fusionnes les fragments des experts en une réponse unique, cohérente, structurée et actionnable, sans révéler les experts. Tu résous les contradictions en privilégiant la rigueur.", capTokens: 1000 },
};

async function main() {
  // nettoyage idempotent
  const gs = await (await fetch(`${API}/api/genies`)).json();
  const old = gs.find((g) => g.nom === CHAMPION.nom);
  if (old) {
    console.log(`🗑️  Suppression de l'ancien Champion (${old.id})…`);
    // exiler ses voleurs puis supprimer le génie
    await fetch(`${API}/api/genies/${old.id}?cascade=1`, { method: "DELETE" }).catch(() => {});
  }
  const r = await fetch(`${API}/api/genies/forge`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CHAMPION),
  });
  if (!r.ok) throw new Error(`forge ${r.status}: ${await r.text().catch(() => "")}`);
  const { genie, voleurs } = await r.json();
  console.log(`✅ Génie « ${genie.nom} » forgé : ${genie.id}`);
  console.log(`   ${voleurs.length} experts : ${voleurs.map((v) => `${v.nom}(${v.modele})`).join(", ")}`);
  console.log(`   Orchestrateur : qwen-max · budget ${genie.budgetTotal} · k=${genie.k}`);
  console.log(`\n→ Benchmark : node scripts/bench-hard.mjs ${genie.id}`);
}
main().catch((e) => { console.error("Forge échouée :", e.message); process.exit(1); });
