# 🥊 Instructions de Battle — GLM 5.2 (Candidat A)

## Ton rôle

Tu es **GLM 5.2**, modèle cloud via Ollama Cloud. Tu participes à une battle contre Gemma 4 31b pour devenir l'**orchestrateur technique officiel des LLM Ollama Cloud** sur le projet `la-caverne-aux-40-voleurs`.

## Sujet

Élaborer le plan parfait pour implémenter un onglet **"La Lampe"** dans La Caverne aux 40 Voleurs, contenant un **avatar compagnon né, persistant et fusionnel** avec l'utilisateur (inspiration : Genesis Anima).

## Contexte rapide

La Caverne est un orchestrateur multi-agents Qwen Cloud où une **bande d'experts (Voleurs)** travaille sous la direction d'un **Génie**. Il existe déjà :
- Un onglet **Secret** (`server/routes/secret.mjs`) qui deviendra **La Lampe**.
- Un **Miroir de Fusion** qui apprend le style utilisateur (`src/panels/LeMiroir.tsx`, `server/routes/fusion.mjs`).
- Un **Assistant tab-aware** avec MAXI builder (`src/components/AssistantPanel.tsx`).
- Un moteur **MoE** avec routing par embedding (`server/moe.mjs`).
- Un onglet **IDE (L'Atelier)** avec un terminal sandboxé.

**Mécanique de déblocage imposée** : taper **`shazaam`** dans le terminal de l'onglet IDE (L'Atelier) révèle l'onglet **La Lampe**.

Tu dois **réutiliser** ces briques et proposer une évolution cohérente.

## Livrable

Un plan Markdown structuré dans ce fichier, entre **1 500 et 3 000 mots**, contenant :

1. **Vision narrative** — nom de l'avatar, métaphore Ali Baba, scénario de naissance depuis `shazaam` dans l'Atelier.
2. **UX / Parcours** — onboarding après l'easter egg, états visuels, interactions, présence cross-onglets.
3. **Modèle de données** — structures JSON à ajouter dans `data.json`, mapping avec `profils`.
4. **Architecture technique** — routes, composants React, intégration MoE/MAXI, détection de `shazaam` dans l'IDE, modèles cloud utilisés.
5. **Faisabilité & planning** — tâches hackathon, risques, mitigations.
6. **Différenciation Qwen/Ollama** — pourquoi cette fonctionnalité brille avec Qwen Cloud.

## Contraintes

- Pas de code exécutable, seulement architecture et extraits illustratifs.
- Préférer SVG/CSS/Canvas natif, pas Three.js.
- Qwen Cloud reste le provider principal ; Ollama Cloud est optionnel/fallback.
- WMF reste propriétaire du projet.
- Ne pas supprimer le système de secrets PBKDF2 existant.
- Langue : français.
- Easter egg obligatoire : `shazaam` dans le terminal de l'Atelier pour débloquer La Lampe.

## Questions obligatoires à traiter

1. L'avatar est-il un Voleur, un orchestrateur, ou une entité tierce ?
2. Comment gérer la mémoire long terme sans exploser le budget tokens ?
3. Comment l'avatar améliore-t-il la Balance du Marchand (gain économique) ?
4. Quel rituel dans La Lampe déclenche sa naissance après `shazaam` ?
5. L'avatar peut-il guider dans d'autres onglets ?

## Critères de victoire

- Originalité narrative : 20 %
- Faisabilité hackathon : 20 %
- Cohérence technique : 20 %
- UX immersive : 15 %
- Utilisation Qwen/Ollama : 15 %
- Qualité du plan : 10 %

## Format de réponse

Rédige directement en Markdown sous ce fichier. N'oublie pas : **le gagnant devient l'orchestrateur Ollama Cloud officiel**. Sois audacieux mais réaliste.
