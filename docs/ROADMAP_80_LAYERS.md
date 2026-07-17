# 🗺️ Roadmap — Architecture 80 couches

## Phase 1 — Fondations (✅ en grande partie)

- [x] Persistance atomique JSON + migrations (`server/store.mjs`)
- [x] Journal d'événements et snapshots (structures créées)
- [x] Cache mémoire LRU (structure créée)
- [x] KB chunks + embeddings + recherche sémantique
- [x] Vector store disque (`server/kb/vectorStore.mjs`)
- [x] Profilage lexical/longueur (`server/routes/fusion.mjs`)
- [x] Profilage cognitif/technique (`server/profiles/cognitive.mjs`)
- [x] VoiceHint dynamique (`server/profiles/voiceHint.mjs`)

## Phase 2 — Moteur multicouche (✅ en grande partie)

- [x] Routing MoE sélectionnable (`auto`, `mono`, `topk`, `specialisation`, `bazaar`, `cost`, `perf`)
- [x] Guards entrant/sortant connectés au pipeline
- [x] Abliterated/uncensored (`UNCHAINED` + guards)
- [x] Tools registry + executor
- [x] Agents : companion, memory, orchestrator, traitor
- [x] Mémoire long terme et compression
- [x] Empathie contextuelle

## Phase 3 — Capacités avancées (✅ en grande partie)

- [x] Vision : analyse d'image Qwen-VL + OCR
- [x] Gen multimodal : image, vidéo, TTS, musique, avatar
- [x] Pipeline multimodal
- [x] Connecteur de pensée : contributions anonymisées + stats
- [x] Graphe de concepts
- [x] KB universelle partagée

## Phase 4 — Connecteur cloud (✅ structure, ⏳ tests réseau)

- [x] Provider OpenRouter
- [x] Client Fable 5
- [x] Fallback intelligent + cost routing
- [x] Agrégation de réponses
- [x] Cache OpenRouter
- [x] Tests end-to-end Fable 5 (mode démo OK — besoin clé OpenRouter pour réel)
- [x] Tests end-to-end OCR/TTS/image (mode démo OK — besoin clé DashScope pour réel)

## Phase 5 — Onglet La Lampe (✅ prototype)

- [x] Détection de `shazaam` dans l'Atelier
- [x] Déblocage de l'onglet La Lampe
- [x] Création/persistence de l'avatar compagnon
- [x] Évolution automatique après chaque réponse du Génie
- [x] UI avec jauges, stade, souvenirs
- [ ] Battle cloud GLM 5.2 vs Gemma 4 31b pour finaliser le plan
- [ ] Animation/portrait visuel de l'avatar

## Phase 6 — Polish hackathon

- [x] Seed démo (`scripts/seed-demo.mjs`)
- [ ] Benchmark automatique pour les Trésors
- [ ] Deck 10 slides
- [ ] Vidéo 2 minutes
- [ ] Fiche projet hackathon
- [ ] Nettoyage des stubs obsolètes
