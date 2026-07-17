// ============================================================
// L70 — Génération de musique / sons d'ambiance
// Fallback : placeholder — les modèles de musique ne sont pas universellement disponibles.
// ============================================================

export async function generateMusic(prompt, { duration = 10 } = {}) {
  // Pour l'instant, retourne une structure prête pour un provider futur
  return {
    prompt: String(prompt).slice(0, 500),
    duration,
    audioUrl: null,
    note: "Placeholder : intégrer un provider de génération musicale (ex: Suno API ou modèle local).",
  };
}
