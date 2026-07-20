// ============================================================
// L79-L80 — Meta-orchestrateur multicouche
// ============================================================

import { getProvider } from "./providers/providerFactory.js";
import { listTools } from "./tools/registry.mjs";
import { scanInput, scanOutput } from "./guards/filters.mjs";
import { auditPrompt } from "./guards/audit.mjs";

const FABLE5_MODELS = ["qwen-plus", "qwen-max"];

export class MetaOrchestrator {
  constructor(store) {
    this.store = store;
    this.providers = new Map();
  }

  async getProvider(name) {
    if (!this.providers.has(name)) {
      this.providers.set(name, await getProvider(name));
    }
    return this.providers.get(name);
  }

  async route({ intent, complexity, sensitivity, budget }) {
    // 1) Fable 5 (pont Qwen Cloud)
    if (sensitivity > 0.7 || FABLE5_MODELS.includes(intent.model)) {
      return { provider: "qwen-cloud", model: intent.model || FABLE5_MODELS[0] };
    }
    // 2) Multimodal
    if (["image", "video", "vision"].includes(intent.type)) {
      return { provider: "qwen-cloud", model: "qwen-vl-plus" };
    }
    // 3) TTS
    if (intent.type === "tts") {
      return { provider: "qwen-cloud", model: "cosyvoice-v1" };
    }
    // 4) Code
    if (intent.type === "code") {
      return { provider: "qwen-cloud", model: "qwen-coder-plus" };
    }
    // 5) Haute complexité
    if (complexity > 0.8) {
      return { provider: "qwen-cloud", model: "qwen-max" };
    }
    // 6) Budget serré
    if (budget < 0.3) {
      return { provider: "qwen-cloud", model: "qwen-turbo" };
    }
    return { provider: "qwen-cloud", model: "qwen-plus" };
  }

  async executePlan(plan, { userId = "anonymous" } = {}) {
    const results = [];
    for (const step of plan.steps || []) {
      const route = await this.route(step);
      const provider = await this.getProvider(route.provider);
      // Guard entrant
      const lastUser = [...(step.messages || [])].reverse().find((m) => m.role === "user");
      if (lastUser) {
        const scan = scanInput(lastUser.content);
        if (!scan.safe) throw new Error(`Guard entrant : ${scan.issues.map((i) => i.type).join(", ")}`);
      }
      const r = await provider.chatCompletion({
        model: route.model,
        messages: step.messages,
        maxTokens: step.maxTokens,
        temperature: step.temperature,
      });
      // Guard sortant
      const outScan = scanOutput(r.text);
      const finalText = outScan.safe ? r.text : `[Bloqué par guard sortant : ${outScan.issues.map((i) => i.type).join(", ")}]`;
      auditPrompt(this.store, { userId, prompt: step.messages.map((m) => m.content).join("\n"), type: "orchestrate", result: finalText });
      results.push({ step, route, response: { ...r, text: finalText } });
    }
    return results;
  }

  listCapabilities() {
    return [
      "chat", "code", "vision", "image", "video", "tts", "kb_search",
      "profile_learning", "tool_execution", "agent_dispatch", "shared_knowledge",
      "traitor_check", "sirocco_analysis", "fable5_bridge"
    ];
  }
}
