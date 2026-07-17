// T12 — Commandes secrètes (PBKDF2 + rate-limit). 0 dépendance (node:crypto).
// Le mot n'est JAMAIS dans le source livré : seul le hash PBKDF2(mot, sel, iter) l'est.
import { pbkdf2Sync, randomBytes } from "node:crypto";

const ITER = 60000;
const KEYLEN = 32;
function hash(word, salt) {
  return pbkdf2Sync(word.normalize("NFKC").trim().toLowerCase(), salt, ITER, KEYLEN, "sha256").toString("hex");
}
const SEEDS = [
  { id: "sesame", mot: "sésame ouvre-toi", unlock: "mode_sesame", indice: "La porte ne s'ouvre qu'avec les mots justes du conte.", difficulte: "facile" },
  { id: "quarante", mot: "quarante voleurs", unlock: "revele_conseil", indice: "Combien sont-ils à se partager la caverne ?", difficulte: "moyen" },
  { id: "dinar", mot: "bazar des dinars", unlock: "vue_economie", indice: "Où les voleurs monnaient-ils leur parole ?", difficulte: "difficile" },
];
let CATALOGUE = null;
function catalogue() {
  if (CATALOGUE) return CATALOGUE;
  CATALOGUE = SEEDS.map((s) => { const salt = randomBytes(8).toString("hex"); return { id: s.id, hash: hash(s.mot, salt), salt, iterations: ITER, unlock: s.unlock, indice: s.indice, difficulte: s.difficulte }; });
  return CATALOGUE;
}
const attempts = new Map(); // ip -> {n, t}

export const order = 100;
export async function handle(req, res, url, parts, ctx) {
  const { sendJson, sendError, readBody } = ctx.helpers;
  if (parts[0] !== "api" || parts[1] !== "secrets") return false;

  if (req.method === "GET" && parts[2] === "unlocked") {
    ctx.store.unlocked ||= [];
    sendJson(res, 200, {
      unlocked: ctx.store.unlocked,
      indices: catalogue().map((c) => ({ id: c.id, indice: c.indice, difficulte: c.difficulte, trouve: ctx.store.unlocked.includes(c.unlock) })),
    });
    return true;
  }
  if (req.method === "POST" && parts[2] === "try") {
    const ip = req.socket?.remoteAddress || "?";
    const now = Date.now();
    const a = attempts.get(ip) || { n: 0, t: now };
    if (now - a.t > 60000) { a.n = 0; a.t = now; }
    if (a.n >= 20) { sendError(res, 429, "Trop de tentatives, réessaie dans une minute."); return true; }
    a.n++; attempts.set(ip, a);

    const body = await readBody(req);
    const input = String(body?.input || "");
    ctx.store.unlocked ||= [];
    for (const c of catalogue()) {
      if (hash(input, c.salt) === c.hash) {
        if (!ctx.store.unlocked.includes(c.unlock)) { ctx.store.unlocked.push(c.unlock); ctx.save(); }
        sendJson(res, 200, { ok: true, unlock: c.unlock, id: c.id });
        return true;
      }
    }
    sendJson(res, 200, { ok: false });
    return true;
  }
  return false;
}
