// ============================================================
// Terminal magique de l'Atelier — détecte les mots magiques
// ============================================================

const MAGIC_WORDS = {
  shazaam: { unlock: "lampe_revealed", message: "🪔 La Lampe apparaît dans les onglets…" },
};

export function checkMagicCommand(input, store) {
  const cleaned = String(input || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [word, effect] of Object.entries(MAGIC_WORDS)) {
    if (cleaned.includes(word)) {
      store.unlocked ||= [];
      if (!store.unlocked.includes(effect.unlock)) {
        store.unlocked.push(effect.unlock);
      }
      return effect;
    }
  }
  return null;
}
