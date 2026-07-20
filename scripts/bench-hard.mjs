// ============================================================
// Benchmark DIFFICILE — Champion (MoE spécialisé) vs qwen-turbo (agent unique).
// Tâches multi-domaines où un modèle unique atteint ses limites.
// repeats=5 par question (configurable: argv[4]) → moyenne ± écart-type + détail par critère.
// Juge PAIRWISE A/B randomisé + DOUBLE juge (qwen-max + qwen-plus), victoire sur accord.
// Usage : node scripts/bench-hard.mjs [genieId] [baseline] [repeats]
// Sortie : bench/hard-<ts>.json + docs/BENCHMARK_HARD.md
// Nécessite le backend lancé.
// ============================================================
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const API = process.env.CAVERNE_API || "http://localhost:8787";
const ts0 = Date.now();
const REPEATS = Math.max(1, Math.min(10, parseInt(process.argv[4], 10) || 5));

const HARD = [
  { id: "login-secure", nom: "Endpoint login typé + sécurisé + tests",
    q: "Implémente en TypeScript un endpoint Express POST /login qui valide l'email, hache le mot de passe avec bcrypt (cost 12), émet un JWT signé (HS256, exp 1h), renvoie les erreurs normalisées, et liste 3 failles de sécurité à éviter dans cette implémentation. Ajoute 2 tests unitaires clés." },
  { id: "microservices", nom: "Migration monolithe→microservices e-commerce",
    q: "Conçois la migration d'un monolithe e-commerce (catalogue, panier, commandes, paiement) vers des microservices : propose le découpage, le mode de communication (sync/async), la stratégie de cohérence des données, un déploiement zero-downtime, et 3 pièges concrets à éviter avec leur mitigation." },
  { id: "refactor-pure", nom: "Refactor typé + pur + testable + gestion d'erreurs",
    q: "Refactorise cette fonction pour qu'elle soit typée strict, pure (sans effet de bord), testable, et gère explicitement les erreurs (panier vide, item sans prix, taxe négative) : function p(o){return o.items.map(i=>i.p*o.tax).reduce((a,b)=>a+b,0)}. Donne la signature, le code, et 3 cas de test." },
  { id: "consistency", nom: "Eventual vs strong consistency pour un panier",
    q: "Analyse le compromis eventual consistency vs strong consistency pour un panier e-commerce multi-régions : quand choisir l'un ou l'autre selon le contexte, impact UX concret, et propose un hybride réaliste avec sa limite et son invariant de cohérence." },
];

const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const std = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const fmt = (n, d = 2) => (typeof n === "number" ? n.toFixed(d) : String(n));

async function getGenieId(arg) {
  if (arg) return arg;
  const gs = await (await fetch(`${API}/api/genies`)).json();
  const champ = gs.find((g) => g.nom === "Champion de la Caverne") || gs[0];
  if (!champ) throw new Error("Aucun Génie — lance `node scripts/forge-champion.mjs`.");
  return champ.id;
}

