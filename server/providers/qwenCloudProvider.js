import { BaseProvider } from './baseProvider.js';
import { dsFetch } from '../moe.mjs';

/**
 * Qwen Cloud provider implementation using DashScope API
 */
export class QwenCloudProvider extends BaseProvider {
  get name() { return "qwen-cloud"; }
  /**
   * Embed text using text-embedding-v3 via DashScope
   * @param {string} text - Text to embed
   * @returns {Promise<{embedding: number[], tokens: number}>}
   */
  async embedText(text) {
    const r = await dsFetch("/embeddings", {
      model: "text-embedding-v3",
      input: String(text).slice(0, 8000),
      dimensions: 1024,
      encoding_format: "float",
    });
    // DashScope (mode OpenAI-compatible) : { data: [{embedding}], usage: {total_tokens} }
    const embedding = Array.isArray(r?.data) ? r.data[0]?.embedding : r?.output?.embeddings?.[0]?.embedding;
    const tokens = r?.usage?.total_tokens ?? 0;
    if (!Array.isArray(embedding)) throw new Error("embedding DashScope introuvable");
    return { embedding, tokens };
  }

  /**
   * Complete a chat conversation via DashScope
   * @param {Object} params - Parameters for chat completion
   * @param {string} params.model - Model to use (qwen-turbo, qwen-plus, etc.)
   * @param {Array} params.messages - Messages in the conversation
   * @param {number} [params.maxTokens=512] - Maximum tokens to generate
   * @param {number} [params.temperature=0.5] - Sampling temperature
   * @returns {Promise<{text: string, promptTokens: number, completionTokens: number, totalTokens: number, latencyMs: number}>}
   */
  async chatCompletion(params) {
    const start = Date.now();
    const response = await dsFetch("/chat/completions", {
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