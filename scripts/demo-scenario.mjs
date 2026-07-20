// ============================================================
// Scénario de démo en direct — La Caverne aux 40 Voleurs.
// Exerce les 3 features Le Camp (Embûche/Conciliabule/Sceaux) + 1 tour MoE réel.
// Usage : node scripts/demo-scenario.mjs [genieId]
// Sortie : console (transcript) + docs/DEMO_TRANSCRIPT.md
// Nécessite le backend lancé (node server/server.mjs).
// ============================================================
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const API = process.env.CAVERNE_API || "http://localhost:8787";
const lines = [];
const log = (s = "") => { console.log(s); lines.push(s); };
const h = (s) => { log(""); log("═".repeat(72)); log(`  ${s}`); log("═".repeat(72)); };

async function getGenieId(arg) {
  if (arg) return arg;
  const r = await fetch(`${API}/api/genies`);
  const gs = await r.json();
  if (!Array.isArray(gs) || !gs.length) throw new Error("Aucun Génie — lance `node scripts/seed-demo.mjs`.");
  return gs[0].id;
}

async function post(p, body) {
  const r = await fetch(`${API}${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${p} ${r.status}: ${await r.text().catch(() => "")}`);
  return r.json();
}

async function askMoE(genieId, query) {
  const r = await fetch(`${API}/api/ask`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ genieId, query, k: 3 }) });
  if (!r.ok) throw new Error(`/api/ask ${r.status}: ${await r.text().catch(() => "")}`);
  const text = await r.text();
  let final = null;
  let curEvent = "";
  for (const ln of text.split("\n")) {
    if (ln.startsWith("event:")) curEvent = ln.slice(6).trim();
    else if (ln.startsWith("data:")) {
      try { const d = JSON.parse(ln.slice(5).trim()); if (curEvent === "final") final = d; } catch {}
    }
  }
  return final;
}

(async () => {
  const genieId = await getGenieId(process.argv[2]);
  log("🏔️  LA CAVERNE AUX 40 VOLEURS — Démo en direct");
  log(`   API : ${API} · Génie : ${genieId}`);
  h("PRÉLUDE — Le Camp");
  const voleurs = await (await fetch(`${API}/api/voleurs`)).json();
  log(`Le Camp compte ${voleurs.length} voleur(s) :`);
  for (const v of voleurs) log(`  • ${v.nom} — ${v.specialite.split(/[,;]/)[0]} (${v.provider}, ${v.modele})`);

  h("⚔️  FEATURE A — L'EMBÛCHE (audit adversarial par Qwen Cloud)");
  const audit = await post("/api/camp/audit", {});
  log(`Verdict de souveraineté : ${audit.verdict?.resilience}% — ${audit.verdict?.resume}`);
  log("Failles détectées :");
  for (const fl of audit.fragilities || []) log(`  🩸 ${fl.faille} (gravité ${fl.gravite}/5)`);
  log("Gang rival conçu par Qwen :");
  for (const g of audit.gangRival || []) log(`  👺 ${g.nom} [${g.specialite}] → cible ${g.cible}\n      ⚔️ ${g.attaque}`);
  if (audit.recrue) log(`🛡️ Recrue de rupture proposée : ${audit.recrue.nom} — ${audit.recrue.specialite} (${audit.recrue.provider}/${audit.recrue.modele})`);

  h("🏛️  FEATURE B — LE CONCILIABULE (forge par mission naturelle)");
  const mission = "Auditer une API Node.js en 30 minutes et proposer 3 correctifs prioritaires.";
  log(`Mission : « ${mission} »`);
  const forge = await post("/api/camp/forge", { mission });
  log(`Escouade forgée (${forge.escouade.length} voleurs) :`);
  for (const r of forge.escouade) log(`  • ${r.nom} — ${r.specialite} (${r.provider}/${r.modele}, ${r.effort}) — ${r.justification}`);
  log("Débat de recrutement :");
  for (const d of forge.debat || []) log(`  🎭 ${d.voleur}${d.remplace ? ` (remplace ${d.remplace})` : ""} : ${d.plaidoirie}`);
  log(`Verdict : ${forge.verdict}`);

  h("🛡️  FEATURE C — LES SCEAUX (sigil SVG génératif par Qwen Cloud)");
  for (const v of voleurs.slice(0, 4)) {
    const s = await post("/api/camp/sigil", { voleurId: v.id });
    const valid = s.svg.includes("<svg") ? "✅ SVG valide" : "⚠️ SVG invalide";
    log(`  🔮 ${v.nom} → ${valid} · marée ${s.maree.bpm} bpm · hue ${Math.round(s.maree.hue)}° · glyphe ${s.maree.glyph}`);
  }

  h("🧠 TOUR MOE RÉEL — Le Génie répond (routing top-K + fusion Qwen-Max)");
  const q = "Quels sont les 3 risques principaux d'un orchestrateur multi-agents LLM en production, et comment les mitiges ?";
  log(`Question : « ${q} »`);
  const run = await askMoE(genieId, q);
  if (run) {
    log(`Latence : ${run.latencyMs} ms · Tokens : routing ${run.tokens?.routing} + fragments ${run.tokens?.fragments} + fusion ${run.tokens?.fusion} = total ${run.tokens?.total}`);
    log(`Experts retenus : ${(run.routing || []).filter(r => r.retenu).map(r => r.nom || r.voleurId).join(", ") || "n/a"}`);
    log(""); log("Réponse fusionnée du Génie :");
    log(run.answer?.slice(0, 900) + (run.answer?.length > 900 ? "…" : ""));
  } else log("⚠️ Aucun événement final reçu.");

  h("FIN — La Caverne aux 40 Voleurs");
  log(`Transcript sauvegardé : docs/DEMO_TRANSCRIPT.md`);

  fs.writeFileSync(path.join(ROOT, "docs", "DEMO_TRANSCRIPT.md"), lines.join("\n") + "\n");
  process.exit(0);
})().catch((e) => { console.error("Démo échouée :", e.message); process.exit(1); });
