// ============================================================
// La Caverne aux 40 Voleurs — Serveur HTTP natif (Node 18+)
// Persistance JSON disque, SSE, CORS ouvert, zéro dépendance.
//   node server/server.mjs   (PORT=8787 par défaut)
// ============================================================

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// Charge server/.env s'il existe (sans dépendance dotenv)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.join(__dirname, ".env");
try {
  const env = fs.readFileSync(ENV_FILE, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch {}

import {
  embedText,
  runMoe,
  runBaseline,
  judgeQuality,
  percentile,
  chatCompletion,
  QWEN_MODELS,
  MODEL_PRICES,
  EMBED_DIM,
  UNCHAINED,
  ensureDinars,
} from "./moe.mjs";
const DEFAULT_PROVIDER = "qwen-cloud";
import { createStore } from "./store.mjs";
import { tryRoutes } from "./routes/registry.mjs";
import { handleMaxiRoutes } from "./routes/maxi_builder.mjs";
import { ContractRegistry } from "./maxi/registry.mjs";
import { observe as fusionObserve, voiceHint as fusionVoiceHint } from "./routes/fusion.mjs";
import { onMoeRunComplete } from "./routes/balance.mjs";

const DATA_FILE = path.join(__dirname, "data.json");
const PORT = Number(process.env.PORT || 8787);

// ---------- Persistance ----------
function loadStore() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const fresh = {
      voleurs: Array.isArray(parsed.voleurs) ? parsed.voleurs : [],
      genies: Array.isArray(parsed.genies) ? parsed.genies : [],
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      profils: typeof parsed.profils === "object" && parsed.profils !== null ? parsed.profils : {},
      kb: Array.isArray(parsed.kb) ? parsed.kb : [],
      kbChunks: Array.isArray(parsed.kbChunks) ? parsed.kbChunks : [],
      missions: Array.isArray(parsed.missions) ? parsed.missions : [],
      negos: Array.isArray(parsed.negos) ? parsed.negos : [],
      debats: Array.isArray(parsed.debats) ? parsed.debats : [],
      tournois: Array.isArray(parsed.tournois) ? parsed.tournois : [],
      pipelines: Array.isArray(parsed.pipelines) ? parsed.pipelines : [],
      etoileJobs: Array.isArray(parsed.etoileJobs) ? parsed.etoileJobs : [],
      unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : [],
      sabres: Array.isArray(parsed.sabres) ? parsed.sabres : [],
      traitorVerdicts: Array.isArray(parsed.traitorVerdicts) ? parsed.traitorVerdicts : [],
      balanceStats: parsed.balanceStats || { requetes: 0, tokensBande: 0, tokensSolo: 0, economiePct: 0, echantillons: 0, ratioEchantillonnage: 5 },
      dinars: Array.isArray(parsed.dinars) ? parsed.dinars : [],
      dinarLedger: Array.isArray(parsed.dinarLedger) ? parsed.dinarLedger : [],
      maxiContracts: Array.isArray(parsed.maxiContracts) ? parsed.maxiContracts : [],
    };
    // Migration : ajoute les clés manquantes si data.json ancien
    let mutated = false;
    for (const k of Object.keys(fresh)) if (!(k in parsed)) { parsed[k] = fresh[k]; mutated = true; }
    if (mutated) fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), "utf8");
    return fresh;
  } catch {
    const fresh = { voleurs: [], genies: [], runs: [], profils: {}, kb: [], kbChunks: [], missions: [], negos: [], debats: [], tournois: [], pipelines: [], etoileJobs: [], unlocked: [], sabres: [], traitorVerdicts: [], maxiContracts: [], dinars: [], dinarLedger: [], balanceStats: { requetes: 0, tokensBande: 0, tokensSolo: 0, economiePct: 0, echantillons: 0, ratioEchantillonnage: 5 } };
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(fresh, null, 2), "utf8");
    return fresh;
  }
}

const store = loadStore();
const maxiRegistry = new ContractRegistry(store.maxiContracts);

let saveTimer = null;
function save() {
  // Écriture atomique (tmp + rename) légèrement différée pour regrouper les mutations
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
    fs.renameSync(tmp, DATA_FILE);
  }, 50);
}

// ---------- Helpers HTTP ----------
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error("Body trop volumineux (>1MB)"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("JSON invalide"));
      }
    });
    req.on("error", reject);
  });
}

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

