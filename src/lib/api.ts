// Client typé du backend Caverne (server/server.mjs). 0 mock.
import type { Voleur, Genie, MoeRun, BenchResult, EtoileJob, RoutingStrategy, SharedKnowledgeStats, AvatarState } from "../types";

export interface DuelResult {
  a: { voleurId: string; nom: string; text: string; tokens: number };
  b: { voleurId: string; nom: string; text: string; tokens: number };
  verdict: { scoreA?: number; scoreB?: number; winner?: "A" | "B"; rationale?: string };
}

export interface DebatResult {
  id: string;
  query: string;
  rounds: Array<{
    tour: number;
    contributions: Array<{ voleurId: string; text: string }>;
  }>;
  synthese: string;
  ts: number;
}

export interface PipelineStep {
  voleurId: string;
  consigne: string;
  input: string;
  output: string;
}

export interface PipelineResult {
  id: string;
  query: string;
  steps: PipelineStep[];
  final?: string;
  ts: number;
}

export interface TournoiMatch {
  a: string; // voleurId
  b: string; // voleurId
  winner: string; // voleurId
  scoreA: number;
  scoreB: number;
}

export interface TournoiResult {
  id: string;
  query: string;
  matches: TournoiMatch[];
  champion: string; // voleurId
  ts: number;
}

// En développement, les appels relatifs passent par le proxy Vite : cela
// fonctionne aussi depuis un téléphone ("localhost" y désignerait le mobile).
const BASE = (import.meta.env.VITE_API ?? "").replace(/\/$/, "");

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(BASE + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`${init?.method ?? "GET"} ${path} → ${r.status} ${await r.text().catch(() => "")}`);
  return r.status === 204 ? (undefined as T) : ((await r.json()) as T);
}

