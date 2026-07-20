# 📊 Benchmark DIFFICILE — Champion (MoE) vs agent unique

> Généré par `scripts/bench-hard.mjs` le 2026-07-19T11:54:20.104Z — Génie `gen_78233b44-f3b9-4fe1-970c-78b5905490ce`, baseline `qwen-turbo`, **5 répétitions par question** (moyenne ± écart-type).
> Tâches **multi-domaines difficiles** où un modèle unique atteint ses limites. **Double juge** (qwen-max + qwen-plus) en **pairwise A/B randomisé** (anti-biais de position) — victoire nette seulement si accord des deux juges. Rubrique 4 critères (exactitude, complémentarité, profondeur, actionabilité) notés 0-5, total 0-20.

## Résultat global

| Métrique | Baseline qwen-turbo | Champion (MoE) | Gain |
|----------|--------------------:|---------------:|-----:|
| Qualité moyenne (/20) | 13.30 ± 1.54 | 16.40 ± 4.71 | 23.31% |
| Victoires par round | 3/20 | **12/20** | — |

**Verdict :** le MoE Champion dépasse la baseline de 23.31% en qualité moyenne, avec un écart-type de 4.71 (stabilité).

## Détail par cas difficile

### Endpoint login typé + sécurisé + tests `login-secure`
> _« Implémente en TypeScript un endpoint Express POST /login qui valide l'email, hache le mot de passe avec bcrypt (cost 12), émet un JWT signé (HS256, exp 1h), ren… »_

Qualité : baseline 14.30±1.69 → Champion 10.80±6.07 · victoires Champion 1/5 · mur 98.2s

| Critère (juge /5) | Baseline | Champion | Δ |
|-------------------|---------:|---------:|---:|
| exactitude | 3.80 | 3.10 | -0.70 |
| complementation | 3.30 | 2.40 | -0.90 |
| profondeur | 3.00 | 2.30 | -0.70 |
| actionabilite | 4.20 | 3.00 | -1.20 |

Détail des répétitions :
- rep 0: base 12.50 / cav 19.00 → **caverne**
- rep 1: base 15.00 / cav 3.50 → **baseline**
- rep 2: base 17.00 / cav 7.50 → **baseline**
- rep 3: base 12.50 / cav 17.00 → **tie**
- rep 4: base 14.50 / cav 7.00 → **baseline**

### Migration monolithe→microservices e-commerce `microservices`
> _« Conçois la migration d'un monolithe e-commerce (catalogue, panier, commandes, paiement) vers des microservices : propose le découpage, le mode de communication … »_

Qualité : baseline 13.80±1.47 → Champion 18.60±1.36 · victoires Champion 4/5 · mur 101.5s

| Critère (juge /5) | Baseline | Champion | Δ |
|-------------------|---------:|---------:|---:|
| exactitude | 3.70 | 4.80 | 1.10 |
| complementation | 3.80 | 4.30 | 0.50 |
| profondeur | 2.70 | 4.80 | 2.10 |
| actionabilite | 3.60 | 4.70 | 1.10 |

Détail des répétitions :
- rep 0: base 13.50 / cav 20.00 → **caverne**
- rep 1: base 11.50 / cav 19.00 → **caverne**
- rep 2: base 14.50 / cav 17.00 → **caverne**
- rep 3: base 13.50 / cav 20.00 → **caverne**
- rep 4: base 16.00 / cav 17.00 → **tie**

### Refactor typé + pur + testable + gestion d'erreurs `refactor-pure`
> _« Refactorise cette fonction pour qu'elle soit typée strict, pure (sans effet de bord), testable, et gère explicitement les erreurs (panier vide, item sans prix, … »_

Qualité : baseline 13.20±0.51 → Champion 16.70±2.01 · victoires Champion 2/5 · mur 103.0s

| Critère (juge /5) | Baseline | Champion | Δ |
|-------------------|---------:|---------:|---:|
| exactitude | 3.70 | 4.20 | 0.50 |
| complementation | 3.10 | 4.40 | 1.30 |
| profondeur | 2.50 | 3.80 | 1.30 |
| actionabilite | 3.90 | 4.30 | 0.40 |

Détail des répétitions :
- rep 0: base 13.00 / cav 13.50 → **tie**
- rep 1: base 14.00 / cav 19.50 → **caverne**
- rep 2: base 13.00 / cav 16.50 → **tie**
- rep 3: base 12.50 / cav 18.00 → **caverne**
- rep 4: base 13.50 / cav 16.00 → **tie**

### Eventual vs strong consistency pour un panier `consistency`
> _« Analyse le compromis eventual consistency vs strong consistency pour un panier e-commerce multi-régions : quand choisir l'un ou l'autre selon le contexte, impac… »_

Qualité : baseline 11.90±1.02 → Champion 19.50±0.32 · victoires Champion 5/5 · mur 181.7s

| Critère (juge /5) | Baseline | Champion | Δ |
|-------------------|---------:|---------:|---:|
| exactitude | 3.40 | 5.00 | 1.60 |
| complementation | 2.70 | 4.80 | 2.10 |
| profondeur | 2.50 | 4.90 | 2.40 |
| actionabilite | 3.30 | 4.80 | 1.50 |

Détail des répétitions :
- rep 0: base 12.50 / cav 19.50 → **caverne**
- rep 1: base 12.00 / cav 19.00 → **caverne**
- rep 2: base 13.00 / cav 19.50 → **caverne**
- rep 3: base 12.00 / cav 19.50 → **caverne**
- rep 4: base 10.00 / cav 20.00 → **caverne**

## Reproduire

```bash
node server/server.mjs &
node scripts/forge-champion.mjs   # forge le Génie Champion
node scripts/bench-hard.mjs                        # baseline qwen-turbo, 5 reps
node scripts/bench-hard.mjs <genieId> qwen-plus 10   # 10 reps pour crédibilité maximale
```

Résultat JSON brut : `bench/hard-1784462060104.json`.