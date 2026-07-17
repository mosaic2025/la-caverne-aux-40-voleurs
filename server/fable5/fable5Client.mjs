import { OpenRouterProvider } from "./openrouterProvider.mjs";
import { cacheGet, cacheSet } from "./cache.mjs";

export const FABLE5_MODELS = [
  "anthropic/claude-fable-5",
  "anthropic/claude-5-fable-20260609",
];

const DEFAULT_FABLE5 = FABLE5_MODELS[0];

export class Fable5Client {
  constructor(model = DEFAULT_FABLE5) {
    this.provider = new OpenRouterProvider();
    this.model = model;
  }

  async ask(messages, { maxTokens = 2048, temperature = 0.6, useCache = true } = {}) {
    const prompt = messages.map((m) => m.content).join("\n");
    if (useCache) {
      const cached = cacheGet(prompt, this.model);
      if (cached) return { ...cached, cached: true };
    }
    const result = await this.provider.chatCompletion({
      model: this.model,
      messages,
      maxTokens,
      temperature,
    });
    if (useCache) cacheSet(prompt, this.model, result);
    return result;
  }

  async single(prompt, { system = "", maxTokens = 2048, temperature = 0.6, useCache = true } = {}) {
    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });
    return this.ask(messages, { maxTokens, temperature, useCache });
  }
}
