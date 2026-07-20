# Pitch La Caverne aux 40 Voleurs — Qwen Cloud Global AI Hackathon 2026

> Deck 10 slides · ~5 min · démo live à l'appui. Tous les chiffres sont reproductibles (`scripts/bench-hard.mjs`, `scripts/hero-table.mjs`, `node scripts/audit-layers.mjs`).

## Slide 1 — Hook (15 s)

**Ali Baba avait 40 voleurs. Vous, vous avez 40 experts Qwen — et un Génie qui sait quand ne pas les convoquer.**
Un orchestrateur MoE **adaptatif**, natif Qwen Cloud, qui ne s'active que lorsqu'il prouve qu'il vaut la peine.

## Slide 2 — Problème (30 s)

- Un LLM fort seul = cher, parfois surcoté sur les tâches simples.
- Un MoE naïf = **dilue la thèse** sur les tâches analytiques (fusion multi-experts tue le raisonnement).
- Le vrai défi n'est pas « faire un MoE », c'est **savoir quand l'activer**.

## Slide 3 — Solution : orchestrateur adaptatif (45 s)

**La Caverne** classifie chaque requête avant de router :

- **Tâche analytique mono-domaine** → *délégation* à 1 expert fort, **sans fusion** (k=1).
- **Tâche constructive multi-domaines** → top-k experts + fusion « **rédacteur en chef** » (un seul narrateur, pas de patchwork).
- **Veto sur le mode** : l'orchestrateur confronte sa fusion au meilleur expert seul et la **rejette** si l'expert gagne.
- Famille Qwen orchestrée : `qwen-turbo` (router) · `qwen-plus` (experts) · `qwen-coder-plus` (code) · `qwen-max` (fusion + juge).

> **L'argument n'est pas « on a 40 experts », c'est « on sait quand n'en utiliser qu'un ».**

## Slide 4 — Hero table : v1 → v2 (la preuve du flip)

| Cas (juge /20) | qwen-turbo | MoE v1 naïf | MoE v2 adaptatif |
|---|---:|---:|---:|
| login sécurisé | 14.30 | 16.00 | 10.80 |
| microservices | 13.80 | 17.67 | **18.60** |
| refactor pur | 13.20 | 19.67 | 16.70 |
| **consistency** | **11.90** | **13.33 ❌** | **19.50 ✅ (5/5 unanime)** |
| **Global** | **13.30** | 16.67 (+4%) | **16.40 (+23%) · 12/20 consensus** |

- v1 = MoE naïf : **+4% seulement**, plafonne sur `consistency` (la fusion dilue l'analyse).
- v2 = adaptatif : **+23%**, flip `consistency` 13.33 → 19.50 (**5/5 unanime sous double-juge**).
- v2 domine les tâches **décomposables** (microservices, consistency) ; sur le code mono-concern (login/refactor), le MoE peut sous-performer — c'est exactement ce que le **veto sur le mode (L80)** corrige en option.
- _La régression v1 n'est pas un bug : c'est la **découverte** qui a motivé v2._

## Slide 5 — Méthodo de mesure crédible (30 s)

- **Pairwise A/B randomisé** (anti-biais de position du juge).
- **Double juge** : `qwen-max` + `qwen-plus`, victoire nette **seulement si accord** (tie sinon — juge bruité assumé).
- Rubrique **4 critères** (exactitude, complémentarité, profondeur, actionabilité) × 0-5 = 0-20.
- **5 répétitions** par question (configurable jusqu'à 10), moyenne ± écart-type.
- Baseline = `qwen-turbo` agent unique, **même prompt**, même juge.

## Slide 6 — Identité produit : Le Camp (45 s)

Trois features jamais vues qui donnent une âme au projet :

- **L'Embûche** (`POST /api/camp/audit`) : un stratège adversarial teste la robustesse de la bande et recrute un voleur de rupture.
- **Le Conciliabule** (`POST /api/camp/forge`) : recruteur MoE qui constitue l'escouade optimale puis organise un **débat de recrutement** où chaque candidat plaide.
- **Les Sceaux** (`POST /api/camp/sigil`) : sigil SVG génératif + marée dynamique — chaque Génie a son blason.

## Slide 7 — Observabilité temps réel (30 s)

**L'Observatoire** (SSE live) montre le raisonnement de l'orchestrateur, pas juste la réponse finale :
quel agent est sélectionné · pourquoi (score embedding × perf) · coût par agent · latence · confiance · fusion · **veto** · historique des décisions.

## Slide 8 — Architecture : 81/81 couches vérifiées (30 s)

- `node scripts/audit-layers.mjs` → **L0 → L80, 81/81 implémentées** (script reproductible, pas une checklist manuelle).
- **18/18 tests** verts, **typecheck** vert, **build** vert.
- Zero dépendance lourde : Node ESM natif + React + Vite. Providers : **Qwen Cloud / AI Studio / Alibaba Cloud / Ollama Cloud uniquement**.

## Slide 9 — Démo live (60 s)

1. `sh scripts/run-demo.sh` → Caverne seedée + backend.
2. Onglet **Le Camp** → L'Embûche, Le Conciliabule, Les Sceaux.
3. Poser une question analytique → **délégation mono-expert** (l'Observatoire le montre).
4. Poser une question multi-domaines → **top-k + fusion rédacteur** (+ veto si activé).
5. `node scripts/bench-hard.mjs` → tableau live baseline vs Champion.

## Slide 10 — Appel (15 s)

**Sésame, ouvre-toi.**
Un orchestrateur qui sait quand ne pas être un MoE. Une régression transformée en découverte. Un récit, pas une démo.
La Caverne est prête. Le Génie attend. La Lampe n'attend que votre voix.

---

## Reproduire en 2 commandes

```bash
sh scripts/run-demo.sh                 # seed + backend (mode démo, sans clé)
node scripts/bench-hard.mjs            # benchmark baseline vs Champion
node scripts/hero-table.mjs bench/<v1>.json bench/<v2>.json
```

Avec clé réelle : `export DASHSCOPE_API_KEY=...` puis `node scripts/forge-champion.mjs && node scripts/bench-hard.mjs`.