export const api = {
  health: () => j<{ ok: boolean }>("/api/health"),
  listUnlocked: () => j<{ unlocked: string[] }>("/api/unlocked"),

  listProviders: () =>
    j<{ providers: string[]; models: Record<string, string[]>; default: string }>("/api/providers"),

  listVoleurs: () => j<Voleur[]>("/api/voleurs"),
  createVoleur: (v: Omit<Voleur, "id" | "embedding" | "tokensUtilises" | "actif">) =>
    j<Voleur>("/api/voleurs", { method: "POST", body: JSON.stringify(v) }),
  updateVoleur: (id: string, patch: Partial<Voleur>) =>
    j<Voleur>(`/api/voleurs/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteVoleur: (id: string) => j<void>(`/api/voleurs/${id}`, { method: "DELETE" }),

  listGenies: () => j<Genie[]>("/api/genies"),
  createGenie: (g: Omit<Genie, "id" | "reliquat">) =>
    j<Genie>("/api/genies", { method: "POST", body: JSON.stringify(g) }),
  forgeGenie: (payload: {
    nom: string;
    voiceCharter: string;
    budgetTotal: number;
    k: number;
    dominance: number;
    parSpecialisation?: boolean;
    routingStrategy?: RoutingStrategy;
    ml?: boolean;
    embeddingModel?: string;
    models: { nom: string; specialite: string; specialisation?: string; modele: string; effort: "low" | "med" | "high"; systemPrompt: string; capTokens: number; provider?: string }[];
    orchestrateur?: { modele: string; provider?: string; effort: "low" | "med" | "high"; systemPrompt: string; capTokens: number };
  }) =>
    j<{ genie: Genie; voleurs: Voleur[] }>("/api/genies/forge", { method: "POST", body: JSON.stringify(payload) }),

  forgeChat: (description: string) =>
    j<{
      nom: string;
      voiceCharter: string;
      budgetTotal: number;
      k: number;
      dominance: number;
      parSpecialisation?: boolean;
      routingStrategy?: RoutingStrategy;
      ml?: boolean;
      embeddingModel?: string;
      models: { nom: string; specialite: string; specialisation?: string; modele: string; effort: "low" | "med" | "high"; systemPrompt: string; capTokens: number; provider?: string }[];
      orchestrateur?: { modele: string; provider?: string; effort: "low" | "med" | "high"; systemPrompt: string; capTokens: number };
    }>("/api/genies/forge-chat", { method: "POST", body: JSON.stringify({ description }) }),

  listRuns: () => j<MoeRun[]>("/api/runs"),
  duel: (voleurAId: string, voleurBId: string, query: string, judgeProvider?: string, judgeModel?: string) =>
    j<DuelResult>("/api/conseil/duel", { method: "POST", body: JSON.stringify({ voleurAId, voleurBId, query, judgeProvider, judgeModel }) }),

  atelierHealth: () => j<{ ok: boolean; mode: string }>("/api/atelier/health"),
  atelierAssist: (code: string, action: string, instruction = "") =>
    j<{ result: string; tokens: number; action: string }>("/api/atelier/assist", { method: "POST", body: JSON.stringify({ code, action, instruction }) }),
  atelierRun: (code: string, lang: "js" | "python" = "js") =>
    j<{ output: string; result?: string; error: string | null; stderr?: string; mode?: string; timedOut?: boolean }>("/api/atelier/run", { method: "POST", body: JSON.stringify({ code, lang }) }),

  dinars: () => j<{ balances: { voleurId: string; nom: string; solde: number; mises: number; gains: number; pertes: number }[]; ledger: import("../types").DinarLedgerEntry[] }>("/api/dinars"),
  dinarMarket: () => j<import("../types").DinarMarketSnapshot[]>("/api/dinars/market"),
  traitor: () => j<{ verdicts: { runId: string; severity: string; objection?: string; verdict?: string; ts: number }[]; total: number; founded: number; ttu: number }>("/api/traitor"),
  traitorJudge: (runId: string, verdict: "founded" | "unfounded") =>
    j<{ ok: boolean }>("/api/traitor/judge", { method: "POST", body: JSON.stringify({ runId, verdict }) }),

  fusionProfile: (userId: string) =>
    j<{ userId: string; interactions: number; fusionPct: number; lenUser: number; lenGenie: number; lengthSimilarity: number; lexiconSimilarity: number; lexique: string[]; lexiqueGenie: string[]; voiceHint: string }>(`/api/fusion/${encodeURIComponent(userId)}`),

  etoileJobs: () => j<EtoileJob[]>("/api/etoile/jobs"),
  etoileImage: (prompt: string) => j<EtoileJob>("/api/etoile/image", { method: "POST", body: JSON.stringify({ prompt }) }),
  etoileVideo: (prompt: string) => j<EtoileJob>("/api/etoile/video", { method: "POST", body: JSON.stringify({ prompt }) }),
  etoileRefresh: (id: string) => j<EtoileJob>(`/api/etoile/jobs/${encodeURIComponent(id)}/refresh`),
  debat: (voleurIds: string[], question: string, rounds?: number) =>
    j<DebatResult>("/api/conseil/debat", { method: "POST", body: JSON.stringify({ voleurIds, question, rounds }) }),
  tournoi: (voleurIds: string[], question: string) =>
    j<TournoiResult>("/api/conseil/tournoi", { method: "POST", body: JSON.stringify({ voleurIds, question }) }),
  pipeline: (steps: { voleurId: string; consigne: string }[], question: string) =>
    j<PipelineResult>("/api/conseil/pipeline", { method: "POST", body: JSON.stringify({ steps, question }) }),

  benchmark: (genieId: string, baseline: string, questions?: string[], baselineProvider?: string) =>
    j<BenchResult>("/api/benchmark", { method: "POST", body: JSON.stringify({ genieId, baseline, questions, baselineProvider }) }),

  sabre: (genieId: string, query: string) =>
    j<import("../types").SabreDuel>("/api/arene/sabre", { method: "POST", body: JSON.stringify({ genieId, query }) }),
  listSabres: () => j<{ duels: import("../types").SabreDuel[]; total: number; bandeWins: number; soloWins: number }>("/api/arene/sabre"),

  balance: () =>
    j<import("../types").BalanceStats>("/api/balance"),

  // Meta / orchestrateur multicouche
  avatar: (userId: string) => j<AvatarState>(`/api/avatar/${encodeURIComponent(userId)}`),
  evolveAvatar: (userId: string, payload: { name?: string; userMsg?: string; genieAnswer?: string; fusionPct?: number; unlockedSecrets?: string[] }) =>
    j<AvatarState>(`/api/avatar/${encodeURIComponent(userId)}/evolve`, { method: "POST", body: JSON.stringify(payload) }),
  avatarVoiceHint: (userId: string) => j<AvatarState>(`/api/avatar/${encodeURIComponent(userId)}/voice-hint`),
  avatarForgeVoleur: (userId: string) =>
    j<{ voleur: Voleur; shardsUsed: number }>(`/api/avatar/${encodeURIComponent(userId)}/forge-voleur`, { method: "POST" }),
  metaCapabilities: () => j<{ capabilities: string[] }>("/api/meta/capabilities"),
  metaOrchestrate: (intent: { type: string; model?: string; messages?: any[]; maxTokens?: number; temperature?: number }, complexity = 0.5, sensitivity = 0, budget = 1) =>
    j<{ provider: string; model: string }>("/api/meta/orchestrate", { method: "POST", body: JSON.stringify({ intent, complexity, sensitivity, budget }) }),
  contributeSharedKnowledge: (userId: string, text: string, source = "chat", tags?: string[]) =>
    j<{ id: string }>("/api/shared-knowledge/contribute", { method: "POST", body: JSON.stringify({ userId, text, source, tags }) }),
  sharedKnowledgeStats: () => j<SharedKnowledgeStats>("/api/shared-knowledge/stats"),
  sharedKnowledgeSearch: (query: string, k = 5, provider?: string) =>
    j<{ query: string; hits: { id: string; docId: string; text: string; score: number; metadata?: any }[] }>("/api/shared-knowledge/search", { method: "POST", body: JSON.stringify({ query, k, provider }) }),
  sharedKnowledgeGraph: () => j<{ nodes: { id: string; weight: number }[]; edges: { source: string; target: string; weight: number }[] }>("/api/shared-knowledge/graph"),
  kbSearch: (query: string, k = 5, provider?: string) =>
    j<{ query: string; hits: { id: string; docId: string; text: string; score: number; metadata?: any }[] }>("/api/kb/search", { method: "POST", body: JSON.stringify({ query, k, provider }) }),
  kbStats: () => j<{ docs: number; vectorStats: { vectors: number; file: string } }>("/api/kb/stats"),
  tts: (text: string, voice?: string) => j<{ audioUrl?: string; audioBase64?: string; tokens: number }>("/api/tts", { method: "POST", body: JSON.stringify({ text, voice }) }),
  generateImage: (prompt: string) => j<{ taskId: string; status: string; results?: { url?: string; prompt: string; note?: string }[] }>("/api/gen/image", { method: "POST", body: JSON.stringify({ prompt }) }),
  generateVideo: (prompt: string) => j<{ taskId: string; status: string; note?: string }>("/api/gen/video", { method: "POST", body: JSON.stringify({ prompt }) }),
  visionAnalyze: (imageUrl: string, prompt?: string) => j<{ text: string; tokens: number }>("/api/vision/analyze", { method: "POST", body: JSON.stringify({ imageUrl, prompt }) }),
  fable5: (prompt: string, model = "anthropic/claude-fable-5", { system, maxTokens, temperature }: { system?: string; maxTokens?: number; temperature?: number } = {}) =>
    j<{ text: string; promptTokens: number; completionTokens: number; totalTokens: number; latencyMs: number }>("/api/fable5", { method: "POST", body: JSON.stringify({ prompt, model, system, maxTokens, temperature }) }),

  /** Stream SSE de /api/ask. yield {event, data} au fil de l'eau. */
  async *ask(genieId: string, query: string): AsyncGenerator<{ event: string; data: any }> {
    const r = await fetch(BASE + "/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genieId, query }),
    });
    if (!r.ok || !r.body) throw new Error(`/api/ask → ${r.status}`);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const blocks = buf.split("\n\n");
      buf = blocks.pop() ?? "";
      for (const block of blocks) {
        let event = "message";
        let data = "";
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        if (data) {
          try { yield { event, data: JSON.parse(data) }; }
          catch { yield { event, data }; }
        }
      }
    }
  },
};