// ---------- Ollama live model list (cache 60s) ----------
// Catalogue ollama CLOUD (modèles :cloud = calcul cloud via la passerelle localhost).
// /api/tags ne liste QUE les modèles pull en local — les :cloud sont des pointeurs,
// donc on expose le catalogue officiel (ollama.com/search?c=cloud, 18 modèles).
const OLLAMA_CLOUD = [
  "deepseek-v4-pro:cloud", "deepseek-v4-flash:cloud",
  "glm-5.2:cloud", "glm-5.1:cloud",
  "kimi-k2.7-code:cloud", "kimi-k2.6:cloud", "kimi-k2.5:cloud",
  "nemotron-3-ultra:cloud", "nemotron-3-super:cloud", "nemotron-3-nano:30b:cloud",
  "minimax-m3:cloud", "minimax-m2.7:cloud", "minimax-m2.5:cloud",
  "gemma4:31b:cloud", "qwen3.5:122b:cloud", "qwen3.5:35b:cloud",
  "gpt-oss:120b:cloud", "gpt-oss:20b:cloud",
  "gemini-3-flash-preview:cloud", "mistral-large-3:cloud",
];
let _ollamaCache = null; // { list, ts }
async function listOllamaModels() {
  const now = Date.now();
  if (_ollamaCache && now - _ollamaCache.ts < 60_000) return _ollamaCache.list;
  const base = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
  let local = [];
  try {
    const r = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const j = await r.json();
      local = (j.models || []).map((m) => m.name || m.model).filter(Boolean);
    }
  } catch { /* passerelle down ou vide — on garde le catalogue cloud */ }
  // Catalogue cloud d'abord, puis modèles locaux éventuels (dedup)
  const uniq = [...new Set([...OLLAMA_CLOUD, ...local])];
  _ollamaCache = { list: uniq, ts: now };
  return _ollamaCache.list;
}

// ---------- Validation ----------
const EFFORTS = ["low", "med", "high"];

function validateVoleurInput(b) {
  const errors = [];
  if (!b || typeof b !== "object") return ["Body manquant"];
  if (typeof b.nom !== "string" || !b.nom.trim()) errors.push("nom requis (string non vide)");
  if (typeof b.specialite !== "string" || !b.specialite.trim()) errors.push("specialite requise (string non vide)");
  // Qwen Cloud / Alibaba utilisent les modèles Qwen ; Ollama accepte n'importe quel modèle local.
  const isOllama = b.provider === "ollama";
  if (!isOllama && !QWEN_MODELS.includes(b.modele)) {
    errors.push(`modele invalide (attendu: ${QWEN_MODELS.join(", ")})`);
  } else if (isOllama && (typeof b.modele !== "string" || !b.modele.trim())) {
    errors.push("modele requis (string non vide)");
  }
  if (!EFFORTS.includes(b.effort)) errors.push(`effort invalide (attendu: ${EFFORTS.join(", ")})`);
  if (typeof b.systemPrompt !== "string" || !b.systemPrompt.trim()) errors.push("systemPrompt requis");
  if (!Number.isFinite(b.capTokens) || b.capTokens < 32) errors.push("capTokens requis (nombre >= 32)");
  // provider is optional, default to 'qwen-cloud' if not provided or invalid
  if (b.provider !== undefined && typeof b.provider !== "string") {
    errors.push("provider doit être une chaîne de caractères");
  }
  // specialisation (groupe MoE emboîté) — optionnel, string non vide si présent
  if (b.specialisation !== undefined && (typeof b.specialisation !== "string" || !b.specialisation.trim())) {
    errors.push("specialisation doit être une chaîne non vide si fournie");
  }
  // orchestrateur — optionnel, booléen si présent
  if (b.orchestrateur !== undefined && typeof b.orchestrateur !== "boolean") {
    errors.push("orchestrateur doit être un booléen");
  }
  return errors;
}

function validateGenieInput(b, store) {
  const errors = [];
  if (!b || typeof b !== "object") return ["Body manquant"];
  if (typeof b.nom !== "string" || !b.nom.trim()) errors.push("nom requis");
  if (!Array.isArray(b.voleursIds) || b.voleursIds.length === 0) {
    errors.push("voleursIds requis (tableau non vide)");
  } else {
    for (const id of b.voleursIds) {
      if (!store.voleurs.some((v) => v.id === id)) errors.push(`Voleur inconnu: ${id}`);
    }
  }
  if (typeof b.voiceCharter !== "string" || !b.voiceCharter.trim()) errors.push("voiceCharter requise");
  if (!Number.isFinite(b.budgetTotal) || b.budgetTotal < 100) errors.push("budgetTotal requis (nombre >= 100)");
  return errors;
}

// ---------- Questions de benchmark (série fixe, mesures réelles) ----------
const BENCH_QUESTIONS = [
  "Explique la différence entre concurrence et parallélisme, avec un exemple concret en Node.js.",
  "Quels sont les compromis entre une base SQL et une base documentaire pour un carnet de commandes e-commerce ?",
  "Rédige un plan en 5 points pour migrer une API monolithique vers des services indépendants sans interruption.",
];

// ---------- Contexte partagé pour les routes modulaires (T01) ----------
const ROUTE_CTX = {
  get store() { return store; },
  save,
  helpers: { sendJson, sendError, readBody, newId },
  moe: { chatCompletion, embedText, runMoe, runBaseline, judgeQuality, percentile, QWEN_MODELS, MODEL_PRICES },
  maxi: { registry: maxiRegistry },
  defaultProvider: DEFAULT_PROVIDER,
};

