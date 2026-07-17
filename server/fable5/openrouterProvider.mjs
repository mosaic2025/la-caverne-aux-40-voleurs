// ============================================================
// Provider OpenRouter — pont vers Fable 5 et autres modèles cloud
// ============================================================

import { BaseProvider } from "../providers/baseProvider.js";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export class OpenRouterProvider extends BaseProvider {
  constructor() {
    super();
    this.apiKey = process.env.OPENROUTER_API_KEY || "";
    this.baseUrl = (process.env.OPENROUTER_BASE_URL || OPENROUTER_BASE_URL).replace(/\/$/, "");
    this.referrer = process.env.OPENROUTER_REFERRER || "https://github.com/mosaic2025/la-caverne-aux-40-voleurs";
  }

  get name() { return "openrouter"; }

  async _fetch(path, body) {
    if (!this.apiKey) throw new Error("OPENROUTER_API_KEY manquante");
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": this.referrer,
        "X-Title": "La Caverne aux 40 Voleurs",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`OpenRouter ${path} HTTP ${res.status}: ${txt.slice(0, 300)}`);
    }
    return res.json();
  }

  async embedText(text) {
    // Fallback sur le provider par défaut pour les embeddings si OpenRouter n'en fournit pas
    throw new Error("OpenRouterProvider: embedText non supporté nativement");
  }

  async chatCompletion(params) {
    const start = Date.now();
    const response = await this._fetch("/chat/completions", {
      model: params.model,
      messages: params.messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      stream: false,
    });
    const latencyMs = Date.now() - start;
    const text = response.choices?.[0]?.message?.content ?? "";
    const usage = response.usage ?? {};
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? (promptTokens + completionTokens);
    return { text, promptTokens, completionTokens, totalTokens, latencyMs };
  }
}
