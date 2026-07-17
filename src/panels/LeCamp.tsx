// Onglet Le Camp — création/gestion des Voleurs (experts multi-provider). Backend réel.
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { QWEN_MODELS, type Voleur, type Effort } from "../types";

const EFFORTS: Effort[] = ["low", "med", "high"];
const PROVIDER_LABEL: Record<string, string> = { "qwen-cloud": "Qwen Cloud", alibaba: "Alibaba Cloud", ollama: "Ollama" };
const FALLBACK_PROVIDER_MODELS: Record<string, string[]> = {
  "qwen-cloud": QWEN_MODELS, alibaba: QWEN_MODELS, ollama: ["deepseek-v4-pro:cloud","deepseek-v4-flash:cloud","glm-5.2:cloud","glm-5.1:cloud","kimi-k2.7-code:cloud","kimi-k2.6:cloud","nemotron-3-ultra:cloud","nemotron-3-super:cloud","minimax-m3:cloud","gemma4:31b:cloud","qwen3.5:122b:cloud","gpt-oss:120b:cloud","gemini-3-flash-preview:cloud","mistral-large-3:cloud"],
};

// Jaccard sur les mots de spécialité (0 = disjoints, 1 = identiques).
function jaccard(a: string, b: string) {
  const ta = new Set(a.toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter(Boolean));
  const tb = new Set(b.toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter++;
  return inter / (ta.size + tb.size - inter);
}

// Indice de Moediversité — entropie de Shannon sur les mots de spécialité.
// Mesure la couverture sémantique du camp (brevêtable : "Moediversity Index" pour optimisation MoE).
function moediversity(specialites: string[]) {
  if (!specialites.length) return 0;
  const freq: Record<string, number> = {};
  let total = 0;
  for (const s of specialites) {
    for (const w of s.toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter(Boolean)) {
      freq[w] = (freq[w] || 0) + 1; total++;
    }
  }
  if (!total) return 0;
  let H = 0;
  for (const w in freq) {
    const p = freq[w] / total;
    H -= p * Math.log2(p);
  }
  return H; // bits — plus haut = couverture sémantique large
}

export function LeCamp() {
  const [voleurs, setVoleurs] = useState<Voleur[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    nom: "", specialite: "", modele: "qwen-turbo" as string,
    effort: "med" as Effort, systemPrompt: "", capTokens: 300,
    provider: "qwen-cloud" as string,
  });
  const [providers, setProviders] = useState<string[]>(["qwen-cloud", "alibaba", "ollama"]);
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>(FALLBACK_PROVIDER_MODELS);

  const load = () => api.listVoleurs().then(setVoleurs).catch((e) => setErr(String(e)));
  useEffect(() => {
    load();
    api.listProviders().then((r) => {
      setProviders(r.providers);
      setProviderModels(r.models || FALLBACK_PROVIDER_MODELS);
    }).catch(() => {});
  }, []);

  const modelsFor = (p: string) => providerModels[p] || FALLBACK_PROVIDER_MODELS[p] || QWEN_MODELS;

  const create = async () => {
    setErr(""); setBusy(true);
    try {
      await api.createVoleur({ ...f, modele: f.modele as any });
      setF({ ...f, nom: "", specialite: "", systemPrompt: "" });
      await load();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };
  const del = async (id: string) => { await api.deleteVoleur(id); load(); };

  // Alliances suggérées : paires de voleurs à spécialités complémentaires (Jaccard faible).
  const alliances = useMemo(() => {
    const out: { a: Voleur; b: Voleur; score: number }[] = [];
    for (let i = 0; i < voleurs.length; i++) {
      for (let j = i + 1; j < voleurs.length; j++) {
        const sim = jaccard(voleurs[i].specialite, voleurs[j].specialite);
        if (sim < 0.34) out.push({ a: voleurs[i], b: voleurs[j], score: 1 - sim });
      }
    }
    return out.sort((x, y) => y.score - x.score).slice(0, 5);
  }, [voleurs]);

  return (
    <section>
      <h2>Le Camp — {voleurs.length} voleur(s)</h2>
      {err && <p style={{ color: "#e67" }}>{err}</p>}
      {voleurs.length > 0 && (() => {
        const div = moediversity(voleurs.map((v) => v.specialite));
        const maxH = Math.log2(voleurs.length + 1) || 1;
        const pct = Math.round((div / maxH) * 100);
        return (
          <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }} title="Indice de Moediversité — entropie de Shannon sur les spécialités">🧬</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, opacity: .7 }}>Indice de Moediversité — couverture sémantique du camp</div>
              <div style={{ height: 8, background: "#0f0d0a", borderRadius: 4, overflow: "hidden", marginTop: 4 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct > 66 ? "#7ad67a" : pct > 33 ? "#e8c766" : "#e67" }} />
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#b8860b" }}>{div.toFixed(2)}<span style={{ fontSize: 11, opacity: .5 }}> bits</span></div>
              <div style={{ fontSize: 11, opacity: .5 }}>{pct}% du max</div>
            </div>
          </div>
        );
      })()}
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
        <input placeholder="Nom" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} />
        <input placeholder="capTokens" type="number" value={f.capTokens} onChange={(e) => setF({ ...f, capTokens: +e.target.value })} />
        <input placeholder="Spécialité (routage embedding)" value={f.specialite} style={{ gridColumn: "1/3" }} onChange={(e) => setF({ ...f, specialite: e.target.value })} />
        <select value={f.provider} onChange={(e) => {
          const np = e.target.value;
          const list = modelsFor(np);
          setF({ ...f, provider: np, modele: list.includes(f.modele) ? f.modele : list[0] });
        }}>
          {providers.map((p) => <option key={p} value={p}>{PROVIDER_LABEL[p] || p}</option>)}
        </select>
        <select value={f.modele} onChange={(e) => setF({ ...f, modele: e.target.value })}>
          {modelsFor(f.provider).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={f.effort} onChange={(e) => setF({ ...f, effort: e.target.value as Effort })}>
          {EFFORTS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <span style={{ opacity: .5, fontSize: 12, alignSelf: "center" }}>Provider pilote l'embedding + le chat</span>
        <textarea placeholder="Prompt système (cadrage)" value={f.systemPrompt} style={{ gridColumn: "1/3", minHeight: 60 }} onChange={(e) => setF({ ...f, systemPrompt: e.target.value })} />
        <button className="tab active" disabled={busy || !f.nom || !f.specialite} onClick={create} style={{ gridColumn: "1/3" }}>
          {busy ? "Invitation…" : "Inviter un Voleur"}
        </button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ textAlign: "left", opacity: .6 }}>
          <th>Nom</th><th>Spécialité</th><th>Provider</th><th>Modèle</th><th>Perf</th><th>Tokens</th><th />
        </tr></thead>
        <tbody>
          {voleurs.map((v) => {
            const perf = typeof v.perf === "number" ? v.perf : 0.5;
            return (
              <tr key={v.id} style={{ borderTop: "1px solid #2a2216" }}>
                <td>{v.nom}</td>
                <td>
                  {v.specialite.split(/[,;]+/).map((s) => s.trim()).filter(Boolean).map((s, i) => (
                    <span key={i} style={{ display: "inline-block", background: "#2a2216", borderRadius: 4, padding: "1px 6px", marginRight: 4, fontSize: 11 }}>{s}</span>
                  ))}
                </td>
                <td><span style={{ opacity: .8, fontSize: 12 }}>{PROVIDER_LABEL[v.provider] || v.provider || "qwen-cloud"}</span></td>
                <td>{v.modele}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 60, height: 6, background: "#2a2216", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${Math.round(perf * 100)}%`, height: "100%", background: perf > 0.75 ? "#7ad67a" : perf > 0.5 ? "#e8c766" : "#e67" }} />
                    </div>
                    <span style={{ fontSize: 11, opacity: .6 }}>{Math.round(perf * 100)}%</span>
                  </div>
                </td>
                <td>{v.tokensUtilises}</td>
                <td><button onClick={() => del(v.id)} style={{ cursor: "pointer" }}>Exiler</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {alliances.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ marginBottom: 6 }}>🤝 Alliances complémentaires suggérées</h3>
          <p style={{ opacity: .5, fontSize: 12, marginBottom: 8 }}>Paires de voleurs aux spécialités disjointes — un MoE qui les fusionne couvre un spectre plus large.</p>
          {alliances.map(({ a, b, score }, i) => (
            <div key={i} style={{ padding: 8, marginBottom: 6, border: "1px solid #2a2216", borderRadius: 6, display: "flex", justifyContent: "space-between" }}>
              <span><b>{a.nom}</b> <span style={{ opacity: .5 }}>×</span> <b>{b.nom}</b></span>
              <span style={{ opacity: .6, fontSize: 12 }}>complémentarité {(score * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}