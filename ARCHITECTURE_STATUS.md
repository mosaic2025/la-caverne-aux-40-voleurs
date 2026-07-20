# 🏛️ État de l'architecture 80 couches — La Caverne aux 40 Voleurs

## ✅ Ce qui est en place


### Terminal magique + déblocage La Lampe
- `server/sandbox/terminal.mjs` — détecte `shazaam` dans le code de l'Atelier.
- `server/routes/atelier.mjs` — renvoie l'effet magique au lieu d'exécuter le code.
- `server/routes/unlocked.mjs` — route `/api/unlocked` pour lister les fonctionnalités débloquées.
- `src/App.tsx` — masque/révèle l'onglet **La Lampe** selon `lampe_revealed`.
- Test end-to-end OK : `shazaam` dans `/api/atelier/run` → débloque `lampe_revealed`.

### Évolution de La Lampe connectée au Génie
- `server/server.mjs` : après chaque réponse MoE, appel de `evolveCompanion()` pour faire évoluer l'avatar.
- `server/agents/companion.mjs` : fonction `evolveCompanion()` publique.
- `src/panels/LaLampe.tsx` : UI enrichie avec jauges, stade, souvenirs, bouton "Réveiller".
- Test end-to-end OK : `/api/avatar/:userId/evolve` crée et persiste l'avatar.

### Couches humaines et mémoire
- `server/humanity/memoryLongTerm.mjs` — compression d'historique + rappel contextuel.
- `server/profiles/voiceHint.mjs` — voiceHint dynamique fusion + ton + profil cognitif.
- `server/profiles/cognitive.mjs` — profilage cognitif/technique par triggers.
- `server/humanity/empathy.mjs` — détection de ton (urgent/positif/frustré/curieux/neutre).

### Fable 5 cache
- `server/fable5/cache.mjs` — cache mémoire Fable 5 (Qwen Cloud) avec TTL 1h.
- `server/fable5/fable5Client.mjs` — intègre le cache.

### Avatar Gen
- `server/gen/avatarGen.mjs` — génère un prompt de portrait pour La Lampe selon son stade.

### Mode démo sans clé API
- `server/mocks/demo.mjs` — réponses simulées pour Fable 5, OCR, TTS, image, vidéo.
- `scripts/seed-demo.mjs` — crée une Caverne de démo (4 Voleurs, 1 Génie, avatar, Lampe débloquée).
- `scripts/run-demo.sh` — lance la démo complète en un clic.
- Routes `/api/fable5`, `/api/gen/image`, `/api/gen/video`, `/api/tts`, `/api/vision/analyze` testées OK en mode démo.
### Fondations
- `docs/ARCHITECTURE_80_LAYERS.md` — carte complète des 12 piliers / 80 couches.
- `server/store.mjs` — persistance atomique avec migrations (L0-L6).
- Squelette des répertoires pour les 80 couches.

### MoE / Routing
- `server/moe.mjs` : `selectExperts()` avec 7 stratégies (`auto`, `mono`, `topk`, `specialisation`, `bazaar`, `cost`, `perf`).
- `routingStrategy` + `routingMode` persistés dans le `run`.
- Guards entrant/sortant connectés à `chatCompletion`.
- UI `src/panels/LeGenie.tsx` : sélecteurs routing / ML / embeddingModel.
- API `/api/genies/forge` et `/api/genies/forge-chat` prennent en compte les nouveaux champs.

### Agents (L45-L52)
- `server/agents/base.mjs` — classe de base.
- `server/agents/companion.mjs` — La Lampe, agent compagnon.
- `server/agents/memory.mjs` — indexation/rappel.
- `server/agents/orchestrator.mjs` — superviseur.
- `server/agents/traitor.mjs` — contradicteur.

### Connecteur de pensée / Meta
- `server/orchestrator.mjs` : meta-orchestrateur avec `route()` et 14 capacités.
- `server/sharedMind/connector.mjs` : contributions anonymisées + stats de savoir partagé.
- `server/sharedMind/universalKb.mjs` : KB universelle (objectif 1B → 1T tokens).
- `server/routes/meta.mjs` : routes `/api/meta/capabilities`, `/api/meta/orchestrate`, `/api/shared-knowledge/*`, `/api/tts`, `/api/vision/analyze`, `/api/fable5`.
- Onglet UI `src/panels/LeConnecteur.tsx` intégré dans `App.tsx`.

### Fable 5 (pont Qwen Cloud)
- `server/fable5/fable5Client.mjs` — pont Fable 5 repointé sur Qwen Cloud (DashScope).
- `server/fable5/fable5Client.mjs` — client Fable 5.
- `server/fable5/fallback.mjs` — fallback intelligent + cost routing.
- `server/fable5/aggregator.mjs` — agrégation de réponses.
- `server/providers/providerFactory.js` — enregistre `qwen-cloud`, `alibaba`, `ollama` (providers autorisés uniquement).
- `scripts/ask-fable5.mjs` — script CLI pour questionner Fable 5.

