// ============================================================
// Seed démo — crée une Caverne prête à montrer sans clé API
// Usage : node scripts/seed-demo.mjs
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../server/data.json");

function loadStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

function emb(text) {
  // Embedding factice de 1024 dims pour la démo
  const arr = new Array(1024).fill(0);
  for (let i = 0; i < text.length; i++) arr[i % 1024] += text.charCodeAt(i) / 1000;
  return arr;
}

function id(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const store = loadStore();
store.voleurs = [];
store.genies = [];
store.runs = [];
store.avatars = {};
store.profils = {};
store.sharedKnowledge = { contributions: [], concepts: [], graph: {} };

const voleurs = [
  { nom: "Stratège", specialite: "stratégie, planification, priorisation", specialisation: "stratégie", modele: "qwen-turbo", effort: "med", systemPrompt: "Tu es un stratège pragmatique. Plans clairs et priorisés.", capTokens: 300, provider: "qwen-cloud" },
  { nom: "Codeur", specialite: "programmation, code, architecture logicielle", specialisation: "technique", modele: "qwen-coder-plus", effort: "med", systemPrompt: "Tu es un développeur expert. Code propre, typé, explications courtes.", capTokens: 400, provider: "qwen-cloud" },
  { nom: "Rédacteur", specialite: "rédaction, documentation, communication", specialisation: "communication", modele: "qwen-turbo", effort: "low", systemPrompt: "Tu es un rédacteur concis. Reformule et synthétise.", capTokens: 200, provider: "qwen-cloud" },
  { nom: "Critique", specialite: "critique, failles, biais, qualité", specialisation: "technique", modele: "qwen-plus", effort: "med", systemPrompt: "Tu es un critique rigoureux. Pointe les failles avec tact.", capTokens: 250, provider: "qwen-cloud" },
];

const createdVoleurs = voleurs.map((v) => ({
  id: id("vol"),
  ...v,
  embedding: emb(v.specialite),
  actif: true,
  tokensUtilises: 0,
  perf: 0.5,
}));

store.voleurs.push(...createdVoleurs);

const genie = {
  id: id("gen"),
  nom: "Génie de la Caverne",
  voleursIds: createdVoleurs.map((v) => v.id),
  voiceCharter: "Une seule voix, claire, directe, en français. Ne révèle jamais les experts internes.",
  budgetTotal: 50000,
  reliquat: 50000,
  k: 3,
  dominance: 0.05,
  ml: true,
  parSpecialisation: true,
  routingStrategy: "auto",
  embeddingModel: "text-embedding-v3",
  provider: "qwen-cloud",
};

store.genies.push(genie);

// Créer un avatar de démo
store.avatars["chef"] = {
  userId: "chef",
  personality: {
    userId: "chef",
    name: "Génie de la Lampe",
    mood: "curieux",
    formality: 0.5,
    verbosity: 0.5,
    humor: 0.3,
    patience: 0.7,
    birthTs: Date.now(),
    stage: "forme",
    interactions: 5,
    fusionPct: 35,
  },
  memories: [
    { role: "user", text: "Comment migrer une API monolithique ?", ts: Date.now() - 10000 },
    { role: "genie", text: "Découpe par domaine, ajoute une gateway, migre progressivement.", ts: Date.now() - 9000 },
  ],
};

// Contribution au savoir commun
store.sharedKnowledge.contributions.push({
  id: id("contrib"),
  userId: "anon_demo",
  text: "Docker containerise les applications. Kubernetes les orchestre.",
  source: "demo",
  tags: ["devops", "demo"],
  ts: Date.now(),
});

// Débloquer La Lampe
store.unlocked ||= [];
if (!store.unlocked.includes("lampe_revealed")) store.unlocked.push("lampe_revealed");

saveStore(store);
console.log("✅ Caverne de démo créée :");
console.log(`   ${createdVoleurs.length} Voleurs`);
console.log(`   1 Génie : ${genie.nom}`);
console.log(`   Avatar chef en stade ${store.avatars["chef"].personality.stage}`);
console.log(`   La Lampe débloquée`);
console.log(`   1 contribution au Connecteur`);
