// ============================================================
// L7-L10 — Personnalité de base + humeur + style
// ============================================================

const STAGES = ["oeuf", "larve", "forme", "forme_eveillee"];

export function createAvatarPersonality(userId, seed = {}) {
  return {
    userId,
    name: seed.name || "Nour",
    mood: seed.mood || "curieux",
    formality: seed.formality ?? 0.5,
    verbosity: seed.verbosity ?? 0.5,
    humor: seed.humor ?? 0.3,
    patience: seed.patience ?? 0.7,
    birthTs: seed.birthTs || Date.now(),
    stage: seed.stage || "oeuf",
  };
}

export function evolvePersonality(p, interactions, fusionPct) {
  let stageIndex = 0;
  if (interactions >= 5) stageIndex = 1;
  if (interactions >= 20) stageIndex = 2;
  if (interactions >= 25 && fusionPct > 60) stageIndex = 3;
  return { ...p, stage: STAGES[stageIndex] || "oeuf", interactions, fusionPct };
}

export function adjustMood(personality, tone) {
  const moodMap = {
    urgent: "alerte",
    positif: "joyeux",
    frustré: "solid<aire",
    curieux: "curieux",
    neutre: "calme",
  };
  return { ...personality, mood: moodMap[tone] || personality.mood };
}
