// ============================================================
// L71 — Portrait de Voleur : GET /api/voleurs/:id/portrait
// Génère (via z-image-turbo / Wanx) un portrait fantastique pour un
// Voleur, à partir de sa spécialité, et le cache sur l'objet voleur.
// order 100 → prioritaire sur le stub 501 (order 999).
// ============================================================
import { createImageJob } from "../moe.mjs";

export const order = 100;

const PORTRAIT_STYLE = "portrait fantastique orientale, style caverne des mille et une nuits, ";
const STAGE_BY_EFFORT = { low: "timide", med: "concentré", high: "intense et rayonnant" };

function buildVoleurPrompt(v) {
  const effort = STAGE_BY_EFFORT[v.effort] || "concentré";
  return `${PORTRAIT_STYLE}incarne « ${v.nom} », voleur expert en ${v.specialite}, air ${effort}, tenue de voleur ornée, lumière dorée et violette, fond de caverne ancienne aux trésors, détail riche, ambiance mystérieuse.`;
}

export async function handle(req, res, url, parts, ctx) {
  // GET /api/voleurs/:id/portrait
  if (req.method !== "GET") return false;
  if (parts[0] !== "api" || parts[1] !== "voleurs" || parts[4] !== undefined) return false;
  if (parts[3] !== "portrait") return false;
  const id = parts[2];
  if (!id) return false;

  const { store, save } = ctx;
  const voleur = store.voleurs.find((v) => v.id === id);
  if (!voleur) { ctx.helpers.sendJson(res, 404, { error: "Voleur introuvable" }); return true; }

  // Cache : régénère seulement si ?fresh=1
  const fresh = url.searchParams.get("fresh") === "1";
  if (voleur.portrait?.url && !fresh) {
    ctx.helpers.sendJson(res, 200, { voleurId: id, nom: voleur.nom, url: voleur.portrait.url, cached: true, prompt: voleur.portrait.prompt });
    return true;
  }

  try {
    const prompt = buildVoleurPrompt(voleur);
    const job = await createImageJob(prompt);
    if (!job?.url) throw new Error("Aucune URL renvoyée par le générateur d'image");
    voleur.portrait = { url: job.url, prompt: job.promptEnrichi || prompt, ts: Date.now() };
    save();
    ctx.helpers.sendJson(res, 200, { voleurId: id, nom: voleur.nom, url: job.url, cached: false, prompt: voleur.portrait.prompt });
  } catch (e) {
    ctx.helpers.sendJson(res, 502, { error: "Échec génération portrait", detail: String(e.message || e), prompt: buildVoleurPrompt(voleur) });
  }
  return true;
}
