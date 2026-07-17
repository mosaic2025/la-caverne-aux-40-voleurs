// ============================================================
// L38-L39 — Exécution sécurisée des tools
// ============================================================

import { getTool } from "./registry.mjs";

export async function executeTool(name, args, ctx) {
  const tool = getTool(name);
  if (!tool) throw new Error(`Tool inconnu : ${name}`);
  const spec = tool.spec || {};
  for (const [k, v] of Object.entries(spec.parameters || {})) {
    if (v.required && !(k in args)) {
      throw new Error(`Paramètre manquant : ${k}`);
    }
  }
  return await tool.execute(args, ctx);
}

export async function executePlan(plan, ctx) {
  const results = [];
  for (const step of plan.steps || []) {
    results.push(await executeTool(step.tool, step.args, ctx));
  }
  return results;
}