### Génération multimodale (L67-L72)
- `server/gen/image.mjs` — génération d'images Wanx.
- `server/gen/video.mjs` — génération de vidéos Wanx.
- `server/gen/tts.mjs` — synthèse vocale CosyVoice.
- `server/gen/music.mjs` — placeholder musique.
- `server/gen/pipeline.mjs` — pipeline multimodal image→vidéo→voix.

### Onglet La Lampe (prototype)
- `server/routes/avatar.mjs` — routes `/api/avatar/:userId`, `/api/avatar/:userId/evolve`.
- `src/panels/LaLampe.tsx` — affichage du compagnon et de sa personnalité.
- Intégré dans `src/App.tsx`.

### Guards / Sécurité
- `server/guards/filters.mjs` — scan entrant (prompt injection) et sortant (patterns dangereux).
- Connecté à `chatCompletion` dans `server/moe.mjs`.

### Humanité + Profilage
- `server/humanity/personality.mjs` — création et évolution de personnalité.
- `server/humanity/empathy.mjs` — détection de ton.
- `server/profiles/learning.mjs` — feedback et apprentissage.

## 🪔 Roadmap La Lampe (Nour) — fondations implémentées

- **Battle exécutée** : `glm-5.2:cloud` vs `gemma4:31b-cloud` via Ollama Cloud.
- **Gagnant / Orchestrateur Ollama Cloud officiel** : `glm-5.2:cloud`.
- **Plan final** : `docs/PLAN_LAMPE_QWEN_HACKATHON.md`.
- **Verdict** : `docs/battle_avatar_secret_verdict.md`.
- ✅ **Jour 1** : effet `shazaam` doré dans `LAtelier.tsx`, shards de mémoire dans `server/agents/companion.mjs`, persistance via `store.avatars`.
- ✅ **Jour 2** : `NourOrb.tsx` injecté dans `AssistantPanel.tsx` avec murmures contextuels ; `voiceHint` Nour fusionné dans la voix du Génie.
- ✅ **Jour 3 (partiel)** : route `/api/avatar/:userId/forge-voleur` pour créer un Voleur calibré sur les shards de Nour.
- ⬜ **Jour 3 (reste)** : permettre à Nour de devenir `orchestrateurId` d'un Génie via l'UI Le Génie.
- ✅ **Fable 5** : repointé sur Qwen Cloud, validé en direct via `/api/fable5`.

## 🏛️ Consolidation des piliers 80 couches

- ✅ **Pilier 1 Persistance** : `server/store.mjs` réécrit, `persistence/*.mjs` implémentés (journal, snapshots, migrations, cache LRU).
- ✅ **Pilier 2 Humanité** : personnalité, empathie, mémoire long terme, portrait vivant.
- ✅ **Pilier 4 Profilage** : cognitif/technique/émotionnel, voiceHint, apprentissage par feedback.
- ✅ **Pilier 5 Guards** : filtres entrant/sortant, audit trail.
- ✅ **Pilier 6 Tools** : registry, executor, cross-tab, external, recall_memory.
- ✅ **Pilier 7 Agents** : base, orchestrateur, mémoire, traitor, companion.
- ✅ **Pilier 9 SharedMind** : connecteur de pensée, KB universelle, graphe de concepts, recherche fédérée.
- ✅ **Pilier 12 Orchestration** : meta-orchestrateur avec guards + audit intégrés.

## ⚠️ Ce qui reste à faire

1. **Tests** : ajouter des tests pour les nouvelles couches.
2. **SharedMind avancé** : graphe de concepts, recherche fédérée, consensus sémantique.
3. **Fable5** : ✅ repointé sur Qwen Cloud, testé en direct via `/api/fable5`.
4. **Humanité** : mémoire long terme, portrait vivant animé.
5. **Profilage** : profil cognitif, technique, émotionnel, voiceHint dynamique.
6. **Battle La Lampe** : ✅ exécutée via Ollama Cloud (GLM 5.2 vs Gemma 4 31b). Fable 5 ✅ via Qwen Cloud.
7. **La Lampe jour 3** : Nour orchestrateur + contrat MAXI "Voleur à mon image".
8. **Piliers 80 couches** : ✅ fondations consolidées (L0-L6, L7-L14, L15-L22 KB vector store + recherche fédérée avec fallback Ollama, L23-L30, L31-L36, L37-L44, L45-L52, L59-L66, L79-L80). Reste : L53-L58 vision, L67-L72 multimodal avancé, L73-L78 Fable 5 en conditions réelles (bloqué par clés API).

## ✅ Validation actuelle

- `npm run typecheck` : OK.
- `npm run build` : OK.
- `node server/tests/architecture.test.mjs` : 18/18 OK.
- Serveur backend : import OK.
- Routes `/api/avatar/:userId`, `/api/avatar/:userId/evolve`, `/api/avatar/:userId/voice-hint`, `/api/avatar/:userId/forge-voleur` : OK.
- Déblocage magique `shazaam` via `/api/atelier/run` : OK.
- `/api/kb` et `/api/kb/search` avec fallback embeddings Ollama local : OK.
- `/api/shared-knowledge/*` (contribute, stats, ingest, search, graph) : OK.
- `/api/meta/capabilities` et `/api/meta/orchestrate` : OK.
