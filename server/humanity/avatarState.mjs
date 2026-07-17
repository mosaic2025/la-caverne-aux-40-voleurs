// ============================================================
// L14 — Portrait vivant : état réactif de l'avatar (La Lampe)
// ============================================================

export function getAvatarState(store, userId) {
  return store.avatars?.[userId] || { exists: false, stage: "oeuf" };
}

export function isAwakened(store, userId) {
  const s = getAvatarState(store, userId);
  return s.exists && (s.personality?.stage || "oeuf") !== "oeuf";
}
