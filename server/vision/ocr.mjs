// ============================================================
// L56 — OCR / Extraction de texte depuis une image
// Fallback : utilisation de qwen-vl-plus comme lecteur d'image
// ============================================================

import { analyzeImage } from "./analyze.mjs";

export async function ocr(imageUrl) {
  return analyzeImage({ imageUrl, prompt: "Extrais le texte présent dans cette image. Réponds UNIQUEMENT avec le texte brut, sans commentaire." });
}
