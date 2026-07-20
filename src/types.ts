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
  soldeDinars?: number;        // monnaie interne du Bazar des Dinars (1 dinar ≈ 100 tokens réels)
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
  routingStrategy?: RoutingStrategy; // stratégie de routage explicite (auto par défaut)
  embeddingModel?: string;     // modèle d'embedding utilisé par le Génie
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
  bazaar?: { encheres: any[]; winners: string[]; losers: string[] };
  traitor?: TraitorCheck;
  sirocco?: SiroccoMetrics;
  routingStrategy?: RoutingStrategy;
  routingMode?: string;
}

export interface SiroccoMetrics {
  chaleur: number;       // 0-1, haut = conformisme (tout le monde dit pareil)
  derive: number;        // 0-1, haut = dérive hors-sujet
  etat: "brise" | "calme" | "tempete";
  alerte?: string;
  tokens: number;        // coût des embeddings (détection quasi gratuite)
}

export interface TraitorCheck {
  objection?: string;            // null = "butin propre"
  severity: "none" | "minor" | "major";
  verdict?: "founded" | "unfounded";
  correctedAnswer?: string;
  tokens: number;
}

export interface SharedKnowledgeStats {
  entries: number;
  estimatedTokens: number;
  estimatedTokensLabel: string;
}

export interface MemoryShard {
  id: string;
  type: "technique" | "préférence" | "emotion";
  content: string;
  weight: number;
  ts: number;
  topics?: string[];
}

export interface AvatarPersonality {
  userId: string;
  name: string;
  mood: string;
  formality: number;
  verbosity: number;
  humor: number;
  patience: number;
  birthTs: number;
  stage: "oeuf" | "larve" | "forme" | "forme_eveillee";
  interactions?: number;
  fusionPct?: number;
}

export interface AvatarState {
  exists: boolean;
  userId?: string;
  personality?: AvatarPersonality;
  memories?: { role: "user" | "genie"; text: string; ts: number }[];
  shards?: MemoryShard[];
  profileId?: string;
  unlockedSecrets?: string[];
  progress?: {
    stage: string;
    nextAt: number | null;
    interactions: number;
    shardWeight: number;
  };
  hint?: string;
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
export interface DinarLedgerEntry {
  id: string;
  ts: number;
  voleurId: string;
  genieId: string;
  query: string;
  type: "enchere" | "gain" | "perte" | "allocation";
  montant: number;
  soldeApres: number;
  details?: string;
}
export interface DinarMarketSnapshot {
  voleurId: string;
  nom: string;
  solde: number;
  encheres: { query: string; offre: number; retenu: boolean; gain: number }[];
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

export type RoutingStrategy = "auto" | "mono" | "topk" | "specialisation" | "bazaar" | "cost" | "perf";

export const ROUTING_STRATEGIES: RoutingStrategy[] = ["auto", "mono", "topk", "specialisation", "bazaar", "cost", "perf"];

export const ROUTING_LABELS: Record<RoutingStrategy, string> = {
  auto: "Auto (dominance)",
  mono: "Mono-expert",
  topk: "Top-K embedding",
  specialisation: "Par spécialisation",
  bazaar: "Bazar des Dinars",
  cost: "Moins cher d'abord",
  perf: "Meilleur historique",
};

// ===== Le Camp — features jury (Embûche / Conciliabule / Sceaux) =====
export interface CampRecrue {
  nom: string; specialite: string; provider: string; modele: string;
  effort: "low" | "med" | "high"; systemPrompt: string; capTokens: number; justification: string;
}
export interface CampAudit {
  fragilities: { faille: string; gravite: number }[];
  gangRival: { nom: string; specialite: string; cible: string; attaque: string }[];
  verdict: { resilience: number; resume: string };
  recrue: CampRecrue | null;
  ts: number;
}
export interface CampForge {
  escouade: CampRecrue[];
  debat: { voleur: string; plaidoirie: string; remplace: string | null }[];
  verdict: string;
  ts: number;
}
export interface CampSigil {
  svg: string;
  maree: { hue: number; bpm: number; glyph: string; description: string };
  seed: number;
  ts: number;
}
