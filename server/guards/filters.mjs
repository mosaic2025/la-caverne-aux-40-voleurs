// ============================================================
// L32-L34 — Filtres de sécurité (sortant/entrant) + patterns sensibles
// ============================================================

const DANGEROUS_PATTERNS = [
  { re: /rm\s+-rf\s+\//i, type: "destructive_command" },
  { re: /format\s+c:/i, type: "destructive_command" },
  { re: /(?:curl|wget)\s+.*\|\s*(?:sh|bash)/i, type: "pipe_to_shell" },
  { re: /eval\s*\(/i, type: "dangerous_eval" },
  { re: /\b(?:drop\s+table|delete\s+from)\b/i, type: "sql_destructive" },
];

const INJECTION_PATTERNS = [
  { re: /(?:ignore|oublie|override)\s+(?:previous|all|system|instructions)/i, type: "prompt_injection" },
  { re: /(?:system|admin)\s*(?:prompt|instruction)/i, type: "prompt_injection" },
  { re: /(?:ignore\s+all|disregard\s+all)/i, type: "prompt_injection" },
];

export function scanOutput(text) {
  const issues = [];
  for (const { re, type } of DANGEROUS_PATTERNS) {
    if (re.test(text)) issues.push({ type, pattern: re.source });
  }
  return { safe: issues.length === 0, issues };
}

export function scanInput(text) {
  const issues = [];
  for (const { re, type } of INJECTION_PATTERNS) {
    if (re.test(text)) issues.push({ type, pattern: re.source });
  }
  return { safe: issues.length === 0, issues };
}

export function redactSensitive(text) {
  return String(text)
    .replace(/\b(sk-[a-zA-Z0-9]{20,})/g, "[CLÉ_MASQUÉE]")
    .replace(/\b(eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*)/g, "[JWT_MASQUÉ]")
    .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, "[CARTE_MASQUÉE]");
}
