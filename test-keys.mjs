// Vérifie la présence et le fonctionnement des clés des providers AUTORISÉS
// (Qwen Cloud / AI Studio via DashScope, Alibaba Cloud, Ollama Cloud).
import fs from "node:fs";
const env = fs.readFileSync("server/.env", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}

console.log("DASHSCOPE (Qwen Cloud) present:", !!process.env.DASHSCOPE_API_KEY);
console.log("ALIBABA_API_KEY present:", !!process.env.ALIBABA_API_KEY);
console.log("OLLAMA_HOST:", process.env.OLLAMA_HOST || "(défaut)");

const { QwenCloudProvider } = await import("./server/providers/qwenCloudProvider.js");
const q = new QwenCloudProvider();
try {
  const r = await q.chatCompletion({ model: "qwen-turbo", messages: [{ role: "user", content: "Réponds uniquement: ok" }], maxTokens: 20, temperature: 0.5 });
  console.log("✅ Qwen Cloud (DashScope) OK:", r.text.slice(0, 100));
} catch (e) {
  console.error("❌ Qwen Cloud ERR:", e.message);
}

try {
  const e = await q.embedText("docker kubernetes orchestration");
  console.log("✅ Qwen embeddings OK:", e.embedding.length, "dims,", e.tokens, "tokens");
} catch (e) {
  console.error("❌ Qwen embeddings ERR:", e.message);
}

const { OllamaProvider } = await import("./server/providers/ollamaProvider.js");
const o = new OllamaProvider();
try {
  const r = await o.chatCompletion({ model: "qwen3.5:122b:cloud", messages: [{ role: "user", content: "Réponds uniquement: ok" }], maxTokens: 20, temperature: 0.5 });
  console.log("✅ Ollama Cloud OK:", r.text.slice(0, 100));
} catch (e) {
  console.error("⚠️ Ollama Cloud ERR (optionnel):", e.message.slice(0, 120));
}
