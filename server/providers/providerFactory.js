// Provider factory — lazy singletons pour éviter les imports circulaires avec moe.mjs
const providerClasses = {
  "qwen-cloud": () => import("./qwenCloudProvider.js").then((m) => m.QwenCloudProvider),
  "ollama": () => import("./ollamaProvider.js").then((m) => m.OllamaProvider),
  "alibaba": () => import("./alibabaProvider.js").then((m) => m.AlibabaProvider),
};

// Providers autorisés : Qwen Cloud / AI Studio, Alibaba Cloud, Ollama Cloud uniquement.

const instances = new Map();

/** Liste les providers disponibles (pour l'UI). */
export function listProviders() {
  return Object.keys(providerClasses);
}

/**
 * Get provider instance by name (lazy singleton, résout les imports circulaires).
 * @param {string} name - Provider name (e.g., 'qwen-cloud', 'ollama')
 * @returns {Promise<Object>} Provider instance with embedText and chatCompletion methods
 */
export async function getProvider(name) {
  if (!instances.has(name)) {
    const loader = providerClasses[name];
    if (!loader) throw new Error(`Provider not found: ${name}`);
    const Cls = await loader();
    instances.set(name, new Cls());
  }
  return instances.get(name);
}

/** Liste les modèles disponibles par provider. */
export function listProviderModels() {
  return {
    "qwen-cloud": ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-plus", "qwen-vl-plus"],
    alibaba: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-plus", "qwen-vl-plus"],
    ollama: ["deepseek-v4-pro:cloud", "glm-5.2:cloud", "gemma4:31b-cloud", "kimi-k2.7-code:cloud", "nemotron-3-ultra:cloud"],
  };
}