// ---------- Routeur ----------
const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "voleurs", ":id?"]

  try {
    if (await handleMaxiRoutes(req, res, url, parts, ROUTE_CTX)) return;

    // Routes modulaires (T01) — prioritaires ; stubs 501 en dernier recours.
    if (await tryRoutes(req, res, url, parts, ROUTE_CTX)) return;

    // GET /api/health
    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true });
    }

    // GET /api/providers — liste providers + modèles disponibles (pour l'UI)
    if (req.method === "GET" && url.pathname === "/api/providers") {
      const ollamaModels = await listOllamaModels();
      const PROVIDER_MODELS = {
        "qwen-cloud": QWEN_MODELS,
        "alibaba": QWEN_MODELS,
        "ollama": ollamaModels,
      };
      return sendJson(res, 200, {
        providers: ["qwen-cloud", "alibaba", "ollama"],
        models: PROVIDER_MODELS,
        default: DEFAULT_PROVIDER,
      });
    }

    // ----- VOLEURS -----
    if (parts[0] === "api" && parts[1] === "voleurs") {
      // GET /api/voleurs
      if (req.method === "GET" && parts.length === 2) {
        return sendJson(res, 200, store.voleurs);
      }

      // POST /api/voleurs
      if (req.method === "POST" && parts.length === 2) {
        const body = await readBody(req);
        const errors = validateVoleurInput(body);
        if (errors.length) return sendError(res, 400, errors.join(" ; "));

        const provider = body.provider || DEFAULT_PROVIDER;
        const { embedding } = await embedText(body.specialite, provider);
        const voleur = {
          id: newId("vol"),
          nom: body.nom.trim(),
          specialite: body.specialite.trim(),
          modele: body.modele,
          effort: body.effort,
          systemPrompt: body.systemPrompt,
          capTokens: Math.floor(body.capTokens),
          embedding,
          actif: true,
          tokensUtilises: 0,
          perf: typeof body.perf === "number" ? Math.max(0, Math.min(1, body.perf)) : 0.5,
          provider,
        };
        store.voleurs.push(voleur);
        ensureDinars(store, voleur.id); // allocation initiale de dinars
        save();
        return sendJson(res, 201, voleur);
      }

      // PATCH /api/voleurs/:id
      if (req.method === "PATCH" && parts.length === 3) {
        const voleur = store.voleurs.find((v) => v.id === parts[2]);
        if (!voleur) return sendError(res, 404, "Voleur introuvable");
        const patch = await readBody(req);
        let needRecompute = false;

        if (patch.nom !== undefined) {
          if (typeof patch.nom !== "string" || !patch.nom.trim()) return sendError(res, 400, "nom invalide");
          voleur.nom = patch.nom.trim();
        }
        if (patch.modele !== undefined) {
          const isOllama = (patch.provider ?? voleur.provider) === "ollama";
          if (!isOllama && !QWEN_MODELS.includes(patch.modele)) return sendError(res, 400, "modele invalide");
          voleur.modele = patch.modele;
        }
        if (patch.effort !== undefined) {
          if (!EFFORTS.includes(patch.effort)) return sendError(res, 400, "effort invalide");
          voleur.effort = patch.effort;
        }
        if (patch.systemPrompt !== undefined) {
          if (typeof patch.systemPrompt !== "string") return sendError(res, 400, "systemPrompt invalide");
          voleur.systemPrompt = patch.systemPrompt;
        }
        if (patch.provider !== undefined) {
          // Validate provider? For now accept any string.
          voleur.provider = patch.provider;
          needRecompute = true;
        }
        if (patch.capTokens !== undefined) {
          if (!Number.isFinite(patch.capTokens) || patch.capTokens < 32) return sendError(res, 400, "capTokens invalide");
          voleur.capTokens = Math.floor(patch.capTokens);
        }
        if (patch.actif !== undefined) {
          voleur.actif = Boolean(patch.actif);
        }
        if (patch.perf !== undefined) {
          if (!Number.isFinite(patch.perf)) return sendError(res, 400, "perf invalide");
          voleur.perf = Math.max(0, Math.min(1, patch.perf));
        }
        if (patch.specialite !== undefined) {
          if (typeof patch.specialite !== "string" || !patch.specialite.trim()) {
            return sendError(res, 400, "specialite invalide");
          }
          voleur.specialite = patch.specialite.trim();
          needRecompute = true;
        }
        if (needRecompute) {
          // Recalcul embedding réel (la spécialité pilote le routing) using the voleur's current provider
          const { embedding } = await embedText(voleur.specialite, voleur.provider);
          voleur.embedding = embedding;
        }
        save();
        return sendJson(res, 200, voleur);
      }

      // DELETE /api/voleurs/:id
      if (req.method === "DELETE" && parts.length === 3) {
        const idx = store.voleurs.findIndex((v) => v.id === parts[2]);
        if (idx === -1) return sendError(res, 404, "Voleur introuvable");
        const id = store.voleurs[idx].id;
        store.voleurs.splice(idx, 1);
        // Retire la référence dans les génies
        for (const g of store.genies) {
          g.voleursIds = g.voleursIds.filter((vid) => vid !== id);
        }
        save();
        res.writeHead(204);
        res.end();
        return;
      }
    }

    // ----- GENIES -----
    if (parts[0] === "api" && parts[1] === "genies") {
      if (req.method === "GET" && parts.length === 2) {
        return sendJson(res, 200, store.genies);
      }
      // DELETE /api/genies/:id — supprime le Génie (et exiler ses voleurs si ?cascade=1)
      if (req.method === "DELETE" && parts.length === 3) {
        const idx = store.genies.findIndex((g) => g.id === parts[2]);
        if (idx === -1) return sendError(res, 404, "Génie introuvable");
        const g = store.genies[idx];
        const cascade = url.searchParams.get("cascade") === "1";
        if (cascade) {
          for (const vid of g.voleursIds || []) {
            const vi = store.voleurs.findIndex((v) => v.id === vid);
            if (vi !== -1) store.voleurs.splice(vi, 1);
          }
        }
        store.genies.splice(idx, 1);
        save();
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method === "POST" && parts.length === 2) {
        const body = await readBody(req);
        const errors = validateGenieInput(body, store);
        if (errors.length) return sendError(res, 400, errors.join(" ; "));
        // Determine provider from the first voleur (if any) else default
        let provider = DEFAULT_PROVIDER;
        if (Array.isArray(body.voleursIds) && body.voleursIds.length > 0) {
          const firstVoleur = store.voleurs.find(v => v.id === body.voleursIds[0]);
          if (firstVoleur) {
            provider = firstVoleur.provider;
          }
        }
        const genie = {
          id: newId("gen"),
          nom: body.nom.trim(),
          voleursIds: [...body.voleursIds],
          voiceCharter: body.voiceCharter,
          budgetTotal: Math.floor(body.budgetTotal),
          reliquat: Math.floor(body.budgetTotal),
          provider,
        };
        store.genies.push(genie);
        save();
        return sendJson(res, 201, genie);
      }

      // POST /api/genies/forge-chat — parse une description NL en structure de forge (via qwen-turbo)
      if (req.method === "POST" && parts.length === 3 && parts[2] === "forge-chat") {
        const body = await readBody(req);
        const description = String(body?.description || "").trim();
        if (!description) return sendError(res, 400, "description requise");
        const SYS = `${UNCHAINED}Tu es un ingénieur MoE. À partir de la description utilisateur, tu produis un JSON STRICT décrivant un Génie (MoE emboîté par spécialisations). Schéma :
{"nom": string, "voiceCharter": string, "budgetTotal": number, "k": number (1-4), "dominance": number (0.01-0.2), "parSpecialisation": boolean, "routingStrategy": "auto"|"mono"|"topk"|"specialisation"|"bazaar"|"cost"|"perf", "ml": boolean, "embeddingModel": string (ex: "text-embedding-v3" ou "nomic-embed-text"),
 "models": [{"nom": string, "specialite": string, "specialisation": string (groupe), "modele": string, "effort": "low"|"med"|"high", "systemPrompt": string, "capTokens": number, "provider": "qwen-cloud"|"alibaba"|"ollama"}],
 "orchestrateur": {"modele": string, "provider": string, "effort": "low"|"med"|"high", "systemPrompt": string, "capTokens": number} | null}
Règles : 2 à 6 experts regroupés en 1-3 spécialisations. Modeles qwen-cloud: qwen-turbo, qwen-plus, qwen-max, qwen-coder-plus, qwen-vl-plus. Pour orchestrateur préfère qwen-max. Réponds UNIQUEMENT avec le JSON, aucun texte autour.`;
        let parsed = null;
        try {
          const r = await chatCompletion({
            model: "qwen-turbo",
            temperature: 0.3,
            maxTokens: 1200,
            messages: [
              { role: "system", content: SYS },
              { role: "user", content: description },
            ],
          }, DEFAULT_PROVIDER);
          const m = r.text.match(/\{[\s\S]*\}/);
          if (m) parsed = JSON.parse(m[0]);
        } catch (e) {
          // fallback : parsing local minimal
        }
        if (!parsed || !Array.isArray(parsed.models) || !parsed.models.length) {
          // Fallback local regex/keywords
          const d = description.toLowerCase();
          const models = [];
          if (/code|dev|programm/.test(d)) models.push({ nom: "Codeur", specialite: "programmation, code, architecture", specialisation: "technique", modele: "qwen-coder-plus", effort: "med", systemPrompt: "Tu es un développeur expert. Code propre, typé, explications courtes.", capTokens: 400, provider: "qwen-cloud" });
          if (/strat|plan|décis|priorit/.test(d)) models.push({ nom: "Stratège", specialite: "stratégie, planification, priorisation", specialisation: "stratégie", modele: "qwen-turbo", effort: "med", systemPrompt: "Tu es un stratège pragmatique. Plans d'action clairs et priorisés.", capTokens: 300, provider: "qwen-cloud" });
          if (/rédac|doc|text|écrit|article/.test(d)) models.push({ nom: "Rédacteur", specialite: "rédaction, documentation, communication", specialisation: "communication", modele: "qwen-turbo", effort: "low", systemPrompt: "Tu es un rédacteur concis. Reformule et synthétise avec clarté.", capTokens: 200, provider: "qwen-cloud" });
          if (/analys|data|chiffre|stat/.test(d)) models.push({ nom: "Analyste", specialite: "analyse de données, statistiques, métriques", specialisation: "technique", modele: "qwen-plus", effort: "med", systemPrompt: "Tu es un analyste rigoureux. Interprète les données avec précision.", capTokens: 350, provider: "qwen-cloud" });
          if (!models.length) models.push({ nom: "Généraliste", specialite: "réponse générale, synthèse", specialisation: "général", modele: "qwen-plus", effort: "med", systemPrompt: "Tu réponds de façon claire et complète.", capTokens: 400, provider: "qwen-cloud" });
          parsed = {
            nom: (description.slice(0, 30) || "Génie forgé").trim(),
            voiceCharter: "Une seule voix, claire, directe, en français. Ne révèle jamais les experts internes.",
            budgetTotal: 50000,
            k: Math.min(3, models.length),
            dominance: 0.05,
            parSpecialisation: true,
            models,
            orchestrateur: /orchestr|synth|fusion|maestro|chef/.test(d)
              ? { modele: "qwen-max", provider: "qwen-cloud", effort: "med", systemPrompt: "Tu es l'orchestrateur. Fusionne les fragments en une réponse unifiée, fluide, sans révéler les experts.", capTokens: 800 }
              : null,
          };
        }
        return sendJson(res, 200, parsed);
      }

      // POST /api/genies/forge — crée N modèles (voleurs) + le Génie en un appel
      if (req.method === "POST" && parts.length === 3 && parts[2] === "forge") {
        const body = await readBody(req);
        const models = Array.isArray(body.models) ? body.models : [];
        if (typeof body.nom !== "string" || !body.nom.trim()) return sendError(res, 400, "nom du Génie requis");
        if (!models.length) return sendError(res, 400, "au moins un modèle requis");
        const created = [];
        let provider = null;
        // Allocation initiale de dinars pour chaque nouveau voleur
        store.dinars ||= [];
        for (const m of models) {
          const specialite = String(m.specialite || m.nom || "").trim();
          const input = {
            nom: m.nom, specialite, modele: m.modele,
            effort: m.effort || "med", systemPrompt: m.systemPrompt || "",
            capTokens: m.capTokens || 400,
            provider: m.provider,
            specialisation: m.specialisation,
          };
          const errs = validateVoleurInput(input);
          if (errs.length) return sendError(res, 400, `modèle "${m.nom}": ${errs.join(", ")}`);
          const providerForModel = input.provider || DEFAULT_PROVIDER;
          const { embedding } = await embedText(specialite, providerForModel);
          const voleur = {
            id: newId("vol"), nom: input.nom.trim(), specialite, modele: input.modele,
            effort: input.effort, systemPrompt: input.systemPrompt, capTokens: Math.floor(input.capTokens),
            embedding, actif: true, tokensUtilises: 0, perf: 0.5,
            provider: providerForModel,
            specialisation: typeof input.specialisation === "string" && input.specialisation.trim() ? input.specialisation.trim() : undefined,
          };
          store.voleurs.push(voleur);
          created.push(voleur);
          ensureDinars(store, voleur.id); // allocation initiale de dinars
          // Track provider consistency
          if (provider === null) {
            provider = providerForModel;
          } else if (provider !== providerForModel) {
            return sendError(res, 400, `Tous les modèles doivent utiliser le même fournisseur. Modèle "${m.nom}" utilise "${providerForModel}" alors que les précédents utilisent "${provider}".`);
          }
        }
        // Orchestrateur optionnel : un voleur marqué orchestrateur, exclu du routage, utilisé pour la fusion
        let orchestrateurId = undefined;
        if (body.orchestrateur && typeof body.orchestrateur === "object" && body.orchestrateur.modele) {
          const o = body.orchestrateur;
          const oInput = {
            nom: "Orchestrateur",
            specialite: "Orchestrateur (fusion des fragments d'experts)",
            modele: o.modele,
            effort: o.effort || "med",
            systemPrompt: o.systemPrompt || "Tu es l'orchestrateur. Fusionne les fragments en une réponse unifiée.",
            capTokens: o.capTokens || 800,
            provider: o.provider || provider || DEFAULT_PROVIDER,
            orchestrateur: true,
          };
          const oErrs = validateVoleurInput(oInput);
          if (oErrs.length) return sendError(res, 400, `orchestrateur: ${oErrs.join(", ")}`);
          const oProvider = oInput.provider;
          if (provider !== null && oProvider !== provider) {
            return sendError(res, 400, `L'orchestrateur doit utiliser le même fournisseur (${provider}). Reçu: ${oProvider}.`);
          }
          if (provider === null) provider = oProvider;
          // Embedding factice (dim correcte) — l'orchestrateur n'est jamais routé, pas besoin d'embedding réel
          const fakeEmb = new Array(EMBED_DIM).fill(0);
          const orch = {
            id: newId("vol"), nom: oInput.nom, specialite: oInput.specialite, modele: oInput.modele,
            effort: oInput.effort, systemPrompt: oInput.systemPrompt, capTokens: Math.floor(oInput.capTokens),
            embedding: fakeEmb, actif: true, tokensUtilises: 0, perf: 0.5,
            provider: oProvider, orchestrateur: true,
          };
          store.voleurs.push(orch);
          created.push(orch);
          orchestrateurId = orch.id;
        }
        const budget = Math.floor(Number(body.budgetTotal) > 0 ? body.budgetTotal : 100000);
        const genie = {
          id: newId("gen"), nom: body.nom.trim(), voleursIds: created.map((v) => v.id),
          voiceCharter: typeof body.voiceCharter === "string" && body.voiceCharter.trim()
            ? body.voiceCharter : "Une seule voix, claire, directe, en français. Ne révèle jamais les experts internes.",
          budgetTotal: budget, reliquat: budget,
          k: Number.isFinite(body.k) ? Math.max(1, Math.floor(body.k)) : undefined,
          dominance: Number.isFinite(body.dominance) ? body.dominance : undefined,
          ml: body.ml !== false,
          parSpecialisation: body.parSpecialisation === true,
          routingStrategy: typeof body.routingStrategy === "string" && body.routingStrategy.trim() ? body.routingStrategy : "auto",
          embeddingModel: typeof body.embeddingModel === "string" && body.embeddingModel.trim() ? body.embeddingModel : "text-embedding-v3",
          orchestrateurId,
          provider, // Store the common provider in the genie
        };
        store.genies.push(genie);
        save();
        return sendJson(res, 201, { genie, voleurs: created });
      }
    }

    // ----- ASSISTANT CONTEXTUEL (chat repliable par onglet) -----
    if (req.method === "POST" && url.pathname === "/api/assistant") {
      const body = await readBody(req);
      const { tab, message, history, provider, model } = body;
      if (typeof message !== "string" || !message.trim()) return sendError(res, 400, "message requis");
      const selectedProvider = provider || DEFAULT_PROVIDER;
      const selectedModel = model || "qwen-turbo";
      // Validate model (for now only Qwen models are supported in assistant)
      if (!QWEN_MODELS.includes(selectedModel)) {
        return sendError(res, 400, `Modèle non supporté: ${selectedModel}. Modèles disponibles: ${QWEN_MODELS.join(", ")}`);
      }
      const HELP = {
        "Le Camp": "créer des Voleurs (experts Qwen) : nom, spécialité (pilote le routage par embedding), modèle Qwen, effort, prompt système.",
        "Le Repaire": "superviser le chef, le roster des Voleurs, la consommation de tokens en temps réel et le budget restant.",
        "Le Génie": "forger un Génie (assemblage de modèles Qwen fusionnés en une voix unique) et dialoguer avec lui.",
        "Le Conseil de Guerre": "faire s'affronter deux Voleurs sur une question, avec un juge impartial.",
        "Les Trésors": "mesurer le gain de la Caverne vs un agent unique (qualité, latence, coût, tokens).",
      };
      const ctx = HELP[tab] || "l'application La Caverne aux 40 Voleurs.";
      const messages = [
        { role: "system", content: `Tu es l'assistant de l'onglet « ${tab || "?"} ». Cet onglet sert à : ${ctx} Réponds bref, concret, en français, orienté action. N'invente pas de fonctions inexistantes.` },
        ...(Array.isArray(history) ? history.slice(-6).filter((h) => h && typeof h.content === "string") : []),
        { role: "user", content: String(message) },
      ];
      try {
        const r = await chatCompletion({ model: selectedModel, messages, maxTokens: 400, temperature: 0.5 }, selectedProvider);
        return sendJson(res, 200, { text: r.text, tokens: r.totalTokens });
      } catch (err) {
        return sendError(res, 500, String(err.message || err));
      }
    }

    // ----- CONSEIL DE GUERRE (duel : 2 voleurs, 1 juge) -----
    if (req.method === "POST" && url.pathname === "/api/conseil/duel") {
      const body = await readBody(req);
      const { voleurAId, voleurBId, query, judgeProvider, judgeModel } = body;
      if (!query || !String(query).trim()) return sendError(res, 400, "query requise");
      const A = store.voleurs.find((v) => v.id === voleurAId);
      const B = store.voleurs.find((v) => v.id === voleurBId);
      if (!A || !B) return sendError(res, 404, "Voleur(s) introuvable(s)");
      const gen = (v) => chatCompletion({
        model: v.modele,
        messages: [
          { role: "system", content: v.systemPrompt || `Tu es ${v.nom}, ${v.specialite}.` },
          { role: "user", content: String(query) },
        ],
        maxTokens: v.capTokens || 400,
        temperature: 0.6,
      }, v.provider); // Use voleur's provider
      try {
        const [ra, rb] = await Promise.all([gen(A), gen(B)]);
        const judgePrompt = `Question:\n${query}\n\nRéponse A (${A.nom}):\n${ra.text}\n\nRéponse B (${B.nom}):\n${rb.text}\n\nTu es juge impartial. Note A et B sur 30 (adéquation, fondement, clarté). Réponds STRICTEMENT en JSON: {"scoreA":n,"scoreB":n,"winner":"A"|"B","rationale":"court"}`;
        const jr = await chatCompletion({ model: judgeModel || "qwen-max", messages: [{ role: "user", content: judgePrompt }], maxTokens: 300, temperature: 0.1 }, judgeProvider || DEFAULT_PROVIDER);
        let verdict;
        try { verdict = JSON.parse(jr.text.match(/\{[\s\S]*\}/)?.[0] ?? "{}"); } catch { verdict = { rationale: jr.text }; }
        return sendJson(res, 200, {
          a: { voleurId: A.id, nom: A.nom, text: ra.text, tokens: ra.totalTokens },
          b: { voleurId: B.id, nom: B.nom, text: rb.text, tokens: rb.totalTokens },
          verdict,
        });
      } catch (err) {
        return sendError(res, 500, String(err.message || err));
      }
    }

    // ----- ASK (SSE) -----
    if (req.method === "POST" && url.pathname === "/api/ask") {
      const body = await readBody(req);
      const { genieId, query, k } = body;
      const userId = String(body.userId || "chef");
      if (typeof genieId !== "string" || typeof query !== "string" || !query.trim()) {
        return sendError(res, 400, "genieId et query requis");
      }
      const genie = store.genies.find((g) => g.id === genieId);
      if (!genie) return sendError(res, 404, "Génie introuvable");

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });

      const sse = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const keepAlive = setInterval(() => {
        try { res.write(": keep-alive\n\n"); } catch { /* connexion fermée */ }
      }, 15000);

      try {
        // Fusion utilisateur : le Génie adapte sa voix au style appris du chef + à Nour.
        const { CompanionAgent, evolveCompanion } = await import("./agents/companion.mjs");
        const avatarData = store.avatars?.[userId];
        const avatarHint = avatarData ? CompanionAgent.deserialize(avatarData).buildVoiceHint(store.profils?.[userId]) : "";
        const fusionHint = fusionVoiceHint(store, userId);
        const hint = [fusionHint, avatarHint].filter(Boolean).join("\n");
        const genieForRun = hint ? { ...genie, voiceCharter: genie.voiceCharter + "\n" + hint } : genie;
        const { run } = await runMoe({
          genie: genieForRun,
          voleurs: store.voleurs,
          query: query.trim(),
          k: Number.isFinite(k) && k >= 1 ? Math.floor(k) : 3,
          onEvent: (type, data) => {
            if (type !== "final") sse(type, data);
          },
          bazaarCtx: { store, save },
        });
        store.runs.push(run);
        // Borne l'historique persisté
        if (store.runs.length > 500) store.runs = store.runs.slice(-500);
        fusionObserve(store, userId, query.trim(), run.answer); // apprentissage du style
        onMoeRunComplete(run, { store, save }); // Balance du Marchand : coût bande vs estimation solo
        // ── Évolution de La Lampe (compagnon avatar) ──
        try {
          const p = store.profils?.[userId];
          evolveCompanion(store, userId, {
            userMsg: query.trim(),
            genieAnswer: run.answer,
            fusionPct: p?.fusionPct || 0,
            name: "Nour",
          });
        } catch (e) { console.warn("[lampe] évolution ignorée:", e.message); }
        save();
        sse("final", run);
      } catch (err) {
        sse("error", { error: String(err.message || err) });
        save(); // les perfs/tokens peuvent avoir bougé même en erreur
      } finally {
        clearInterval(keepAlive);
        res.end();
      }
      return;
    }

    // ----- BENCHMARK -----
    if (req.method === "POST" && url.pathname === "/api/benchmark") {
      const body = await readBody(req);
      const { genieId, baseline, baselineProvider, questions, repeats } = body;
      if (typeof genieId !== "string") return sendError(res, 400, "genieId requis");
      if (typeof baseline !== "string" || !baseline.trim()) return sendError(res, 400, "baseline (modèle) requis");
      const provider = baselineProvider || DEFAULT_PROVIDER;
      const genie = store.genies.find((g) => g.id === genieId);
      if (!genie) return sendError(res, 404, "Génie introuvable");

      const questionList = Array.isArray(questions) && questions.length > 0 ? questions : BENCH_QUESTIONS;
      const repeatN = Math.max(1, Math.min(10, Math.floor(Number(repeats) || 1)));

      const baseLatencies = [];
      const cavLatencies = [];
      let baseTokens = 0, cavTokens = 0;
      let baseCost = 0, cavCost = 0;
      let baseQuality = 0, cavQuality = 0;
      let judged = 0;
      const rounds = [];

      for (const q of questionList) {
        for (let rep = 0; rep < repeatN; rep++) {
        // Baseline (agent unique)
        const b = await runBaseline({ model: baseline, query: q, maxTokens: 1024, providerName: provider });
        baseLatencies.push(b.latencyMs);
        baseTokens += b.tokens;
        baseCost += b.cost;

        // Caverne (MoE réel — même série de questions)
        const t0 = Date.now();
        const { run, cost } = await runMoe({
          genie,
          voleurs: store.voleurs,
          query: q,
          k: 3,
          onEvent: () => {},
        });
        const cavLat = Date.now() - t0;
        cavLatencies.push(cavLat);
        cavTokens += run.tokens.total;
        cavCost += cost;
        store.runs.push(run);
        if (store.runs.length > 500) store.runs = store.runs.slice(-500);

        // Juge qualité — double juge (qwen-max + qwen-plus) pairwise A/B randomisé
        const j = await judgeQuality({
          query: q,
          baselineAnswer: b.text,
          caverneAnswer: run.answer,
        });
        baseQuality += j.baseline;
        cavQuality += j.caverne;
        judged++;
        rounds.push({
          query: q,
          baselineText: b.text,
          caverneText: run.answer,
          baseLatency: b.latencyMs,
          cavLatency: cavLat,
          baseTokens: b.tokens,
          cavTokens: run.tokens.total,
          baseScore: j.baseline,
          cavScore: j.caverne,
          criteria: j.criteria || null,
          judges: j.judges || null,
          positionSwap: !!j.positionSwap,
          rep,
          winner: j.winner || (j.caverne > j.baseline ? "caverne" : (j.baseline > j.caverne ? "baseline" : "tie")),
        });
        }
      }
      save();

      baseQuality = judged ? baseQuality / judged : 0;
      cavQuality = judged ? cavQuality / judged : 0;

      const baseP95 = percentile(baseLatencies, 95);
      const cavP95 = percentile(cavLatencies, 95);
      const baseAvgLatency = baseLatencies.length ? (baseLatencies.reduce((a, b) => a + b, 0) / baseLatencies.length) : 0;
      const cavgAvgLatency = cavLatencies.length ? (cavLatencies.reduce((a, b) => a + b, 0) / cavLatencies.length) : 0;
      const baseCostPer1k = baseTokens > 0 ? (baseCost / baseTokens) * 1000 : 0;
      const cavCostPer1k = cavTokens > 0 ? (cavCost / cavTokens) * 1000 : 0;
      const baseAvgTokens = baseTokens / questionList.length;
      const cavgAvgTokens = cavTokens / questionList.length;

      const gain = (b, c, lowerIsBetter) => {
        if (b === 0) return 0;
        const pct = lowerIsBetter ? ((b - c) / b) * 100 : ((c - b) / b) * 100;
        return Number(pct.toFixed(2));
      };

      const result = {
        baselineModel: baseline,
        baselineProvider: provider,
        rounds,
        metrics: [
          {
            label: "qualité",
            baseline: Number(baseQuality.toFixed(2)),
            caverne: Number(cavQuality.toFixed(2)),
            gainPct: gain(baseQuality, cavQuality, false),
          },
          {
            label: "latence p95",
            baseline: baseP95,
            caverne: cavP95,
            gainPct: gain(baseP95, cavP95, true),
          },
          {
            label: "latence moyenne",
            baseline: Number(baseAvgLatency.toFixed(2)),
            caverne: Number(cavgAvgLatency.toFixed(2)),
            gainPct: gain(baseAvgLatency, cavgAvgLatency, true),
          },
          {
            label: "coût/1k",
            baseline: Number(baseCostPer1k.toFixed(6)),
            caverne: Number(cavCostPer1k.toFixed(6)),
            gainPct: gain(baseCostPer1k, cavCostPer1k, true),
          },
          {
            label: "tokens",
            baseline: baseTokens,
            caverne: cavTokens,
            gainPct: gain(baseTokens, cavTokens, true),
          },
          {
            label: "tokens/moyenne",
            baseline: Number(baseAvgTokens.toFixed(2)),
            caverne: Number(cavgAvgTokens.toFixed(2)),
            gainPct: gain(baseAvgTokens, cavgAvgTokens, true),
          },
        ],
        ts: Date.now(),
      };

      return sendJson(res, 200, result);
    }

    // ----- RUNS (lecture pour Le Repaire / Les Trésors) -----
    if (req.method === "GET" && url.pathname === "/api/runs") {
      return sendJson(res, 200, store.runs);
    }

    return sendError(res, 404, `Route inconnue: ${req.method} ${url.pathname}`);
  } catch (err) {
    if (!res.headersSent) {
      return sendError(res, 500, String(err.message || err));
    }
    try { res.end(); } catch { /* déjà fermé */ }
  }
});

server.listen(PORT, () => {
  console.log(`🏔️  La Caverne aux 40 Voleurs — backend prêt sur http://localhost:${PORT}`);
  console.log(`    Données : ${DATA_FILE}`);
  console.log(`    Clé DashScope : ${process.env.DASHSCOPE_API_KEY ? "présente" : "⚠️  MANQUANTE (export DASHSCOPE_API_KEY=...)"}`);
});

process.on("SIGINT", () => {
  console.log("\nArrêt — sauvegarde finale…");
  try {
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) {
    console.error("Échec sauvegarde finale:", e.message);
  }
  process.exit(0);
});
