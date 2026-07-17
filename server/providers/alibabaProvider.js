import { BaseProvider } from './baseProvider.js';

/**
 * Alibaba Cloud (DashScope compatible-mode) provider.
 * Utilise ALIBABA_API_KEY / ALIBABA_BASE_URL avec fallback sur DASHSCOPE_*.
 */
export class AlibabaProvider extends BaseProvider {
  constructor() {
    super();
    this.apiKey = process.env.ALIBABA_API_KEY || process.env.DASHSCOPE_API_KEY || "";
    this.baseUrl = (process.env.ALIBABA_BASE_URL || process.env.DASHSCOPE_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
  }

  get name() { return "alibaba"; }

  async _fetch(path, body) {
    if (!this.apiKey) throw new Error("ALIBABA_API_KEY (ou DASHSCOPE_API_KEY) manquante");
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Alibaba ${path} HTTP ${res.status}: ${txt.slice(0, 300)}`);
    }
    return res.json();
  }

  async embedText(text) {
    const r = await this._fetch("/embeddings", {
      model: "text-embedding-v3",
      input: String(text).slice(0, 8000),
      dimensions: 1024,
      encoding_format: "float",
    });
    const embedding = r.data?.[0]?.embedding || [];
    const tokens = r.usage?.total_tokens ?? Math.ceil(String(text).length / 4);
    return { embedding, tokens };
  }

  async chatCompletion(params) {
    const start = Date.now();
    const r = await this._fetch("/chat/completions", {
      model: params.model,
      messages: params.messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      stream: false,
    });
    const text = r.choices?.[0]?.message?.content ?? "";
    const u = r.usage ?? {};
    return {
      text,
      promptTokens: u.prompt_tokens ?? 0,
      completionTokens: u.completion_tokens ?? 0,
      totalTokens: u.total_tokens ?? (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0),
      latencyMs: Date.now() - start,
    };
  }
}