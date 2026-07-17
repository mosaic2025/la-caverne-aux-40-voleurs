// Onglet Le Génie — chat voix unique (MoE fusionné). Backend réel, stream SSE.
// Forge visuelle + forge via chat assistant (NL → structure), MoE emboîté par spécialisations,
// orchestrateur optionnel dédié à la fusion.
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { Genie, MoeRun, QwenModel, Effort, TraitorCheck, SiroccoMetrics } from "../types";
import { ROUTING_STRATEGIES, ROUTING_LABELS, type RoutingStrategy } from "../types";

const QWEN: QwenModel[] = ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-plus", "qwen-vl-plus"];
const EFFORTS: Effort[] = ["low", "med", "high"];
const PROVIDER_LABEL: Record<string, string> = { "qwen-cloud": "Qwen Cloud", alibaba: "Alibaba Cloud", ollama: "Ollama" };
const FALLBACK_PROVIDER_MODELS: Record<string, string[]> = {
  "qwen-cloud": QWEN, alibaba: QWEN, ollama: ["deepseek-v4-pro:cloud","deepseek-v4-flash:cloud","glm-5.2:cloud","glm-5.1:cloud","kimi-k2.7-code:cloud","kimi-k2.6:cloud","nemotron-3-ultra:cloud","nemotron-3-super:cloud","minimax-m3:cloud","gemma4:31b:cloud","qwen3.5:122b:cloud","gpt-oss:120b:cloud","gemini-3-flash-preview:cloud","mistral-large-3:cloud"],
};

interface ForgeModel {
  nom: string;
  specialite: string;
  specialisation: string; // groupe MoE emboîté
  modele: string;
  effort: Effort;
  systemPrompt: string;
  capTokens: number;
  provider: string;
}

interface ForgeOrchestrator {
  modele: string;
  provider: string;
  effort: Effort;
  systemPrompt: string;
  capTokens: number;
}

const DEFAULT_MODELS: ForgeModel[] = [
  { nom: "Stratège", specialite: "stratégie, planification, priorisation", specialisation: "stratégie", modele: "qwen-turbo", effort: "med", systemPrompt: "Tu es un stratège pragmatique. Propose des plans d'action clairs et priorisés.", capTokens: 300, provider: "qwen-cloud" },
  { nom: "Codeur", specialite: "programmation, code, architecture logicielle", specialisation: "technique", modele: "qwen-coder-plus", effort: "med", systemPrompt: "Tu es un développeur expert. Donne du code propre, typé, avec explications courtes.", capTokens: 400, provider: "qwen-cloud" },
  { nom: "Rédacteur", specialite: "rédaction, documentation, communication", specialisation: "communication", modele: "qwen-turbo", effort: "low", systemPrompt: "Tu es un rédacteur concis. Reformule et synthétise avec clarté.", capTokens: 200, provider: "qwen-cloud" },
];

