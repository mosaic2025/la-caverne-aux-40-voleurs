import crypto from "node:crypto";
import { createContractManifest, createExpert, createSubMoe } from "./manifest.mjs";
import { ContractRegistry } from "./registry.mjs";
import { validateContract } from "./validate.mjs";

const EMBEDDING_MODEL = "text-embedding-v3";
const SPECIALTIES = [
  ["strategie", "Stratégie", ["priorisation", "impact", "produit"]],
  ["recherche", "Recherche et veille", ["research", "veille", "synthese"]],
  ["architecture", "Architecture systèmes", ["architecture", "apis", "scalabilite"]],
  ["code", "Code et refactor", ["coding", "review", "debug"]],
  ["donnees", "Données et RAG", ["rag", "embeddings", "data"]],
  ["evaluation", "Évaluation et qualité", ["evals", "tests", "benchmark"]],
  ["securite", "Sécurité et garde-fous", ["security", "risques", "guardrails"]],
  ["experience", "UX et interaction", ["ux", "conversation", "workflow"]],
  ["synthese", "Orchestration et synthèse", ["routing", "synthesis", "decision"]],
];

function slug(value) {
  return String(value || "maxi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "maxi";
}
function requestedCount(prompt, current) {
  const match = String(prompt).match(/(\d+)\s*(moe|experts)/i);
  let count = match ? Number(match[1]) : 0;
  if (!count && current && Array.isArray(current.subMoes)) count = current.subMoes.length;
  return Math.min(40, Math.max(1, count || 9));
}
function modelFor(index, capabilities) {
  const joined = capabilities.join(" ");
  if (joined.includes("code") || joined.includes("debug")) return "qwen-coder-plus";
  if (index % 5 === 0) return "qwen-max";
  return "qwen-plus";
}
function makeExpert(id, name, category, capabilities, index, provider, model) {
  let expertModel = model;
  if (provider === "qwen-cloud") {
    // For Qwen cloud, use the modelFor function to select appropriate model based on index/capabilities
    expertModel = modelFor(index, capabilities);
  } else {
    // For Ollama, use the provided model or default to the first available
    if (!expertModel || expertModel === "qwen-plus") {
      expertModel = "llama2"; // Default Ollama model
    }
  }
  return createExpert({
    id: id + "-expert", name, description: "Expert " + (provider === "qwen-cloud" ? "Qwen Cloud" : "Ollama") + " en " + name.toLowerCase(),
    category, lobe: category, provider, model: expertModel, capabilities,
    routingPolicy: { semanticWeight: 0.65, qualityWeight: 0.25, costWeight: 0.1 },
    cascadeConfig: { enabled: true, fallbackModel: provider === "qwen-cloud" ? "qwen-plus" : model, maxAttempts: 2 },
    cacheConfig: { enabled: true, ttlSeconds: 900, semanticThreshold: 0.92 },
  });
}
function makeSubMoe(index, specialty, provider, model) {
  const item = specialty || SPECIALTIES[index % SPECIALTIES.length];
  const key = item[0], name = item[1], capabilities = item[2];
  return createSubMoe({
    id: "submoe-" + String(index + 1).padStart(2, "0") + "-" + key,
    name: name + " — " + (provider === "qwen-cloud" ? "Qwen" : "Ollama"), description: "Sous-MoE dynamique " + (index + 1),
    providerFamily: provider === "qwen-cloud" ? "qwen" : "ollama", categories: [key], lobes: [key, "orchestration"],
    experts: [
      makeExpert(key + "-principal", "Spécialiste " + name, key, capabilities, index, provider, model),
      makeExpert(key + "-critique", "Critiqueur " + name, key + "-review", capabilities.concat(["critique"]), index + 1, provider, model),
      makeExpert(key + "-chercheur", "Chercheur " + name, key + "-research", capabilities.concat(["evidence"]), index + 2, provider, model),
    ],
    routingPolicy: { mode: "hybrid", topK: 2, embeddingModel: EMBEDDING_MODEL, semanticWeight: 0.7 },
    cascadeConfig: { enabled: true, levels: provider === "qwen-cloud" ? ["qwen-turbo", "qwen-plus", "qwen-max"] : [model, model, model], escalateOn: ["low_quality", "conflict"] },
    cacheConfig: { enabled: true, kind: "semantic", ttlSeconds: 900 },
    guards: ["input-policy", "output-grounding", "budget"],
  });
}
function blueprint(prompt, current, providerInfo) {
  const provider = providerInfo?.provider || "qwen-cloud";
  const model = providerInfo?.model || "qwen-plus";
  const count = requestedCount(prompt, current);
  const existing = current && Array.isArray(current.subMoes) ? current.subMoes : [];
  const subMoes = Array.from({ length: count }, function (_, index) {
    const fallback = makeSubMoe(index, null, provider, model);
    const previous = existing[index];
    if (!previous) return fallback;
    return { ...fallback, ...previous, providerFamily: provider === "qwen-cloud" ? "qwen" : "ollama", experts: previous.experts && previous.experts.length ? previous.experts : fallback.experts };
  });
  return createContractManifest({
    ...(current || {}),
    id: current && current.id || "maxi-" + slug(prompt) + "-" + crypto.randomUUID().slice(0, 8),
    name: current && current.name || "Maxi " + (provider === "qwen-cloud" ? "Qwen" : "Ollama") + " — " + slug(prompt).replace(/-/g, " "),
    description: current && current.description || "Créé depuis la demande utilisateur: " + String(prompt).slice(0, 240),
    version: current && current.version || "1.0.0", status: "draft", subMoes,
    categories: [...new Set([...(current && current.categories || []), "maxi", provider === "qwen-cloud" ? "qwen-only" : "ollama-only", "dynamic-moe"])],
    systems: { ...(current && current.systems || {}), chatAssistant: { enabled: true, scope: "all-tabs", sessionScoped: true } },
    modelBindings: { planner: provider === "qwen-cloud" ? "qwen-max" : model, router: provider === "qwen-cloud" ? "qwen-plus" : model, synthesizer: provider === "qwen-cloud" ? "qwen-max" : model, embedding: EMBEDDING_MODEL },
    kbConfig: { enabled: true, mode: "hybrid-rag", topK: 12, rerank: provider === "qwen-cloud" ? "qwen-plus" : model, citations: true },
    indexConfig: { type: "hybrid", lexical: "bm25", vector: "hnsw", embeddingModel: EMBEDDING_MODEL, dimensions: 1024 },
    routingPolicy: { mode: "hybrid", semantic: true, costAware: true, qualityAware: true, parallelRace: { enabled: true, criticalOnly: true, maxBranches: 3 } },
    cascadeConfig: { enabled: true, levels: provider === "qwen-cloud" ? ["qwen-turbo", "qwen-plus", "qwen-max"] : [model, model, model], retryOn: ["timeout", "invalid_output", "low_quality"] },
    cacheConfig: { enabled: true, kind: "semantic", ttlSeconds: 900, threshold: 0.92 },
    guards: ["prompt-injection", "pii", "budget", "tool-permission", "grounding"],
    synthesis: { model: provider === "qwen-cloud" ? "qwen-max" : model, mode: "evidence-first", requireCitations: true, resolveConflicts: true },
  });
}
function parseJson(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  try { return JSON.parse(cleaned); } catch (ignore) {}
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (ignore) { return null; }
}
async function askQwen(prompt, options) {
  const instruction = "Demande: " + String(prompt).slice(0, 6000) + "\nRetourne uniquement un JSON avec manifest, assistantMessage, assumptions et warnings. Architecture Maxi LLM. Respecte le nombre de MoE. Trois experts minimum par sous-MoE.";
  try {
    let output = null;
    if (options.generate) output = await options.generate(instruction);
    else if (options.chatCompletion) {
      // Extract provider and model from context if available
      const providerName = options.context?.provider || "qwen-cloud";
      const modelName = options.context?.model || options.model || "qwen-plus";
      output = (await options.chatCompletion({ model: modelName, messages: [{ role: "user", content: instruction }], maxTokens: 5000, temperature: 0.2 }, providerName)).text;
    }
    else if (process.env.DASHSCOPE_API_KEY) {
      const base = (process.env.DASHSCOPE_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
      const response = await fetch(base + "/chat/completions", { method: "POST", headers: { Authorization: "Bearer " + process.env.DASHSCOPE_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ model: options.model || "qwen-plus", messages: [{ role: "user", content: instruction }], temperature: 0.2, max_tokens: 5000 }) });
      if (!response.ok) throw new Error("DashScope HTTP " + response.status);
      output = (await response.json()).choices[0].message.content;
    }
    const parsed = parseJson(output);
    if (parsed) return { parsed, response: parsed.assistantMessage || parsed.response || "Architecture générée et vérifiée.", assumptions: parsed.assumptions || [], warnings: parsed.warnings || [] };
    return { parsed: null, response: "Blueprint local vérifiable utilisé.", assumptions: [], warnings: ["Réponse non JSON; fallback déterministe."] };
  } catch (error) {
    return { parsed: null, response: "Service d'IA indisponible; blueprint local vérifiable utilisé.", assumptions: [], warnings: ["Fallback: " + error.message] };
  }
}
function normalize(raw, prompt, current, providerInfo) {
  const provider = providerInfo?.provider || "qwen-cloud";
  const model = providerInfo?.model || "qwen-plus";
  const candidate = raw && raw.manifest && typeof raw.manifest === "object" ? raw.manifest : raw;
  const base = blueprint(prompt, current, providerInfo);
  if (!candidate) return base;
  const result = { ...base, ...candidate, status: "draft" };
  const rawSubs = Array.isArray(candidate.subMoes) ? candidate.subMoes : [];
  result.subMoes = base.subMoes.map(function (fallback, index) {
    const sub = { ...fallback, ...(rawSubs[index] || {}), providerFamily: provider === "qwen-cloud" ? "qwen" : "ollama" };
    const rawExperts = rawSubs[index] && Array.isArray(rawSubs[index].experts) ? rawSubs[index].experts : fallback.experts;
    sub.experts = rawExperts.map(function (expert, expertIndex) {
      const expertModel = String(expert.model || model).startsWith("qwen-") && provider === "qwen-cloud" ? expert.model :
                         String(expert.model || model).startsWith("qwen-") && provider !== "qwen-cloud" ? "qwen-plus" :
                         expert.model || model;
      return { ...fallback.experts[expertIndex % fallback.experts.length], ...expert, id: expert.id || sub.id + "-expert-" + (expertIndex + 1), provider, model: expertModel };
    });
    while (sub.experts.length < 3) {
      if (provider === "qwen-cloud") {
        sub.experts.push(makeExpert(sub.id + "-extra-" + sub.experts.length, "Spécialiste complémentaire", sub.id, ["specialist"], index, provider, model));
      } else {
        // For Ollama, use the specified model or a default
        const expertModel = model || "llama2";
        sub.experts.push(makeExpert(sub.id + "-extra-" + sub.experts.length, "Spécialiste complémentaire", sub.id, ["specialist"], index, provider, expertModel));
      }
    }
    return sub;
  });
  return validateContract(result).isValid ? result : base;
}
export function analyzeManifest(currentManifest) {
  if (!currentManifest) return { status: "empty", manifest: null, warnings: [] };
  try {
    const manifest = typeof currentManifest === "string" ? JSON.parse(currentManifest) : currentManifest;
    return { status: "ready", manifest, warnings: [] };
  } catch (error) {
    return { status: "invalid", manifest: null, warnings: ["Manifeste existant ignoré: " + error.message] };
  }
}
export async function generateProposal(naturalPrompt, currentManifest, options) {
  const prompt = String(naturalPrompt || "");
  if (!prompt.trim()) throw new Error("Le prompt naturel est requis");
  const settings = options || {};
  const analysis = analyzeManifest(currentManifest);
  const response = await askQwen(prompt, settings);
  const manifest = normalize(response.parsed, prompt, analysis.manifest);
  const check = validateContract(manifest);
  if (!check.isValid) throw new Error("Manifest généré invalide: " + check.errors.join(", "));
  const oldIds = new Set(analysis.manifest && analysis.manifest.subMoes ? analysis.manifest.subMoes.map(function (item) { return item.id; }) : []);
  const newIds = new Set(manifest.subMoes.map(function (item) { return item.id; }));
  return { id: manifest.id, intention: "construction-maxi-qwen", assistantMessage: response.response, assumptions: response.assumptions, warnings: response.warnings.concat(analysis.warnings), manifest, status: "ready", preview: JSON.stringify(manifest, null, 2), diff: { added: [...newIds].filter(function (id) { return !oldIds.has(id); }), modified: analysis.manifest ? ["routingPolicy", "cascadeConfig", "cacheConfig", "synthesis"] : ["contrat Maxi complet"], removed: [...oldIds].filter(function (id) { return !newIds.has(id); }) } };
}
export async function applyChanges(data, registry) {
  const targetRegistry = registry || new ContractRegistry();
  if (!data || !data.id || !data.manifest) throw new Error("id et manifest sont requis");
  const existing = targetRegistry.get(data.id);
  const expectedVersion = data.expectedVersion || data.manifest.version || "1.0.0";
  if (existing && existing.version !== expectedVersion) throw new Error("Version concurrente: attendu " + expectedVersion + ", actuel " + existing.version);
  const next = { ...data.manifest, id: data.id, version: data.manifest.version || expectedVersion, status: "draft" };
  const check = validateContract(next);
  if (!check.isValid) throw new Error("Manifest invalide: " + check.errors.join(", "));
  if (existing) await targetRegistry.patch(data.id, next); else await targetRegistry.create(next);
  const contract = await targetRegistry.publish(data.id);
  return { id: data.id, revision: Date.now(), hash: crypto.createHash("sha256").update(data.content || JSON.stringify(next)).digest("hex").slice(0, 16), status: "applied", appliedAt: new Date().toISOString(), contract };
}
export { askQwen as generateResponse };

