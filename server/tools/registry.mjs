// ============================================================
// L37-L44 — Registry + exécution des tools/actions
// ============================================================

export const TOOL_REGISTRY = new Map();

export function registerTool(name, spec, execute) {
  TOOL_REGISTRY.set(name, { name, spec, execute });
}

export function getTool(name) {
  return TOOL_REGISTRY.get(name);
}

export function listTools() {
  return Array.from(TOOL_REGISTRY.values()).map((t) => ({ name: t.name, spec: t.spec }));
}

// Tool de base : navigation entre onglets
registerTool("goto", {
  description: "Change d'onglet dans l'UI",
  parameters: { tabId: { type: "string" } },
}, async ({ tabId }, ctx) => {
  if (ctx.onGotoTab) ctx.onGotoTab(tabId);
  return `Onglet changé : ${tabId}`;
});

// Tool : poser une question au Génie
registerTool("ask_genie", {
  description: "Envoie une question au Génie actif",
  parameters: { genieId: { type: "string" }, query: { type: "string" } },
}, async ({ genieId, query }) => {
  return `Question envoyée au Génie ${genieId} : ${query}`;
});

// Tool : rappeler la mémoire long terme
registerTool("recall_memory", {
  description: "Rappelle des souvenirs pertinents",
  parameters: { userId: { type: "string" }, query: { type: "string" } },
}, async ({ userId, query }, ctx) => {
  const { recallLongTerm } = await import("../humanity/memoryLongTerm.mjs");
  const hits = recallLongTerm(ctx.store, query, 3);
  return hits.length
    ? `Souvenirs pertinents :\n${hits.map((h) => `- ${h.summary}`).join("\n")}`
    : "Aucun souvenir pertinent.";
});
