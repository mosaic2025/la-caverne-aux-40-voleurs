import { QwenCloudProvider } from './qwenCloudProvider.js';
import { OllamaProvider } from './ollamaProvider.js';
import { AlibabaProvider } from './alibabaProvider.js';
import { OpenRouterProvider } from '../fable5/openrouterProvider.mjs';

// Provider registry
const providers = new Map();

// Register providers
providers.set('qwen-cloud', new QwenCloudProvider());
providers.set('ollama', new OllamaProvider());
providers.set('alibaba', new AlibabaProvider());
providers.set('openrouter', new OpenRouterProvider());

/** Liste les providers disponibles (pour l'UI). */
export function listProviders() {
  return Array.from(providers.keys());
}

/**
 * Get provider instance by name
 * @param {string} name - Provider name (e.g., 'qwen-cloud', 'ollama')
 * @returns {Object} Provider instance with embedText and chatCompletion methods
 */
export function getProvider(name) {
  const provider = providers.get(name);
  if (!provider) {
    throw new Error(`Provider not found: ${name}`);
  }
  return provider;
}
/** Liste les modèles disponibles par provider. */
export function listProviderModels() {
  return {
    "qwen-cloud": ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-plus", "qwen-vl-plus"],
    alibaba: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-plus", "qwen-vl-plus"],
    ollama: ["deepseek-v4-pro:cloud", "glm-5.2:cloud", "gemma4:31b:cloud", "kimi-k2.7-code:cloud", "nemotron-3-ultra:cloud"],
    openrouter: ["anthropic/claude-fable-5", "anthropic/claude-5-fable-20260609"],
  };
}
