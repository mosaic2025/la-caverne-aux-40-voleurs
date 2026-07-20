// ============================================================
// Fable5Client — pont "Fable 5" repointé sur Qwen Cloud (DashScope).
// (L73-L78) — auparavant OpenRouter ; désormais Qwen-first, conformément
// à la contrainte providers : seuls Qwen Cloud / AI Studio / Alibaba / Ollama Cloud.
// ============================================================
import { QwenCloudProvider } from "../providers/qwenCloudProvider.js";
import { cacheGet, cacheSet } from "./cache.mjs";

// Modèles "Fable 5" = modèles Qwen Cloud utilisés comme pont exotique.
export const FABLE5_MODELS = ["qwen-plus", "qwen-max"];

const DEFAULT_FABLE5 = FABLE5_MODELS[0];

export class Fable5Client {
  constructor(model = DEFAULT_FABLE5) {
    this.provider = new QwenCloudProvider();
    this.model = FABLE5_MODELS.includes(model) ? model : DEFAULT_FABLE5;
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
