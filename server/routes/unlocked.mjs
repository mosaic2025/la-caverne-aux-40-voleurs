// ============================================================
// Route /api/unlocked — liste les fonctionnalités débloquées
// ============================================================

export const order = 100;

export async function handle(req, res, url, parts, ctx) {
  const { sendJson } = ctx.helpers;
  if (req.method !== "GET" || url.pathname !== "/api/unlocked") return false;
  ctx.store.unlocked ||= [];
  return sendJson(res, 200, { unlocked: ctx.store.unlocked }), true;
}
