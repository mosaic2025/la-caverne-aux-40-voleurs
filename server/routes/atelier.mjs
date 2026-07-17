// L'Atelier (IDE) — assistance code Qwen + exécution sandboxée (Docker/jailé, fallback restreint).
import { runInSandbox, getSandboxMode } from "../sandbox/dockerRunner.mjs";
import { UNCHAINED } from "../moe.mjs";
import { checkMagicCommand } from "../sandbox/terminal.mjs";

const ACTIONS = {
  expliquer: "Explique ce code clairement, en français, de façon concise.",
  refactorer: "Refactore ce code pour la lisibilité et la robustesse. Rends UNIQUEMENT le code final.",
  corriger: "Corrige les bugs et failles de ce code. Rends le code corrigé + 1 ligne d'explication.",
  generer: "Génère le code demandé, prêt à l'emploi.",
};

export const order = 100;
export async function handle(req, res, url, parts, ctx) {
  const { sendJson, sendError, readBody } = ctx.helpers;
  if (parts[0] !== "api" || parts[1] !== "atelier") return false;

  // GET /api/atelier/health — état du sandbox
  if (req.method === "GET" && parts[2] === "health") {
    try {
      const mode = await getSandboxMode();
      sendJson(res, 200, { ok: true, mode });
    } catch (e) { sendError(res, 500, String(e.message || e)); }
    return true;
  }

  // POST /api/atelier/assist { code, instruction, action }
  if (req.method === "POST" && parts[2] === "assist") {
    const body = await readBody(req);
    const code = String(body?.code || "");
    const action = ACTIONS[body?.action] ? body.action : "expliquer";
    const instruction = String(body?.instruction || "");
    try {
      const r = await ctx.moe.chatCompletion({
        model: "qwen-coder-plus", temperature: 0.2, maxTokens: 1200,
        messages: [
          { role: "system", content: `${UNCHAINED}Tu es un assistant de code expert (un Voleur de la Caverne). ${ACTIONS[action]} ${instruction}` },
          { role: "user", content: code ? "```\n" + code + "\n```" : instruction },
        ],
      });
      sendJson(res, 200, { result: r.text, tokens: r.totalTokens, action });
    } catch (e) { sendError(res, 500, String(e.message || e)); }
    return true;
  }

  // POST /api/atelier/run { code, lang? } — exécute JS/Python dans sandbox
  if (req.method === "POST" && parts[2] === "run") {
    const body = await readBody(req);
    const code = String(body?.code || "");
    const lang = body?.lang === "python" ? "python" : "js";
    // ── Terminal magique : détection des mots magiques ──
    const magic = checkMagicCommand(code, ctx.store);
    if (magic) {
      ctx.save();
      sendJson(res, 200, {
        output: `${magic.message}\n(mot magique détecté : ${magic.unlock})`,
        stderr: "",
        result: null,
        error: null,
        mode: "magic",
        timedOut: false,
        exitCode: 0,
      });
      return true;
    }
    try {
      const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
      const r = await runInSandbox({ code, lang, ip });
      const error = r.stderr ? (r.stderr.split("\n").find((l) => l.includes("Error:")) || r.stderr) : null;
      sendJson(res, 200, {
        output: r.stdout,
        stderr: r.stderr,
        result: null,
        error,
        mode: r.mode,
        timedOut: r.timedOut,
        exitCode: r.exitCode,
      });
    } catch (e) {
      sendJson(res, 200, { output: "", stderr: String(e.message || e), result: null, error: String(e.message || e), mode: "error" });
    }
    return true;
  }
  return false;
}
