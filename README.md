# 🏴 La Caverne aux 40 Voleurs

> **Orchestrateur multi-agents Qwen** pour le Qwen Cloud Global AI Hackathon 2026.  
> Une bande de 40 experts (Voleurs) sous la direction d'un Génie, avec mesure de gain économique et qualitatif en temps réel.

---

## ✨ Proposition de valeur

La Caverne ne **remplace pas** Qwen — elle **combine intelligemment** plusieurs modèles Qwen pour obtenir plus de qualité tout en dépensant moins de tokens qu'un agent unique.

- **Gain économique** mesuré via la Balance du Marchand.
- **Gain qualitatif** mesuré via l'Arène du Sabre.
- **Multi-provider** : Qwen Cloud / Alibaba Cloud par défaut, Ollama Cloud et OpenRouter/Fable 5 en fallback.

---

## 🚀 Démarrage rapide

```bash
# 1. Dépendances
npm ci

# 2. Configuration
cp server/.env.example server/.env
# Éditez server/.env avec votre DASHSCOPE_API_KEY

# 3. Lancer le backend
node server/server.mjs

# 4. Lancer le frontend (autre terminal)
npm run dev
```

Le backend écoute sur le port `8787` (ou `PORT=...`), le frontend Vite sur `5273`.

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
| Fable 5 + OpenRouter | L73-L78 | `server/fable5/` |
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
OPENROUTER_API_KEY=sk-...          # Pour Fable 5 et modèles externes
OLLAMA_HOST=http://localhost:11434  # Fallback local
SANDBOX_TIMEOUT_MS=5000
MOE_BAZAAR=on
MOE_SIROCCO=on
MOE_TRAITOR=on
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
- **IA** : Qwen Cloud / Alibaba Cloud via DashScope, OpenRouter/Fable 5, Ollama.

---

## 📜 Licence

Apache 2.0 — voir `LICENSE`.

---

> 🏴 **WMF** reste propriétaire du projet et de ses concepts.
