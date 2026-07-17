import { QwenCloudProvider } from './qwenCloudProvider.js';
import { OllamaProvider } from './ollamaProvider.js';
import { AlibabaProvider } from './alibabaProvider.js';

// Provider registry
const providers = new Map();

// Register providers
providers.set('qwen-cloud', new QwenCloudProvider());
providers.set('ollama', new OllamaProvider());
providers.set('alibaba', new AlibabaProvider());

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