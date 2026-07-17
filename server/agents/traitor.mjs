// ============================================================
// L49 — Agent Traitor : contradicteur permanent (40ᵉ Voleur)
// ============================================================

export class TraitorAgent extends Agent {
  constructor() {
    super({ id: "traitor", name: "40ᵉ Voleur", role: "traitor", systemPrompt: "Tu es un contradicteur constructif. Cherche les failles et propose des corrections." });
  }

  critique({ query, answer }) {
    const flaws = [];
    if (answer.length < 30) flaws.push("réponse trop courte");
    if (!answer.toLowerCase().includes(query.toLowerCase().slice(0, 20))) flaws.push("réponse peut-être hors-sujet");
    if (answer.includes("désolé") || answer.includes("je ne peux pas")) flaws.push("réponse refusante");
    return {
      objection: flaws.length ? `Objectifs : ${flaws.join(", ")}` : null,
      severity: flaws.length >= 2 ? "major" : flaws.length ? "minor" : "none",
    };
  }
}
