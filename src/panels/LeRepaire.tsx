// Onglet Le Repaire — chef, roster, monitoring tokens live + reliquat. Backend réel.
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Voleur, Genie, MoeRun, DinarMarketSnapshot } from "../types";

export function LeRepaire() {
  const [voleurs, setVoleurs] = useState<Voleur[]>([]);
  const [genies, setGenies] = useState<Genie[]>([]);
  const [runs, setRuns] = useState<MoeRun[]>([]);
  const [market, setMarket] = useState<DinarMarketSnapshot[]>([]);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const [v, g, r, m] = await Promise.all([
        api.listVoleurs(), api.listGenies(), api.listRuns().catch(() => []), api.dinarMarket().catch(() => []),
      ]);
      setVoleurs(v); setGenies(g); setRuns(r); setMarket(m);
    } catch (e) { setErr(String(e)); }
  };
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  const totalTokens = runs.reduce((s, r) => s + (r.tokens?.total ?? 0), 0);
  const reliquat = genies.reduce((s, g) => s + (g.reliquat ?? 0), 0);
  const budget = genies.reduce((s, g) => s + (g.budgetTotal ?? 0), 0);
  const pct = budget ? Math.round(((budget - reliquat) / budget) * 100) : 0;

  // Pouls du Repaire — débit tokens sur la dernière minute (innovation: cardiogramme énergétique MoE)
  const now = Date.now();
  const recent = runs.filter((r) => now - (r.ts ?? 0) < 60_000);
  const debit = recent.reduce((s, r) => s + (r.tokens?.total ?? 0), 0);
  const debitParSec = Math.round(debit / 60);
  const vivacite = recent.length; // requêtes/min

  return (
    <section>
      <h2>Le Repaire</h2>
      {err && <p style={{ color: "#e67" }}>{err}</p>}
      <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
        <Stat label="Voleurs actifs" value={voleurs.filter((v) => v.actif).length} />
        <Stat label="Génies" value={genies.length} />
        <Stat label="Requêtes MoE" value={runs.length} />
        <Stat label="Tokens consommés" value={totalTokens} />
      </div>

      {/* Pouls live — cardiogramme énergétique */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 22, animation: "pulse 1.2s infinite", color: vivacite > 0 ? "#7ad67a" : "#666" }} title="Pouls du Repaire">❤</span>
        <div>
          <div style={{ fontSize: 12, opacity: .7 }}>Pouls du Repaire — vivacité</div>
          <div style={{ fontSize: 14 }}>{vivacite} req/min · <b style={{ color: "#b8860b" }}>{debitParSec}</b> tok/s sur la dernière minute</div>
        </div>
        <div style={{ flex: 1, display: "flex", gap: 2, alignItems: "flex-end", height: 28, marginLeft: 12 }}>
          {Array.from({ length: 30 }).map((_, i) => {
            const bucketStart = now - (30 - i) * 2000;
            const c = runs.filter((r) => (r.ts ?? 0) >= bucketStart && (r.ts ?? 0) < bucketStart + 2000).length;
            return <div key={i} style={{ flex: 1, height: `${Math.min(100, c * 33)}%`, background: c > 0 ? "#b8860b" : "#2a2216", minHeight: 2 }} />;
          })}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ opacity: .6, fontSize: 13 }}>Budget : {budget - reliquat} / {budget} tokens ({pct}%) · reliquat {reliquat}</div>
        <div style={{ height: 10, background: "#2a2216", borderRadius: 6, overflow: "hidden", marginTop: 4 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "#e8c766" }} />
        </div>
      </div>
      <h3 style={{ opacity: .8 }}>Roster</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ textAlign: "left", opacity: .6 }}><th>Nom</th><th>Modèle</th><th>Statut</th><th>Tokens</th><th>Perf</th><th>Dinars</th></tr></thead>
        <tbody>
          {voleurs.map((v) => {
            const solde = market.find((m) => m.voleurId === v.id)?.solde ?? v.soldeDinars ?? 0;
            return (
              <tr key={v.id} style={{ borderTop: "1px solid #2a2216" }}>
                <td>{v.nom}</td><td>{v.modele}</td>
                <td>{v.actif ? "● actif" : "○ dormant"}</td>
                <td>{v.tokensUtilises}</td><td>{v.perf?.toFixed(2) ?? "—"}</td>
                <td style={{ color: solde > 800 ? "#7ad67a" : solde < 200 ? "#e67" : "#e8c766" }}>{solde} 🪙</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3 style={{ opacity: .8, marginTop: 20 }}>🪙 Bazar des Dinars — dernières enchères</h3>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {market.map((m) => (
          <div key={m.voleurId} style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 6, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <b>{m.nom}</b>
              <span style={{ color: "#e8c766" }}>{m.solde} 🪙</span>
            </div>
            <div style={{ fontSize: 12, opacity: .6, marginTop: 4 }}>
              {m.encheres.slice(-3).map((e, i) => (
                <div key={i} style={{ color: e.retenu ? "#7ad67a" : "#888" }}>
                  {e.retenu ? "✓" : "×"} offre {e.offre}D — {e.query.slice(0, 30)}…
                </div>
              ))}
              {!m.encheres.length && <div>Aucune enchère</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#e8c766" }}>{value}</div>
      <div style={{ fontSize: 12, opacity: .6 }}>{label}</div>
    </div>
  );
}
