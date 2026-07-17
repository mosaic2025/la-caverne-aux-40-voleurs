import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AssistantContext, AssistantMessage, AssistantState, ContractManifest } from "../types/maxi";
import { applyChanges, fetchPreview } from "../lib/maxiAssistant";
import { matchTool, type ToolContext } from "../lib/tabTools";
import { api } from "../lib/api";
import "./AssistantPanel.css";

interface AssistantPanelProps { context: AssistantContext; }

const FALLBACK_MODELS: Record<string, string[]> = {
  "qwen-cloud": ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-plus", "qwen-vl-plus"],
  "alibaba": ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-coder-plus", "qwen-vl-plus"],
  "ollama": ["deepseek-v4-pro:cloud","deepseek-v4-flash:cloud","glm-5.2:cloud","glm-5.1:cloud","kimi-k2.7-code:cloud","kimi-k2.6:cloud","nemotron-3-ultra:cloud","nemotron-3-super:cloud","minimax-m3:cloud","gemma4:31b:cloud","qwen3.5:122b:cloud","gpt-oss:120b:cloud","gemini-3-flash-preview:cloud","mistral-large-3:cloud"],
};

export default function AssistantPanel({ context }: AssistantPanelProps) {
  const [state, setState] = useState<AssistantState>({
    messages: [{ id: "welcome", role: "assistant", timestamp: new Date(), content: "Assistant tab-aware. Je peux agir sur l'onglet courant ou les autres: crée un voleur, forge un génie, lance un benchmark, génère une image/vidéo, exécute du code, ou change d'onglet. Sinon, je forge un MoE sur demande." }],
    isExpanded: true, isProcessing: false,
  });
  const [inputValue, setInputValue] = useState("");
  const [currentManifest, setCurrentManifest] = useState<ContractManifest>();
  const [provider, setProvider] = useState<string>("qwen-cloud");
  const [model, setModel] = useState<string>("qwen-turbo");
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>(FALLBACK_MODELS);
  const [providers, setProviders] = useState<string[]>(["qwen-cloud", "alibaba", "ollama"]);

  useEffect(() => {
    api.listProviders().then((r) => {
      setProviders(r.providers);
      setProviderModels(r.models || FALLBACK_MODELS);
      if (!r.providers.includes(provider)) setProvider(r.default || r.providers[0]);
    }).catch(() => {});
  }, []);

  // Update model when provider changes
  useEffect(() => {
    const models = providerModels[provider] || [];
    if (models.length > 0 && !models.includes(model)) {
      setModel(models[0]);
    }
  }, [provider, providerModels]);
  const currentContext: AssistantContext = {
    ...context,
    provider,
    model,
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [state.messages, state.previewResult, state.applyResult]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = inputValue.trim();
    if (!prompt || state.isProcessing) return;
    const userMessage: AssistantMessage = { id: "user-" + Date.now(), role: "user", timestamp: new Date(), content: prompt };
    setState((previous) => ({ ...previous, messages: [...previous.messages, userMessage], isProcessing: true, error: undefined }));
    setInputValue("");
    try {
      // 1) Tentative d'action directe via outils cross-tab (pattern matching).
      const toolCtx: ToolContext = { context: currentContext, provider, model };
      const matched = matchTool(prompt);
      if (matched) {
        const toolResult = await matched.tool.execute(matched.args, toolCtx);
        const assistantMessage: AssistantMessage = { id: "assistant-" + Date.now(), role: "assistant", timestamp: new Date(), content: `[${matched.tool.name}] ${toolResult}` };
        setState((previous) => ({ ...previous, messages: [...previous.messages, assistantMessage], isProcessing: false }));
        return;
      }
      // 2) Comportement par défaut: forge MoE via moteur Maxi.
      const preview = await fetchPreview(prompt, currentManifest, currentContext);
      const assistantMessage: AssistantMessage = { id: "assistant-" + Date.now(), role: "assistant", timestamp: new Date(), content: preview.assistantMessage || "Architecture proposée. Vérifie l'aperçu puis applique-la." };
      setState((previous) => ({ ...previous, messages: [...previous.messages, assistantMessage], previewResult: preview, applyResult: undefined, isProcessing: false }));
      setCurrentManifest(preview.manifest);
    } catch (error) {
      setState((previous) => ({ ...previous, isProcessing: false, error: error instanceof Error ? error.message : "Erreur inconnue" }));
    }
  }

  async function handleApply() {
    const preview = state.previewResult;
    if (!preview || state.isProcessing) return;
    setState((previous) => ({ ...previous, isProcessing: true, error: undefined }));
    try {
      const result = await applyChanges(preview.id, preview.preview, preview.manifest, preview.manifest.version, currentContext);
      setCurrentManifest(result.contract);
      setState((previous) => ({ ...previous, applyResult: result, previewResult: undefined, isProcessing: false }));
    } catch (error) {
      setState((previous) => ({ ...previous, isProcessing: false, error: error instanceof Error ? error.message : "Erreur d'application" }));
    }
  }

  function cancelPreview() { setState((previous) => ({ ...previous, previewResult: undefined, applyResult: undefined })); }
  if (!state.isExpanded) return <aside className="assistant-panel collapsed"><div className="assistant-header"><strong>Assistant — {context.tabLabel}</strong><button onClick={() => setState((p) => ({ ...p, isExpanded: true }))}>▶</button></div></aside>;
  const expertCount = state.previewResult ? state.previewResult.manifest.subMoes.reduce((total, subMoe) => total + subMoe.experts.length, 0) : 0;
  return (
    <aside className="assistant-panel">
      <div className="assistant-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong>Assistant — {context.tabLabel}</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <label htmlFor="provider-select">Provider:</label>
            <select
              id="provider-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={{ marginLeft: 4 }}
            >
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p === "qwen-cloud" ? "Qwen Cloud" : p === "alibaba" ? "Alibaba Cloud" : "Ollama"}
                </option>
              ))}
            </select>
            <label htmlFor="model-select" style={{ marginLeft: 8 }}>
              Model:
            </label>
            <select
              id="model-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ marginLeft: 4 }}
            >
              {(providerModels[provider] || []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <small>{context.tabLabel} · {provider === "qwen-cloud" ? "Qwen Cloud" : provider === "alibaba" ? "Alibaba Cloud" : "Ollama"} · {model} · session {context.sessionId.slice(-6)}</small>
        <button className="assistant-toggle" onClick={() => setState((p) => ({ ...p, isExpanded: false }))}>▼</button>
      </div>
      <div className="messages-container">
        {state.messages.map((message) => <div key={message.id} className={"message " + message.role + "-message"} style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>)}
        {state.isProcessing && <div className="processing-indicator">Qwen orchestre et vérifie l'architecture…</div>}
        {state.error && <div className="error-message">{state.error}</div>}
        <div ref={messagesEndRef} />
      </div>
      {state.previewResult && <section className="preview-section"><strong>Proposition vérifiée</strong><p>{state.previewResult.manifest.subMoes.length} sous-MoE · {expertCount} experts · {String(state.previewResult.manifest.modelBindings && state.previewResult.manifest.modelBindings.embedding || "text-embedding-v3")}</p><p>{state.previewResult.status} · {state.previewResult.warnings.length} avertissement(s)</p><details><summary>Manifeste</summary><pre>{state.previewResult.preview}</pre></details><div className="apply-actions"><button className="cancel-button" onClick={cancelPreview}>Annuler</button><button className="apply-button" onClick={handleApply} disabled={state.isProcessing}>Appliquer</button></div></section>}
      {state.applyResult && <div className="message assistant-message">Contrat appliqué : {state.applyResult.id} · révision {state.applyResult.revision}</div>}
      <form className="input-area" onSubmit={handleSubmit}><textarea value={inputValue} onChange={(event) => setInputValue(event.target.value)} placeholder="Ex: crée un voleur codeur · forge un génie · lance un benchmark vs qwen-plus · génère une image de renard · va au Camp" disabled={state.isProcessing} /><button className="send-button" type="submit" disabled={!inputValue.trim() || state.isProcessing}>Envoyer</button></form>
    </aside>
  );
}

