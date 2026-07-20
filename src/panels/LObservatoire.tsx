// Onglet L'Observatoire — tableau de bord d'observabilité temps réel de l'orchestrateur.
// Montre le RAISONNEMENT du Génie : qui est sélectionné, pourquoi, coût/agent, temps,
// confiance, fusion finale, et l'historique des décisions. Consomme /api/ask en SSE.
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { Genie, MoeRun } from "../types";

const PRICES: Record<string, number> = {
  "qwen-turbo": 0.0003, "qwen-plus": 0.0012, "qwen-max": 0.006,
  "qwen-coder-plus": 0.0035, "qwen-vl-plus": 0.0021, "text-embedding-v3": 0.00007,
};
const cost = (model: string, tokens: number) => ((PRICES[model] ?? 0.0012) * (tokens || 0));
const fmtCost = (c: number) => `$${c.toFixed(5)}`;

interface Enchere { voleurId: string; nom: string; offre: number; justification: string; tokens: number; score: number; valeur: number; }
interface LiveFrag { voleurId: string; nom: string; text: string; tokens: number; t: number; }
interface FinalRun {
  id: string; query: string; answer: string;
  fragments?: { voleurId: string; text: string; tokens: number }[];
  tokens?: { routing: number; selection: number; fragments: number; fusion: number; total: number };
  latencyMs?: number;
  bazaar?: { encheres: Enchere[]; winners: string[]; losers: string[]; costDinars: number };
  traitor?: { severity: string; tokens: number };
  routingStrategy?: string; routingMode?: string;
}

