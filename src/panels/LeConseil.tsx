// Onglet Le Conseil de Guerre — modes multiples : duel, débat, tournoi, pipeline
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { QWEN_MODELS, type Voleur } from "../types";

const PROVIDER_LABEL: Record<string, string> = { "qwen-cloud": "Qwen Cloud", alibaba: "Alibaba Cloud", ollama: "Ollama" };
const FALLBACK_PROVIDER_MODELS: Record<string, string[]> = {
  "qwen-cloud": QWEN_MODELS, alibaba: QWEN_MODELS,
  ollama: ["deepseek-v4-pro:cloud", "glm-5.2:cloud", "kimi-k2.7-code:cloud", "nemotron-3-ultra:cloud", "gemma4:31b:cloud", "qwen3.5:122b:cloud"],
};

const NON_MOT = /[^a-zà-ÿ0-9]+/;

// Spectre de Divergence — Jaccard inverse sur le lexique (innovation brevetable :
// "Divergence Spectrum" pour mesurer la complémentarité des réponses d'un duel MoE).
function divergenceSpectrum(a: string, b: string): { divergence: number; shared: string[] } {
  const ta = new Set(a.toLowerCase().split(NON_MOT).filter((w) => w.length > 3));
  const tb = new Set(b.toLowerCase().split(NON_MOT).filter((w) => w.length > 3));
  let inter = 0;
  const shared: string[] = [];
  for (const w of ta) if (tb.has(w)) { inter++; shared.push(w); }
  const union = ta.size + tb.size - inter;
  const divergence = union ? Math.round((1 - inter / union) * 100) : 0;
  return { divergence, shared };
}

