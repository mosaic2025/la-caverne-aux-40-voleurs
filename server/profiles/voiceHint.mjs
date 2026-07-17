// ============================================================
// L27 — VoiceHint dynamique enrichi par profilage cognitif/émotionnel
// ============================================================

import { analyzeProfile, detectEmotionalLoad } from "./cognitive.mjs";
import { detectTone } from "../humanity/empathy.mjs";

export function buildVoiceHint(userProfile, lastUserMessage = "") {
  if (!userProfile) return "";
  const parts = [];
  if (userProfile.fusionPct >= 60) parts.push(`L'utilisateur est fortement fusionné (${userProfile.fusionPct}%) : adopte son style. `);
  else if (userProfile.fusionPct >= 30) parts.push(`L'utilisateur commence à fusionner (${userProfile.fusionPct}%) : harmonise-toi progressivement. `);

  const tone = detectTone(lastUserMessage);
  const toneHints = {
    urgent: "Ton pressé : réponses courtes et directes. ",
    positif: "Ton positif : conserve un style léger. ",
    frustré: "Ton frustré : patience, clarification, solution. ",
    curieux: "Ton curieux : explications avec exemples. ",
    neutre: "",
  };
  parts.push(toneHints[tone] || "");

  if (Array.isArray(userProfile.messages) && userProfile.messages.length >= 3) {
    const profile = analyzeProfile(userProfile.messages.slice(-20));
    parts.push(`Style dominant : ${profile.dominantCognitive}. Domaine technique probable : ${profile.dominantTech}. `);
    if (profile.secondaryTech.length) parts.push(`Autres domaines : ${profile.secondaryTech.join(", ")}. `);
  }

  const emo = detectEmotionalLoad([lastUserMessage]);
  if (emo.intensity >= 2) parts.push("Charge émotionnelle élevée : sois particulièrement attentif. ");

  return parts.filter(Boolean).join("").trim();
}
