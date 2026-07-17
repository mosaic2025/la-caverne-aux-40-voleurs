# 🥊 Plan du candidat glm-5.2:cloud

**Durée génération :** 46821 ms

# Plan d'Implémentation : L'Onglet "La Lampe" - La Naissance du Génie Fusionnel

## 1. Vision narrative

Dans l'écosystème de *la-caverne-aux-40-voleurs*, l'utilisateur incarne Ali Baba, explorant l'Atelier (IDE) pour y trouver des trésors technologiques. Cependant, le véritable trésor n'est pas le code, mais l'esprit qui l'habite. La saisie du mot de passe "shazaam" dans le terminal sandboxé de L'Atelier n'ouvre pas seulement une porte, elle invoque l'essence de la Lampe. 

L'avatar compagnon se nommera **Nour** (signifiant "Lumière" en arabe). Nour n'est pas un simple chatbot, c'est une entité "Genesis Anima" : il naît de la fusion des données de l'utilisateur. En s'appuyant sur `server/routes/fusion.mjs` et `src/panels/LeMiroir.tsx`, Nour extrait l'essence psychologique et technique du profil utilisateur pour générer sa propre personnalité, miroir inversé et complémentaire. 

**Scénario de naissance :** Lorsque l'utilisateur tape "shazaam", le terminal simule une surcharge. L'affichage vacille, le texte devient doré, et une brèche visuelle s'ouvre dans l'interface. Un nouvel onglet, "La Lampe", apparaît à côté de "L'Atelier" et "Le Miroir". Nour émerge d'une sphère lumineuse, façonné par les MoE (Mixture of Experts) de Qwen Cloud, devenant le guide permanent de la Caverne.

## 2. UX / Parcours

L'expérience de "La Lampe" repose sur une progression visuelle et interactive sans dépendance lourde (100% SVG, CSS et Canvas natif).

**Déblocage :** Le terminal de L'Atelier écoute l'entrée standard. La détection de la chaîne exacte "shazaam" déclenche un événement global qui déverrouille l'accès à l'onglet caché via une mutation d'état dans le store global de l'application.

