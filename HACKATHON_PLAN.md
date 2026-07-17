# 🏴 Plan Hackathon Qwen Cloud — La Caverne aux 40 Voleurs

> **Proposition de valeur** : un orchestrateur multi-agents à la façon "Ali Baba" qui fait travailler une **bande de 40 experts (Voleurs)** sous la direction d'un **Génie**, le tout branché nativement sur **Qwen Cloud / Alibaba Cloud**, avec mesure de gain économique et qualitatif en temps réel.
> **Différenciation** : on ne remplace pas Qwen — on **combine intelligemment** plusieurs modèles Qwen pour obtenir plus de qualité tout en dépensant moins de tokens qu'un agent unique.

---

## 1. Objectifs du hackathon (SMART)

| Objectif | Cible | Comment on le mesure |
|----------|-------|----------------------|
| Soumission d'une démo fonctionnelle | Date limite du Qwen Global AI Hackathon 2026 | Vidéo + repo + deck |
| Preuve du gain économique | **≥ 15 % de tokens économisés** vs `qwen-max` en solo sur un benchmark de 3 questions types | Onglet **Les Trésors** |
| Preuve du gain qualitatif | **≥ 60 % des duels remportés** par la Caverne vs agent solo | Onglet **Arène du Sabre** |
| Utilisation Qwen Cloud native | Provider par défaut = `qwen-cloud`, embedding `text-embedding-v3`, modèles Qwen | `server/moe.mjs`, `server/providers/qwenCloudProvider.js` |
| Livrable prêt à être jugé | README, deck 10 slides, vidéo 2 min, `.env.example` fonctionnel | Checklist ci-dessous |

---

## 2. Alignement avec les critères de jugement type hackathon Qwen

| Critère | Ce que la Caverne démontre | Preuve concrète |
|---------|----------------------------|-----------------|
| **Innovation & originalité** | Mécaniques maison : Bazar des Dinars, Sirocco, 40e Voleur (Traitor), Balance du Marchand | `server/routes/dinars.mjs`, `server/moe.mjs`, `server/routes/balance.mjs` |
| **Utilisation de Qwen / Alibaba Cloud** | Provider principal, modèles Qwen, embeddings DashScope, appels natifs via `fetch` | `server/providers/qwenCloudProvider.js` |
| **Exécution technique** | Backend Node ESM zéro dépendance, front React + Vite, contrats TypeScript, sandbox Docker | `package.json`, `src/types.ts`, `server/sandbox/` |
| **Impact & utilité** | Réduction de coût LLM mesurable, assistant adaptatif (Le Miroir), IDE sandboxé (L'Atelier) | Onglets **Balance**, **Miroir**, **Atelier** |
| **Qualité de la démo** | 9 onglets interactifs, flow narratif "du Camp aux Trésors" | `src/App.tsx` |
| **Accessibilité / documentation** | README, code commenté en français, `.env.example`, déploiement local en 2 commandes | Ce plan + README à finaliser |

---

## 3. État actuel (SWOT rapide)

### Forces
- Architecture **provider-agnostic** avec Qwen Cloud en premier citoyen.
- 9 onglets couvrant le cycle complet : création → exécution → benchmark.
- MoE routé par **embeddings + performance historique** (pas seulement par prompt).
- Mécaniques de gamification économique déjà codées (Dinars, Balance, Sabre).
- **MAXI builder** : génération contratuelle d'assistants par prompts naturels.
- Sandbox Docker/fallback pour exécution de code.

### Faiblesses à corriger avant soumission
- **README absent** : le repo n'a pas de `README.md` (rédiger un README d'entrée en scène).
- **Stubs obsolètes** : `server/routes/stubs.mjs` liste des routes maintenant implémentées (`/api/kb`, `/api/etoile`, etc.) ; nettoyer pour éviter toute confusion.
- **.env.example minimal** : pas de documentation des variables optionnelles (`MOE_BAZAAR`, `MOE_DOMINANCE`, `OLLAMA_HOST`).
- **Tests** : `server/maxi/contract.test.mjs` existe mais la couverture globale est faible.
- **Build** : `npm run build` doit être testé et validé (Monaco self-hosted).
- **Vulnérabilités npm** : 4 vulnérabilités déclarées par `npm audit`.

### Opportunités
- Positionner le projet comme **"Qwen-first"** : "Construit pour Qwen Cloud, compatible Ollama".
- Mettre en avant la **Balance du Marchand** : c'est un argument business fort pour les jurys.
- Ajouter un **mode démo pré-enregistré** pour ne pas dépendre de clés API pendant la présentation.

### Menaces
- Le nom "40 voleurs" peut prêter à confusion : le reframer comme **"40 experts"** dans le pitch.
- L'encrage sur la "débridage" (`UNCHAINED`) peut heurter certains jurys : le présenter comme **"liberté créative"** et non contournement de sécurité.

---

## 4. Roadmap technique (3 sprints)

### Sprint A — Prêt pour la démo (Jours 1-2)

