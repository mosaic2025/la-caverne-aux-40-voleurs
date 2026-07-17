// ============================================================
// L9 — Empathie contextuelle (détection de ton)
// ============================================================

const TONE_PATTERNS = {
  urgent: /\b(urgent|vite|maintenant|asap|immédiat|tout de suite|dépêche|!{2,})\b/i,
  positif: /\b(merci|super|génial|cool|parfait|excellent|bravo|top|nickel)\b/i,
  frustré: /\b(bug|erreur|plante|marche pas|ne fonctionne pas|nul|horrible|ça craint|énervé|frustré)\b/i,
  curieux: /\b(pourquoi|comment|explique|détaille|clarifie|exemple|quelle est la différence)\b/i,
};

export function detectTone(text) {
  const t = String(text).toLowerCase();
  if (TONE_PATTERNS.urgent.test(t)) return "urgent";
  if (TONE_PATTERNS.frustré.test(t)) return "frustré";
  if (TONE_PATTERNS.curieux.test(t)) return "curieux";
  if (TONE_PATTERNS.positif.test(t)) return "positif";
  return "neutre";
}

export function empathyHint(tone) {
  const hints = {
    urgent: "L'utilisateur semble pressé. Sois direct et priorise l'action.",
    positif: "L'utilisateur est satisfait. Peux maintenir un ton léger.",
    frustré: "L'utilisateur rencontre un problème. Sois patient, rassurant, propose une solution claire.",
    curieux: "L'utilisateur veut comprendre. Développe avec des exemples.",
    neutre: "Adapte-toi au contexte.",
  };
  return hints[tone] || hints.neutre;
}

export function buildEmpathyVoiceHint(text) {
  const tone = detectTone(text);
  return empathyHint(tone);
}
