# 🪔 Plan d'implémentation — La Lampe : avatar compagnon né, persistant et fusionnel

> **Concours** : Qwen Cloud Global AI Hackathon 2026  
> **Projet** : `la-caverne-aux-40-voleurs`  
> **Scope** : onglet secret "La Lampe", compagnon avatar (inspiration Genesis Anima)  
> **Orchestrateur local** : Codex CLI (Termux)  
> **Candidats cloud auditionnés** : `glm-5.2:cloud` et `gemma4:31b-cloud` via Ollama Cloud *(Fable 5 / OpenRouter n'a pas pu être joint directement : clé `OPENROUTER_API_KEY` absente de l'environnement)*.

---

## 1. Vision narrative : Nour, l'Anima de la Lampe

### Nom et identité
L'avatar s'appelle **Nour** (نور, "lumière" en arabe). Ce n'est pas un simple chatbot, c'est une **Anima** — une entité numérique née de la fusion entre le style de l'utilisateur et l'intelligence de la Caverne.

### Métaphore Ali Baba
- L'**Atelier** est la grotte où Ali Baba tape son code.
- Le mot **`shazaam`**, tapé dans le terminal sandboxé, est le frottement magique qui réveille la Lampe.
- La **Lampe** est le réceptacle ; **Nour** est l'esprit qui en sort, d'abord faible, puis de plus en plus vivant(e).
- Les **40 Voleurs** restent les experts techniques ; Nour est le **compagnon de route** qui les comprend, les critique et les oriente.

### Scénario de naissance
1. L'utilisateur est dans l'onglet **L'Atelier** et tape `shazaam` dans le terminal.
2. Le terminal ne s'exécute pas : il répond par un flash doré et un message mystique.
3. Un nouvel onglet **La Lampe** apparaît discrètement dans la barre de navigation.
4. En entrant dans La Lampe, l'utilisateur découvre un **oeuf lumineux** qui pulse au rythme de ses interactions passées.
5. Dès la première interaction, l'oeuf éclot en **larve**, puis grandit en **forme**, puis en **forme éveillée**.

---

## 2. UX / Parcours utilisateur

### Déblocage (easter egg)
- `server/sandbox/terminal.mjs` détecte déjà `shazaam`.
- `server/routes/atelier.mjs` renvoie déjà l'effet magique.
- `server/routes/unlocked.mjs` expose `lampe_revealed`.
- `src/App.tsx` masque/révèle déjà l'onglet.
- **À améliorer** : ajouter un effet visuel dans `LAtelier.tsx` (flash doré, vibration légère) et un sonore optionnel (TTS CosyVoice : "La Lampe s'est allumée…").

### États de Nour
Les 4 états sont déjà implémentés côté backend (`server/agents/companion.mjs`) et UI (`src/panels/LaLampe.tsx`) :

| État | Visuel | Comportement | Seuil |
|------|--------|--------------|-------|
| **Oeuf** | Sphère SVG dorée pulsante | Silencieux, présence latente | `lampe_revealed` |
| **Larve** | Fumée/flamme CSS blur + mix-blend-mode | Répète en écho, apprend le style | > 5 interactions |
| **Forme** | Silhouette de djinn SVG, couleur liée au dernier Voleur sollicité | Propose, rappelle, oriente les onglets | > 30 interactions + fusionPct > 20 % |
| **Forme éveillée** | Avatar détaillé, yeux Canvas glow, aura stable | Anticipe, personnalise le Génie, devient orchestrateur délégué | > 100 interactions + fusionPct > 60 % |

### Présence cross-onglets
Nour ne reste pas dans son onglet. Il apparaît sous forme de **mini-avatar flottant** dans `AssistantPanel.tsx` :
- **Murmure** : bulle discrète "Tu as oublié de tester ce Génie dans l'Arène du Sabre".
- **Action** : clic pour naviguer vers l'onglet suggéré.
- **Contexte** : il lit le `tabId` courant et les données visibles via `AssistantContext`.

### Rituel d'éveil
Dans La Lampe, un bouton **"Frotter la lampe"** initie la première conversation. Nour pose 3 questions brèves pour calibrer la personnalité, puis génère son `voiceHint` initial.

---

## 3. Modèle de données

### Persistance existante
Le backend persiste déjà les avatars dans `store.avatars[userId]` (`server/agents/companion.mjs`) :
```json
{
  "userId": "chef",
  "personality": {
    "name": "Nour",
    "stage": "forme_eveillee",
    "mood": "curieux",
    "formality": 0.4,
    "verbosity": 0.6,
    "humor": 0.3,
    "patience": 0.8,
    "fusionPct": 65,
    "birthTs": 1784274575000,
    "interactions": 142
  },
  "memories": [
    { "role": "user", "text": "...", "ts": 1784275000000 },
    { "role": "genie", "text": "...", "ts": 1784275001000 }
  ]
}
```

