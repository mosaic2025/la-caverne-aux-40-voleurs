// ============================================================
// Mode démo — réponses simulées pour Fable 5, OCR, TTS, image, vidéo
// Active quand la clé API manque ou si DEMO_MODE=on
// ============================================================

export const isDemo = () => process.env.DEMO_MODE === "on" || !process.env.DASHSCOPE_API_KEY;

export function demoFable5(prompt) {
  return {
    text: `[DÉMO Fable 5] Voici une réponse simulée pour : "${prompt.slice(0, 80)}..."\n\nEn mode production avec OPENROUTER_API_KEY, cette réponse proviendrait du modèle anthropic/claude-fable-5.`,
    promptTokens: Math.floor(prompt.length / 4),
    completionTokens: 64,
    totalTokens: Math.floor(prompt.length / 4) + 64,
    latencyMs: 120,
    model: "anthropic/claude-fable-5 (demo)",
  };
}

export function demoOcr(imageUrl) {
  return {
    text: `[DÉMO OCR] Image analysée : ${imageUrl.slice(0, 60)}...\nTexte détecté (simulé) : "Sésame, ouvre-toi."`,
    tokens: 12,
  };
}

export function demoTts(text) {
  return {
    audioUrl: null,
    audioBase64: "[DÉMO] audio_base64_simulé",
    tokens: Math.floor(text.length / 4),
    note: "En production avec DASHSCOPE_API_KEY, CosyVoice génère un vrai fichier audio.",
  };
}

export function demoImage(prompt) {
  return {
    taskId: "demo_task_" + Date.now(),
    status: "SUCCEEDED",
    results: [{ url: null, prompt: prompt.slice(0, 200), note: "Image simulée — fournir DASHSCOPE_API_KEY pour Wanx." }],
  };
}

export function demoVideo(prompt) {
  return {
    taskId: "demo_task_" + Date.now(),
    status: "SUCCEEDED",
    note: "Vidéo simulée — fournir DASHSCOPE_API_KEY pour Wanx video.",
  };
}
