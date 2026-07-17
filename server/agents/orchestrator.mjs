// ============================================================
// L46 — Agent Orchestrateur : supervise les autres agents
// ============================================================

import { Agent } from "./base.mjs";

export class OrchestratorAgent extends Agent {
  constructor({ id, name = "Orchestrateur" } = {}) {
    super({ id, name, role: "orchestrator", systemPrompt: "Supervise les agents et choisit la prochaine action." });
    this.agents = new Map();
  }

  register(agent) {
    this.agents.set(agent.id, agent);
  }

  plan(observation) {
    return {
      steps: Array.from(this.agents.values()).map((a) => ({ agent: a.id, action: "observe", payload: observation })),
    };
  }
}
