// ============================================================
// L41-L42 — Outils externes et multimodaux
// ============================================================

import { registerTool } from "./registry.mjs";

registerTool("fetch_url", {
  description: "Récupère une URL (limité aux textes simples)",
  parameters: { url: { type: "string" } },
}, async ({ url }) => {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return text.slice(0, 4000);
});

registerTool("search_kb", {
  description: "Recherche dans le KB local",
  parameters: { query: { type: "string" } },
}, async ({ query }, ctx) => {
  const { searchShared } = await import("../sharedMind/connector.mjs");
  const hits = searchShared(ctx.store, query, 5);
  return hits.length
    ? hits.map((h) => `- ${h.text.slice(0, 200)}`).join("\n")
    : "Aucun résultat dans le savoir partagé.";
});
