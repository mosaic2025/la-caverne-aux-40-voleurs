// ============================================================
// CONTRATS D'INTERFACE — La Caverne aux 40 Voleurs
// Source de vérité partagée entre front, backend et briques générées.
// Les bâtisseurs (kimi/deepseek/glm) DOIVENT respecter ces types.
// ============================================================

export type QwenModel =
  | "qwen-turbo"
  | "qwen-plus"
  | "qwen-max"
  | "qwen-coder-plus"
  | "qwen-vl-plus";

export type Effort = "low" | "med" | "high";

/** Un Voleur = un expert cadré (créé dans Le Camp). */
export interface Voleur {
  id: string;
  nom: string;
  specialite: string;          // texte libre → sert au calcul d'embedding (spécialité individuelle)
  specialisation?: string;     // groupe MoE emboîté (ex: "code", "stratégie") — pour routage 2 niveaux
  modele: QwenModel;
  effort: Effort;
  systemPrompt: string;        // cadrage (couche L1)
  capTokens: number;           // plafond tokens par appel
  provider: string;            // ex: 'qwen-cloud', 'ollama'
  embedding?: number[];        // dim 1024, text-embedding-v3 (qwen) or nomic-embed-text (ollama)
  actif: boolean;
  tokensUtilises: number;      // cumul consommation
  perf?: number;               // score de performance historique [0..1]
  orchestrateur?: boolean;     // true = expert de fusion (exclu du routage, appelé après les fragments)
}

/** Un MoE / Génie = un assemblage de Voleurs fusionnés en une voix unique. */
export interface Genie {
  id: string;
  nom: string;
  voleursIds: string[];
  voiceCharter: string;        // charte de voix unique (couche L2, fusion)
  budgetTotal: number;         // budget tokens alloué
  reliquat: number;            // budget restant
  provider: string;            // ex: 'qwen-cloud', 'ollama' (déduit des voleurs)
  k?: number;                  // nb d'experts interrogés par requête
  dominance?: number;          // seuil mono-expert
  ml?: boolean;                // apprentissage perf historique
  orchestrateurId?: string;    // id du Voleur orchestrateur (fusion dédiée)
  parSpecialisation?: boolean; // routage 2 niveaux (groupe puis expert)
}

/** Trace d'une exécution MoE (pour Le Repaire + Les Trésors). */
export interface MoeRun {
  id: string;
  genieId: string;
  query: string;
  routing: { voleurId: string; score: number }[];   // top-k embedding
  fragments: { voleurId: string; text: string; tokens: number }[];
  answer: string;              // réponse fusionnée finale
  tokens: { routing: number; selection: number; fragments: number; fusion: number; total: number };
  latencyMs: number;
  ts: number;
}

/** Résultat d'un benchmark Caverne vs agent unique (Les Trésors). */
export interface BenchResult {
  baselineModel: string;
  baselineProvider?: string;
  rounds?: {
    query: string;
    baselineText: string;
    caverneText: string;
    baseLatency: number;
    cavLatency: number;
    baseTokens: number;
    cavTokens: number;
    baseScore: number;
    cavScore: number;
    winner: "caverne" | "baseline" | "tie";
  }[];
  metrics: {
    label: string;             // "qualité" | "latence p95" | "coût/1k" | "tokens"
    baseline: number;
    caverne: number;
    gainPct: number;
  }[];
  ts: number;
}

// ---- Contrats API backend (le backend DOIT exposer ceci) ----
export interface CaverneAPI {
  // Le Camp
  listVoleurs(): Promise<Voleur[]>;
  createVoleur(v: Omit<Voleur, "id" | "embedding" | "tokensUtilises" | "actif">): Promise<Voleur>;
  updateVoleur(id: string, patch: Partial<Voleur>): Promise<Voleur>;
  deleteVoleur(id: string): Promise<void>;
  // Génies
  listGenies(): Promise<Genie[]>;
  createGenie(g: Omit<Genie, "id" | "reliquat">): Promise<Genie>;
  // Le Génie (chat) — SSE stream de fragments puis réponse fusionnée
  ask(genieId: string, query: string): AsyncIterable<Partial<MoeRun>>;
  // Les Trésors
  benchmark(genieId: string, baseline: QwenModel): Promise<BenchResult>;
}

export const QWEN_MODELS: QwenModel[] = [
  "qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-plus", "qwen-vl-plus",
];

// ===== Extensions (T01) — additifs, ne modifient rien ci-dessus =====
export interface KbDoc { id: string; nom: string; taille: number; chunks: number; ts: number; }
export interface KbChunk { id: string; docId: string; text: string; embedding?: number[]; }
export interface KbSearchResult { chunkId: string; docId: string; text: string; score: number; }

export interface TournoiMatch { a: string; b: string; winner: string; scoreA: number; scoreB: number; }
export interface TournoiRun { id: string; query: string; matches: TournoiMatch[]; champion: string; ts: number; }
export interface DebatRound { tour: number; contributions: { voleurId: string; text: string }[]; }
export interface DebatRun { id: string; query: string; rounds: DebatRound[]; synthese: string; ts: number; }
export interface PipelineStep { voleurId: string; role: string; input: string; output: string; }
export interface PipelineRun { id: string; query: string; steps: PipelineStep[]; final: string; ts: number; }

export interface MoeTrace {
  routing: { voleurId: string; score: number; retenu: boolean }[];
  fusion: { phrase: string; voleurId: string; cosinus: number }[];
  tokens: number;
}
export interface NegoTour { voleurId: string; position: string; concession?: string; }
export interface NegoSession { id: string; query: string; tours: NegoTour[]; accord: string; resolu: boolean; ts: number; }
export interface SousTache { id: string; description: string; voleurId: string; resultat?: string; }
export interface MissionPlan { id: string; mission: string; sousTaches: SousTache[]; synthese?: string; ts: number; }

export interface EtoileJob { id: string; prompt: string; promptEnrichi: string; type: "image" | "video"; url?: string; status: string; error?: string; ts: number; }
export interface EtoileCritique { note: number; commentaire: string; }
export interface SabreDuel { query: string; solo: string; bande: string; gagnant: "solo" | "bande"; ecartQualite: number; }
export interface BalanceStats { requetes: number; tokensBande: number; tokensSolo: number; economiePct: number; }
export interface Portrait { voleurId: string; url: string; }
export interface SecretEntry { id: string; hash: string; salt: string; iterations: number; unlock: string; indice: string; difficulte: string; }
