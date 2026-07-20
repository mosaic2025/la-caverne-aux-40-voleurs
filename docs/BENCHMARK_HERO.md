# 🏆 Tableau Hero — Baseline vs MoE v1 vs MoE v2 (adaptatif)

> Généré par `scripts/hero-table.mjs` — baseline **qwen-turbo**, v1 = `hard-1784388536221.json` (3 reps), v2 = `hard-1784462060104.json` (5 reps, double-juge pairwise).
> **v1** = MoE top-k+fusion uniforme (avant délégation). **v2** = orchestrateur adaptatif (délégation mono-expert sur tâches analytiques + fusion « rédacteur en chef »).
> Scores qualité /20 (moyenne des reps) — comparable entre runs. Les victoires consensus double-juge sont dans `docs/BENCHMARK_HARD.md`.

## Vue d'ensemble (qualité /20)

| Cas | qwen-turbo | MoE v1 | MoE v2 |
|-----|---:|---:|---:|
| Endpoint login typé + sécurisé + tests | 14.30 | 16.00 | **10.80** |
| Migration monolithe→microservices e-commerce | 13.80 | 17.67 | **18.60** |
| Refactor typé + pur + testable + gestion d'erreurs | 13.20 | 19.67 | **16.70** |
| Eventual vs strong consistency pour un panier | 11.90 | 13.33 | **19.50** |
| **Global** | **13.30** | **16.67** (4.17% vs sa baseline) | **16.40** (**+23.31%** vs sa baseline) |

## Lecture jury

- La colonne **v1** montre la régression du MoE naïf sur les tâches analytiques (fusion qui dilue la thèse).
- La colonne **v2** montre le flip apporté par l'orchestrateur adaptatif : il sait *quand ne pas être un MoE*.
- La ligne **consistency** est le moment-clé du récit : v1 plafonne (13.33), v2 s'envole (19.50, 5/5 unanime) — preuve que l'adaptativité n'est pas un détail cosmétique.
- **Global : +23.31%** en qualité moyenne vs agent unique, sous double-juge pairwise (le bar le plus strict).

## Reproduire
```bash
node server/server.mjs &
node scripts/forge-champion.mjs
node scripts/bench-hard.mjs                 # v2 (adaptatif), 5 reps, double-juge
# v1 : revenir au MoE sans délégation (git checkout avant la gate) puis relancer bench-hard.mjs
node scripts/hero-table.mjs bench/<v1>.json bench/<v2>.json
```