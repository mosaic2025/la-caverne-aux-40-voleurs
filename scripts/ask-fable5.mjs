// Usage : OPENROUTER_API_KEY=sk-xxx node scripts/ask-fable5.mjs "ma question"
import { Fable5Client } from "../server/fable5/fable5Client.mjs";

const question = process.argv.slice(2).join(" ") || "Présente-toi brièvement.";

const client = new Fable5Client();

try {
  const r = await client.single(question, {
    system: "Tu es Fable 5, un modèle cloud consulté par le projet La Caverne aux 40 Voleurs. Réponds de façon concise, technique et orientée action.",
    maxTokens: 2048,
    temperature: 0.6,
  });
  console.log("\n=== Réponse Fable 5 ===\n");
  console.log(r.text);
  console.log("\n=== Métriques ===");
  console.log(`Tokens : ${r.totalTokens} | Latence : ${r.latencyMs}ms`);
} catch (e) {
  console.error("Erreur Fable 5 :", e.message);
  process.exit(1);
}
