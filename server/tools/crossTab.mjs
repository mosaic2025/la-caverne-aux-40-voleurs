// ============================================================
// L40 — Outils cross-tab
// ============================================================

import { registerTool } from "./registry.mjs";

registerTool("goto_camp", { description: "Va dans Le Camp", parameters: {} }, async (_, ctx) => {
  ctx.onGotoTab?.("camp"); return "Le Camp";
});
registerTool("goto_genie", { description: "Va dans Le Génie", parameters: {} }, async (_, ctx) => {
  ctx.onGotoTab?.("genie"); return "Le Génie";
});
registerTool("goto_atelier", { description: "Va dans L'Atelier", parameters: {} }, async (_, ctx) => {
  ctx.onGotoTab?.("atelier"); return "L'Atelier";
});
registerTool("goto_lampe", { description: "Va dans La Lampe", parameters: {} }, async (_, ctx) => {
  ctx.onGotoTab?.("lampe"); return "La Lampe";
});
registerTool("goto_connecteur", { description: "Va dans Le Connecteur", parameters: {} }, async (_, ctx) => {
  ctx.onGotoTab?.("connecteur"); return "Le Connecteur";
});