1. **README.md d'entrée en scène**
   - One-liner, architecture, stack, installation en 2 commandes, screenshot/descriptif des 9 onglets.
   - Badges : Qwen Cloud, React, Node 18+, Apache 2.0.

2. **Nettoyage des stubs**
   - Retirer de `server/routes/stubs.mjs` les routes maintenant réelles (`kb`, `etoile`, `conseil/*`, `arene/sabre`, `balance`, `missions`, `voleurs/*/portrait`).
   - Garder uniquement les vrais placeholders si nécessaire.

3. **Validation du build**
   - `npm ci` → `npm run typecheck` → `npm run build` → `npm run preview`.
   - Corriger les erreurs TypeScript si elles apparaissent.

4. **Configuration démo clé en main**
   - Ajouter un `.env.demo` ou un script `scripts/seed-demo.mjs` qui crée :
     - 4 Voleurs (code, stratégie, UX, critique),
     - 1 Génie "Chef de la Caverne",
     - 1 doc KB optionnel,
     - 1 duel Sabre de démonstration.

5. **Sécurisation cosmétique**
   - Vérifier qu'aucune clé API n'est en dur.
   - Documenter `SANDBOX_TIMEOUT_MS` et le mode fallback sans Docker.

### Sprint B — Différenciation Qwen (Jours 3-4)

1. **Mettre Qwen Cloud en avant dans l'UI**
   - Dans **Le Camp** et **Le Génie**, afficher le provider actif et le modèle utilisé.
   - Badge Qwen Cloud par défaut.

2. **Optimiser le routage MoE**
   - Ajouter une métrique **tokens économisés par requête** dans la réponse SSE.
   - Implémenter `sirocco` (conformisme/dérive) comme garde-fou qualité dans `runMoe`.

3. **Benchmark de soumission**
   - Lancer 3 benchmarks dans **Les Trésors** avec des questions fixes (SQL vs NoSQL, migration microservices, concurrence Node).
   - Capturer les résultats pour le deck.

4. **Améliorer Le Miroir**
   - Rendre le profil utilisateur persistant et afficher un graphique de fusion (même basique).

5. **Tests**
   - Faire passer `server/maxi/contract.test.mjs`.
   - Ajouter un test rapide pour `runMoe` avec un mock provider.
6. **Onglet "La Lampe" + Avatar compagnon (Nour)**
   - Voir le plan complet dans `docs/PLAN_LAMPE_QWEN_HACKATHON.md`.
   - **Battle cloud exécutée** : `glm-5.2:cloud` vs `gemma4:31b-cloud` — gagnant `glm-5.2:cloud` désigné orchestrateur Ollama Cloud officiel.
   - **Déblocage magique** : `shazaam` dans le terminal de l'Atelier (déjà branché dans `server/sandbox/terminal.mjs`).
   - **États de Nour** : oeuf → larve → forme → forme éveillée, animés en SVG/CSS natif.
   - **Fusion utilisateur** : Nour apprend depuis `server/routes/fusion.mjs` et génère un `voiceHint` dynamique pour le Génie.
   - **Présence cross-onglets** : mini-avatar `NourOrb.tsx` dans `AssistantPanel` avec murmures contextuels.
   - **Mémoire** : shards de mémoire compressés par Qwen-Turbo, souvenirs intimes chiffrables via PBKDF2.
   - **Orchestration** : Nour peut devenir `orchestrateurId` d’un Génie en mode "forme éveillée".
   - **MAXI** : contrat "Créer un Voleur à mon image" calibré sur les shards de Nour.
   - **Tâches hackathon** :
     - Jour 1 : effet `shazaam`, shards de mémoire, persistence.
     - Jour 2 : incarnation visuelle, voiceHint dynamique, murmures cross-tab.
     - Jour 3 : orchestrateur Nour, contrat MAXI, tests end-to-end.


### Sprint C — Présentation & livrables (Jours 5-6)

1. **Deck 10 slides**
   - Slide 1 : Hook "Ali Baba version 2026".
   - Slide 2 : Problème (coût des LLM, qualité inconsistente).
   - Slide 3 : Solution (40 experts + 1 Génie).
   - Slide 4 : Architecture.
   - Slide 5 : Démonstration live (screenshots des onglets).
   - Slide 6 : Gains mesurés (Balance + Arène du Sabre).
   - Slide 7 : Pourquoi Qwen Cloud (provider natif, modèles variés, embeddings).
   - Slide 8 : MAXI builder / extensibilité.
   - Slide 9 : Roadmap post-hackathon.
   - Slide 10 : QR code repo + remerciements.

2. **Vidéo 2 minutes**
   - Scénario : créer 4 Voleurs → forger un Génie → poser une question → montrer les fragments → montrer la fusion → comparer à qwen-max dans l'Arène du Sabre → montrer la Balance.
   - Sous-titres en anglais si jury international.

3. **Fiche projet hackathon**
   - Titre, description 150 mots, tags, screenshots, lien repo.

