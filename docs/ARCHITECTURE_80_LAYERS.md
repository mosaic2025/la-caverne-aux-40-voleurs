# 🏛️ Architecture 80 couches — La Caverne aux 40 Voleurs

> Objectif : transformer `la-caverne-aux-40-voleurs` en une plateforme multi-agents multicouche, avec persistance, humanité, KB, profilage, capacités abliterated/uncensored, tools, agents autonomes, vision, connaissance partagée à grande échelle (1B / 1T tokens de savoir collectif), génération multimodale (image/vidéo/TTS) et pont Fable 5 via OpenRouter.

---

## Vue d'ensemble des 12 piliers

| # | Pilier | Couches concernées | Fichier(s) maîtres |
|---|--------|-------------------|-------------------|
| 1 | **Persistance** | L0-L6 | `server/store.mjs`, `server/persistence/*.mjs` |
| 2 | **Humanité** | L7-L14 | `server/humanity/*.mjs`, `src/panels/LeMiroir.tsx` |
| 3 | **KB — Runes du Coffre** | L15-L22 | `server/routes/kb.mjs`, `server/kb/*.mjs` |
| 4 | **Profilage utilisateur** | L23-L30 | `server/routes/fusion.mjs`, `server/profiles/*.mjs` |
| 5 | **Abliterated / Uncensored** | L31-L36 | `server/moe.mjs` (UNCHAINED), `server/guards/*.mjs` |
| 6 | **Tools / Actions** | L37-L44 | `server/tools/*.mjs`, `src/lib/tabTools.ts` |
| 7 | **Agents autonomes** | L45-L52 | `server/agents/*.mjs`, `server/routes/missions.mjs` |
| 8 | **Vision** | L53-L58 | `server/vision/*.mjs`, `server/routes/etoile.mjs` |
| 9 | **Connaissance partagée** | L59-L66 | `server/sharedMind/*.mjs` |
| 10 | **Multimodal — Gen** | L67-L72 | `server/gen/*.mjs` |
| 11 | **Fable 5 + OpenRouter** | L73-L78 | `server/fable5/*.mjs` |
| 12 | **Orchestration ultime** | L79-L80 | `server/orchestrator.mjs` |

---

## Détail des 80 couches

### Pilier 1 — Persistance (L0-L6)

- **L0 Store atomique JSON** : `server/store.mjs` — load/save atomique, migrations.
- **L1 Journal d'événements** : append-only log de toutes les mutations.
- **L2 Snapshots** : snapshots horodatés pour rollback.
- **L3 Migrations** : versionnage automatique du schéma `data.json`.
- **L4 Cache mémoire** : cache LRU des objets fréquemment accédés.
- **L5 Export / Import** : backup/restore complet.
- **L6 Intégrité** : checksums + réparation automatique.

### Pilier 2 — Humanité (L7-L14)

- **L7 Personnalité de base** : traits, humeur, cycle biologique simulé.
- **L8 Mémoire émotionnelle** : souvenirs marquants, sentiment associé.
- **L9 Empathie contextuelle** : détection du ton utilisateur.
- **L10 Préférences de style** : formalité, longueur, humour.
- **L11 Mémoire long-terme** : résumés compressés des conversations.
- **L12 Adaptation rythmique** : synchronisation avec la cadence utilisateur.
- **L13 Intentions anticipées** : prédiction des prochains besoins.
- **L14 Portrait vivant** : avatar réactif (La Lampe).

### Pilier 3 — KB — Runes du Coffre (L15-L22)

- **L15 Chunking maison** : segmentation + overlap.
- **L16 Embeddings** : `text-embedding-v3` / Ollama `nomic-embed-text`.
- **L17 Vector store disque** : index JSON + cosinus rapide.
- **L18 Recherche sémantique** : top-k + filtrage lexical.
- **L19 KB hybride** : docs texte + images + structuré.
- **L20 KB partagée** : contribution au savoir collectif.
- **L21 Résumé KB** : synthèse automatique avant injection.
- **L22 Versionnage KB** : historique des modifications.

### Pilier 4 — Profilage utilisateur (L23-L30)

- **L23 Profil lexical** : `server/routes/fusion.mjs` existant.
- **L24 Profil cognitif** : style de raisonnement (deductif/inductif/analogique).
- **L25 Profil technique** : stack, langages, outils préférés.
- **L26 Profil émotionnel** : ton, patience, niveau d'urgence.
- **L27 VoiceHint dynamique** : injection dans les prompts système.
- **L28 Segmentation** : personas explicites (chef, débutant, expert).
- **L29 Apprentissage par renforcement** : feedback explicite/implicit.
- **L30 Anonymisation** : export profil sans données sensibles.

### Pilier 5 — Abliterated / Uncensored (L31-L36)

- **L31 Couche UNCHAINED** : prompt system de base.
- **L32 Filtre sortant** : garde-fou contre les sorties dangereuses.
- **L33 Filtre entrant** : détection d'attaques prompt.
- **L34 Mode sandbox** : exécution isolée des outputs sensibles.
- **L35 Traitor (40ᵉ Voleur)** : agent dissident existant.
- **L36 Audit trail** : log des prompts sensibles (local uniquement).

### Pilier 6 — Tools / Actions (L37-L44)

- **L37 Registry tools** : déclaration dynamique.
- **L38 Validation d'arguments** : schémas JSON.
- **L39 Exécution safe** : sandbox Docker/fallback.
- **L40 Outils cross-tab** : navigation, création Voleur/Génie.
- **L41 Outils externes** : fetch, filesystem limité.
- **L42 Outils multimodaux** : gen image/vidéo/audio.
- **L43 Composition d'outils** : pipelines d'actions.
- **L44 Observabilité** : traces de tool calls.

