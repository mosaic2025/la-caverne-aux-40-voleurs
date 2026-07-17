// Bazar des Dinars — endpoints économie interne (soldes + ledger + marché live)
export const order = 100;

export async function handle(req, res, url, parts, ctx) {
  const { sendJson, sendError } = ctx.helpers;
  if (parts[0] !== "api" || parts[1] !== "dinars") return false;

  ctx.store.dinars ||= [];
  ctx.store.dinarLedger ||= [];

  if (req.method === "GET" && parts.length === 2) {
    // Soldes par voleur
    const voleurs = ctx.store.voleurs || [];
    const balances = voleurs.map((v) => {
      const d = ctx.store.dinars.find((x) => x.voleurId === v.id) || { solde: 0, mises: 0, gains: 0, pertes: 0 };
      return { voleurId: v.id, nom: v.nom, solde: d.solde, mises: d.mises, gains: d.gains, pertes: d.pertes };
    });
    return sendJson(res, 200, { balances, ledger: ctx.store.dinarLedger.slice(-50) });
  }

  if (req.method === "GET" && parts[2] === "market") {
    // Dernier état du marché : pour chaque voleur, ses dernières enchères
    const market = ctx.store.dinars.map((d) => {
      const v = ctx.store.voleurs.find((x) => x.id === d.voleurId);
      const bids = ctx.store.dinarLedger
        .filter((l) => l.voleurId === d.voleurId && l.type === "enchere")
        .slice(-10)
        .map((l) => ({
          query: l.query,
          offre: l.details ? Number((l.details.match(/Mise (\d+)D/) || [])[1]) || 0 : 0,
          retenu: l.details ? l.details.includes("retenu:true") : false,
          gain: l.montant > 0 ? l.montant : 0,
        }));
      return { voleurId: d.voleurId, nom: v?.nom || d.voleurId, solde: d.solde, encheres: bids };
    });
    return sendJson(res, 200, market);
  }

  return sendError(res, 404, "Route dinars inconnue");
}
