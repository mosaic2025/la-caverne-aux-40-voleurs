// ============================================================
// L36 — Audit trail des prompts sensibles
// ============================================================

import { appendJournal } from "../persistence/journal.mjs";
import { redactSensitive } from "./filters.mjs";

export function auditPrompt(store, { userId, prompt, type = "input", result = null }) {
  const safePrompt = redactSensitive(prompt);
  const safeResult = result ? redactSensitive(result) : null;
  appendJournal({ type: "audit", subtype: type, userId, prompt: safePrompt, result: safeResult });
}
