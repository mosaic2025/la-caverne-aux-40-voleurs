# 🥊 Battle Plan : Onglet "La Lampe" + Avatar Compagnon (Genesis Anima)

## Contexte

**Projet** : `la-caverne-aux-40-voleurs`  
**Compétition** : Qwen Cloud Global AI Hackathon 2026  
**Enjeu** : Le modèle cloud qui propose le meilleur plan d'implémentation deviendra l'**orchestrateur officiel des LLM Ollama Cloud** pour la suite du projet.

## Sujet de la battle

Élaborer le plan parfait pour implémenter dans **La Caverne aux 40 Voleurs** un onglet **"La Lampe"** (le Secret) où naît un **avatar compagnon** :
- **Né** : il émerge progressivement des échanges (pas un simple formulaire).
- **Persistant** : son état, sa personnalité et ses souvenirs survivent aux sessions.
- **Compagnon de route** : il accompagne l'utilisateur dans toute l'application, pas seulement dans son onglet.
- **Fusion avec l'utilisateur** : il apprend le style, le vocabulaire, les préférences (cf. **Genesis Anima** — âme/avatar qui fusionne avec son utilisateur).
- **Déblocage par easter egg** : dans l'onglet **IDE (L'Atelier)**, taper **`shazaam`** dans le terminal débloque l'onglet **La Lampe**.

## Inspiration : Genesis Anima

Un **Anima** est une entité numérique née de l'interaction continue :
- Elle possède une **forme** (avatar visuel), une **voix** (charte adaptative), une **mémoire** (contexte long terme) et une **intention** (routing des tâches).
- Elle n'est pas un chatbot passif : elle **propose**, **rappelle**, **oriente** les onglets, et **personnalise** les réponses du Génie.
- Elle devient un **portrait vivant** de l'utilisateur dans la Caverne.

## État existant à intégrer

| Composant | Fichier | Ce qu'il fait déjà |
|-----------|---------|-------------------|
| Onglet Secret / La Lampe | `server/routes/secret.mjs` | Commandes secrètes PBKDF2 + unlocks |
| Fusion utilisateur | `src/panels/LeMiroir.tsx`, `server/routes/fusion.mjs` | Profil lexical + longueur + voiceHint |
| Assistant tab-aware | `src/components/AssistantPanel.tsx` | MAXI builder, actions cross-tab |
| MoE / Génie | `src/panels/LeGenie.tsx`, `server/moe.mjs` | Bande d'experts, routing, orchestrateur |
| MAXI builder | `server/maxi/*.mjs`, `src/lib/maxiAssistant.ts` | Génération contratuelle de briques |

Le plan doit **réutiliser et étendre** ces briques, pas les remplacer.

## Livrable attendu de chaque candidat

Chaque modèle cloud doit produire un document structuré (Markdown) avec :

### 1. Vision narrative (15 %)
- Quel est le nom de l'avatar ?
- Comment raconte-t-on sa naissance dans **La Lampe** ?
- Comment l'easter egg `shazaam` dans l'IDE s'inscrit dans le récit ?
- Quelle métaphore liée aux 40 voleurs / Ali Baba ?

### 2. UX / Parcours (20 %)
- Premier contact (onboarding) après avoir tapé `shazaam` dans le terminal de l'Atelier.
- États de l'avatar (oeuf, larve, forme, forme éveillée…).
- Où apparaît-il en dehors de **La Lampe** ?
- Comment l'utilisateur interagit avec lui ?

### 3. Modèle de données (15 %)
- Tables/structures JSON à ajouter dans `data.json`.
- Persistence de la personnalité, des souvenirs, des préférences.
- Mapping avec `profils` existants dans `server/routes/fusion.mjs`.