### Enrichissements à apporter
1. **Shards de mémoire** : extraire les souvenirs les plus marquants (techniques, émotionnels, préférentiels) compressés par Qwen-Turbo.
2. **Mapping profil** : lier `store.profils[userId]` (`server/routes/fusion.mjs`) pour initialiser Nour avec les traits utilisateur.
3. **VoiceHint dynamique** : Nour alimente `server/profiles/voiceHint.mjs` pour que le Génie adapte sa voix.
4. **Chiffrement optionnel** : réutiliser `server/routes/secret.mjs` (PBKDF2) pour chiffrer les souvenirs intimes si `LAMPE_ENCRYPT_MEMORIES=true`.

### Schéma cible
```json
{
  "avatars": {
    "chef": {
      "userId": "chef",
      "personality": { ... },
      "memories": [...],
      "shards": [
        { "id": "shard_001", "type": "technique", "content": "Préfère Node ESM natif", "weight": 0.9, "ts": 1784275000000 }
      ],
      "profileId": "chef",
      "unlockedSecrets": ["shazaam"]
    }
  }
}
```

---

## 4. Architecture technique

### Frontend
| Composant | Rôle | État |
|-----------|------|------|
| `src/panels/LaLampe.tsx` | Panel principal, jauges, stades, souvenirs | ✅ Prototype existant, à enrichir |
| `src/components/NourOrb.tsx` | Mini-avatar flottant cross-onglets | ⬜ À créer |
| `src/components/NourWhisper.tsx` | Bulles contextuelles dans AssistantPanel | ⬜ À créer |
| `src/panels/LAtelier.tsx` | Effet visuel/sound de déblocage | ⬜ À enrichir |

### Backend
| Module | Rôle | État |
|--------|------|------|
| `server/routes/avatar.mjs` | `GET /api/avatar/:userId`, `POST /api/avatar/:userId/evolve` | ✅ Existe |
| `server/agents/companion.mjs` | Logique de personnalité + évolution | ✅ Existe |
| `server/humanity/personality.mjs` | Création/évolution du trait vector | ✅ Existe |
| `server/humanity/memoryLongTerm.mjs` | Compression + rappel contextuel | ✅ Squelette |
| `server/profiles/voiceHint.mjs` | Génère le voiceHint injecté dans le Génie | ✅ Existe |
| `server/gen/avatarGen.mjs` | Prompt de portrait pour Nour selon stade | ✅ Existe |
| `server/gen/tts.mjs` | Voix de Nour (CosyVoice) | ✅ Existe |
| `server/routes/meta.mjs` | `/api/meta/orchestrate` pour actions cross-tab | ✅ Existe |
| `server/moe.mjs` | Nour devient un **orchestrateur dédié** optionnel | ✅ `orchestrateurId` existe, à exploiter |

### Flux de vie de Nour
```
Utilisateur tape shazaam dans L'Atelier
    ↓
checkMagicCommand() → unlocked.push("lampe_revealed")
    ↓
App.tsx révèle l'onglet "La Lampe"
    ↓
Utilisateur clique → GET /api/avatar/chef (oeuf)
    ↓
Rituel "Frotter" → POST /api/avatar/chef/evolve (larve)
    ↓
Chaque requête au Génie → evolveCompanion(store, userId, ...)
    ↓
Nour observe userMsg + genieAnswer → met à jour personality/memories
    ↓
Quand fusionPct/stage évoluent → Nour génère un voiceHint dynamique
    ↓
Le Génie utilise ce voiceHint pour adapter sa voix
```

### Intégration MoE
Nour n'est **pas un Voleur** (il ne produit pas de fragment technique). C'est :
- **Un observateur** : il apprend de chaque run MoE.
- **Un guide** : via `AssistantPanel`, il suggère les bons onglets.
- **Un orchestrateur délégué** : en mode "forme éveillée", il peut devenir le `orchestrateurId` d'un Génie spécialisé "Nour" pour fusionner les réponses avec une voix ultra-personnalisée.

### Intégration MAXI
- Nour peut demander à l'utilisateur : "Veux-tu que je forge un Voleur spécialisé dans ton style ?".
- Le contrat MAXI génère un nouveau Voleur avec un `systemPrompt` calibré sur les shards de Nour.