export function LObservatoire() {
  const [genies, setGenies] = useState<Genie[]>([]);
  const [genieId, setGenieId] = useState("");
  const [query, setQuery] = useState("");
  const [k, setK] = useState(3);
  const [busy, setBusy] = useState(false);
  const [frags, setFrags] = useState<LiveFrag[]>([]);
  const [finalRun, setFinalRun] = useState<FinalRun | null>(null);
  const [traitor, setTraitor] = useState<{ severity: string; tokens: number } | null>(null);
  const [liveBazaar, setLiveBazaar] = useState<{ encheres: Enchere[]; winners: string[] } | null>(null);
  const [liveRouting, setLiveRouting] = useState<{ routing: { voleurId: string; score: number; retenu?: boolean }[]; mode: string } | null>(null);
  const [history, setHistory] = useState<MoeRun[]>([]);
  const [t0, setT0] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { api.listGenies().then((g) => { setGenies(g); if (g[0]) setGenieId(g[0].id); }).catch(() => {}); }, []);
  const loadHistory = () => api.listRuns().then((r) => setHistory((r || []).slice(-12).reverse())).catch(() => {});
  useEffect(() => { loadHistory(); }, []);

  const voleurNom = (id: string) => {
    const e = finalRun?.bazaar?.encheres?.find((x) => x.voleurId === id);
    if (e?.nom) return e.nom;
    return id;
  };

  const run = async () => {
    if (!genieId || !query.trim()) return;
    setBusy(true); setFrags([]); setFinalRun(null); setTraitor(null); setLiveBazaar(null); setLiveRouting(null); setElapsed(0);
    const start = Date.now(); setT0(start);
    timer.current = setInterval(() => setElapsed(Date.now() - start), 100);
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genieId, query: query.trim(), k }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() || "";
        for (const ev of events) {
          let etype = "", dataStr = "";
          for (const ln of ev.split("\n")) {
            if (ln.startsWith("event:")) etype = ln.slice(6).trim();
            else if (ln.startsWith("data:")) dataStr += ln.slice(5).trim();
          }
          if (!dataStr) continue;
          let data: any = {}; try { data = JSON.parse(dataStr); } catch { continue; }
          if (etype === "bazaar") {
            setLiveBazaar({ encheres: data.encheres || [], winners: (data.winners || []).map((w: any) => w.voleurId || w) });
          } else if (etype === "routing") {
            setLiveRouting({ routing: data.routing || [], mode: data.mode || "" });
          } else if (etype === "fragment") {
            setFrags((prev) => [...prev, { voleurId: data.voleurId, nom: data.voleurId, text: data.text, tokens: data.tokens, t: Date.now() - start }]);
          } else if (etype === "traitor") {
            setTraitor({ severity: data.severity, tokens: data.tokens });
          } else if (etype === "final") {
            setFinalRun(data as FinalRun);
          } else if (etype === "error") {
            setFrags((prev) => [...prev, { voleurId: "error", nom: "erreur", text: data.error || "erreur", tokens: 0, t: Date.now() - start }]);
          }
        }
      }
      loadHistory();
    } catch (e: any) {
      if (e.name !== "AbortError") setFrags((prev) => [...prev, { voleurId: "error", nom: "erreur", text: String(e.message), tokens: 0, t: Date.now() - start }]);
    } finally {
      if (timer.current) clearInterval(timer.current);
      setBusy(false);
    }
  };

  const stop = () => { abortRef.current?.abort(); if (timer.current) clearInterval(timer.current); setBusy(false); };

  const encheres = finalRun?.bazaar?.encheres || liveBazaar?.encheres || [];
  const winners = finalRun?.bazaar?.winners || liveBazaar?.winners || [];
  const losers = finalRun?.bazaar?.losers || [];
  const totalTokens = finalRun?.tokens?.total ?? 0;
  const totalCost = finalRun ? (finalRun.fragments || []).reduce((s, f) => s + cost((finalRun as any).modele || "qwen-plus", f.tokens), 0) + cost("qwen-max", finalRun.tokens?.fusion ?? 0) : 0;

  return (
    <section>
      <h2>L'Observatoire — raisonnement de l'orchestrateur en temps réel</h2>
      <p style={{ opacity: .6, fontSize: 13 }}>Voit <b>qui</b> est sélectionné, <b>pourquoi</b>, le <b>coût par agent</b>, le <b>temps</b>, la <b>confiance</b>, la <b>fusion</b> et l'<b>historique des décisions</b>.</p>

      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr auto auto", marginBottom: 10 }}>
        <select value={genieId} onChange={(e) => setGenieId(e.target.value)} disabled={busy}>
          {genies.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
        <input placeholder="Question difficile (multi-domaine)…" value={query} onChange={(e) => setQuery(e.target.value)} disabled={busy} />
        <select value={k} onChange={(e) => setK(+e.target.value)} disabled={busy}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>k={n}</option>)}</select>
        {busy ? <button className="tab" onClick={stop} style={{ background: "#8b1a1a", color: "#fff" }}>⏹ Stop</button> : <button className="tab active" onClick={run} style={{ background: "#b8860b", color: "#14110b" }}>▶ Orchestrer</button>}
      </div>

      {t0 > 0 && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12, fontSize: 13 }}>
          <span>⏱️ <b>{(elapsed / 1000).toFixed(1)}s</b>{finalRun ? ` (final: ${(finalRun.latencyMs ? (finalRun.latencyMs / 1000).toFixed(1) : "?")}s)` : " …"}</span>
          {finalRun && <span>🎲 stratégie <b>{finalRun.routingStrategy}</b> / mode <b>{finalRun.routingMode}</b></span>}
          {!finalRun && liveRouting && <span>🎲 mode <b>{liveRouting.mode}</b> · {liveRouting.routing.length} candidats</span>}
          {finalRun && <span>🪙 tokens <b>{totalTokens}</b> · coût ≈ <b>{fmtCost(totalCost)}</b></span>}
          {traitor && <span>🛡️ traitor <b style={{ color: traitor.severity === "none" ? "#7ad67a" : "#e67" }}>{traitor.severity}</b></span>}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Sélection — pourquoi chaque agent */}
        <div style={{ border: "1px solid #2a2216", borderRadius: 8, padding: 10 }}>
          <h3 style={{ marginTop: 0 }}>🎯 Sélection des agents {finalRun ? `(${winners.length} retenus / ${encheres.length})` : ""}</h3>
          {!encheres.length && <p style={{ opacity: .4, fontSize: 13 }}>{busy ? "enchères en cours…" : "lance une requête pour voir la sélection"}</p>}
          {encheres.map((e) => {
            const retenu = winners.includes(e.voleurId);
            return (
              <div key={e.voleurId} style={{ padding: 8, marginBottom: 6, borderRadius: 6, border: `1px solid ${retenu ? "#b8860b" : "#3a2e1a"}`, background: retenu ? "#1a1610" : "#100d09", opacity: retenu ? 1 : 0.6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b style={{ color: retenu ? "#b8860b" : "#888" }}>{retenu ? "✓" : "✗"} {e.nom}</b>
                  <span style={{ fontSize: 12, opacity: .7 }}>offre {e.offre} · {e.tokens} tok · val {e.valeur.toFixed(4)}</span>
                </div>
                <div style={{ fontSize: 12, opacity: .75, marginTop: 4 }}>« {e.justification} »</div>
              </div>
            );
          })}
          {losers.length > 0 && <div style={{ fontSize: 11, opacity: .5, marginTop: 4 }}>Écartés : {losers.map((id) => encheres.find((e) => e.voleurId === id)?.nom || id).join(", ")}</div>}
        </div>

        {/* Fusion finale */}
        <div style={{ border: "1px solid #2a2216", borderRadius: 8, padding: 10 }}>
          <h3 style={{ marginTop: 0 }}>🔀 Fusion finale (orchestrateur qwen-max)</h3>
          {!finalRun?.answer && <p style={{ opacity: .4, fontSize: 13 }}>{busy ? "fusion en cours…" : "—"}</p>}
          {finalRun?.answer && <div style={{ whiteSpace: "pre-wrap", fontSize: 13, maxHeight: 260, overflow: "auto" }}>{finalRun.answer}</div>}
          {finalRun && <div style={{ fontSize: 11, opacity: .5, marginTop: 8 }}>fragments {finalRun.tokens?.fragments} + fusion {finalRun.tokens?.fusion} = {finalRun.tokens?.total} tok</div>}
        </div>
      </div>

      {/* Flux live des fragments */}
      {frags.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <h3>📡 Flux des experts (live)</h3>
          {frags.map((f, i) => (
            <div key={i} style={{ padding: 8, marginBottom: 6, border: "1px solid #2a2216", borderRadius: 6, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", opacity: .7, fontSize: 12 }}>
                <span>{f.voleurId === "error" ? "⚠️" : "🧠"} {voleurNom(f.voleurId)}</span>
                <span>+{(f.t / 1000).toFixed(1)}s · {f.tokens} tok</span>
              </div>
              <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{f.text.slice(0, 400)}{f.text.length > 400 ? "…" : ""}</div>
            </div>
          ))}
        </div>
      )}

      {/* Historique des décisions */}
      <div style={{ marginTop: 18 }}>
        <h3>📜 Historique des décisions</h3>
        <p style={{ opacity: .5, fontSize: 12 }}>Les {history.length} dernières orchestrations (stratégie, agents, tokens, latence).</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ textAlign: "left", opacity: .6 }}><th>Query</th><th>Stratégie</th><th>Agents</th><th>Tokens</th><th>Latence</th></tr></thead>
          <tbody>
            {history.map((r: any) => (
              <tr key={r.id} style={{ borderTop: "1px solid #2a2216" }}>
                <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.query}</td>
                <td>{r.routingStrategy}/{r.routingMode}</td>
                <td>{(r.fragments || []).map((f: any) => voleurNom(f.voleurId)).join(", ") || "—"}</td>
                <td>{r.tokens?.total ?? "—"}</td>
                <td>{r.latencyMs ? `${(r.latencyMs / 1000).toFixed(1)}s` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
