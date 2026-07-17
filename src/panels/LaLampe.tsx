// Onglet La Lampe — avatar compagnon né, persistant et fusionnel
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AvatarState, MemoryShard } from "../types";

const stageEmoji: Record<string, string> = {
  oeuf: "🥚",
  larve: "🐛",
  forme: "🧞",
  forme_eveillee: "✨",
};

const stageName: Record<string, string> = {
  oeuf: "Oeuf",
  larve: "Larve",
  forme: "Forme",
  forme_eveillee: "Forme éveillée",
};

const shardEmoji: Record<MemoryShard["type"], string> = {
  technique: "🔧",
  préférence: "💡",
  emotion: "❤️",
};

export function LaLampe() {
  const [state, setState] = useState<AvatarState | null>(null);
  const [userId, setUserId] = useState("chef");
  const [err, setErr] = useState("");
  const [forged, setForged] = useState("");

  const load = async () => {
    setErr("");
    try {
      const s = await api.avatar(userId);
      setState(s);
    } catch (e) { setErr(String(e)); }
  };

  useEffect(() => { load(); }, [userId]);

  const wakeUp = async () => {
    setErr("");
    try {
      const s = await api.evolveAvatar(userId, {
        name: "Nour",
        userMsg: "Qui es-tu ?",
        genieAnswer: "Je suis Nour, l'esprit de ta lampe. Je grandis avec chacun de tes mots.",
        fusionPct: 0,
      });
      setState(s);
    } catch (e) { setErr(String(e)); }
  };

  const forgeVoleur = async () => {
    setErr("");
    setForged("");
    try {
      const r = await api.avatarForgeVoleur(userId);
      setForged(`Voleur forgé : ${r.voleur.nom} (id ${r.voleur.id}) — ${r.shardsUsed} shard(s) utilisé(s).`);
    } catch (e) { setErr(String(e)); }
  };

  const personality = state?.personality;
  const memories = state?.memories || [];
  const shards = state?.shards || [];
  const progress = state?.progress;
  const awake = !!state?.exists;

  return (
    <section>
      <h2>La Lampe</h2>
      <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
        Ici naît Nour, ton compagnon. Plus tu interagis avec le Génie, plus il évolue et fusionne avec ton style.
      </p>
      {err && <p style={{ color: "#e67" }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Identifiant utilisateur" />
        <button onClick={load}>Actualiser</button>
      </div>

      {!awake ? (
        <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 48, textAlign: "center" }}>🥚</div>
          <p style={{ textAlign: "center", opacity: 0.7 }}>La Lampe est encore close. Tape "shazaam" dans le terminal de l'Atelier, ou frotte la lampe pour éveiller Nour.</p>
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button onClick={wakeUp}>🪔 Frotter la lampe</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <span style={{ fontSize: 64 }}>{stageEmoji[personality?.stage || "oeuf"] || "🪔"}</span>
              <div>
                <div style={{ fontSize: 20 }}>{personality?.name || "Nour"}</div>
                <div style={{ fontSize: 12, opacity: 0.6, textTransform: "capitalize" }}>
                  {stageName[personality?.stage || "oeuf"]} · Humeur {personality?.mood} · {personality?.interactions || 0} échanges
                </div>
                {progress?.nextAt && (
                  <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                    Prochain stade à ~{progress.nextAt} interactions · poids des souvenirs {Math.round(progress.shardWeight * 10) / 10}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              {[
                { label: "Formalité", v: personality?.formality ?? 0.5 },
                { label: "Verbiosité", v: personality?.verbosity ?? 0.5 },
                { label: "Humour", v: personality?.humor ?? 0.3 },
                { label: "Patience", v: personality?.patience ?? 0.7 },
                { label: "Fusion", v: (personality?.fusionPct ?? 0) / 100 },
              ].map(({ label, v }) => (
                <div key={label} style={{ background: "#0f0d0a", borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>{label}</div>
                  <div style={{ height: 6, background: "#2a2216", borderRadius: 3, marginTop: 6 }}>
                    <div style={{ width: `${Math.round(v * 100)}%`, height: "100%", background: label === "Fusion" ? "#ffd700" : "#b8860b", borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>{Math.round(v * 100)}%</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Souvenirs récents</div>
            {memories.length === 0 ? (
              <span style={{ opacity: 0.5, fontSize: 13 }}>Pas encore de souvenirs — parle au Génie.</span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflow: "auto" }}>
                {memories.slice(-10).map((m, i) => (
                  <div key={i} style={{ background: "#0f0d0a", borderRadius: 6, padding: 8, fontSize: 12 }}>
                    <span style={{ color: m.role === "user" ? "#7ad67a" : "#b8860b", fontWeight: 700 }}>{m.role === "user" ? "Toi" : "Génie"}</span>
                    <span style={{ opacity: 0.7, marginLeft: 8 }}>{m.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {shards.length > 0 && (
            <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Fragments d'âme (shards)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflow: "auto" }}>
                {shards.slice(-8).reverse().map((s) => (
                  <div key={s.id} style={{ background: "#0f0d0a", borderRadius: 6, padding: 8, fontSize: 12 }}>
                    <span style={{ marginRight: 6 }}>{shardEmoji[s.type]}</span>
                    <span style={{ opacity: 0.85 }}>{s.content}</span>
                    <span style={{ opacity: 0.5, marginLeft: 8 }}>{Math.round(s.weight * 100)}%</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <button onClick={forgeVoleur} disabled={shards.length === 0}>🔨 Forger un Voleur à mon image</button>
                {forged && <div style={{ fontSize: 12, marginTop: 8, color: "#7ad67a" }}>{forged}</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