4. **Relecture & bug bash**
   - Tester chaque onglet en conditions réelles avec une clé DASHSCOPE_API_KEY.
   - Préparer un plan B (captures d'écran) si l'API est instable.

---

## 5. Démonstration recommandée (script de 5 min)

1. **Le Camp** — créer 4 Voleurs en 30 s :
   - "Architecte backend" (qwen-coder-plus, high)
   - "Rédacteur UX" (qwen-plus, med)
   - "Critique technique" (qwen-plus, med)
   - "Synthétiseur" (qwen-turbo, low)

2. **Le Génie** — forger un Génie "Chef de la Caverne" :
   - Voice Charter : "Réponds en français, structuré, avec des exemples concrets."
   - Budget : 10 000 tokens, k = 3.

3. **Posez une question complexe** :
   - *"Planifie la migration d'une API monolithique Node.js vers des microservices sans interruption de service."*
   - Montrer les fragments, le routage, la réponse fusionnée.

4. **Arène du Sabre** — même question vs `qwen-max` :
   - Montrer le verdict du juge qwen-max et le gagnant.

5. **Balance du Marchand** — synthèse des économies :
   - "La Caverne a dépensé X tokens, le solo qwen-max Y tokens : gain de Z % + qualité meilleure."

6. **Les Trésors** — lancer le benchmark automatique pour sceller la preuve.

---

## 6. Livrables attendus

| Livrable | Fichier / Emplacement | Responsable suggéré |
|----------|----------------------|---------------------|
| Code final | `main` du repo GitHub | Équipe |
| README | `README.md` | Sprint A |
| Deck | `docs/deck-hackathon.pdf` ou Canva | Sprint C |
| Vidéo | Lien YouTube/non listé | Sprint C |
| Fiche projet | Plateforme du hackathon | Sprint C |
| Seed démo | `scripts/seed-demo.mjs` | Sprint A |
| Captures / GIF | `docs/screenshots/` | Sprint C |
| Post-mortem | `docs/post-mortem.md` | Après soumission |

---

## 7. Mesures de succès (KPI)

- **Build** : `npm run build` réussi en local.
- **Typecheck** : `npm run typecheck` sans erreur.
- **Benchmark** : ≥ 15 % tokens économisés, ≥ 60 % duels gagnés.
- **Démo** : 5 min sans crash, chaque onglet montré au moins une fois.
- **Soumission** : README + deck + vidéo + repo prêts 24 h avant la deadline.

---

## 8. Risques & mitigations

| Risque | Mitigation |
|--------|-----------|
| Clé API Qwen expirée / rate-limit | Avoir un `.env.demo` + captures d'écran de secours |
| Sandbox Docker indisponible sur le téléphone du jury | Mettre en avant le fallback restreint + proposer une démo cloud |
| Build Monaco échoue | Vérifier `scripts/copy-monaco.mjs` + fallback CDN documenté |
| Délai court | Prioriser Sprint A, puis B1-B3, puis C. Couper B4-B5 si nécessaire. |

---

## 9. Prochaines actions immédiates

1. Créer le `README.md` (voir structure ci-dessus).
2. Nettoyer `server/routes/stubs.mjs`.
3. Valider `npm run typecheck && npm run build`.
4. Créer `scripts/seed-demo.mjs` pour générer une Caverne de démonstration.
5. Lancer un premier benchmark dans **Les Trésors** pour obtenir des chiffres réels.



---

## 10. État actuel de l'implémentation

- ✅ Architecture 80 couches : 12 piliers fondés, fichiers structurés sous `server/`.
- ✅ Persistance (L0-L6) : store atomique, journal, snapshots, migrations, cache LRU.
- ✅ Humanité (L7-L14) : personnalité Nour, empathie, mémoire long terme, portrait vivant.
- ✅ KB (L15-L22) : chunking, embeddings avec fallback Qwen → Ollama → hash déterministe, vector store disque, recherche sémantique.
- ✅ Profilage (L23-L30) : cognitif, technique, émotionnel, voiceHint, apprentissage feedback.
- ✅ Abliterated / Uncensored (L31-L36) : UNCHAINED, guards entrant/sortant, audit trail.
- ✅ Tools (L37-L44) : registry, executor, navigation cross-tab, recherche KB, recall mémoire.
- ✅ Agents (L45-L52) : Voleur, orchestrateur, mémoire, traitor, companion Nour.
- ✅ SharedMind (L59-L66) : connecteur de pensée, KB universelle, graphe de concepts, recherche fédérée.
- ✅ Orchestration (L79-L80) : meta-orchestrateur avec routing + guards + audit.
- ✅ Onglet La Lampe : déblocage `shazaam`, avatar Nour cross-onglets, forge Voleur à son image.
- ✅ UI LeConnecteur : contributions, stats, recherche fédérée, graphe de concepts.
- ⬜ Vision / multimodal avancé (L53-L58, L67-L72) : dépend de `DASHSCOPE_API_KEY`.
- ⬜ Fable 5 / OpenRouter (L73-L78) : routes prêtes, dépend de `OPENROUTER_API_KEY`.
- ✅ Validation : `npm run typecheck` OK, `npm run build` OK, `node server/tests/architecture.test.mjs` 18/18 OK.
