// NourOrb — mini-avatar compagnon flottant, présent dans AssistantPanel
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AvatarState } from "../types";

interface NourOrbProps {
  userId?: string;
  tabId?: string;
  tabLabel?: string;
  onGotoTab?: (tabId: string) => void;
}

const STAGE_EMOJI: Record<string, string> = {
  oeuf: "🥚",
  larve: "🐛",
  forme: "🧞",
  forme_eveillee: "✨",
};

const STAGE_LABEL: Record<string, string> = {
  oeuf: "Nour dort encore",
  larve: "Nour s'éveille",
  forme: "Nour te guide",
  forme_eveillee: "Nour est fusionné",
};

function makeWhisper(state: AvatarState | null, tabId?: string, tabLabel?: string): string | null {
  if (!state?.exists) return `✨ Tape "shazaam" dans le terminal de l'Atelier pour réveiller Nour.`;
  const stage = state.personality?.stage || "oeuf";
  const interactions = state.personality?.interactions || 0;
  const fusion = state.personality?.fusionPct || 0;

  if (stage === "oeuf") return `🥚 Nour est un oeuf. Parle au Génie pour le réchauffer.`;
  if (stage === "larve") return `🐛 Nour imite ton style (${interactions} échanges).`;

  // murmures contextuels
  if (tabId === "atelier") return `💡 Nour : "Besoin d'un contrat MAXI pour ce code ?"`;
  if (tabId === "genie") return `🧞 Nour : "Je peux devenir l'orchestrateur de ce Génie quand je serai éveillé."`;
  if (tabId === "miroir") return `🪞 Nour : "Ton reflet me nourrit. Fusion ${fusion}%."`;
  if (tabId === "arene") return `⚔️ Nour : "Envie un Voleur dans l'Arène du Sabre ?"`;
  if (tabId === "tresors") return `💰 Nour : "Les benchmarks scelleront la victoire de la Caverne."`;
  if (tabId === "connecteur") return `🌐 Nour : "Chaque pensée partagée enrichit le savoir commun."`;

  return `🧞 Nour te surveille depuis ${tabLabel || "cet onglet"}.`;
}

export function NourOrb({ userId = "chef", tabId, tabLabel, onGotoTab }: NourOrbProps) {
  const [state, setState] = useState<AvatarState | null>(null);
  const [whisper, setWhisper] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  const load = async () => {
    try {
      const s = await api.avatar(userId);
      setState(s);
    } catch (e) {
      // Silencieux : Nour n'est pas encore disponible
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [userId]);

  useEffect(() => {
    if (!state) return;
    const w = makeWhisper(state, tabId, tabLabel);
    setWhisper(w);
    if (state.exists) setPulse(true);
    const t = setTimeout(() => setPulse(false), 1500);
    return () => clearTimeout(t);
  }, [state, tabId, tabLabel]);

  const stage = state?.personality?.stage || "oeuf";
  const emoji = STAGE_EMOJI[stage] || "🪔";
  const label = STAGE_LABEL[stage] || "Nour";

  return (
    <div style={{ position: "relative", marginTop: 8, padding: "0 10px 10px", display: "flex", alignItems: "center", gap: 10 }}>
      {whisper && (
        <div
          onClick={() => onGotoTab?.("lampe")}
          style={{
            flex: 1,
            background: "rgba(184,134,11,.14)",
            border: "1px solid rgba(184,134,11,.35)",
            borderRadius: 10,
            padding: "6px 10px",
            fontSize: 12,
            cursor: onGotoTab ? "pointer" : "default",
            opacity: 0.92,
          }}
        >
          {whisper}
        </div>
      )}
      <button
        title={label}
        onClick={() => onGotoTab?.("lampe")}
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "1px solid rgba(184,134,11,.55)",
          background: "rgba(20,16,11,.9)",
          fontSize: 22,
          cursor: onGotoTab ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: pulse ? "0 0 18px 4px rgba(255,215,0,.55)" : "0 0 6px rgba(184,134,11,.35)",
          transition: "box-shadow .6s ease",
          flexShrink: 0,
        }}
      >
        {emoji}
      </button>
    </div>
  );
}

export default NourOrb;