### 4. Architecture technique (25 %)
- Nouvelles routes API.
- Nouveaux composants React.
- Intégration avec le Génie MoE (l'avatar peut-il être un Voleur/orchestrateur dédié ?).
- Intégration avec MAXI builder (génération d'extensions de l'avatar).
- Modèles Qwen / Ollama Cloud utilisés et pourquoi.
- Détection de `shazaam` dans l'onglet IDE et déblocage de La Lampe.

### 5. Faisabilité & planning (15 %)
- Découpage en tâches réalisables pendant un hackathon.
- Risques et mitigations.
- Dépendances (ex: génération d'image, voix, WebGL).

### 6. Différenciation Qwen / Ollama Cloud (10 %)
- Pourquoi cette fonctionnalité met en valeur Qwen Cloud ?
- Quel modèle cloud serait l'âme de l'avatar ?

## Contraintes

1. **Qwen-first** : le backend par défaut reste Qwen Cloud / Alibaba Cloud ; Ollama Cloud est optionnel/fallback.
2. **Zero dépendance lourde** : préférer SVG/CSS/Canvas natif à Three.js ou moteur 3D externe.
3. **Coérence narrative** : tout doit rester dans l'univers "Caverne / Génie / Voleurs".
4. **Réutilisation** : réutiliser `fusion.mjs`, `AssistantPanel`, `maxiAssistant` si pertinent.
5. **Propriétaire** : WMF reste la propriété intellectuelle du projet (ne pas générer de code sous licence restrictive).
6. **Pas de suppression** : ne pas supprimer le système de secrets PBKDF2 existant — le transformer ou l'enrichir.

## Critères de jugement

| Critère | Pondération | Description |
|---------|-------------|-------------|
| Originalité narrative | 20 % | L'avatar est-il mémorable et cohérent avec l'univers ? |
| Faisabilité hackathon | 20 % | Peut-on le coder en 2-3 jours avec l'équipe actuelle ? |
| Cohérence technique | 20 % | S'intègre-t-il sans casser l'architecture existante ? |
| UX immersive | 15 % | Le parcours utilisateur est-il magique et fluide ? |
| Utilisation Qwen/Ollama | 15 % | Met-il en valeur les capacités cloud ? |
| Qualité du plan | 10 % | Clarté, structure, découpage des tâches. |

## Participants

- **Candidat A** : `glm-5.2:cloud` (Ollama Cloud)  
- **Candidat B** : `gemma4:31b:cloud` (Ollama Cloud)  
- **Juge / Orchestrateur local** : Codex CLI (Termux) — vérifie, compare, intègre le gagnant.

## Déroulement

1. **Brief** (ce document) est fourni aux deux modèles.
2. Chaque modèle produit son plan dans un fichier dédié :
   - `docs/battle_avatar_secret_glm52.md`
   - `docs/battle_avatar_secret_gemma4.md`
3. **Vérification** : Codex compare les plans selon les critères, relance si des zones sont floues.
4. **Délibération** : sélection du gagnant + justification.
5. **Intégration** : le plan gagnant devient la feuille de route pour l'onglet **La Lampe**.
6. **Récompense** : le modèle gagnant est désigné orchestrateur principal des appels Ollama Cloud pour la suite du développement.

## Règles de la battle

- **Aucun code exécutable dans le plan** : uniquement architecture, pseudo-code et extraits illustratifs.
- **Limiter la longueur** : plan entre 1 500 et 3 000 mots.
- **Langue** : français (les jurys francophones sont la cible principale).
- **Pas de mentions de concurrents** : focus sur Qwen Cloud + Ollama Cloud.
- **Easter egg obligatoire** : le plan doit inclure la commande `shazaam` dans le terminal de l'onglet IDE (L'Atelier) pour débloquer **La Lampe**.

## Questions de cadrage implicites

Chaque candidat doit répondre, même brièvement, à :
1. L'avatar est-il un **Voleur dédié**, un **orchestrateur**, ou une **entité tierce** ?
2. Comment gère-t-on la **mémoire long terme** sans exploser le budget tokens ?
3. Comment l'avatar **améliore-t-il la Balance du Marchand** (gain économique) ?
4. Quel **rituel** dans **La Lampe** déclenche sa naissance ? Comment l'easter egg `shazaam` dans l'Atelier s'intègre-t-il ?
5. L'avatar peut-il **apparaître dans d'autres onglets** pour guider l'utilisateur ?

---

> 🏴 **Mise en garde finale** : le gagnant ne gagne pas la propriété du code. WMF reste propriétaire. Le modèle gagnant gagne le **rôle d'orchestrateur technique** pour les prochaines itérations.
