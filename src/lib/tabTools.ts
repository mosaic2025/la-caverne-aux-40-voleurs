/**
 * Registre d'outils cross-tab pour l'AssistantPanel.
 * Couche d'action directe déclenchée par pattern matching sur le prompt
 * avant de basculer sur la forge MoE (fetchPreview).
 */
import { api } from "./api";
import type { AssistantContext } from "../types/maxi";

export interface ToolContext {
  context: AssistantContext;
  provider: string;
  model: string;
  addMessage?: (content: string) => void;
}

export interface TabTool {
  name: string;
  description: string;
  /** Retourne les arguments extraits du prompt, ou null si non pertinent. */
  match: (prompt: string) => Record<string, unknown> | null;
  /** Exécute l'outil et renvoie un message de résultat pour le chat. */
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>;
}

/** Normalise le prompt pour la matching. */
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Extrait une chaîne entre guillemets ou après "nom"/"appelé"/"de". */
function extractName(prompt: string): string | null {
  const n = norm(prompt);
  // Guillemets
  const quoted = prompt.match(/["“']([^"”']+)["”']/);
  if (quoted) return quoted[1].trim();
  // "nom/appelé X"
  const after = prompt.match(/(?:nom(?:mé|mer)?\s+|appele[rs]?\s+|nommé\s+)([A-Za-zÀ-ÿ0-9 _-]{2,40})/i);
  if (after) return after[1].trim();
  // "X spécialite Y" — capture mot-clé puis suite
  for (const kw of ["voleur", "expert", "genie", "forge"]) {
    const re = new RegExp(kw + "\\s+(?:un(?:e)?\\s+)?([A-Za-zÀ-ÿ0-9 _-]{2,40})", "i");
    const m = n.match(re) || prompt.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

const TAB_IDS = ["camp", "repaire", "genie", "conseil", "miroir", "atelier", "etoile", "tresors"];
const TAB_LABELS: Record<string, string> = {
  camp: "Le Camp", repaire: "Le Repaire", genie: "Le Génie",
  conseil: "Le Conseil", miroir: "Le Miroir", atelier: "L'Atelier",
  etoile: "Nuit Étoilée", tresors: "Les Trésors",
};

export const TAB_TOOLS: TabTool[] = [
  {
    name: "gotoTab",
    description: "Change l'onglet actif (va vers / ouvre l'onglet X).",
    match: (prompt) => {
      const p = norm(prompt);
      // Verbes de navigation forts uniquement (évite collision avec "affiche/montre les X").
      if (!/(^va\b|aller|ouvre|navigue|change\s+d'?onglet|reviens|retour\b|vas?-?y|aller\s+[aà]|va\s+au\b|va\s+[aà]\b)/.test(p)) return null;
      for (const id of TAB_IDS) {
        const alias: Record<string, string[]> = {
          camp: ["camp"],
          repaire: ["repaire", "repere"],
          genie: ["genie", "genie"],
          conseil: ["conseil"],
          miroir: ["miroir", "mirror"],
          atelier: ["atelier"],
          etoile: ["etoile", "nuit etoilee", "etoilee"],
          tresors: ["tresors", "tresor"],
        };
        if (alias[id].some((a) => p.includes(a))) return { tabId: id };
      }
      return null;
    },
    execute: async (args, ctx) => {
      const tabId = String(args.tabId || "");
      const cb = ctx.context.onGotoTab;
      if (!cb) return "Navigation indisponible (callback onGotoTab manquant).";
      if (!TAB_IDS.includes(tabId)) return "Onglet inconnu: " + tabId;
      cb(tabId);
      return `Onglet actif → ${TAB_LABELS[tabId]}.`;
    },
  },
  {
    name: "listVoleurs",
    description: "Liste les voleurs (experts) existants.",
    match: (prompt) => {
      const p = norm(prompt);
      if (!/voleur|expert/.test(p)) return null;
      if (/\b(list|liste|affiche|montre|voir|quels? sont|combien)\b/.test(p) && !/cree|creer|ajout|nouveau|forge/.test(p)) return {};
      return null;
    },
    execute: async () => {
      const voleurs = await api.listVoleurs();
      if (!voleurs.length) return "Aucun voleur pour le moment. Le Camp est vide.";
      const lignes = voleurs.map((v) => `• ${v.nom} — ${v.specialite} (${v.provider}/${v.modele})${v.actif ? "" : " [inactif]"}`);
      return `Voleurs (${voleurs.length}):\n${lignes.join("\n")}`;
    },
  },
  {
    name: "createVoleur",
    description: "Crée un voleur (expert) dans Le Camp.",
    match: (prompt) => {
      const p = norm(prompt);
      if (!/voleur|expert/.test(p)) return null;
      if (!/cree|creer|ajout|nouveau|fabrique|construis/.test(p)) return null;
      const nom = extractName(prompt);
      // spécialité : mot-clé libre après "spécialité/spécialiste en/Codeur/Coder"
      let specialite = "généraliste";
      const specMatch = prompt.match(/(?:specialit[eé]|specialiste\s+(?:en|de)?|en)\s+([A-Za-zÀ-ÿ0-9 _-]{2,40})/i);
      if (specMatch) specialite = specMatch[1].trim();
      else if (/codeur|code|coder|programmation/.test(p)) specialite = "code";
      else if (/recherche|veille/.test(p)) specialite = "recherche";
      else if (/securite|s[eé]curit/.test(p)) specialite = "securite";
      else if (/architecture/.test(p)) specialite = "architecture";
      else if (/donnee|données|rag/.test(p)) specialite = "donnees";
      else if (/ux|experience/.test(p)) specialite = "experience";
      return { nom: nom || "Nouveau voleur", specialite };
    },
    execute: async (args, ctx) => {
      const nom = String(args.nom || "Nouveau voleur");
      const specialite = String(args.specialite || "généraliste");
      const voleur = await api.createVoleur({
        nom,
        specialite,
        provider: ctx.provider,
        modele: ctx.model as any,
        effort: "med",
        systemPrompt: `Tu es ${nom}, expert en ${specialite}. Réponds en français, de façon précise et concise.`,
        capTokens: 1024,
      });
      return `Voleur créé dans Le Camp: ${voleur.nom} (id ${voleur.id}) — spécialité ${voleur.specialite}, provider ${voleur.provider}/${voleur.modele}.`;
    },
  },
  {
    name: "listGenies",
    description: "Liste les génies (MoE) existants.",
    match: (prompt) => {
      const p = norm(prompt);
      if (!/genie|genie|moe/.test(p)) return null;
      if (/\b(list|liste|affiche|montre|voir|quels? sont|combien)\b/.test(p) && !/cree|creer|forge|nouveau/.test(p)) return {};
      return null;
    },
    execute: async () => {
      const genies = await api.listGenies();
      if (!genies.length) return "Aucun génie forgé. Utilise « forge un génie » pour en créer un.";
      const lignes = genies.map((g) => `• ${g.nom} — ${g.voleursIds.length} voleurs, budget ${g.budgetTotal} (${g.provider})`);
      return `Génies (${genies.length}):\n${lignes.join("\n")}`;
    },
  },
  {
    name: "forgeGenie",
    description: "Forge un génie (MoE) à partir d'un voiceCharter et de modèles.",
    match: (prompt) => {
      const p = norm(prompt);
      if (!/forge|genie|genie|moe/.test(p)) return null;
      if (!/forge|creer|cree|fabrique|construis|nouveau/.test(p)) return null;
      const nom = extractName(prompt) || "Génie auto";
      // budget
      const budgetMatch = prompt.match(/(\d+)\s*(tokens?|k)?/i);
      const budget = budgetMatch ? Number(budgetMatch[1]) * (budgetMatch[2] ? 1000 : 1) : 4000;
      // k
      const kMatch = prompt.match(/k\s*=?\s*(\d+)/i);
      const k = kMatch ? Number(kMatch[1]) : 3;
      const voiceCharter = `Voix unique du génie ${nom}: synthèse evidence-first, français, ton direct.`;
      return { nom, voiceCharter, budgetTotal: budget, k, dominance: 0.6 };
    },
    execute: async (args, ctx) => {
      const nom = String(args.nom || "Génie auto");
      const voiceCharter = String(args.voiceCharter || "");
      const budgetTotal = Number(args.budgetTotal || 4000);
      const k = Number(args.k || 3);
      const dominance = Number(args.dominance || 0.6);
      const models = [
        { nom: "Planificateur", specialite: "strategie", modele: ctx.model, effort: "high" as const, systemPrompt: "Planifie et orchestre.", capTokens: 800, provider: ctx.provider },
        { nom: "Codeur", specialite: "code", modele: ctx.model, effort: "med" as const, systemPrompt: "Écrit et relit le code.", capTokens: 800, provider: ctx.provider },
        { nom: "Critiqueur", specialite: "evaluation", modele: ctx.model, effort: "low" as const, systemPrompt: "Critique et vérifie.", capTokens: 600, provider: ctx.provider },
      ].slice(0, k);
      const res = await api.forgeGenie({ nom, voiceCharter, budgetTotal, k, dominance, models });
      return `Génie forgé: ${res.genie.nom} (id ${res.genie.id}) — ${res.voleurs.length} voleurs assemblés, budget ${res.genie.budgetTotal} tokens.`;
    },
  },
  {
    name: "runBenchmark",
    description: "Lance un benchmark Caverne vs baseline.",
    match: (prompt) => {
      const p = norm(prompt);
      if (!/benchmark|bench|compar/.test(p)) return null;
      if (!/lance|demarr|joue|fais|go|start|run/.test(p) && !/benchmark\s+de\b/.test(p)) return null;
      // baseline: "contre X" / "vs X" / "baseline X"
      const vs = prompt.match(/(?:contre|vs\.?|baseline)\s+([A-Za-z0-9 _\-:.]+)/i);
      const baseline = vs ? vs[1].trim() : "qwen-plus";
      // genieId: "du genie X" / "genie X"
      const g = prompt.match(/genie\s+([A-Za-z0-9 _-]+)/i);
      return { baseline, genieHint: g ? g[1].trim() : null };
    },
    execute: async (args) => {
      let genieId = String(args.genieHint || "");
      if (!genieId || !/^[a-zA-Z0-9-]+$/.test(genieId)) {
        const genies = await api.listGenies();
        if (!genies.length) return "Aucun génie disponible pour le benchmark. Forge d'abord un génie.";
        genieId = genies[0].id;
      }
      const baseline = String(args.baseline || "qwen-plus");
      const res = await api.benchmark(genieId, baseline);
      const wins = (res.rounds || []).filter((r) => r.winner === "caverne").length;
      const total = (res.rounds || []).length;
      return `Benchmark terminé: Caverne ${wins}/${total} round gagnés vs ${baseline}. ${res.metrics.length} métriques — voir Les Trésors.`;
    },
  },
  {
    name: "generateImage",
    description: "Génère une image via Nuit Étoilée.",
    match: (prompt) => {
      const p = norm(prompt);
      if (!/(image|gener(e|é)|creer|cree|dessine|illustre)/.test(p)) return null;
      if (!/(image|dessin|illustration|photo)/.test(p)) return null;
      // prompt image: entre guillemets ou après "de/une"
      const quoted = prompt.match(/["“']([^"”']+)["”']/);
      if (quoted) return { prompt: quoted[1] };
      const m = prompt.match(/(?:image|dessine|illustre|genere)\s+(?:une?\s+)?(?:image\s+(?:de\s+)?)?([A-Za-zÀ-ÿ0-9 _-]{3,80})/i);
      if (m) return { prompt: m[1] };
      return { prompt: prompt.replace(/^(?:genere|cr[ée]e?|dessine|illustre)\s+(?:une?\s+)?image\s+(?:de\s+)?/i, "").trim() };
    },
    execute: async (args) => {
      const p = String(args.prompt || "").trim();
      if (!p) return "Prompt image vide.";
      const job = await api.etoileImage(p);
      return `Image lancée (job ${job.id}, type ${job.type}). Statut: ${job.status}. Voir Nuit Étoilée.`;
    },
  },
  {
    name: "generateVideo",
    description: "Génère une vidéo via Nuit Étoilée.",
    match: (prompt) => {
      const p = norm(prompt);
      if (!/(video|vidéo|clip|film|anime)/.test(p)) return null;
      const quoted = prompt.match(/["“']([^"”']+)["”']/);
      if (quoted) return { prompt: quoted[1] };
      const m = prompt.match(/(?:video|vid[eé]o|clip|film|anime)\s+(?:de\s+)?([A-Za-zÀ-ÿ0-9 _-]{3,80})/i);
      if (m) return { prompt: m[1] };
      return { prompt: prompt.replace(/^(?:genere|cr[ée]e?)\s+(?:une?\s+)?(?:vid[eé]o|clip|film)\s+(?:de\s+)?/i, "").trim() };
    },
    execute: async (args) => {
      const p = String(args.prompt || "").trim();
      if (!p) return "Prompt vidéo vide.";
      const job = await api.etoileVideo(p);
      return `Vidéo lancée (job ${job.id}). Statut: ${job.status}. Voir Nuit Étoilée.`;
    },
  },
  {
    name: "atelierRun",
    description: "Exécute du code dans L'Atelier.",
    match: (prompt) => {
      const p = norm(prompt);
      if (!/(atelier|exec|exéc|run|lance|joue)\b.*code|code\b.*(atelier|exec|run)/.test(p)) return null;
      // bloc de code
      const block = prompt.match(/```(?:js|javascript|python)?\s+([\s\S]+?)```/);
      if (block) {
        const lang = /python/.test(prompt) ? "python" : "js";
        return { code: block[1], lang };
      }
      return null;
    },
    execute: async (args) => {
      const code = String(args.code || "");
      const lang = (args.lang === "python" ? "python" : "js") as "js" | "python";
      if (!code) return "Aucun code à exécuter.";
      const res = await api.atelierRun(code, lang);
      const out = res.error ? `Erreur: ${res.error}` : (res.output || res.result || "(sans sortie)");
      return `Atelier (${lang}) → ${out.slice(0, 600)}`;
    },
  },
];

/**
 * Tente de matcher un outil sur le prompt. Retourne { tool, args } ou null.
 * Premier match gagne; l'ordre de TAB_TOOLS fait la priorité.
 */
export function matchTool(prompt: string): { tool: TabTool; args: Record<string, unknown> } | null {
  for (const tool of TAB_TOOLS) {
    try {
      const args = tool.match(prompt);
      if (args) return { tool, args };
    } catch {
      /* ignore tool match errors */
    }
  }
  return null;
}

export const TOOL_NAMES = TAB_TOOLS.map((t) => t.name);