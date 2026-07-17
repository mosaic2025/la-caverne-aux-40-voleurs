// Onglet L'Arène du Sabre — bande (Génie MoE) vs agent unique (qwen-max). Innovation Fable 5.
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Genie, SabreDuel } from "../types";

export function LAreneSabre() {
  const [genies, setGenies] = useState<Genie[]>([]);
  const [genieId, setGenieId] = useState("");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SabreDuel | null>(null);
  const [history, setHistory] = useState<{ duels: SabreDuel[]; total: number; bandeWins: number; soloWins: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.listGenies().then((g) => { setGenies(g); if (g[0]) setGenieId((id) => id || g[0].id); }).catch((e) => setErr(String(e)));
    loadHistory();
  }, []);

  const loadHistory = () => api.listSabres().then(setHistory).catch(() => {});

  const run = async () => {
    if (!genieId || !query.trim()) return;
    setBusy(true); setErr(""); setResult(null);
    try {
      const d = await api.sabre(genieId, query);
      setResult(d);
      loadHistory();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const winRate = history && history.total ? Math.round((history.bandeWins / history.total) * 100) : 0;

  return (
    <section>
      <h2>⚔️ L'Arène du Sabre</h2>
      <p style={{ opacity: 0.7, fontSize: 13 }}>La bande (Génie MoE) affronte un agent unique qwen-max. Un juge impartial note chaque réponse sur 10.</p>
      {err && <p style={{ color: "#e67" }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <select value={genieId} onChange={(e) => setGenieId(e.target.value)}>
          {genies.map((g) => <option key={g.id} value={g.id}>{g.nom} (reliquat {g.reliquat})</option>)}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Question pour le duel…" style={{ flex: 1, minWidth: 200 }} />
        <button className="tab active" disabled={busy || !genieId} onClick={run}>{busy ? "Duel…" : "⚔️ Crosser le fer"}</button>
      </div>

      {result && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>{result.gagnant === "bande" ? "🏴" : "🗡️"}</span>
            <b>Vainqueur : {result.gagnant === "bande" ? "La Bande" : "L'Agent Solo"}</b>
            <span style={{ opacity: 0.6 }}>écart qualité {result.ecartQualite > 0 ? "+" : ""}{result.ecartQualite}/10</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ border: `1px solid ${result.gagnant === "bande" ? "#e8c766" : "#2a2216"}`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: result.gagnant === "bande" ? "#e8c766" : "#b8a878", fontWeight: 700 }}>Bande (Génie MoE) {result.gagnant === "bande" ? "👑" : ""}</div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 6 }}>{result.bande}</div>
            </div>
            <div style={{ border: `1px solid ${result.gagnant === "solo" ? "#e8c766" : "#2a2216"}`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: result.gagnant === "solo" ? "#e8c766" : "#b8a878", fontWeight: 700 }}>Agent Solo (qwen-max) {result.gagnant === "solo" ? "👑" : ""}</div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 6 }}>{result.solo}</div>
            </div>
          </div>
        </div>
      )}

      {history && history.total > 0 && (
        <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <b>Historique des duels</b>
            <span style={{ color: "#e8c766" }}>{history.bandeWins}🏴 / {history.soloWins}🗡️ · {winRate}% pour la Bande</span>
          </div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {history.duels.map((d, i) => (
              <div key={i} style={{ background: "#0f0d0a", borderRadius: 6, padding: 8, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{d.gagnant === "bande" ? "🏴 Bande" : "🗡️ Solo"}</span>
                  <span style={{ opacity: 0.6 }}>{d.ecartQualite > 0 ? "+" : ""}{d.ecartQualite}</span>
                </div>
                <div style={{ opacity: 0.5, marginTop: 4 }}>{d.query.slice(0, 45)}…</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