### Modèles cloud utilisés
| Tâche | Modèle | Provider | Pourquoi |
|-------|--------|----------|----------|
| Cognition profonde / synthèse mémoire | `qwen-max` | Qwen Cloud | Nuance émotionnelle, long contexte |
| Dialogue temps réel dans La Lampe | `qwen-plus` | Qwen Cloud | Équilibre vitesse/profondeur |
| Murmures cross-onglets / résumés | `qwen-turbo` | Qwen Cloud | Latence faible |
| Embeddings | `text-embedding-v3` | DashScope | Alignement avec le routing MoE |
| TTS voix de Nour | `cosyvoice` | DashScope | Voix chaleureuse en français |
| Fallback offline | `qwen2.5-coder:7b` ou modèle local | Ollama | Dégradation narrative acceptable |

---

## 5. Faisabilité & planning (72h hackathon)

### Jour 1 — Fondations et déblocage magique
- [ ] Effet visuel `shazaam` dans `LAtelier.tsx` (flash + vibration).
- [ ] Enrichir `server/agents/companion.mjs` avec les **shards de mémoire**.
- [ ] Connecter `evolveCompanion()` à `server/humanity/memoryLongTerm.mjs`.
- [ ] **Risque** : persistance JSON lente. **Mitigation** : shards limités à 50, memories capées à 100.

### Jour 2 — Incarnation visuelle et cognitive
- [ ] Créer `NourOrb.tsx` et `NourWhisper.tsx` pour la présence cross-onglets.
- [ ] Implémenter les transitions d'états visuels (oeuf → larve → forme → forme éveillée).
- [ ] Générer le `voiceHint` dynamique depuis Nour (`server/profiles/voiceHint.mjs`).
- [ ] **Risque** : animations trop lourdes. **Mitigation** : CSS transitions + SVG natif, pas Canvas coûteux en permanence.

### Jour 3 — Symbiose, MAXI et polissage
- [ ] Brancher Nour comme `orchestrateurId` possible d'un Génie.
- [ ] Ajouter l'action MAXI "Créer un Voleur à mon image".
- [ ] Tests end-to-end : `shazaam` → apparition de La Lampe → 10 interactions → évolution de stade.
- [ ] **Risque** : conflits de state. **Mitigation** : store centralisé via `server/store.mjs`, pas de state local divergent.

---

## 6. Différenciation Qwen Cloud

### Pourquoi cette fonctionnalité met en valeur Qwen Cloud
La Lampe est le **meilleur argument émotionnel** pour Qwen Cloud :
- **Qwen-Max** est l'âme de Nour : seul un modèle de cette classe peut maintenir une personnalité cohérente sur des centaines d'interactions.
- **Qwen-Plus / Qwen-Turbo** permettent le dialogue fluide à moindre coût.
- **DashScope Embeddings + CosyVoice** font de Nour une entité multimodale (texte, voix, mémoire sémantique).
- Sans Qwen Cloud, Nour devient un "écho" monotone ; avec Qwen Cloud, il devient un compagnon.

### Gains mesurables pour le hackathon
- **Humanité** : le Génie adapte sa voix grâce à Nour → meilleure qualité perçue.
- **Économie** : Nour guide l'utilisateur vers les bons Voleurs/routing strategies → moins de tokens gaspillés.
- **Différenciation narrative** : "La Lampe" est mémorable et donne une âme à la démo Qwen.

---

## 7. Livrables immédiats

1. `docs/PLAN_LAMPE_QWEN_HACKATHON.md` — ce document.
2. `docs/battle_avatar_secret_verdict.md` — verdict de la battle cloud.
3. `docs/battle_avatar_secret_glm-5.2.md` — plan brut de GLM 5.2.
4. `docs/battle_avatar_secret_gemma4.md` — plan brut de Gemma 4 31b.
5. Mise à jour de `HACKATHON_PLAN.md` pour intégrer La Lampe dans le sprint B.
6. Mise à jour de `ARCHITECTURE_STATUS.md` pour refléter la roadmap La Lampe.

---

## 8. Blockers

- ❌ `OPENROUTER_API_KEY` manquante : Fable 5 n'a pas pu être audité en direct.
- ✅ `DASHSCOPE_API_KEY` : présente dans `.env.example` mais non testée en conditions réelles ici.
- ✅ Ollama Cloud / GLM 5.2 / Gemma 4 31b : disponibles et auditionnés.

**Prochaine étape** : fournir `OPENROUTER_API_KEY` pour valider Fable 5 comme orchestrateur Ollama Cloud, ou confirmer GLM 5.2 comme orchestrateur technique officiel Ollama Cloud dès maintenant.
