// Onglet Le Camp — création/gestion des Voleurs (experts multi-provider). Backend réel.
// + 3 features "jury" alimentées par Qwen Cloud : L'Embûche, Le Conciliabule, Les Sceaux.
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { QWEN_MODELS, type Voleur, type Effort, type CampAudit, type CampForge, type CampSigil, type CampRecrue } from "../types";

const EFFORTS: Effort[] = ["low", "med", "high"];
const PROVIDER_LABEL: Record<string, string> = { "qwen-cloud": "Qwen Cloud", alibaba: "Alibaba Cloud", ollama: "Ollama" };
const FALLBACK_PROVIDER_MODELS: Record<string, string[]> = {
  "qwen-cloud": QWEN_MODELS, alibaba: QWEN_MODELS, ollama: ["deepseek-v4-pro:cloud","deepseek-v4-flash:cloud","glm-5.2:cloud","glm-5.1:cloud","kimi-k2.7-code:cloud","kimi-k2.6:cloud","nemotron-3-ultra:cloud","nemotron-3-super:cloud","minimax-m3:cloud","gemma4:31b:cloud","qwen3.5:122b:cloud","gpt-oss:120b:cloud","gemini-3-flash-preview:cloud","mistral-large-3:cloud"],
};

function jaccard(a: string, b: string) {
  const ta = new Set(a.toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter(Boolean));
  const tb = new Set(b.toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0; for (const w of ta) if (tb.has(w)) inter++;
  return inter / (ta.size + tb.size - inter);
}

function moediversity(specialites: string[]) {
  if (!specialites.length) return 0;
  const freq: Record<string, number> = {}; let total = 0;
  for (const s of specialites) for (const w of s.toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter(Boolean)) { freq[w] = (freq[w] || 0) + 1; total++; }
  if (!total) return 0;
  let H = 0; for (const w in freq) { const p = freq[w] / total; H -= p * Math.log2(p); }
  return H;
}

type SubTab = "camp" | "embuche" | "conciliabule" | "sceaux";

export function LeCamp() {
  const [voleurs, setVoleurs] = useState<Voleur[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sub, setSub] = useState<SubTab>("camp");
  const [f, setF] = useState({ nom: "", specialite: "", modele: "qwen-turbo" as string, effort: "med" as Effort, systemPrompt: "", capTokens: 300, provider: "qwen-cloud" as string });
  const [providers] = useState<string[]>(["qwen-cloud", "alibaba", "ollama"]);
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>(FALLBACK_PROVIDER_MODELS);

  const load = () => api.listVoleurs().then(setVoleurs).catch((e) => setErr(String(e)));
  useEffect(() => {
    load();
    api.listProviders().then((r) => setProviderModels(r.models || FALLBACK_PROVIDER_MODELS)).catch(() => {});
  }, []);
  const modelsFor = (p: string) => providerModels[p] || FALLBACK_PROVIDER_MODELS[p] || QWEN_MODELS;

  const create = async (rec?: Partial<typeof f> & { nom?: string; specialite?: string; systemPrompt?: string; provider?: string; modele?: string; effort?: Effort; capTokens?: number }) => {
    const data = rec ? { ...f, ...rec } : f;
    setErr(""); setBusy(true);
    try { await api.createVoleur({ ...data, modele: data.modele as any } as any); await load(); return true; }
    catch (e) { setErr(String(e)); return false; } finally { setBusy(false); }
  };
  const del = async (id: string) => { await api.deleteVoleur(id); load(); };

  const alliances = useMemo(() => {
    const out: { a: Voleur; b: Voleur; score: number }[] = [];
    for (let i = 0; i < voleurs.length; i++) for (let j = i + 1; j < voleurs.length; j++) {
      const sim = jaccard(voleurs[i].specialite, voleurs[j].specialite);
      if (sim < 0.34) out.push({ a: voleurs[i], b: voleurs[j], score: 1 - sim });
    }
    return out.sort((x, y) => y.score - x.score).slice(0, 5);
  }, [voleurs]);

  const div = voleurs.length ? moediversity(voleurs.map((v) => v.specialite)) : 0;
  const maxH = voleurs.length ? Math.log2(voleurs.length + 1) || 1 : 1;
  const pct = Math.round((div / maxH) * 100);

  return (
    <section>
      <h2>Le Camp — {voleurs.length} voleur(s)</h2>

      <nav style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {([["camp","🏕️ Le Camp"],["embuche","⚔️ L'Embûche"],["conciliabule","🏛️ Le Conciliabule"],["sceaux","🛡️ Les Sceaux"]] as [SubTab,string][]).map(([k,l]) => (
          <button key={k} className={sub===k?"tab active":"tab"} onClick={()=>setSub(k)} style={sub===k?{background:"#b8860b",color:"#14110b"}:{}}>{l}</button>
        ))}
      </nav>

      {err && <p style={{ color: "#e67" }}>{err}</p>}

      {sub === "camp" && (
        <>
          {voleurs.length > 0 && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }} title="Indice de Moediversité">🧬</span>
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
          )}
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
            <input placeholder="Nom" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} />
            <input placeholder="capTokens" type="number" value={f.capTokens} onChange={(e) => setF({ ...f, capTokens: +e.target.value })} />
            <input placeholder="Spécialité (routage embedding)" value={f.specialite} style={{ gridColumn: "1/3" }} onChange={(e) => setF({ ...f, specialite: e.target.value })} />
            <select value={f.provider} onChange={(e) => { const np = e.target.value; const list = modelsFor(np); setF({ ...f, provider: np, modele: list.includes(f.modele) ? f.modele : list[0] }); }}>
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
            <button className="tab active" disabled={busy || !f.nom || !f.specialite} onClick={() => create()} style={{ gridColumn: "1/3" }}>
              {busy ? "Invitation…" : "Inviter un Voleur"}
            </button>
          </div>
          <VoleursTable voleurs={voleurs} onDelete={del} />
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
        </>
      )}

      {sub === "embuche" && <Embuche voleurs={voleurs} onRecruit={create} />}
      {sub === "conciliabule" && <Conciliabule onRecruit={create} />}
      {sub === "sceaux" && <Sceaux voleurs={voleurs} />}
    </section>
  );
}

