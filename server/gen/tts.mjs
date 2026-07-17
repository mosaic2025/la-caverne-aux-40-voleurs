// ============================================================
// L69 — Synthèse vocale TTS (DashScope / CosyVoice)
// ============================================================

import { dsFetch } from "../moe.mjs";

export async function tts({ text, voice = "longxiaochun", format = "mp3", sampleRate = 24000 }) {
  const r = await dsFetch("/audio/speech", {
    model: "cosyvoice-v1",
    input: { text: String(text).slice(0, 3000) },
    voice,
    response_format: format,
    sample_rate: sampleRate,
  });
  return {
    audioUrl: r.output?.url || null,
    audioBase64: r.output?.audio || null,
    tokens: r.usage?.total_tokens || 0,
  };
}
