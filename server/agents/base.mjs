// ============================================================
// L45 — Classe de base des agents
// ============================================================

export class Agent {
  constructor({ id, name, role, systemPrompt }) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.systemPrompt = systemPrompt;
  }

  observe(record) {
    // hook par défaut
  }

  toJSON() {
    return { id: this.id, name: this.name, role: this.role, systemPrompt: this.systemPrompt };
  }
}