function VoleursTable({ voleurs, onDelete }: { voleurs: Voleur[]; onDelete: (id: string) => void }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr style={{ textAlign: "left", opacity: .6 }}><th>Nom</th><th>Spécialité</th><th>Provider</th><th>Modèle</th><th>Perf</th><th>Tokens</th><th /></tr></thead>
      <tbody>
        {voleurs.map((v) => {
          const perf = typeof v.perf === "number" ? v.perf : 0.5;
          return (
            <tr key={v.id} style={{ borderTop: "1px solid #2a2216" }}>
              <td>{v.nom}</td>
              <td>{v.specialite.split(/[,;]+/).map((s) => s.trim()).filter(Boolean).map((s, i) => (<span key={i} style={{ display: "inline-block", background: "#2a2216", borderRadius: 4, padding: "1px 6px", marginRight: 4, fontSize: 11 }}>{s}</span>))}</td>
              <td><span style={{ opacity: .8, fontSize: 12 }}>{PROVIDER_LABEL[v.provider] || v.provider || "qwen-cloud"}</span></td>
              <td>{v.modele}</td>
              <td><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 60, height: 6, background: "#2a2216", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${Math.round(perf * 100)}%`, height: "100%", background: perf > 0.75 ? "#7ad67a" : perf > 0.5 ? "#e8c766" : "#e67" }} /></div><span style={{ fontSize: 11, opacity: .6 }}>{Math.round(perf * 100)}%</span></div></td>
              <td>{v.tokensUtilises}</td>
              <td><button onClick={() => onDelete(v.id)} style={{ cursor: "pointer" }}>Exiler</button></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ============================================================
// ⚔️ L'Embûche — audit adversarial du Camp (Qwen Cloud)
// ============================================================
function Embuche({ voleurs, onRecruit }: { voleurs: Voleur[]; onRecruit: (r: Partial<{ nom: string; specialite: string; provider: string; modele: string; effort: Effort; systemPrompt: string; capTokens: number }>) => Promise<boolean> }) {
  const [audit, setAudit] = useState<CampAudit | null>(null);
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState("");
  const run = async () => { setBusy(true); setAudit(null); try { setAudit(await api.campAudit(focus)); } catch (e) { setAudit(null); } finally { setBusy(false); } };
  const byNom = (n: string) => voleurs.find((v) => v.nom === n);
  const res = audit?.verdict?.resilience ?? 0;
  return (
    <div>
      <p style={{ opacity: .6, fontSize: 13 }}>Qwen Cloud attaque ton propre Camp : il conçoit le gang rival qui exploite tes failles, note la résilience, puis propose la <b>recrue de rupture</b> qui neutralise la plus grosse menace.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input placeholder="Focus optionnel (ex: couverture backend)" value={focus} onChange={(e) => setFocus(e.target.value)} style={{ flex: 1 }} />
        <button className="tab active" disabled={busy} onClick={run} style={{ background: "#8b1a1a", color: "#fff" }}>{busy ? "Embûche en cours…" : "🗡️ Lancer l'Embûche"}</button>
      </div>
      {audit && (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>🏅 Verdict de souveraineté</b>
              <span style={{ fontSize: 26, fontWeight: 800, color: res > 66 ? "#7ad67a" : res > 33 ? "#e8c766" : "#e67" }}>{res}%</span>
            </div>
            <div style={{ height: 10, background: "#0f0d0a", borderRadius: 5, overflow: "hidden", marginTop: 8 }}>
              <div style={{ width: `${res}%`, height: "100%", background: res > 66 ? "#7ad67a" : res > 33 ? "#e8c766" : "#e67", transition: "width .6s" }} />
            </div>
            {audit.verdict?.resume && <p style={{ opacity: .7, fontSize: 13, marginTop: 8 }}>{audit.verdict.resume}</p>}
          </div>

          {audit.fragilities?.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 6 }}>🩸 Failles détectées</h3>
              {audit.fragilities.map((fl, i) => (
                <div key={i} style={{ padding: 8, marginBottom: 6, border: "1px solid #2a2216", borderRadius: 6, display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span>{fl.faille}</span>
                  <span style={{ opacity: .7, fontSize: 12 }}>gravité {fl.gravite}/5</span>
                </div>
              ))}
            </div>
          )}

          {audit.gangRival?.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 6 }}>👺 Gang rival</h3>
              {audit.gangRival.map((g, i) => {
                const tgt = byNom(g.cible);
                return (
                  <div key={i} style={{ padding: 10, marginBottom: 8, border: "1px solid #5a2222", borderRadius: 8, background: "#1a1010" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <b style={{ color: "#e88" }}>{g.nom}</b>
                      <span style={{ opacity: .6, fontSize: 12 }}>🎯 cible : {g.cible} {tgt ? "" : "(introuvable)"}</span>
                    </div>
                    <div style={{ fontSize: 12, opacity: .7, marginBottom: 4 }}>{g.specialite}</div>
                    <div style={{ fontSize: 13 }}>⚔️ {g.attaque}</div>
                    {tgt && <div style={{ marginTop: 6, fontSize: 12, color: "#b8860b" }}>↳ {tgt.nom} ({PROVIDER_LABEL[tgt.provider] || tgt.provider}, {tgt.modele})</div>}
                  </div>
                );
              })}
            </div>
          )}

          {audit.recrue && <RecrueCard r={audit.recrue} onRecruit={onRecruit} label="Recrue de Rupture" />}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 🏛️ Le Conciliabule — forge par mission naturelle (Qwen Cloud)
// ============================================================
function Conciliabule({ onRecruit }: { onRecruit: (r: Partial<{ nom: string; specialite: string; provider: string; modele: string; effort: Effort; systemPrompt: string; capTokens: number }>) => Promise<boolean> }) {
  const [mission, setMission] = useState("");
  const [forge, setForge] = useState<CampForge | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => { if (!mission.trim()) return; setBusy(true); setForge(null); try { setForge(await api.campForge(mission)); } catch {} finally { setBusy(false); } };
  return (
    <div>
      <p style={{ opacity: .6, fontSize: 13 }}>Décris une mission en une phrase. Qwen Cloud constitue l'escouade optimale (3-5 voleurs complémentaires) et organise un <b>débat de recrutement</b> où chaque candidat plaide pour sa place.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input placeholder="ex: auditer une API Node en 30 min et proposer 3 correctifs prioritaires" value={mission} onChange={(e) => setMission(e.target.value)} style={{ flex: 1 }} />
        <button className="tab active" disabled={busy || !mission.trim()} onClick={run} style={{ background: "#b8860b", color: "#14110b" }}>{busy ? "Conciliabule…" : "🔨 Forger l'escouade"}</button>
      </div>
      {forge && (
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <h3 style={{ marginBottom: 6 }}>🛡️ Escouade proposée</h3>
            {forge.escouade.map((r, i) => <RecrueCard key={i} r={r} onRecruit={onRecruit} label={`Recruter ${r.nom}`} />)}
          </div>
          {forge.debat?.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 6 }}>🎭 Débat de recrutement</h3>
              {forge.debat.map((d, i) => (
                <div key={i} style={{ padding: 8, marginBottom: 6, border: "1px solid #2a2216", borderRadius: 6 }}>
                  <b style={{ color: "#b8860b" }}>{d.voleur}</b>{d.remplace ? <span style={{ opacity: .6, fontSize: 12 }}> — remplace <i>{d.remplace}</i></span> : null}
                  <p style={{ opacity: .8, fontSize: 13, marginTop: 4 }}>{d.plaidoirie}</p>
                </div>
              ))}
            </div>
          )}
          {forge.verdict && <div style={{ padding: 10, border: "1px solid #b8860b", borderRadius: 8, background: "#1a1610" }}><b>📜 Verdict : </b>{forge.verdict}</div>}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 🛡️ Les Sceaux — sigil SVG génératif + marée animée (Qwen Cloud)
// ============================================================
function Sceaux({ voleurs }: { voleurs: Voleur[] }) {
  const [sigils, setSigils] = useState<Record<string, CampSigil>>({});
  const [busy, setBusy] = useState(false);
  const [maree, setMarée] = useState(true);
  const reveal = async () => {
    setBusy(true);
    const map: Record<string, CampSigil> = {};
    for (const v of voleurs) { try { map[v.id] = await api.campSigil({ voleurId: v.id }); } catch {} }
    setSigils(map); setBusy(false);
  };
  return (
    <div>
      <p style={{ opacity: .6, fontSize: 13 }}>Chaque Voleur reçoit un <b>Sceau</b> : un sigil SVG unique généré par Qwen Cloud à partir de son identité. La <b>Marée</b> fait pulser le camp — chaque sceau bat à son rythme (bpm) sur sa teinte (hue).</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button className="tab active" disabled={busy || !voleurs.length} onClick={reveal} style={{ background: "#b8860b", color: "#14110b" }}>{busy ? "Scellage…" : "🛡️ Révéler les Sceaux"}</button>
        <button className="tab" onClick={() => setMarée(!maree)}>{maree ? "⏸ Marée" : "▶ Marée"}</button>
      </div>
      {voleurs.length === 0 && <p style={{ opacity: .5 }}>Le Camp est vide — invite d'abord des voleurs.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {voleurs.map((v) => {
          const s = sigils[v.id];
          const bpm = s?.maree?.bpm || 60;
          const hue = s?.maree?.hue ?? 42;
          const dur = maree ? `${(60 / bpm).toFixed(2)}s` : "0s";
          return (
            <div key={v.id} style={{ border: "1px solid #2a2216", borderRadius: 8, padding: 10, textAlign: "center", background: "#14110b" }}>
              <div style={{ width: 120, height: 120, margin: "0 auto", filter: maree ? `drop-shadow(0 0 8px hsla(${hue},60%,50%,.6))` : "none", animation: maree ? `caverne-pulse ${dur} ease-in-out infinite` : "none" }}
                   dangerouslySetInnerHTML={s ? { __html: s.svg } : { __html: placeholderSigil(hue) }} />
              <div style={{ fontWeight: 700, marginTop: 6, color: "#b8860b" }}>{v.nom}</div>
              <div style={{ fontSize: 11, opacity: .6 }}>{v.specialite.split(/[,;]/)[0]?.trim()}</div>
              {s && <div style={{ fontSize: 10, opacity: .5, marginTop: 4 }}>{s.maree.glyph} · {bpm} bpm · h{Math.round(hue)}°</div>}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes caverne-pulse{0%,100%{transform:scale(.94);opacity:.78}50%{transform:scale(1.04);opacity:1}}`}</style>
    </div>
  );
}

function placeholderSigil(hue: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="#14110b" stroke="#3a2e1a" stroke-width="2"/><circle cx="100" cy="100" r="40" fill="none" stroke="hsl(${hue},50%,40%)" stroke-width="2" opacity=".5"/></svg>`;
}

function RecrueCard({ r, onRecruit, label }: { r: CampRecrue; onRecruit: (r: Partial<{ nom: string; specialite: string; provider: string; modele: string; effort: Effort; systemPrompt: string; capTokens: number }>) => Promise<boolean>; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{ padding: 10, marginBottom: 8, border: "1px solid #b8860b", borderRadius: 8, background: "#1a1610" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <b style={{ color: "#b8860b" }}>{r.nom}</b>
        <button className="tab active" disabled={done} onClick={async () => { if (await onRecruit(r)) setDone(true); }} style={{ background: done ? "#3a6a3a" : "#b8860b", color: "#14110b" }}>{done ? "✅ Recruté" : label}</button>
      </div>
      <div style={{ fontSize: 12, opacity: .7, marginTop: 4 }}>{r.specialite}</div>
      <div style={{ fontSize: 11, opacity: .6, marginTop: 2 }}>{PROVIDER_LABEL[r.provider] || r.provider} · {r.modele} · {r.effort} · {r.capTokens} tok</div>
      {r.justification && <div style={{ fontSize: 12, marginTop: 6, fontStyle: "italic", opacity: .8 }}>« {r.justification} »</div>}
    </div>
  );
}
