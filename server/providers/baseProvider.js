// Base provider class defining the interface for AI providers
export class BaseProvider {
  /**
   * Embed text using the provider's embedding model
   * @param {string} text - Text to embed
   * @returns {Promise<{embedding: number[], tokens: number}>}
   */
  async embedText(text) {
    throw new Error('Method not implemented');
  }

  /**
   * Complete a chat conversation using the provider's model
   * @param {Object} params - Parameters for chat completion
   * @param {string} params.model - Model to use
   * @param {Array} params.messages - Messages in the conversation
   * @param {number} [params.maxTokens=512] - Maximum tokens to generate
   * @param {number} [params.temperature=0.5] - Sampling temperature
   * @returns {Promise<{text: string, promptTokens: number, completionTokens: number, totalTokens: number, latencyMs: number}>}
   */
  async chatCompletion(params) {
    throw new Error('Method not implemented');
  }
}