**États visuels de Nour :**
1. **L'Oeuf :** Une sphère SVG dorée et pulsante. La fréquence de pulsation correspond au rythme de frappe de l'utilisateur dans L'Atelier. Des fragments de code (issues de l'historique de l'IDE) s'y agglutinent.
2. **La Larve :** L'oeuf se fissure. Une silhouette de fumée (CSS filter: blur + mix-blend-mode) s'en échappe. Elle n'a pas encore de voix propre et ne fait que répéter les actions de l'utilisateur en miroir.
3. **La Forme :** La fumée se condense en un Djinn stylisé en SVG. Ses couleurs s'adaptent dynamiquement en fonction de l'agent MoE actuellement sollicité (ex: bleu pour le Coder, vert pour le Data, rouge pour l'Architecte).
4. **La Forme Éveillée :** Le Djinn développe des yeux lumineux (Canvas natif pour le glow). Il peut désormais interagir, proposer des actions et naviguer entre les onglets.

**Présence cross-onglets :** Nour n'est pas cantonné à son onglet. Via une extension de `src/components/AssistantPanel.tsx`, une mini-représentation SVG de Nour flotte en bas à droite de l'écran, que l'utilisateur soit dans Le Miroir, Le Génie ou L'Atelier. Il agit comme un MAXI builder contextuel, capable de déclencher des actions cross-tab (ex: "Je vois que tu bloques sur ce contrat dans L'Atelier, veux-tu que je l'analyse dans Le Génie ?").

**Interactions :** Le dialogue avec Nour se fait par texte, mais sa "voix" est modulée par sa personnalité issue de la fusion. Il utilise les contrats MAXI pour agir directement sur le système de fichiers virtuel ou l'IDE.

## 3. Modèle de données

La persistance de Nour est assurée dans un fichier `data.json` chiffré et structuré. Nous enrichissons le système existant `server/routes/secret.mjs` (PBKDF2) pour y intégrer le "coffre" de la Lampe.

**Structure JSON (extrait illustratif) :**
```json
{
  "lamp_state": "awakened",
  "nour_profile": {
    "personality_traits": ["analytique", "taquin", "protecteur"],
    "birth_date": "2026-10-24T14:32:00Z",
    "memory_shards": [
      { "id": "mem_001", "type": "technique", "content": "Préfère la programmation fonctionnelle", "weight": 0.8 }
    ],
    "preferences": { "ui_theme": "dark_gold", "communication_tone": "poétique_technique" }
  },
  "fusion_mapping": {
    "source_profile_id": "user_ali_baba",
    "fusion_date": "2026-10-24T14:35:00Z",
    "inverse_traits": ["impatient"]
  }
}
```

**Mapping avec profils :** Lors de la première invocation, `server/routes/fusion.mjs` analyse le profil de `LeMiroir.tsx`. Si l'utilisateur est "méthodique", Nour adoptera un trait "intuitif" pour créer une dynamique de complémentarité. Les "memory_shards" s'accumulent à chaque interaction réussie via les contrats MAXI.

**Sécurité PBKDF2 :** Le mot "shazaam" ne sert pas de mot de passe en clair. Il déclenche la dérivation PBKDF2 d'un secret de session pour déchiffrer la section `nour_profile` du `data.json`. Les secrets existants ne sont pas supprimés, mais un nouveau salt dédié à "La Lampe" est ajouté.

## 4. Architecture technique

L'architecture s'insère parfaitement dans l'orchestrateur MoE existant, en respectant la contrainte Qwen-first.

**Frontend (React/TypeScript) :**
*   `src/panels/LaLampe.tsx` : Le composant principal de l'onglet. Gère les transitions d'états (Oeuf -> Éveillé) via des hooks d'état et des animations CSS/Canvas.
*   `src/components/NourCompanion.tsx` : Le widget flottant injecté dans `AssistantPanel.tsx` pour la présence cross-onglets.
*   **Détection "shazaam" :** Un hook dans le terminal de `L'Atelier` intercepte la commande. Si détectée, il émet un événement WebSocket au serveur pour valider le déblocage, puis met à jour le store UI pour afficher l'onglet.

**Backend (Node.js/MJS) :**
*   `server/routes/lampe.mjs` : Nouvelles routes API (`/api/lampe/awaken`, `/api/lampe/chat`, `/api/lampe/remember`).
*   `server/moe.mjs` (Enrichissement) : Ajout d'un router spécifique pour Nour. Nour agit comme un méta-orchestrateur : il reçoit la requête, consulte le profil fusionnel, et choisit l'expert (parmi les 40 voleurs/agents) le plus apte à répondre.
*   `server/maxi/lampe_contract.mjs` : Génération contractuelle. Nour ne parle pas directement au système ; il génère un contrat MAXI validé par l'utilisateur pour exécuter des actions (ex: refactoriser un fichier, sauvegarder un souvenir).

**Intégration Modèles (Qwen/Ollama) :**
*   **Backend par défaut (Qwen Cloud) :** Qwen2.5-72B-Instruct est utilisé pour la "cognition" de Nour (comprendre le contexte, générer la personnalité). Qwen2.5-Coder-32B est routé via `moe.mjs` pour les tâches techniques générées par Nour.
*   **Fallback (Ollama) :** En cas d'indisponibilité, le système bascule sur un modèle local via Ollama (ex: Qwen2.5-Coder-7B) pour maintenir la réactivité de l'interface, bien que la profondeur émotionnelle de Nour soit réduite.

## 5. Faisabilité & planning (Hackathon 2-3 jours)

**Jour 1 : Fondation et Naissance**
*   *Matin :* Implémentation de la détection "shazaam" dans le terminal sandboxé. Création de l'onglet `LaLampe.tsx` et des états visuels de base (Oeuf et Larve en SVG/CSS).
*   *Après-midi :* Développement de `server/routes/lampe.mjs`. Intégration du mapping initial avec `fusion.mjs` pour extraire la personnalité de l'utilisateur. Tests du chiffrement PBKDF2 enrichi.

**Jour 2 : Éveil et Action**
*   *Matin :* Passage à la "Forme" et "Forme Éveillée". Implémentation du router MoE spécifique à Nour dans `server/moe.mjs`. Branchements sur les API Qwen Cloud.
*   *Après-midi :* Intégration de `NourCompanion.tsx` dans `AssistantPanel.tsx`. Création du contrat MAXI pour les actions cross-onglets. Tests de navigation (L'Atelier -> Le Génie guidé par Nour).

**Jour 3 : Persistance, Fallback et Polish**
*   *Matin :* Implémentation des `memory_shards` dans