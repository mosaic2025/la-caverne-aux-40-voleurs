// Onglet La Nuit Étoilée — génération d'images et vidéos par prompts.
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { EtoileJob } from "../types";

type EtoileJobLocal = EtoileJob & { localPath?: string };

// URL locale persistente si le média est téléchargé côté backend, sinon OSS distante.
function mediaUrl(job: EtoileJobLocal): string {
  if (job.localPath) return `/api/etoile/${job.localPath}`;
  return job.url ?? "";
}

const PRESETS = [
  { label: "Caverne magique", prompt: "Une caverne orientale aux parois dorées, 40 voleurs en silhouettes, lumière d'une lampe magique, style peinture persane." },
  { label: "Génie spectral", prompt: "Un génie bleu translucide sortant d'une lampe ancienne, nuages de fumée dorée, ciel étoilé, style fantastique." },
  { label: "Sésame cyber", prompt: "Une porte de cave massive s'ouvrant dans une ville cyberpunk orientale, néons, style Blade Runner." },
];

export function LaNuitEtoilee() {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<"image" | "video">("image");
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState<EtoileJobLocal[]>([]);
  const [err, setErr] = useState("");

  const refresh = async () => {
    try { setJobs(await api.etoileJobs()); } catch (e) { setErr(String(e)); }
  };
  useEffect(() => { refresh(); const t = setInterval(refresh, 4000); return () => clearInterval(t); }, []);

  // Polling des jobs vidéo PENDING : refresh toutes 5s, max 15 tentatives.
  useEffect(() => {
    const pending = jobs.filter((j) => j.type === "video" && j.status === "PENDING");
    if (pending.length === 0) return;
    let count = 0;
    const tick = async () => {
      if (count >= 15) return;
      count += 1;
      for (const job of pending) {
        try { await api.etoileRefresh(job.id); } catch { /* ignore */ }
      }
      await refresh();
    };
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [jobs]);

  const create = async () => {
    if (!prompt.trim()) return;
    setBusy(true); setErr("");
    try {
      await (type === "image" ? api.etoileImage(prompt) : api.etoileVideo(prompt));
      await refresh();
      setPrompt("");
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const refreshOne = async (id: string) => {
    try {
      await api.etoileRefresh(id);
      await refresh();
    } catch (e) { setErr(String(e)); }
  };

  return (
    <section>
      <h2>La Nuit Étoilée</h2>
      {err && <p style={{ color: "#e67" }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => setPrompt(p.prompt)} disabled={busy}>{p.label}</button>
        ))}
      </div>
      <textarea
        style={{ width: "100%", minHeight: 80, background: "#0f0d0a", color: "#e8d5b5", border: "1px solid #2a2216", borderRadius: 6, padding: 8 }}
        placeholder="Décris la scène à générer..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={busy}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <select value={type} onChange={(e) => setType(e.target.value as "image" | "video")} disabled={busy}>
          <option value="image">Image (z-image-turbo)</option>
          <option value="video">Vidéo (wan2.1-t2v)</option>
        </select>
        <button disabled={busy || !prompt.trim()} onClick={create}>{busy ? "Invocation…" : "✨ Invoquer"}</button>
      </div>

      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {jobs.map((j) => {
          const url = mediaUrl(j);
          const succeeded = j.status === "SUCCEEDED" && url;
          return (
            <div key={j.id} style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 12, opacity: .6, marginBottom: 6 }}>{j.type === "image" ? "🖼" : "🎬"} {j.status} · {new Date(j.ts).toLocaleTimeString()}</div>
              <div style={{ fontSize: 13, marginBottom: 8, whiteSpace: "pre-wrap" }}>{j.prompt}</div>
              {succeeded ? (
                j.type === "image" ? <img src={url} alt={j.prompt} style={{ width: "100%", borderRadius: 6 }} /> :
                <video src={url} controls style={{ width: "100%", borderRadius: 6 }} />
              ) : j.status === "FAILED" ? (
                <div style={{ height: 120, background: "#0f0d0a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#e67", textAlign: "center", padding: 8 }}>
                  ❌ {j.error ?? "Échec de génération"}
                </div>
              ) : (
                <div style={{ height: 120, background: "#0f0d0a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, opacity: .5 }}>
                  ⏳ Génération en cours…
                </div>
              )}
              {j.promptEnrichi && (
                <details style={{ marginTop: 6, fontSize: 11, opacity: .7 }}>
                  <summary style={{ cursor: "pointer", opacity: .6 }}>Prompt enrichi (qwen-vl-plus)</summary>
                  <div style={{ marginTop: 4, whiteSpace: "pre-wrap", opacity: .8 }}>{j.promptEnrichi}</div>
                </details>
              )}
              {succeeded && (
                <a download href={url} style={{ display: "inline-block", marginTop: 8, color: "#e8d5b5", textDecoration: "none" }}>
                  <button type="button" style={{ width: "100%" }}>⬇ Télécharger</button>
                </a>
              )}
              {j.status === "PENDING" && <button style={{ marginTop: 8 }} onClick={() => refreshOne(j.id)}>Rafraîchir</button>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