(async () => {
  const genieId = await getGenieId(process.argv[2]);
  const baseline = process.argv[3] || "qwen-turbo";
  console.log(`\n🏁 Benchmark DIFFICILE — Champion ${genieId} vs ${baseline} · ${REPEATS} reps/question\n`);

  const cases = [];
  for (const h of HARD) {
    process.stdout.write(`  ▸ ${h.nom} … `);
    const t0 = Date.now();
    try {
      const r = await fetch(`${API}/api/benchmark`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genieId, baseline, baselineProvider: "qwen-cloud", questions: [h.q], repeats: REPEATS }),
      });
      if (!r.ok) throw new Error(`${r.status}: ${await r.text().catch(() => "")}`);
      const res = await r.json();
      const rounds = res.rounds || [];
      const baseScores = rounds.map((x) => x.baseScore);
      const cavScores = rounds.map((x) => x.cavScore);
      const wins = rounds.filter((x) => x.winner === "caverne").length;
      const losses = rounds.filter((x) => x.winner === "baseline").length;
      // agrégat par critère
      const critKeys = ["exactitude", "complementation", "profondeur", "actionabilite"];
      const critAgg = { baseline: {}, caverne: {} };
      for (const k of critKeys) {
        critAgg.baseline[k] = mean(rounds.map((x) => x.criteria?.baseline?.[k] ?? 0));
        critAgg.caverne[k] = mean(rounds.map((x) => x.criteria?.caverne?.[k] ?? 0));
      }
      cases.push({ id: h.id, nom: h.nom, q: h.q, rounds, baseScores, cavScores, wins, losses, ties: rounds.length - wins - losses, critAgg, wallMs: Date.now() - t0 });
      console.log(`qualité ${fmt(mean(baseScores))}±${fmt(std(baseScores))} → ${fmt(mean(cavScores))}±${fmt(std(cavScores))} · Caverne ${wins}/${rounds.length} · ${fmt((Date.now() - t0) / 1000, 1)}s`);
    } catch (e) {
      console.log(`ERREUR : ${e.message}`);
      cases.push({ id: h.id, nom: h.nom, q: h.q, error: e.message });
    }
  }

  // agrégat global
  const allBase = cases.flatMap((c) => c.baseScores || []);
  const allCav = cases.flatMap((c) => c.cavScores || []);
  const totWins = cases.reduce((s, c) => s + (c.wins || 0), 0);
  const totLosses = cases.reduce((s, c) => s + (c.losses || 0), 0);
  const totRounds = allBase.length;
  const gMean = mean(allBase), gStd = std(allBase), cMean = mean(allCav), cStd = std(allCav);
  const gainPct = gMean ? ((cMean - gMean) / gMean) * 100 : 0;

  // persistance JSON
  const benchDir = path.join(ROOT, "bench");
  fs.mkdirSync(benchDir, { recursive: true });
  const jsonPath = path.join(benchDir, `hard-${ts0}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({ genieId, baseline, repeats: REPEATS, ts: ts0, aggregate: { gMean, gStd, cMean, cStd, gainPct, totWins, totLosses, totRounds }, cases }, null, 2));

  // rapport MD
  const md = [
    "# 📊 Benchmark DIFFICILE — Champion (MoE) vs agent unique",
    "",
    `> Généré par \`scripts/bench-hard.mjs\` le ${new Date(ts0).toISOString()} — Génie \`${genieId}\`, baseline \`${baseline}\`, **${REPEATS} répétitions par question** (moyenne ± écart-type).`,
    "> Tâches **multi-domaines difficiles** où un modèle unique atteint ses limites. **Double juge** (qwen-max + qwen-plus) en **pairwise A/B randomisé** (anti-biais de position) — victoire nette seulement si accord des deux juges. Rubrique 4 critères (exactitude, complémentarité, profondeur, actionabilité) notés 0-5, total 0-20.",
    "",
    "## Résultat global",
    "",
    `| Métrique | Baseline ${baseline} | Champion (MoE) | Gain |`,
    `|----------|--------------------:|---------------:|-----:|`,
    `| Qualité moyenne (/20) | ${fmt(gMean)} ± ${fmt(gStd)} | ${fmt(cMean)} ± ${fmt(cStd)} | ${fmt(gainPct)}% |`,
    `| Victoires par round | ${totLosses}/${totRounds} | **${totWins}/${totRounds}** | — |`,
    "",
    `**Verdict :** le MoE Champion ${gainPct > 0 ? "dépasse" : "égal ne dépasse pas"} la baseline de ${fmt(Math.abs(gainPct))}% en qualité moyenne, avec un écart-type de ${fmt(cStd)} (stabilité).`,
    "",
    "## Détail par cas difficile",
    "",
  ];
  for (const c of cases) {
    if (c.error) { md.push(`### ${c.nom} — ❌ ${c.error}`); continue; }
    md.push(`### ${c.nom} \`${c.id}\``);
    md.push(`> _« ${c.q.slice(0, 160)}… »_`);
    md.push("");
    md.push(`Qualité : baseline ${fmt(mean(c.baseScores))}±${fmt(std(c.baseScores))} → Champion ${fmt(mean(c.cavScores))}±${fmt(std(c.cavScores))} · victoires Champion ${c.wins}/${c.rounds.length} · mur ${fmt(c.wallMs / 1000, 1)}s`);
    md.push("");
    md.push(`| Critère (juge /5) | Baseline | Champion | Δ |`);
    md.push(`|-------------------|---------:|---------:|---:|`);
    for (const k of ["exactitude", "complementation", "profondeur", "actionabilite"]) {
      const b = c.critAgg.baseline[k], cv = c.critAgg.caverne[k];
      md.push(`| ${k} | ${fmt(b)} | ${fmt(cv)} | ${fmt(cv - b, 2)} |`);
    }
    md.push("");
    md.push("Détail des répétitions :");
    for (let i = 0; i < c.rounds.length; i++) {
      const r = c.rounds[i];
      md.push(`- rep ${r.rep}: base ${fmt(r.baseScore)} / cav ${fmt(r.cavScore)} → **${r.winner}**`);
    }
    md.push("");
  }
  md.push("## Reproduire");
  md.push("");
  md.push("```bash");
  md.push("node server/server.mjs &");
  md.push("node scripts/forge-champion.mjs   # forge le Génie Champion");
  md.push(`node scripts/bench-hard.mjs                        # baseline qwen-turbo, ${REPEATS} reps`);
  md.push("node scripts/bench-hard.mjs <genieId> qwen-plus 10   # 10 reps pour crédibilité maximale");
  md.push("```");
  md.push("");
  md.push(`Résultat JSON brut : \`bench/hard-${ts0}.json\`.`);
  fs.writeFileSync(path.join(ROOT, "docs", "BENCHMARK_HARD.md"), md.join("\n"));

  console.log(`\n  ✅ ${cases.filter((c) => !c.error).length}/${cases.length} cas mesurés`);
  console.log(`  📈 Qualité globale : ${fmt(gMean)}±${fmt(gStd)} → ${fmt(cMean)}±${fmt(cStd)} (${fmt(gainPct)}%) · Champion ${totWins}/${totRounds} rounds`);
  console.log(`  📄 JSON : ${path.relative(ROOT, jsonPath)}`);
  console.log(`  📄 MD   : docs/BENCHMARK_HARD.md\n`);
})().catch((e) => { console.error("Benchmark échoué :", e.message); process.exit(1); });
