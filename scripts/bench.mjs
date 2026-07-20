// ============================================================
// Benchmark reproductible — Caverne (MoE) vs baseline (agent unique).
// Mesure TEMPS · COÛT · QUALITÉ sur plusieurs cas d'usage.
// Usage : node scripts/bench.mjs [genieId] [baselineModel] [baselineProvider]
// Défaut : premier Génie de /api/genies · baseline qwen-turbo · qwen-cloud
// Sortie : bench/results-<ts>.json + docs/BENCHMARK_RESULTS.md
// Nécessite le backend lancé (node server/server.mjs).
// ============================================================
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const API = process.env.CAVERNE_API || "http://localhost:8787";
const ts0 = Date.now();

// Cas d'usage à questions fixes (reproductibilité)
const USE_CASES = [
  {
    id: "concurrency",
    nom: "Concurrence & performance Node",
    baseline: "qwen-turbo",
    questions: [
            "Explique la différence entre concurrence et parallélisme, avec un exemple concret en Node.js.",
            "Comment éviter les goulots d'étranglement I/O sur une API Express recevant 10k req/s ?",
    ],
  },
  {
    id: "archi",
    nom: "Architecture & migration microservices",
    baseline: "qwen-turbo",
    questions: [
            "Quels sont les compromis entre une base SQL et une base documentaire pour un carnet de commandes e-commerce ?",
            "Rédige un plan en 5 points pour migrer une API monolithique vers des services indépendants sans interruption.",
    ],
  },
  {
    id: "code",
    nom: "Code & typage TypeScript",
    baseline: "qwen-coder-plus",
    questions: [
            "Écris une fonction TypeScript générique qui déduplique un tableau par une clé extraite, avec types stricts.",
            "Refactorise ce snipset pour éliminer les any : function map(a){return a.map(x=>x.id)}",
    ],
  },
  {
    id: "analyse",
    nom: "Analyse de données & métriques",
    baseline: "qwen-plus",
    questions: [
            "Quelles métriques suivre pour évaluer la qualité d'un orchestrateur multi-agents LLM ?",
            "Comment détecter la dérive sémantique entre plusieurs experts sur une même requête ?",
    ],
  },
];

async function getGenieId(arg) {
  if (arg) return arg;
  const r = await fetch(`${API}/api/genies`);
  const gs = await r.json();
  if (!Array.isArray(gs) || !gs.length) throw new Error("Aucun Génie trouvé — lance `node scripts/seed-demo.mjs`.");
  return gs[0].id;
}

function fmt(n, d = 2) { return typeof n === "number" ? n.toFixed(d) : String(n); }

async function runOne(genieId, uc) {
  const t0 = Date.now();
  const r = await fetch(`${API}/api/benchmark`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ genieId, baseline: uc.baseline, baselineProvider: "qwen-cloud", questions: uc.questions }),
  });
  if (!r.ok) throw new Error(`/api/benchmark ${r.status}: ${await r.text().catch(() => "")}`);
  const result = await r.json();
  const wall = Date.now() - t0;
  return { ...result, useCase: uc.id, useCaseNom: uc.nom, wallMs: wall };
}

function metricMap(metrics) {
  const m = {};
  for (const x of metrics || []) m[x.label] = x;
  return m;
}

