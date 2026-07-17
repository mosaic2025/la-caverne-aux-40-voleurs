// Stubs 501 (T01) — répondent tant que la vraie tâche n'a pas livré son module.
// order 999 : toujours essayé EN DERNIER, donc un vrai module (order 100) gagne.
export const order = 999;

const STUB_PATHS = [
  /^\/api\/kb(\/|$)/,
  /^\/api\/conseil\/(tournoi|debat|pipeline)$/,
  /^\/api\/negociation$/,
  /^\/api\/missions(\/|$)/,
  /^\/api\/etoiles(\/|$)/,
  /^\/api\/arene\/sabre$/,
  /^\/api\/balance$/,
  /^\/api\/voleurs\/[^/]+\/portrait$/,
];

export async function handle(req, res, url, _parts, ctx) {
  if (STUB_PATHS.some((re) => re.test(url.pathname))) {
    ctx.helpers.sendJson(res, 501, { todo: true, path: url.pathname });
    return true;
  }
  return false;
}
