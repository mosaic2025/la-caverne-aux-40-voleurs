// ============================================================
// L71 — Génération de portrait d'avatar pour La Lampe
// Génère un prompt enrichi à envoyer à un générateur d'image.
// ============================================================

export function buildAvatarPrompt(personality) {
  const stageDesc = {
    oeuf: "un oeuf doré flottant dans une fumée violette",
    larve: "une larve lumineuse et chuchotante",
    forme: "un génie translucide aux yeux brillants",
    forme_eveillee: "un maître-esprit majestueux entouré d'étoiles",
  };
  const stage = personality?.stage || "oeuf";
  const mood = personality?.mood || "curieux";
  return `Portrait fantastique : ${stageDesc[stage]}, style orientale magique, ambiance ${mood}, lumière dorée et violette, fond de caverne ancienne.`;
}

export async function generateAvatar(personality) {
  // Retourne le prompt prêt à être utilisé par generateImage()
  return {
    prompt: buildAvatarPrompt(personality),
    note: "Appeler generateImage(prompt) pour produire le visuel. Cache recommandé.",
  };
}
