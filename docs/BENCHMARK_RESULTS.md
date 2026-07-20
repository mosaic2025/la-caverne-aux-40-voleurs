# 📊 Benchmark reproductible — Caverne vs baseline

> Généré par `scripts/bench.mjs` le 2026-07-18T14:39:42.417Z — Génie `gen_42i6gjwd`, API `http://localhost:8787`.
> Chaque cas d'usage pose des **questions fixes** au MoE Caverne et à un **agent unique baseline**, puis un **juge qwen-max** note la qualité (anonymisé A/B). Mesures : temps (latence), coût (tokens × prix), qualité (score juge).

## Résumé agrégé

| Métrique | Baseline (agent unique) | Caverne (MoE) | Gain |
|----------|------------------------:|--------------:|-----:|
| Qualité (juge /20) | 8.50 | 8.50 | 0.00% |
| Latence moyenne (ms) | 9064 | 31000 | -242.00% |
| Coût/1k tokens | 0.001325 | 0.001411 | -6.47% |
| Tokens totaux | 6018 | 21188 | -252.08% |

**Victoires par round :** Caverne 4 · Baseline 4 · Égalités 0.

## Détail par cas d'usage

### Concurrence & performance Node `concurrency`
Baseline : `qwen-turbo` (qwen-cloud) · 2 rounds · mur 98.9s

| Métrique | Baseline | Caverne | Gain % |
|----------|---------:|--------:|-------:|
| qualité | 9.00 | 8.00 | -11.11% |
| latence p95 | 9272.00 | 58211.00 | -527.81% |
| latence moyenne | 8338.50 | 39820.50 | -377.55% |
| coût/1k | 0.000300 | 0.001473 | -391.05% |
| tokens | 1874.00 | 6079.00 | -224.39% |
| tokens/moyenne | 937.00 | 3039.50 | -224.39% |

Détail des rounds (gagnant par round) :

- _« Explique la différence entre concurrence et parallélisme, avec un exem… »_ → **baseline** (base 9.00 / cav 8.00)
- _« Comment éviter les goulots d'étranglement I/O sur une API Express rece… »_ → **baseline** (base 9.00 / cav 8.00)

### Architecture & migration microservices `archi`
Baseline : `qwen-turbo` (qwen-cloud) · 2 rounds · mur 64.3s

| Métrique | Baseline | Caverne | Gain % |
|----------|---------:|--------:|-------:|
| qualité | 8.00 | 9.50 | 18.75% |
| latence p95 | 8042.00 | 29995.00 | -272.98% |
| latence moyenne | 5352.00 | 25752.50 | -381.18% |
| coût/1k | 0.000300 | 0.001440 | -379.93% |
| tokens | 1299.00 | 6002.00 | -362.05% |
| tokens/moyenne | 649.50 | 3001.00 | -362.05% |

Détail des rounds (gagnant par round) :

- _« Quels sont les compromis entre une base SQL et une base documentaire p… »_ → **caverne** (base 8.00 / cav 9.00)
- _« Rédige un plan en 5 points pour migrer une API monolithique vers des s… »_ → **caverne** (base 8.00 / cav 10.00)

### Code & typage TypeScript `code`
Baseline : `qwen-coder-plus` (qwen-cloud) · 2 rounds · mur 38.5s

| Métrique | Baseline | Caverne | Gain % |
|----------|---------:|--------:|-------:|
| qualité | 8.00 | 9.00 | 12.50% |
| latence p95 | 5805.00 | 17374.00 | -199.29% |
| latence moyenne | 3621.50 | 14592.00 | -302.93% |
| coût/1k | 0.003500 | 0.001297 | 62.95% |
| tokens | 545.00 | 3659.00 | -571.38% |
| tokens/moyenne | 272.50 | 1829.50 | -571.38% |

Détail des rounds (gagnant par round) :

- _« Écris une fonction TypeScript générique qui déduplique un tableau par … »_ → **caverne** (base 8.00 / cav 9.00)
- _« Refactorise ce snipset pour éliminer les any : function map(a){return … »_ → **caverne** (base 8.00 / cav 9.00)

### Analyse de données & métriques `analyse`
Baseline : `qwen-plus` (qwen-cloud) · 2 rounds · mur 128.3s

| Métrique | Baseline | Caverne | Gain % |
|----------|---------:|--------:|-------:|
| qualité | 9.00 | 7.50 | -16.67% |
| latence p95 | 18981.00 | 66364.00 | -249.63% |
| latence moyenne | 18944.50 | 43833.00 | -131.38% |
| coût/1k | 0.001200 | 0.001433 | -19.46% |
| tokens | 2300.00 | 5448.00 | -136.87% |
| tokens/moyenne | 1150.00 | 2724.00 | -136.87% |

Détail des rounds (gagnant par round) :

- _« Quelles métriques suivre pour évaluer la qualité d'un orchestrateur mu… »_ → **baseline** (base 9.00 / cav 7.00)
- _« Comment détecter la dérive sémantique entre plusieurs experts sur une … »_ → **baseline** (base 9.00 / cav 8.00)

## Reproduire

```bash
# 1) lancer le backend
node server/server.mjs &
# 2) (option) seed démo
node scripts/seed-demo.mjs
# 3) lancer le benchmark
node scripts/bench.mjs [genieId] [baselineModel] [baselineProvider]
```

Résultat JSON brut : `bench/results-1784385582417.json`.