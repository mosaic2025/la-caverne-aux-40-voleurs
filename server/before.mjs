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
} from "./moe.mjs";
const DEFAULT_PROVIDER = "qwen-cloud";
import { tryRoutes } from "./routes/registry.mjs";
import { handleMaxiRoutes } from "./routes/maxi_builder.mjs";
import { ContractRegistry } from "./maxi/registry.mjs";
import { observe as fusionObserve, voiceHint as fusionVoiceHint } from "./routes/fusion.mjs";

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
      balanceStats: parsed.balanceStats || { requetes: 0, tokensBande: 0, tokensSolo: 0, economiePct: 0, echantillons: 0, ratioEchantillonnage: 5 },
      maxiContracts: Array.isArray(parsed.maxiContracts) ? parsed.maxiContracts : [],
    };
    // Migration : ajoute les clés manquantes si data.json ancien
    let mutated = false;
    for (const k of Object.keys(fresh)) if (!(k in parsed)) { parsed[k] = fresh[k]; mutated = true; }
    if (mutated) fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), "utf8");
    return fresh;
  } catch {
    const fresh = { voleurs: [], genies: [], runs: [], profils: {}, kb: [], kbChunks: [], missions: [], negos: [], debats: [], tournois: [], pipelines: [], etoileJobs: [], unlocked: [], sabres: [], maxiContracts: [], balanceStats: { requetes: 0, tokensBande: 0, tokensSolo: 0, economiePct: 0, echantillons: 0, ratioEchantillonnage: 5 } };
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

// ---------- Validation ----------
const EFFORTS = ["low", "med", "high"];

function validateVoleurInput(b) {
  const errors = [];
  if (!b || typeof b !== "object") return ["Body manquant"];
  if (typeof b.nom !== "string" || !b.nom.trim()) errors.push("nom requis (string non vide)");
  if (typeof b.specialite !== "string" || !b.specialite.trim()) errors.push("specialite requise (string non vide)");
  if (!QWEN_MODELS.includes(b.modele)) errors.push(`modele invalide (attendu: ${QWEN_MODELS.join(", ")})`);
  if (!EFFORTS.includes(b.effort)) errors.push(`effort invalide (attendu: ${EFFORTS.join(", ")})`);
  if (typeof b.systemPrompt !== "string" || !b.systemPrompt.trim()) errors.push("systemPrompt requis");
  if (!Number.isFinite(b.capTokens) || b.capTokens < 32) errors.push("capTokens requis (nombre >= 32)");
  // provider is optional, default to 'qwen-cloud' if not provided or invalid
  if (b.provider !== undefined && typeof b.provider !== "string") {
    errors.push("provider doit être une chaîne de caractères");
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
        save();
        return sendJson(res, 201, voleur);
      }

