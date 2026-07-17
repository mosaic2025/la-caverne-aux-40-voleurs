// Client typé du backend Caverne (server/server.mjs). 0 mock.
import type { Voleur, Genie, MoeRun, BenchResult, EtoileJob } from "../types";

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
