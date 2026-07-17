// ============================================================
// L24-L26 — Profilage cognitif, technique et émotionnel
// ============================================================

const COGNITIVE_TRIGGERS = {
  deductif: ["donc", "par conséquent", "il s'ensuit", "si alors", "alors que", "en déduis"],
  inductif: ["exemple", "cas", "pattern", "tendance", "en général", "souvent"],
  analogique: ["comme", "similaire", "métaphore", "analogie", "on peut voir ça comme"],
};

const TECH_TRIGGERS = {
  javascript: ["js", "javascript", "node", "react", "express", "next.js", "vue"],
  python: ["python", "pandas", "django", "flask", "fastapi", "pytorch"],
  devops: ["docker", "kubernetes", "ci/cd", "terraform", "ansible", "github actions"],
  data: ["sql", "mongodb", "postgres", "redis", "elasticsearch", "kafka"],
  rust: ["rust", "cargo", "tokio", "actix"],
  mobile: ["android", "ios", "flutter", "react native", "termux"],
};

export function analyzeProfile(texts = []) {
  const all = texts.map((t) => String(t).toLowerCase()).join(" ");
  const cognitive = {};
  for (const [style, words] of Object.entries(COGNITIVE_TRIGGERS)) {
    cognitive[style] = words.reduce((s, w) => s + (all.includes(w) ? 1 : 0), 0);
  }
  const technical = {};
  for (const [domain, words] of Object.entries(TECH_TRIGGERS)) {
    technical[domain] = words.reduce((s, w) => s + (all.includes(w) ? 1 : 0), 0);
  }
  const dominantCognitive = Object.entries(cognitive).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutre";
  const dominantTech = Object.entries(technical).sort((a, b) => b[1] - a[1])[0]?.[0] || "general";
  const secondaryTech = Object.entries(technical).filter(([k]) => k !== dominantTech).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
  return { cognitive, technical, dominantCognitive, dominantTech, secondaryTech };
}

export function detectEmotionalLoad(texts = []) {
  const all = texts.map((t) => String(t).toLowerCase()).join(" ");
  const markers = {
    urgent: /\b(urgent|vite|asap|maintenant)\b/i.test(all),
    frustrated: /\b(bug|erreur|plante|marche pas|nul)\b/i.test(all),
    excited: /\b(génial|super|excellent|top|incroyable)\b/i.test(all),
  };
  const score = Object.values(markers).filter(Boolean).length;
  return { ...markers, intensity: score };
}