(async () => {
  const genieId = await getGenieId(process.argv[2]);
  const forcedBaseline = process.argv[3];
  const forcedProvider = process.argv[4] || "qwen-cloud";
  console.log(`\n🏁 Benchmark Caverne vs baseline — Génie ${genieId}`);
  console.log(`   API : ${API}\n`);

  const cases = forcedBaseline
    ? USE_CASES.map((u) => ({ ...u, baseline: forcedBaseline }))
    : USE_CASES;

  const results = [];
  for (const uc of cases) {
    process.stdout.write(`  ▸ ${uc.nom} (baseline ${uc.baseline}) … `);
    try {
      const res = await runOne(genieId, uc);
      results.push(res);
      const q = metricMap(res.metrics);
      const winner = q["qualité"];
      console.log(`qualité ${fmt(winner?.baseline)}→${fmt(winner?.caverne)} (${winner?.gainPct > 0 ? "+" : ""}${fmt(winner?.gainPct)}%) · ${res.rounds?.length || 0} rounds · ${fmt(res.wallMs / 1000, 1)}s`);
    } catch (e) {
      console.log(`ERREUR : ${e.message}`);
      results.push({ useCase: uc.id, useCaseNom: uc.nom, error: e.message });
    }
  }

  // --- persist JSON ---
  const benchDir = path.join(ROOT, "bench");
  fs.mkdirSync(benchDir, { recursive: true });
  const jsonPath = path.join(benchDir, `results-${ts0}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({ genieId, api: API, ts: ts0, results }, null, 2));

  // --- rapport MD ---
  const agg = { qualiteBase: 0, qualiteCav: 0, latBase: 0, latCav: 0, costBase: 0, costCav: 0, tokBase: 0, tokCav: 0, n: 0, wins: 0, ties: 0, losses: 0 };
  for (const res of results) {
    if (res.error) continue;
    const m = metricMap(res.metrics);
    const q = m["qualité"], l = m["latence moyenne"], c = m["coût/1k"], t = m["tokens"];
    agg.qualiteBase += q?.baseline || 0; agg.qualiteCav += q?.caverne || 0;
    agg.latBase += l?.baseline || 0; agg.latCav += l?.caverne || 0;
    agg.costBase += c?.baseline || 0; agg.costCav += c?.caverne || 0;
    agg.tokBase += t?.baseline || 0; agg.tokCav += t?.caverne || 0;
    agg.n++;
    const wins = (res.rounds || []).filter((r) => r.winner === "caverne").length;
    const losses = (res.rounds || []).filter((r) => r.winner === "baseline").length;
    agg.wins += wins; agg.losses += losses; agg.ties += (res.rounds || []).length - wins - losses;
  }
  const N = agg.n || 1;
  const md = [
    "# 📊 Benchmark reproductible — Caverne vs baseline",
    "",
    `> Généré par \`scripts/bench.mjs\` le ${new Date(ts0).toISOString()} — Génie \`${genieId}\`, API \`${API}\`.`,
    "> Chaque cas d'usage pose des **questions fixes** au MoE Caverne et à un **agent unique baseline**, puis un **juge qwen-max** note la qualité (anonymisé A/B). Mesures : temps (latence), coût (tokens × prix), qualité (score juge).",
    "",
    "## Résumé agrégé",
    "",
    `| Métrique | Baseline (agent unique) | Caverne (MoE) | Gain |`,
    `|----------|------------------------:|--------------:|-----:|`,
    `| Qualité (juge /20) | ${fmt(agg.qualiteBase / N)} | ${fmt(agg.qualiteCav / N)} | ${fmt(((agg.qualiteCav / N) - (agg.qualiteBase / N)) / ((agg.qualiteBase / N) || 1) * 100)}% |`,
    `| Latence moyenne (ms) | ${fmt(agg.latBase / N, 0)} | ${fmt(agg.latCav / N, 0)} | ${fmt(((agg.latBase / N) - (agg.latCav / N)) / ((agg.latBase / N) || 1) * 100)}% |`,
    `| Coût/1k tokens | ${fmt(agg.costBase / N, 6)} | ${fmt(agg.costCav / N, 6)} | ${fmt(((agg.costBase / N) - (agg.costCav / N)) / ((agg.costBase / N) || 1) * 100)}% |`,
    `| Tokens totaux | ${agg.tokBase} | ${agg.tokCav} | ${fmt((agg.tokBase - agg.tokCav) / (agg.tokBase || 1) * 100)}% |`,
    "",
    `**Victoires par round :** Caverne ${agg.wins} · Baseline ${agg.losses} · Égalités ${agg.ties}.`,
    "",
    "## Détail par cas d'usage",
    "",
  ];
  for (const res of results) {
    if (res.error) { md.push(`### ${res.useCaseNom} — ❌ ${res.error}`); continue; }
    const m = metricMap(res.metrics);
    md.push(`### ${res.useCaseNom} \`${res.useCase}\``);
    md.push(`Baseline : \`${res.baselineModel}\` (${res.baselineProvider}) · ${res.rounds?.length || 0} rounds · mur ${fmt(res.wallMs / 1000, 1)}s`);
    md.push("");
    md.push(`| Métrique | Baseline | Caverne | Gain % |`);
    md.push(`|----------|---------:|--------:|-------:|`);
    for (const k of ["qualité", "latence p95", "latence moyenne", "coût/1k", "tokens", "tokens/moyenne"]) {
      const x = m[k];
      if (x) md.push(`| ${k} | ${fmt(x.baseline, k.includes("coût") ? 6 : 2)} | ${fmt(x.caverne, k.includes("coût") ? 6 : 2)} | ${fmt(x.gainPct)}% |`);
    }
    md.push("");
    if (res.rounds?.length) {
      md.push("Détail des rounds (gagnant par round) :");
      md.push("");
      for (const r of res.rounds) md.push(`- _« ${r.query.slice(0, 70)}… »_ → **${r.winner}** (base ${fmt(r.baseScore)} / cav ${fmt(r.cavScore)})`);
      md.push("");
    }
  }
  md.push("## Reproduire");
  md.push("");
  md.push("```bash");
  md.push("# 1) lancer le backend");
  md.push("node server/server.mjs &");
  md.push("# 2) (option) seed démo");
  md.push("node scripts/seed-demo.mjs");
  md.push("# 3) lancer le benchmark");
  md.push("node scripts/bench.mjs [genieId] [baselineModel] [baselineProvider]");
  md.push("```");
  md.push("");
  md.push(`Résultat JSON brut : \`bench/results-${ts0}.json\`.`);
  fs.writeFileSync(path.join(ROOT, "docs", "BENCHMARK_RESULTS.md"), md.join("\n"));

  console.log(`\n  ✅ ${results.filter((r) => !r.error).length}/${results.length} cas mesurés`);
  console.log(`  📄 JSON : ${path.relative(ROOT, jsonPath)}`);
  console.log(`  📄 MD   : docs/BENCHMARK_RESULTS.md\n`);
})().catch((e) => { console.error("Benchmark échoué :", e.message); process.exit(1); });
