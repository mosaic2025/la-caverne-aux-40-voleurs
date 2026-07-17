// Onglet Les Trésors — benchmark Caverne vs agent unique (gain mesurable). Backend réel.
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { QWEN_MODELS, type Genie, type BenchResult } from "../types";

const PROVIDER_LABEL: Record<string, string> = { "qwen-cloud": "Qwen Cloud", alibaba: "Alibaba Cloud", ollama: "Ollama" };
const FALLBACK_PROVIDER_MODELS: Record<string, string[]> = {
  "qwen-cloud": QWEN_MODELS, alibaba: QWEN_MODELS,
  ollama: ["deepseek-v4-pro:cloud", "glm-5.2:cloud", "kimi-k2.7-code:cloud", "nemotron-3-ultra:cloud", "gemma4:31b:cloud", "qwen3.5:122b:cloud"],
};

export function LesTresors() {
  const [genies, setGenies] = useState<Genie[]>([]);
  const [genieId, setGenieId] = useState("");
  const [provider, setProvider] = useState<string>("qwen-cloud");
  const [baseline, setBaseline] = useState<string>("qwen-max");
  const [res, setRes] = useState<(BenchResult & { rounds?: any[]; baselineProvider?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [customQuestions, setCustomQuestions] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [openQ, setOpenQ] = useState<number | null>(null);
  const [providers, setProviders] = useState<string[]>(["qwen-cloud", "alibaba", "ollama"]);
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>(FALLBACK_PROVIDER_MODELS);

  useEffect(() => {
    api.listGenies().then((g) => { setGenies(g); if (g[0]) setGenieId(g[0].id); }).catch((e) => setErr(String(e)));
    api.listProviders().then((r) => { setProviders(r.providers); setProviderModels(r.models || FALLBACK_PROVIDER_MODELS); }).catch(() => {});
  }, []);
  const modelsFor = (p: string) => providerModels[p] || FALLBACK_PROVIDER_MODELS[p] || QWEN_MODELS;

  const run = async () => {
    if (!genieId) return;
    setBusy(true); setErr(""); setRes(null); setOpenQ(null);
    try {
      const questions = useCustom && customQuestions.trim()
        ? customQuestions.split("\n").map(q => q.trim()).filter(q => q.length > 0)
        : undefined;
      setRes(await api.benchmark(genieId, baseline as any, questions, provider));
    }
    catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const wins = res?.rounds?.reduce((acc: any, r: any) => { acc[r.winner] = (acc[r.winner] || 0) + 1; return acc; }, { caverne: 0, baseline: 0, tie: 0 }) || null;

  return (
    <section>
      <h2>Les Trésors — Banc d'essai</h2>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 12 }}>
        Mesure le gain réel du MoE (Caverne) vs un agent unique (baseline) sur une série de questions.
        Juge qualité aveugle qwen-max + latence, tokens, coût. Choisis ton provider/model de baseline.
      </p>
      {err && <p style={{ color: "#e67" }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <select value={genieId} onChange={(e) => setGenieId(e.target.value)}>
          {genies.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
        <span style={{ opacity: .6 }}>vs</span>
        <select value={provider} onChange={(e) => { const np = e.target.value; const list = modelsFor(np); setProvider(np); if (!list.includes(baseline)) setBaseline(list[0]); }}>
          {providers.map((p) => <option key={p} value={p}>{PROVIDER_LABEL[p] || p}</option>)}
        </select>
        <select value={baseline} onChange={(e) => setBaseline(e.target.value)}>
          {modelsFor(provider).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button className="tab active" disabled={busy || !genieId} onClick={run}>{busy ? "Banc d'essai…" : "Lancer"}</button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} />
          Questions personnalisées (une par ligne)
        </label>
      </div>
      {useCustom && (
        <textarea value={customQuestions} onChange={(e) => setCustomQuestions(e.target.value)} placeholder="Une question par ligne" style={{ width: "100%", minHeight: 80, background: "#0f0d0a", color: "#e8d5b5", border: "1px solid #2a2216", borderRadius: 6, padding: 8, marginBottom: 8 }} />
      )}

      {busy && <p className="stub">Appels réels en cours (Caverne + baseline + juge qwen-max)…</p>}

      {res && (
        <>
          {wins && (
            <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
              <Score label="Victoires Caverne" v={wins.caverne} color="#7ad67a" />
              <Score label="Victoires Baseline" v={wins.baseline} color="#e67" />
              <Score label="Égalités" v={wins.tie} color="#e8c766" />
            </div>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
            <thead><tr style={{ textAlign: "left", opacity: .6 }}><th>Métrique</th><th>Baseline ({res.baselineModel})</th><th>Caverne</th><th>Gain</th><th style={{ width: 160 }}>Visuel</th></tr></thead>
            <tbody>
              {res.metrics.map((m) => {
                const max = Math.max(Math.abs(m.baseline), Math.abs(m.caverne), 1);
                return (
                  <tr key={m.label} style={{ borderTop: "1px solid #2a2216" }}>
                    <td>{m.label}</td>
                    <td>{typeof m.baseline === "number" ? m.baseline.toLocaleString() : m.baseline}</td>
                    <td>{typeof m.caverne === "number" ? m.caverne.toLocaleString() : m.caverne}</td>
                    <td style={{ color: m.gainPct >= 0 ? "#7ad67a" : "#e67", fontWeight: 600 }}>{m.gainPct >= 0 ? "+" : ""}{m.gainPct}%</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <div style={{ width: "50%", height: 8, background: "#0f0d0a", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${(Math.abs(m.baseline) / max) * 100}%`, height: "100%", background: "#e67" }} /></div>
                        <div style={{ width: "50%", height: 8, background: "#0f0d0a", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${(Math.abs(m.caverne) / max) * 100}%`, height: "100%", background: "#7ad67a" }} /></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {res.rounds && res.rounds.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 8 }}>Détail par question ({res.rounds.length})</h3>
              {res.rounds.map((r: any, i: number) => (
                <div key={i} style={{ border: "1px solid #2a2216", borderRadius: 6, marginBottom: 8 }}>
                  <button onClick={() => setOpenQ(openQ === i ? null : i)} style={{ width: "100%", textAlign: "left", background: "#14110b", border: "none", color: "#e8d5b5", padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Q{i + 1} · {r.query}</span>
                    <span style={{ fontSize: 12 }}>
                      <b style={{ color: r.winner === "caverne" ? "#7ad67a" : r.winner === "baseline" ? "#e67" : "#e8c766" }}>
                        {r.winner === "caverne" ? "Caverne" : r.winner === "baseline" ? "Baseline" : "Égalité"}
                      </b> · base {r.baseScore} vs cav {r.cavScore} · {r.cavLatency}ms
                    </span>
                  </button>
                  {openQ === i && (
                    <div style={{ padding: 12, borderTop: "1px solid #2a2216", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, opacity: .6, marginBottom: 4 }}>Baseline ({res.baselineModel}) — {r.baseLatency}ms · {r.baseTokens} tok</div>
                        <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{r.baselineText}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, opacity: .6, marginBottom: 4 }}>Caverne (MoE) — {r.cavLatency}ms · {r.cavTokens} tok</div>
                        <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{r.caverneText}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Score({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div style={{ background: "#14110b", border: `1px solid ${color}55`, borderRadius: 8, padding: "10px 16px", minWidth: 140 }}>
      <div style={{ fontSize: 22, color, fontWeight: 700 }}>{v}</div>
      <div style={{ fontSize: 12, opacity: .7 }}>{label}</div>
    </div>
  );
}