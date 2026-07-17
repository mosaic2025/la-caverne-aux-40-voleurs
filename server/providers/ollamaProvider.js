import { BaseProvider } from './baseProvider.js';

const TARGET_DIM = 1024; // doit matcher EMBED_DIM du moteur MoE

/**
 * Ollama provider implementation for a local/cloud Ollama instance.
 * Utilise le fetch natif (Node 18+), aucune dépendance externe.
 */
export class OllamaProvider extends BaseProvider {
  constructor() {
    super();
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.embedModel = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
  }

  get name() { return "ollama"; }

  /** Pad/tronque l'embedding à TARGET_DIM pour rester compatible avec le routing MoE. */
  static align(vec) {
    if (!Array.isArray(vec)) return new Array(TARGET_DIM).fill(0);
    if (vec.length === TARGET_DIM) return vec;
    if (vec.length > TARGET_DIM) return vec.slice(0, TARGET_DIM);
    return vec.concat(new Array(TARGET_DIM - vec.length).fill(0));
  }

  async embedText(text) {
    const body = { model: this.embedModel, input: String(text).slice(0, 8000) };
    // /api/embed (nouveau) puis /api/embeddings (ancien) en fallback
    let data;
    try {
      const res = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Ollama embed HTTP ${res.status}`);
      data = await res.json();
    } catch (e) {
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.embedModel, prompt: String(text).slice(0, 8000) }),
      });
      if (!res.ok) throw new Error(`Ollama embeddings HTTP ${res.status}: ${await res.text().catch(() => "")}`);
      data = await res.json();
    }
    const raw = data.embeddings?.[0] || data.embedding || [];
    const embedding = OllamaProvider.align(raw);
    const tokens = Math.ceil(String(text).length / 4);
    return { embedding, tokens };
  }

  async chatCompletion(params) {
    const start = Date.now();
    const messages = (params.messages || []).map((m) => ({ role: m.role, content: m.content }));
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model,
        messages,
        stream: false,
        options: {
          num_predict: params.maxTokens ?? 512,
          temperature: params.temperature ?? 0.5,
        },
      }),
    });
    if (!res.ok) throw new Error(`Ollama chat HTTP ${res.status}: ${await res.text().catch(() => "")}`);
    const data = await res.json();
    const text = data.message?.content || data.response || '';
    const promptTokens = data.prompt_eval_count ?? Math.ceil(messages.reduce((s, m) => s + String(m.content).length, 0) / 4);
    const completionTokens = data.eval_count ?? Math.ceil(text.length / 4);
    const totalTokens = promptTokens + completionTokens;
    return { text, promptTokens, completionTokens, totalTokens, latencyMs: Date.now() - start };
  }
}