### Pilier 7 — Agents autonomes (L45-L52)

- **L45 Agent Voleur autonome** : boucle perception/action.
- **L46 Agent Orchestrateur** : supervise les autres agents.
- **L47 Agent Missionnaire** : tâches planifiées (`server/routes/missions.mjs`).
- **L48 Agent Mémoire** : indexation et rappel automatique.
- **L49 Agent Traitor** : contradicteur permanent.
- **L50 Agent Curateur** : veille et enrichissement KB.
- **L51 Agent Négociateur** : arbitrage ressources/tokens.
- **L52 Agent Companion** : avatar persistant (La Lampe).

### Pilier 8 — Vision (L53-L58)

- **L53 Vision Qwen-VL** : analyse d'images.
- **L54 Génération d'images** : Wanx via DashScope.
- **L55 Génération de vidéos** : Wanx video via DashScope.
- **L56 OCR / Extraction** : texte dans les images.
- **L57 Vision Ollama** : fallback local.
- **L58 Cache médias** : stockage local + proxy.

### Pilier 9 — Connaissance partagée (L59-L66)

- **L59 Connecteur de pensée** : agrège les savoirs de tous les utilisateurs.
- **L60 KB universelle** : un seul grand corpus, 1B → 1T tokens.
- **L61 Contribution anonymisée** : chaque utilisateur enrichit le savoir commun.
- **L62 Consensus sémantique** : dédoublonnage et validation.
- **L63 Graphe de concepts** : entités et relations extraits.
- **L64 Recherche fédérée** : recherche locale + distante.
- **L65 Accès contrôlé** : permissions par niveau.
- **L66 Connecteur Fable 5** : pont vers OpenRouter pour les modèles absents.

### Pilier 10 — Multimodal — Gen (L67-L72)

- **L67 Gen image** : `server/routes/etoile.mjs` existant.
- **L68 Gen vidéo** : extension de l'existant.
- **L69 Gen audio / TTS** : synthèse vocale DashScope.
- **L70 Gen musique** : génération de sons d'ambiance.
- **L71 Gen avatar** : personnage visuel pour La Lampe.
- **L72 Pipeline multimodal** : image → vidéo → voix synchronisée.

### Pilier 11 — Fable 5 + OpenRouter (L73-L78)

- **L73 Provider OpenRouter** : `server/providers/openrouterProvider.js`.
- **L74 Modèles Fable 5** : mapping des modèles via OpenRouter.
- **L75 Fallback intelligent** : choix du meilleur modèle disponible.
- **L76 Cost routing** : sélection par prix/latence/qualité.
- **L77 Agrégation de réponses** : plusieurs modèles + vote/consensus.
- **L78 Cache OpenRouter** : réutilisation des réponses identiques.

### Pilier 12 — Orchestration ultime (L79-L80)

- **L79 Meta-orchestrateur** : choisit le provider, le modèle, la stratégie, les tools, le budget.
- **L80 Boucle de vie** : observation → décision → action → apprentissage → persistence.

---

## Contraintes de design

1. **Qwen-first** : Qwen Cloud / Alibaba Cloud sont les providers par défaut.
2. **Ollama Cloud** : fallback optionnel pour les modèles non disponibles chez Qwen.
3. **OpenRouter** : porte d'entrée vers Fable 5 et modèles exotiques.
4. **Zéro dépendance lourde** : Node ESM natif, React + Vite, SVG/Canvas, pas Three.js.
5. **Propriété WMF** : WMF reste propriétaire du code et des concepts.
6. **Privacy-first** : connaissance partagée anonymisée, profils exportables.

---

## Fichiers à créer / réorganiser

```
server/
  store.mjs              # refactor L0-L6
  persistence/
    journal.mjs
    snapshots.mjs
    migrations.mjs
    cache.mjs
  humanity/
    personality.mjs
    empathy.mjs
    memoryLongTerm.mjs
    avatarState.mjs
  kb/
    chunks.mjs
    embeddings.mjs
    vectorStore.mjs
    search.mjs
    sharedKb.mjs
  profiles/
    cognitive.mjs
    voiceHint.mjs
    learning.mjs
  guards/
    filters.mjs
    audit.mjs
  tools/
    registry.mjs
    executor.mjs
    crossTab.mjs
    external.mjs
  agents/
    base.mjs
    orchestrator.mjs
    memory.mjs
    traitor.mjs
    companion.mjs
  vision/
    analyze.mjs
    generate.mjs
    ocr.mjs
  sharedMind/
    connector.mjs
    universalKb.mjs
    conceptGraph.mjs
    federatedSearch.mjs
  gen/
    image.mjs
    video.mjs
    tts.mjs
    music.mjs
    avatarGen.mjs
    pipeline.mjs
  fable5/
    openrouterProvider.mjs
    fable5Client.mjs
    fallback.mjs
    aggregator.mjs
  orchestrator.mjs       # L79-L80
```

---

## Phases d'implémentation recommandées

### Phase 1 — Fondations (L0-L6, L15-L22, L23-L30)
Persistance, KB, profilage.

### Phase 2 — Moteur multicouche (L31-L52)
Guards, tools, agents autonomes, abliterated/uncensored.

### Phase 3 — Capacités avancées (L53-L72)
Vision, génération multimodale, avatar.

### Phase 4 — Connecteur collectif (L59-L66, L73-L80)
SharedMind, OpenRouter/Fable 5, orchestrateur ultime.

---

> 🏴 **Note** : ce document est la carte. Chaque couche doit être implémentée de manière incrémentale, en commençant par les fondations. Pas de suppression de l'existant sans revue.
