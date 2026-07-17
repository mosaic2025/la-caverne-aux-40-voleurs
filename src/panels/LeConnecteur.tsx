// Onglet Le Connecteur — connaissance partagée + capacités du meta-orchestrateur
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { SharedKnowledgeStats } from "../types";

interface GraphData {
  nodes: { id: string; weight: number }[];
  edges: { source: string; target: string; weight: number }[];
}

interface Hit {
  id: string;
  docId: string;
  text: string;
  score: number;
  metadata?: { title?: string; nom?: string };
}

export function LeConnecteur() {
  const [stats, setStats] = useState<SharedKnowledgeStats | null>(null);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState("chef");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [graph, setGraph] = useState<GraphData | null>(null);

  useEffect(() => {
    loadStats();
    loadGraph();
    api.metaCapabilities().then((r) => setCapabilities(r.capabilities)).catch(() => {});
  }, []);

  const loadStats = async () => {
    try { setStats(await api.sharedKnowledgeStats()); }
    catch (e) { setErr(String(e)); }
  };

  const loadGraph = async () => {
    try { setGraph(await api.sharedKnowledgeGraph()); }
    catch (e) { /* silently ignore */ }
  };

  const contribute = async () => {
    if (!text.trim()) return;
    setBusy(true); setErr("");
    try {
      await api.contributeSharedKnowledge(userId, text);
      setText("");
      await loadStats();
      await loadGraph();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true); setErr("");
    try {
      const r = await api.sharedKnowledgeSearch(query, 5);
      setHits(r.hits);
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  return (
    <section>
      <h2>Le Connecteur de Pensée</h2>
      <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
        Un savoir commun nourri par tous les utilisateurs. Chaque contribution enrichit la mémoire collective de la Caverne.
        Objectif : 1B → 1T tokens de savoir partagé.
      </p>
      {err && <p style={{ color: "#e67" }}>{err}</p>}

      {stats && (
        <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>Contributions</div>
              <div style={{ fontSize: 24 }}>{stats.entries}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>Tokens estimés</div>
              <div style={{ fontSize: 24, color: "#b8860b" }}>{stats.estimatedTokensLabel}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🔗 Connecter au savoir commun</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Identifiant (anonymisé)" />
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Partage un savoir, une astuce, une procédure..." style={{ minHeight: 80 }} />
          <button onClick={contribute} disabled={busy || !text.trim()}>{busy ? "Contribution…" : "Connecter au savoir commun"}</button>
        </div>
      </div>

      <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🔎 Recherche fédérée dans le savoir partagé</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un concept..." style={{ flex: 1 }} />
          <button onClick={search} disabled={busy || !query.trim()}>{busy ? "…" : "Rechercher"}</button>
        </div>
        {hits.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflow: "auto" }}>
            {hits.map((h) => (
              <div key={h.id} style={{ background: "#0f0d0a", borderRadius: 6, padding: 8, fontSize: 12 }}>
                <div style={{ opacity: 0.6, marginBottom: 2 }}>Score {h.score} · {h.docId}</div>
                <div>{h.text.slice(0, 300)}{h.text.length > 300 && "…"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {graph && graph.nodes.length > 0 && (
        <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🕸️ Graphe de concepts ({graph.nodes.length} nœuds, {graph.edges.length} liens)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 160, overflow: "auto" }}>
            {graph.nodes.slice(0, 30).map((n) => (
              <span key={n.id} style={{ background: "#0f0d0a", border: "1px solid #2a2216", borderRadius: 12, padding: "2px 8px", fontSize: 12 }}>
                {n.id} · {n.weight}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Capacités de l'orchestrateur multicouche</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {capabilities.map((c) => (
            <span key={c} style={{ background: "#0f0d0a", border: "1px solid #2a2216", borderRadius: 12, padding: "2px 8px", fontSize: 12 }}>{c}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
