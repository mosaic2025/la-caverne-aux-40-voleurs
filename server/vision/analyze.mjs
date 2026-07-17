// ============================================================
// L53 — Vision Qwen-VL : analyse d'image
// ============================================================

import { dsFetch } from "../moe.mjs";

export async function analyzeImage({ imageUrl, prompt = "Décris cette image en français, de façon concise." }) {
  const r = await dsFetch("/chat/completions", {
    model: "qwen-vl-plus",
    messages: [
      { role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageUrl } },
      ]},
    ],
    max_tokens: 512,
    temperature: 0.3,
  });
  return {
    text: r.choices?.[0]?.message?.content || "",
    tokens: r.usage?.total_tokens || 0,
  };
}