export function LeGenie() {
  const [genies, setGenies] = useState<Genie[]>([]);
  const [genieId, setGenieId] = useState("");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [frags, setFrags] = useState<{ voleurId: string; text: string }[]>([]);
  const [run, setRun] = useState<MoeRun | null>(null);
  const [traitor, setTraitor] = useState<TraitorCheck | null>(null);
  const [sirocco, setSirocco] = useState<SiroccoMetrics | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showForge, setShowForge] = useState(false);
  const [forgeName, setForgeName] = useState("");
  const [forgeCharter, setForgeCharter] = useState("Une seule voix, claire, directe, en français. Ne révèle jamais les experts internes.");
  const [forgeBudget, setForgeBudget] = useState(50000);
  const [forgeK, setForgeK] = useState(3);
  const [forgeDominance, setForgeDominance] = useState(0.05);
  const [parSpecialisation, setParSpecialisation] = useState(true);
  const [forgeRoutingStrategy, setForgeRoutingStrategy] = useState<RoutingStrategy>("auto");
  const [forgeMl, setForgeMl] = useState(true);
  const [forgeEmbeddingModel, setForgeEmbeddingModel] = useState("text-embedding-v3");
  const [models, setModels] = useState<ForgeModel[]>(DEFAULT_MODELS);
  const [useOrchestrator, setUseOrchestrator] = useState(false);
  const [orchestrator, setOrchestrator] = useState<ForgeOrchestrator>({
    modele: "qwen-max", provider: "qwen-cloud", effort: "med",
    systemPrompt: "Tu es l'orchestrateur du Génie. Fusionne les fragments d'experts en une réponse unifiée, fluide, sans révéler les experts internes. Résous les contradictions en privilégiant la précision.",
    capTokens: 800,
  });
  // Chat forge (délégation à l'assistant)
  const [chatMode, setChatMode] = useState(false);
  const [chatDesc, setChatDesc] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [providers, setProviders] = useState<string[]>(["qwen-cloud", "alibaba", "ollama"]);
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>(FALLBACK_PROVIDER_MODELS);

  useEffect(() => {
    api.listProviders().then((r) => {
      setProviders(r.providers);
      setProviderModels(r.models || FALLBACK_PROVIDER_MODELS);
    }).catch(() => {});
  }, []);
  const modelsFor = (p: string) => providerModels[p] || FALLBACK_PROVIDER_MODELS[p] || QWEN;

  const loadGenies = () => api.listGenies().then((g) => { setGenies(g); if (g[0]) setGenieId((id) => id || g[0].id); });
  useEffect(() => { loadGenies().catch((e) => setErr(String(e))); }, []);

  const createFromAll = async () => {
    setErr("");
    try {
      const voleurs = await api.listVoleurs();
      if (!voleurs.length) { setErr("Crée d'abord des Voleurs dans Le Camp."); return; }
      const g = await api.createGenie({
        nom: "Génie principal",
        voleursIds: voleurs.map((v) => v.id),
        voiceCharter: "Une seule voix, claire, directe, en français. Synthétise sans révéler les voleurs.",
        budgetTotal: 50000,
        provider: voleurs[0]?.provider || "qwen-cloud",
      });
      setGenies((gs) => [...gs, g]); setGenieId(g.id);
    } catch (e) { setErr(String(e)); }
  };

  const forge = async () => {
    setErr(""); setBusy(true);
    try {
      const r = await api.forgeGenie({
        nom: forgeName || "Génie forgé",
        voiceCharter: forgeCharter,
        budgetTotal: forgeBudget,
        k: forgeK,
        dominance: forgeDominance,
        parSpecialisation,
        routingStrategy: forgeRoutingStrategy,
        ml: forgeMl,
        embeddingModel: forgeEmbeddingModel,
        models,
        orchestrateur: useOrchestrator ? orchestrator : undefined,
      });
      setGenies((gs) => [...gs, r.genie]); setGenieId(r.genie.id);
      setShowForge(false);
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  // Forge via chat : description NL → structure remplie
  const forgeChat = async () => {
    if (!chatDesc.trim()) return;
    setErr(""); setChatBusy(true);
    try {
      const r = await api.forgeChat(chatDesc);
      if (r.nom) setForgeName(r.nom);
      if (typeof r.voiceCharter === "string") setForgeCharter(r.voiceCharter);
      if (Number.isFinite(r.budgetTotal)) setForgeBudget(r.budgetTotal);
      if (Number.isFinite(r.k)) setForgeK(Math.max(1, Math.min(4, Math.floor(r.k))));
      if (Number.isFinite(r.dominance)) setForgeDominance(r.dominance);
      if (typeof r.parSpecialisation === "boolean") setParSpecialisation(r.parSpecialisation);
      if (r.routingStrategy && ROUTING_STRATEGIES.includes(r.routingStrategy)) setForgeRoutingStrategy(r.routingStrategy);
      if (typeof r.ml === "boolean") setForgeMl(r.ml);
      if (typeof r.embeddingModel === "string") setForgeEmbeddingModel(r.embeddingModel);
      if (Array.isArray(r.models) && r.models.length) {
        setModels(r.models.map((m) => ({
          nom: m.nom || "", specialite: m.specialite || "",
          specialisation: m.specialisation || "général",
          modele: m.modele || "qwen-plus", effort: m.effort || "med",
          systemPrompt: m.systemPrompt || "", capTokens: m.capTokens || 400,
          provider: m.provider || "qwen-cloud",
        })));
      }
      if (r.orchestrateur && r.orchestrateur.modele) {
        setUseOrchestrator(true);
        setOrchestrator({
          modele: r.orchestrateur.modele,
          provider: r.orchestrateur.provider || "qwen-cloud",
          effort: r.orchestrateur.effort || "med",
          systemPrompt: r.orchestrateur.systemPrompt || orchestrator.systemPrompt,
          capTokens: r.orchestrateur.capTokens || 800,
        });
      } else {
        setUseOrchestrator(false);
      }
      setChatMode(false);
      setChatDesc("");
    } catch (e) { setErr(String(e)); } finally { setChatBusy(false); }
  };

  const updateModel = (i: number, patch: Partial<ForgeModel>) => {
    setModels((m) => m.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  };
  const addModel = () => setModels((m) => [...m, { nom: "", specialite: "", specialisation: "général", modele: "qwen-plus", effort: "med", systemPrompt: "", capTokens: 400, provider: "qwen-cloud" }]);
  const removeModel = (i: number) => setModels((m) => m.filter((_, idx) => idx !== i));

  // Groupement visuel par spécialisation
  const groups: { name: string; indices: number[] }[] = [];
  const idxByGroup = new Map<string, number[]>();
  models.forEach((m, i) => {
    const g = m.specialisation || "général";
    if (!idxByGroup.has(g)) { idxByGroup.set(g, []); groups.push({ name: g, indices: idxByGroup.get(g) ?? [] }); }
    idxByGroup.get(g)!.push(i);
  });

  const ask = async () => {
    if (!genieId || !query.trim()) return;
    setBusy(true); setErr(""); setAnswer(""); setFrags([]); setRun(null); setTraitor(null); setSirocco(null);
    try {
      for await (const { event, data } of api.ask(genieId, query)) {
        if (event === "fragment") setFrags((f) => [...f, data]);
        else if (event === "sirocco") setSirocco(data as SiroccoMetrics);
        else if (data && typeof data === "object" && "answer" in data) {
          const runData = data as MoeRun;
          setRun(runData);
          setAnswer(runData.answer);
          if (runData.traitor) setTraitor(runData.traitor);
          if (runData.sirocco) setSirocco(runData.sirocco);
        }
        else if (event === "token" || event === "delta") setAnswer((a) => a + (data.text ?? ""));
        scrollRef.current?.scrollTo(0, 1e9);
      }
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const badgeSeverity = (s: string) => {
    const color = s === "major" ? "#e67" : s === "minor" ? "#fb3" : "#8f8";
    return <span style={{ background: color, color: "#000", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{s}</span>;
  };

  const siroccoIcon = (etat?: string) => {
    if (etat === "tempete") return "🌪️";
    if (etat === "calme") return "🌫️";
    return "🍃";
  };
  const siroccoColor = (etat?: string) => {
    if (etat === "tempete") return "#e67";
    if (etat === "calme") return "#fb3";
    return "#7ad67a";
  };

  return (
    <section>
      <h2>Le Génie</h2>
      {err && <p style={{ color: "#e67" }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <select value={genieId} onChange={(e) => setGenieId(e.target.value)}>
          {genies.map((g) => <option key={g.id} value={g.id}>{g.nom} (reliquat {g.reliquat})</option>)}
        </select>
        <button onClick={createFromAll}>+ Conseil complet</button>
        <button onClick={() => setShowForge((s) => !s)}>{showForge ? "Fermer" : "🔮 Capturer un Génie"}</button>
      </div>

      {showForge && (
        <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 14, marginBottom: 14 }}>
          {/* Barre mode forge : visuel ou chat assistant */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <button className={chatMode ? "tab" : "tab active"} onClick={() => setChatMode(false)}>🎨 Forge visuelle</button>
            <button className={chatMode ? "tab active" : "tab"} onClick={() => setChatMode(true)}>💬 Déléguer à l'assistant</button>
          </div>

          {chatMode ? (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>
                Décris le Génie MoE voulu en langage naturel. L'assistant parse ta description et remplit la forge visuelle (tu peux ajuster ensuite).
              </p>
              <textarea
                placeholder="Ex: un MoE pour le développement logiciel : 3 experts code (frontend, backend, tests) + 1 stratège architecture + 1 rédacteur doc, avec orchestrateur qwen-max pour fusionner."
                value={chatDesc}
                onChange={(e) => setChatDesc(e.target.value)}
                style={{ width: "100%", minHeight: 90, marginBottom: 8 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="tab active" disabled={chatBusy || !chatDesc.trim()} onClick={forgeChat}>
                  {chatBusy ? "L'assistant concocte…" : "🪄 Générer la forge"}
                </button>
                <button onClick={() => setChatMode(false)}>← Ajuster visuellement</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", marginBottom: 12 }}>
                <input placeholder="Nom du Génie" value={forgeName} onChange={(e) => setForgeName(e.target.value)} />
                <input type="number" placeholder="Budget tokens" value={forgeBudget} onChange={(e) => setForgeBudget(+e.target.value)} />
                <select value={forgeK} onChange={(e) => setForgeK(+e.target.value)} style={{ gridColumn: "1/2" }}>
                  <option value={1}>Mode mono-expert (1)</option>
                  <option value={2}>Conseil restreint (2)</option>
                  <option value={3}>Conseil standard (3)</option>
                  <option value={4}>Conseil large (4)</option>
                </select>
                <input type="number" step="0.01" placeholder="Seuil dominance" value={forgeDominance} onChange={(e) => setForgeDominance(+e.target.value)} style={{ gridColumn: "2/3" }} />
                <label style={{ gridColumn: "1/3", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={parSpecialisation} onChange={(e) => setParSpecialisation(e.target.checked)} />
                  Routage par spécialisation (MoE emboîté : choisir la spécialisation puis l'expert)
                </label>
                <select value={forgeRoutingStrategy} onChange={(e) => setForgeRoutingStrategy(e.target.value as RoutingStrategy)} style={{ gridColumn: "1/2" }}>
                  {ROUTING_STRATEGIES.map((s) => <option key={s} value={s}>{ROUTING_LABELS[s]}</option>)}
                </select>
                <select value={forgeEmbeddingModel} onChange={(e) => setForgeEmbeddingModel(e.target.value)} style={{ gridColumn: "2/3" }}>
                  <option value="text-embedding-v3">Qwen text-embedding-v3</option>
                  <option value="nomic-embed-text">Ollama nomic-embed-text</option>
                </select>
                <label style={{ gridColumn: "1/3", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={forgeMl} onChange={(e) => setForgeMl(e.target.checked)} />
                  Apprentissage automatique (ML) : le Génie ajuste ses choix d'experts selon les performances passées.
                </label>
              </div>
              <textarea
                placeholder="Charte de voix du Génie"
                value={forgeCharter}
                onChange={(e) => setForgeCharter(e.target.value)}
                style={{ width: "100%", minHeight: 50, marginBottom: 12 }}
              />

              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>Esprits à emprisonner dans la lampe (groupés par spécialisation)</div>
              {groups.map((grp) => (
                <div key={grp.name} style={{ marginBottom: 10, border: "1px solid #2a2216", borderRadius: 6, padding: 8, background: "#0f0d0a" }}>
                  <div style={{ fontSize: 12, color: "#b8860b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                    🏷️ {grp.name} <span style={{ opacity: 0.6 }}>({grp.indices.length})</span>
                  </div>
                  {grp.indices.map((i) => {
                    const m = models[i];
                    return (
                      <div key={i} style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr auto", marginBottom: 8, alignItems: "end" }}>
                        <input placeholder="Nom de l'esprit" value={m.nom} onChange={(e) => updateModel(i, { nom: e.target.value })} />
                        <input placeholder="Don (spécialité)" value={m.specialite} onChange={(e) => updateModel(i, { specialite: e.target.value })} />
                        <input placeholder="Spécialisation" value={m.specialisation} onChange={(e) => updateModel(i, { specialisation: e.target.value })} />
                        <select value={m.modele} onChange={(e) => updateModel(i, { modele: e.target.value })}>
                          {modelsFor(m.provider).map((q) => <option key={q} value={q}>{q}</option>)}
                        </select>
                        <select value={m.provider} onChange={(e) => {
                          const np = e.target.value;
                          const list = modelsFor(np);
                          updateModel(i, { provider: np, modele: list.includes(m.modele) ? m.modele : list[0] });
                        }}>
                          {providers.map((p) => <option key={p} value={p}>{PROVIDER_LABEL[p] || p}</option>)}
                        </select>
                        <select value={m.effort} onChange={(e) => updateModel(i, { effort: e.target.value as Effort })}>{EFFORTS.map((e) => <option key={e} value={e}>{e}</option>)}</select>
                        <button onClick={() => removeModel(i)}>×</button>
                        <textarea
                          placeholder="System prompt de l'expert"
                          value={m.systemPrompt}
                          onChange={(e) => updateModel(i, { systemPrompt: e.target.value })}
                          style={{ gridColumn: "1/8", minHeight: 38, fontSize: 12 }}
                        />
                        <input type="number" placeholder="capTokens" value={m.capTokens} onChange={(e) => updateModel(i, { capTokens: +e.target.value })} style={{ gridColumn: "1/3" }} />
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Orchestrateur optionnel */}
              <div style={{ marginTop: 10, border: "1px solid #2a2216", borderRadius: 6, padding: 10, background: "#1a1610" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 8 }}>
                  <input type="checkbox" checked={useOrchestrator} onChange={(e) => setUseOrchestrator(e.target.checked)} />
                  🎼 Ajouter un orchestrateur (fusionne les fragments des experts — modèle gros type qwen-max)
                </label>
                {useOrchestrator && (
                  <div style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr 1fr 1fr", alignItems: "end" }}>
                    <select value={orchestrator.modele} onChange={(e) => setOrchestrator((o) => ({ ...o, modele: e.target.value }))}>
                      {modelsFor(orchestrator.provider).map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                    <select value={orchestrator.provider} onChange={(e) => {
                      const np = e.target.value; const list = modelsFor(np);
                      setOrchestrator((o) => ({ ...o, provider: np, modele: list.includes(o.modele) ? o.modele : list[0] }));
                    }}>
                      {providers.map((p) => <option key={p} value={p}>{PROVIDER_LABEL[p] || p}</option>)}
                    </select>
                    <select value={orchestrator.effort} onChange={(e) => setOrchestrator((o) => ({ ...o, effort: e.target.value as Effort }))}>
                      {EFFORTS.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <input type="number" placeholder="capTokens" value={orchestrator.capTokens} onChange={(e) => setOrchestrator((o) => ({ ...o, capTokens: +e.target.value }))} />
                    <textarea
                      placeholder="System prompt de l'orchestrateur"
                      value={orchestrator.systemPrompt}
                      onChange={(e) => setOrchestrator((o) => ({ ...o, systemPrompt: e.target.value }))}
                      style={{ gridColumn: "1/5", minHeight: 50, fontSize: 12 }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={addModel}>+ Esprit</button>
                <button className="tab active" disabled={busy || !forgeName || models.some((m) => !m.nom || !m.specialite)} onClick={forge}>
                  {busy ? "Conjuration…" : "🪔 Sceller dans la lampe"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div ref={scrollRef} style={{ maxHeight: 320, overflow: "auto", background: "#0f0d0a", padding: 12, borderRadius: 8, marginBottom: 10 }}>
        {frags.length > 0 && !run && <p className="stub">🪔 Le Génie consulte les esprits de la lampe… ({frags.length} murmure(s))</p>}
        {answer && <div style={{ whiteSpace: "pre-wrap" }}>{answer}</div>}
        {run && <p style={{ opacity: .5, fontSize: 12, marginTop: 10 }}>
          {run.tokens.total} tokens (routing {run.tokens.routing} · fragments {run.tokens.fragments} · fusion {run.tokens.fusion}) · {run.latencyMs}ms · mode {run.routingMode} ({run.routingStrategy})
        </p>}
        {sirocco && (
          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 10 }}>
            <span style={{ fontSize: 24 }}>{siroccoIcon(sirocco.etat)}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: siroccoColor(sirocco.etat) }}>
                Sirocco — {sirocco.etat === "tempete" ? "Tempête de sable" : sirocco.etat === "calme" ? "Calme plat" : "Brise saine"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Chaleur {Math.round(sirocco.chaleur * 100)}% · Dérive {Math.round(sirocco.derive * 100)}% · {sirocco.tokens} tokens</div>
              {sirocco.alerte && <div style={{ fontSize: 12, color: siroccoColor(sirocco.etat), marginTop: 4 }}>{sirocco.alerte}</div>}
            </div>
          </div>
        )}
        {traitor && traitor.severity !== "none" && (
          <div style={{ marginTop: 12, border: "1px solid #e67", borderRadius: 8, padding: 10, background: "#1a0f0f" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              🦹 40ᵉ Voleur {badgeSeverity(traitor.severity)}
              {traitor.verdict && <span style={{ fontSize: 11, opacity: 0.7 }}>({traitor.verdict})</span>}
            </div>
            {traitor.objection && <p style={{ fontSize: 13, marginBottom: 6 }}>{traitor.objection}</p>}
            {traitor.correctedAnswer && traitor.severity === "major" && (
              <>
                <div style={{ fontSize: 11, color: "#fb3", marginBottom: 4 }}>Réponse corrigée :</div>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 13, background: "#14110b", padding: 8, borderRadius: 6 }}>{traitor.correctedAnswer}</div>
              </>
            )}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sésame, ouvre-toi… (ta requête au Génie)" style={{ flex: 1, minHeight: 50 }} />
        <button className="tab active" disabled={busy || !genieId} onClick={ask}>{busy ? "…" : "🪔 Invoquer"}</button>
      </div>
    </section>
  );
}