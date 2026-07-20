# 🏴 La Caverne aux 40 Voleurs

![layers](https://img.shields.io/badge/couches-81%2F81%20v%C3%A9rifi%C3%A9es-brightgreen)
![tests](https://img.shields.io/badge/tests-25%2F25%20vert-brightgreen)
![typecheck](https://img.shields.io/badge/typecheck-pass-brightgreen)
![build](https://img.shields.io/badge/build-pass-brightgreen)
![benchmark](https://img.shields.io/badge/MoE%20v2-%2B23%25%20qualit%C3%A9-blue)
![providers](https://img.shields.io/badge/providers-Qwen%20Cloud%20%7C%20Alibaba%20%7C%20Ollama-orange)


> **Orchestrateur multi-agents Qwen** pour le Qwen Cloud Global AI Hackathon 2026.  
> Une bande de 40 experts (Voleurs) sous la direction d'un Génie, avec mesure de gain économique et qualitatif en temps réel.

---

## ✨ Proposition de valeur

La Caverne ne **remplace pas** Qwen — elle **combine intelligemment** plusieurs modèles Qwen pour obtenir plus de qualité tout en dépensant moins de tokens qu'un agent unique.

- **Gain économique** mesuré via la Balance du Marchand.
- **Gain qualitatif** mesuré via l'Arène du Sabre.
- **Multi-provider** : Qwen Cloud / AI Studio et Alibaba Cloud par défaut, Ollama Cloud en fallback. (Providers autorisés uniquement — Fable 5 est un pont interne via Qwen Cloud.)

---

## 🚀 Démarrage rapide

**Mode démo (sans clé, 1 commande) :**

```bash
npm ci && sh scripts/run-demo.sh
```

**Mode réel (avec clé Qwen Cloud) :**

```bash
npm ci
cp server/.env.example server/.env   # renseigner DASHSCOPE_API_KEY
node server/server.mjs &             # backend :8787
npm run dev                          # frontend :5273
```

Le backend écoute sur le port `8787` (ou `PORT=...`), le frontend Vite sur `5273`.

---

## 📊 Résultats — MoE adaptatif vs agent unique

| Cas (juge /20) | qwen-turbo | MoE v1 naïf | MoE v2 adaptatif |
|---|---:|---:|---:|
| login sécurisé | 14.30 | 16.00 | 10.80 |
| microservices | 13.80 | 17.67 | **18.60** |
| refactor pur | 13.20 | 19.67 | 16.70 |
| consistency | 11.90 | 13.33 ❌ | **19.50 ✅ (5/5 unanime)** |
| **Global** | **13.30** | 16.67 (+4%) | **16.40 (+23%) · 12/20 consensus** |

- **Pairwise A/B randomisé** + **double juge** (qwen-max + qwen-plus), victoire sur accord (12/20 rounds, bar le plus strict).
- 5 répétitions par question. v1 régresse sur `consistency` (fusion qui dilue) → c'est la **découverte** qui motive v2 (délégation mono-expert + fusion rédacteur). Flip 13.33 → 19.50, 5/5 unanime.
- Reproduire : `node scripts/bench-hard.mjs` puis `node scripts/hero-table.mjs bench/<v1>.json bench/<v2>.json`. Voir `docs/BENCHMARK_HARD.md` et `docs/BENCHMARK_HERO.md`.
---

## 🏛️ Architecture 80 couches

Le projet est structuré autour de **12 piliers** couvrant **80 couches fonctionnelles** :

| Pilier | Couches | Fichiers |
|--------|---------|----------|
| Persistance | L0-L6 | `server/store.mjs`, `server/persistence/` |
| Humanité | L7-L14 | `server/humanity/` |
| KB — Runes du Coffre | L15-L22 | `server/kb/`, `server/routes/kb.mjs` |
| Profilage utilisateur | L23-L30 | `server/profiles/` |
| Abliterated / Uncensored | L31-L36 | `server/moe.mjs`, `server/guards/` |
| Tools | L37-L44 | `server/tools/` |
| Agents autonomes | L45-L52 | `server/agents/` |
| Vision | L53-L58 | `server/vision/` |
| Connaissance partagée | L59-L66 | `server/sharedMind/` |
| Gen multimodal | L67-L72 | `server/gen/` |
| Fable 5 (pont Qwen Cloud) | L73-L78 | `server/fable5/` |
| Orchestration ultime | L79-L80 | `server/orchestrator.mjs` |

Voir `docs/ARCHITECTURE_80_LAYERS.md` et `ARCHITECTURE_STATUS.md` pour le détail.

---

## 🎭 Les onglets

| Onglet | Description |
|--------|-------------|
| **Le Camp** | Créer et gérer les Voleurs (experts multi-provider). |
| **Le Repaire** | Monitoring live des budgets, tokens, runs. |
| **Le Génie** | Forger un MoE, discuter avec lui, choisir la stratégie de routing. |
| **Le Conseil** | Duels, débats, pipelines et tournois entre experts. |
| **Arène du Sabre** | Bande (MoE) vs agent unique — verdict juge Qwen. |
| **Le Miroir** | Fusion utilisateur : comment le Génie adapte sa voix. |
| **L'Atelier** | IDE avec Monaco, assistance Qwen-Coder, exécution sandboxée. |
| **Nuit Étoilée** | Génération d'images et vidéos. |
| **Le Connecteur** | Connaissance partagée (objectif 1B → 1T tokens). |
| **La Lampe** | Avatar compagnon né, persistant et fusionnel — débloqué via `shazaam` dans l'Atelier. |
| **Les Trésors** | Benchmark Caverne vs baseline avec chiffres de gain. |

---

## 🔧 Configuration

Créez un `server/.env` :

```env
# Obligatoire
DASHSCOPE_API_KEY=sk-...

# Optionnel
ALIBABA_API_KEY=sk-...
# (Fable 5 utilise Qwen Cloud — aucune clé OpenRouter requise)
OLLAMA_HOST=http://localhost:11434  # Fallback local
SANDBOX_TIMEOUT_MS=5000
MOE_BAZAAR=on
MOE_SIROCCO=on
MOE_TRAITOR=on
MOE_MODE_VETO=on   # L80 : veto de la fusion si un expert seul gagne
MOE_INPUT_GUARD=on
MOE_OUTPUT_GUARD=on
```

---

## 🧪 Tests

```bash
# TypeScript
npm run typecheck

# Build production
npm run build

# Tests des couches architecture 80
node server/tests/architecture.test.mjs
```

---

## 📦 Stack

- **Backend** : Node.js 18+ ESM, zéro dépendance externe (fetch natif).
- **Frontend** : React 18 + TypeScript + Vite.
- **Éditeur** : Monaco Editor (self-hosted).
- **Sandbox** : Docker (fallback spawn restreint).
- **IA** : Qwen Cloud / AI Studio et Alibaba Cloud via DashScope, Ollama Cloud. (Aucun autre provider.)

---

## 📜 Licence

Apache 2.0 — voir `LICENSE`.

---

> 🏴 **WMF** reste propriétaire du projet et de ses concepts.
