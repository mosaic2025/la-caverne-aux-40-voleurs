// Registre de routes modulaires (T01). Chaque server/routes/<feature>.mjs exporte :
//   export const order = 100        // optionnel (défaut 100 ; stubs = 999)
//   export async function handle(req, res, url, parts, ctx) -> Promise<boolean>
// Si un handler traite la requête, il renvoie true (et a écrit la réponse).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
let handlers = null;

async function load() {
  if (handlers) return handlers;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mjs") && f !== "registry.mjs");
  const mods = [];
  for (const f of files) {
    try {
      const m = await import(pathToFileURL(path.join(dir, f)).href);
      if (typeof m.handle === "function") mods.push({ order: m.order ?? 100, handle: m.handle, name: f });
    } catch (e) {
      console.error(`[routes] échec chargement ${f}: ${e.message}`);
    }
  }
  mods.sort((a, b) => a.order - b.order);
  console.log(`[routes] ${mods.length} module(s) : ${mods.map((m) => m.name).join(", ")}`);
  handlers = mods;
  return mods;
}

export async function tryRoutes(req, res, url, parts, ctx) {
  for (const h of await load()) {
    if (await h.handle(req, res, url, parts, ctx)) return true;
  }
  return false;
}