export function LeConseil() {
  const [voleurs, setVoleurs] = useState<Voleur[]>([]);
  const [mode, setMode] = useState<"duel" | "debate" | "tournament" | "pipeline">("duel");
  // Duel
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [question, setQuestion] = useState("");
  // Debate
  const [debateParticipants, setDebateParticipants] = useState<string[]>([]);
  const [debateQuestion, setDebateQuestion] = useState("");
  const [debateRounds, setDebateRounds] = useState(2);
  // Tournament
  const [tournamentParticipants, setTournamentParticipants] = useState<string[]>([]);
  const [tournamentQuestion, setTournamentQuestion] = useState("");
  // Pipeline
  const [pipelineSteps, setPipelineSteps] = useState<Array<{ voleurId: string; consigne: string }>>([]);
  const [pipelineQuestion, setPipelineQuestion] = useState("");
  // Common
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // Juge (provider/model pour le verdict)
  const [judgeProvider, setJudgeProvider] = useState<string>("qwen-cloud");
  const [judgeModel, setJudgeModel] = useState<string>("qwen-max");
  const [providers, setProviders] = useState<string[]>(["qwen-cloud", "alibaba", "ollama"]);
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>(FALLBACK_PROVIDER_MODELS);
  const modelsFor = (p: string) => providerModels[p] || FALLBACK_PROVIDER_MODELS[p] || QWEN_MODELS;

  useEffect(() => {
    api.listVoleurs().then((v) => { setVoleurs(v); }).catch((e) => setErr(String(e)));
    api.listProviders().then((r) => { setProviders(r.providers); setProviderModels(r.models || FALLBACK_PROVIDER_MODELS); }).catch(() => {});
  }, []);

  const run = async () => {
    setErr("");
    setBusy(true);
    setResult(null);
    try {
      switch (mode) {
        case "duel": {
          if (!a || !b || a === b || !question.trim()) { setErr("Choisis 2 voleurs différents + une question."); return; }
          const res = await api.duel(a, b, question, judgeProvider, judgeModel);
          setResult(res);
          break;
        }
        case "debate": {
          if (debateParticipants.length < 2 || !debateQuestion.trim()) { setErr("Au moins 2 participants et une question requis."); return; }
          const res = await api.debat(debateParticipants, debateQuestion, debateRounds);
          setResult(res);
          break;
        }
        case "tournament": {
          if (tournamentParticipants.length < 2 || !tournamentQuestion.trim()) { setErr("Au moins 2 participants et une question requis."); return; }
          const res = await api.tournoi(tournamentParticipants, tournamentQuestion);
          setResult(res);
          break;
        }
        case "pipeline": {
          if (pipelineSteps.length === 0 || !pipelineQuestion.trim()) { setErr("Au moins une étape et une question requis."); return; }
          // Validate each step has voleurId and consigne
          const invalid = pipelineSteps.find(s => !s.voleurId || !s.consigne.trim());
          if (invalid) { setErr("Chaque étape doit avoir un conseiller et une consigne."); return; }
          const res = await api.pipeline(pipelineSteps, pipelineQuestion);
          setResult(res);
          break;
        }
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const addPipelineStep = () => {
    setPipelineSteps([...pipelineSteps, { voleurId: "", consigne: "" }]);
  };

  const removePipelineStep = (index: number) => {
    setPipelineSteps(pipelineSteps.filter((_, i) => i !== index));
  };

  const updatePipelineStep = (index: number, field: "voleurId" | "consigne", value: string) => {
    setPipelineSteps(pipelineSteps.map((step, i) => i === index ? { ...step, [field]: value } : step));
  };

  return (
    <section>
      <h2>Le Conseil de Guerre</h2>
      <div style={{ marginBottom: 16 }}>
        <label>
          Mode :&nbsp;
          <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={{ marginLeft: 8 }}>
            <option value="duel">Duel</option>
            <option value="debate">Débat</option>
            <option value="tournament">Tournoi</option>
            <option value="pipeline">Pipeline</option>
          </select>
        </label>
      </div>
      {err && <p style={{ color: "#e67" }}>{err}</p>}
      {!busy && (
        <>
          {/* Mode-specific UI */}
          {mode === "duel" && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select value={a} onChange={(e) => setA(e.target.value)}>
                  {voleurs.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}
                </select>
                <span style={{ opacity: .6 }}>vs</span>
                <select value={b} onChange={(e) => setB(e.target.value)}>
                  {voleurs.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ opacity: .6, fontSize: 12 }}>Juge :</span>
                <select value={judgeProvider} onChange={(e) => { const np = e.target.value; const list = modelsFor(np); setJudgeProvider(np); if (!list.includes(judgeModel)) setJudgeModel(list[0]); }}>
                  {providers.map((p) => <option key={p} value={p}>{PROVIDER_LABEL[p] || p}</option>)}
                </select>
                <select value={judgeModel} onChange={(e) => setJudgeModel(e.target.value)}>
                  {modelsFor(judgeProvider).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question soumise au Conseil…" style={{ flex: 1, minHeight: 50 }} />
                <button className="tab active" disabled={busy} onClick={run}>
                  {busy ? "Duel…" : "Lancer le Duel"}
                </button>
              </div>
            </>
          )}
          {mode === "debate" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label>
                  Participants :&nbsp;
                  <select multiple value={debateParticipants} onChange={(e) => {
                    setDebateParticipants(Array.from(e.target.selectedOptions, o => o.value));
                  }} style={{ width: 200, height: 100 }}>
                    {voleurs.map((v) => (
                      <option key={v.id} value={v.id}>{v.nom}</option>
                    ))}
                  </select>
                </label>
                <span style={{ marginLeft: 12, opacity: .6 }}>Sélectionnez plusieurs (Ctrl+click)</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  value={debateQuestion}
                  onChange={(e) => setDebateQuestion(e.target.value)}
                  placeholder="Question du débat"
                  style={{ flex: 1, minHeight: 40 }}
                />
                <label>
                  Rounds :&nbsp;
                  <select value={debateRounds} onChange={(e) => setDebateRounds(Number(e.target.value))} style={{ marginLeft: 8 }}>
                    {[1, 2, 3].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              </div>
              <button className="tab active" disabled={busy} onClick={run}>
                {busy ? "Débat…" : "Lancer le Débat"}
              </button>
            </>
          )}
          {mode === "tournament" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label>
                  Participants :&nbsp;
                  <select multiple value={tournamentParticipants} onChange={(e) => {
                    setTournamentParticipants(Array.from(e.target.selectedOptions, o => o.value));
                  }} style={{ width: 200, height: 100 }}>
                    {voleurs.map((v) => (
                      <option key={v.id} value={v.id}>{v.nom}</option>
                    ))}
                  </select>
                </label>
                <span style={{ marginLeft: 12, opacity: .6 }}>Sélectionnez plusieurs (Ctrl+click)</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  value={tournamentQuestion}
                  onChange={(e) => setTournamentQuestion(e.target.value)}
                  placeholder="Question du tournoi"
                  style={{ flex: 1, minHeight: 40 }}
                />
              </div>
              <button className="tab active" disabled={busy} onClick={run}>
                {busy ? "Tournoi…" : "Lancer le Tournoi"}
              </button>
            </>
          )}
          {mode === "pipeline" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <h3>Étapes du pipeline</h3>
                <button className="tab" onClick={addPipelineStep} style={{ marginBottom: 8 }}>
                  + Ajouter une étape
                </button>
                {pipelineSteps.map((step, index) => (
                  <div key={index} style={{ border: "1px solid #444", padding: 8, marginBottom: 8, borderRadius: 4 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                      <label>
                        Conseiller :&nbsp;
                        <select
                          value={step.voleurId}
                          onChange={(e) => updatePipelineStep(index, "voleurId", e.target.value)}
                          style={{ width: 150 }}
                        >
                          <option value="">— choisir —</option>
                          {voleurs.map((v) => (
                            <option key={v.id} value={v.id}>{v.nom}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Consigne :&nbsp;
                        <input
                          value={step.consigne}
                          onChange={(e) => updatePipelineStep(index, "consigne", e.target.value)}
                          style={{ flex: 1, minHeight: 24 }}
                          placeholder="Que doit faire ce conseiller ?"
                        />
                      </label>
                      <button
                        onClick={() => removePipelineStep(index)}
                        style={{ marginLeft: 8, color: "#e67", fontSize: 12 }}
                        title="Supprimer cette étape"
                      >
                        −
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    value={pipelineQuestion}
                    onChange={(e) => setPipelineQuestion(e.target.value)}
                    placeholder="Question initiale du pipeline"
                    style={{ flex: 1, minHeight: 40 }}
                  />
                </div>
                <button className="tab active" disabled={busy} onClick={run}>
                  {busy ? "Pipeline…" : "Exécuter le Pipeline"}
                </button>
                </div>
              </>
          )}
        </>
      )}
      {busy && <p>Exécution en cours…</p>}
      {result && (
        <div style={{ marginTop: 24 }}>
          <h3>Résultat</h3>
          {mode === "duel" && (
            <>
              <p><b>Verdict :</b> {result.verdict?.winner ? `Victoire ${result.verdict?.winner} (${result.verdict?.winner === "A" ? result.a.nom : result.b.nom})` : "—"} · A {result.verdict?.scoreA ?? "?"} / B {result.verdict?.scoreB ?? "?"}. <i>{result.verdict?.rationale}</i></p>
              {(() => {
                const d = divergenceSpectrum(result.a.text || "", result.b.text || "");
                return (
                  <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12 }}>
                    <span style={{ opacity: .7 }}>📡 Spectre de Divergence — </span>
                    <b style={{ color: d.divergence > 70 ? "#7ad67a" : d.divergence > 40 ? "#e8c766" : "#e67" }}>{d.divergence}%</b>
                    <span style={{ opacity: .5 }}> de divergence lexicale (complémentaires si haut, redondantes si bas)</span>
                    {d.shared.length > 0 && <div style={{ marginTop: 6, opacity: .6 }}>Mots communs : {d.shared.slice(0, 12).join(", ")}</div>}
                  </div>
                );
              })()}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ border: `1px solid ${result.verdict?.winner === "A" ? "#e8c766" : "#2a2216"}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ color: result.verdict?.winner === "A" ? "#e8c766" : "#b8a878", fontWeight: 700 }}>{result.a.nom} {result.verdict?.winner === "A" ? "👑" : ""}</div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 6 }}>{result.a.text}</div>
                  <div style={{ opacity: .5, fontSize: 11, marginTop: 6 }}>{result.a.tokens} tokens</div>
                </div>
                <div style={{ border: `1px solid ${result.verdict?.winner === "B" ? "#e8c766" : "#2a2216"}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ color: result.verdict?.winner === "B" ? "#e8c766" : "#b8a878", fontWeight: 700 }}>{result.b.nom} {result.verdict?.winner === "B" ? "👑" : ""}</div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13, marginTop: 6 }}>{result.b.text}</div>
                  <div style={{ opacity: .5, fontSize: 11, marginTop: 6 }}>{result.b.tokens} tokens</div>
                </div>
              </div>
            </>
          )}
          {mode === "debate" && (
            <>
              <p><b>Synthèse :</b> {result.synthese}</p>
              <details style={{ marginTop: 12 }}>
                <summary>Détails des rounds</summary>
                {result.rounds.map((round: { tour: number; contributions: { voleurId: string; text: string }[] }, idx: number) => (
                  <div key={idx} style={{ marginBottom: 12, padding: 8, border: "1px solid #555", borderRadius: 4 }}>
                    <div><b>Round {round.tour}</b></div>
                    {round.contributions.map((c: { voleurId: string; text: string }, cidx: number) => (
                      <div key={cidx} style={{ marginLeft: 12, marginBottom: 4 }}>
                        <b>{voleurs.find(v => v.id === c.voleurId)?.nom || c.voleurId} :</b> <span style={{ whiteSpace: "pre-wrap" }}>{c.text}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </details>
            </>
          )}
          {mode === "tournament" && (
            <>
              <p><b>Champion :</b> {voleurs.find(v => v.id === result.champion)?.nom || result.champion}</p>
              <details style={{ marginTop: 12 }}>
                <summary>Détails des matchs</summary>
                {result.matches.map((match: { a: string; b: string; winner: string; scoreA: number; scoreB: number }, idx: number) => (
                  <div key={idx} style={{ marginBottom: 12, padding: 8, border: "1px solid #555", borderRadius: 4 }}>
                    <div><b>Match {idx + 1}</b></div>
                    <div style={{ marginLeft: 12 }}>
                      {voleurs.find(v => v.id === match.a)?.nom || match.a} <span style={{ color: "#666"}}>({match.scoreA})</span>
                      vs
                      {voleurs.find(v => v.id === match.b)?.nom || match.b} <span style={{ color: "#666"}}>({match.scoreB})</span>
                      <div style={{ marginLeft: 8, color: match.winner === match.a ? "#e8c766" : match.winner === match.b ? "#e8c766" : "#666" }}>
                        Gagnant : {voleurs.find(v => v.id === match.winner)?.nom || match.winner}
                      </div>
                    </div>
                  </div>
                ))}
              </details>
            </>
          )}
          {mode === "pipeline" && (
            <>
              {result.final && (
                <>
                  <p><b>Résultat final :</b> {result.final}</p>
                </>
              )}
              <details style={{ marginTop: 12 }}>
                <summary>Détails des étapes</summary>
                {result.steps.map((step: { voleurId: string; role?: string; consigne?: string; input?: string; output?: string }, idx: number) => (
                  <div key={idx} style={{ marginBottom: 12, padding: 8, border: "1px solid #555", borderRadius: 4 }}>
                    <div><b>Étape {idx + 1} : {step.role || step.consigne}</b></div>
                    <div style={{ marginLeft: 12, marginBottom: 4 }}>
                      <b>Conseiller :</b> {voleurs.find(v => v.id === step.voleurId)?.nom || step.voleurId}
                    </div>
                    <div style={{ marginLeft: 12, marginBottom: 4 }}>
                      <b>Entrée :</b> <span style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{(step.input || "").slice(0, 200)}{(step.input || "").length > 200 ? "…" : ""}</span>
                    </div>
                    <div style={{ marginLeft: 12, marginBottom: 4 }}>
                      <b>Sortie :</b> <span style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{(step.output || "").slice(0, 200)}{(step.output || "").length > 200 ? "…" : ""}</span>
                    </div>
                  </div>
                ))}
              </details>
            </>
          )}
        </div>
      )}
    </section>
  );
}