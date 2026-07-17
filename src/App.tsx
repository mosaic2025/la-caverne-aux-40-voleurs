import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { LeCamp } from "./panels/LeCamp";
import { LeRepaire } from "./panels/LeRepaire";
import { LeConseil } from "./panels/LeConseil";
import { LeGenie } from "./panels/LeGenie";
import { LesTresors } from "./panels/LesTresors";
import { LAtelier } from "./panels/LAtelier";
import { LaNuitEtoilee } from "./panels/LaNuitEtoilee";
import { LeMiroir } from "./panels/LeMiroir";
import { LAreneSabre } from "./panels/LAreneSabre";
import AssistantPanel from "./components/AssistantPanel";
import type { AssistantContext } from "./types/maxi";
import type { BalanceStats } from "./types";
import { LeConnecteur } from "./panels/LeConnecteur";
import { LaLampe } from "./panels/LaLampe";

const ONGLETS = [
  { id: "camp", label: "Le Camp", el: <LeCamp /> },
  { id: "repaire", label: "Le Repaire", el: <LeRepaire /> },
  { id: "genie", label: "Le Génie", el: <LeGenie /> },
  { id: "conseil", label: "Le Conseil", el: <LeConseil /> },
  { id: "arene", label: "Arène du Sabre", el: <LAreneSabre /> },
  { id: "miroir", label: "Le Miroir", el: <LeMiroir /> },
  { id: "atelier", label: "L'Atelier", el: <LAtelier /> },
  { id: "etoile", label: "Nuit Étoilée", el: <LaNuitEtoilee /> },
  { id: "connecteur", label: "Le Connecteur", el: <LeConnecteur /> },
  { id: "lampe", label: "La Lampe", el: <LaLampe /> },
  { id: "tresors", label: "Les Trésors", el: <LesTresors /> },
] as const;

export function App() {
  const [actif, setActif] = useState<string>("genie");
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 10));
  const [balance, setBalance] = useState<BalanceStats | null>(null);
  useEffect(() => {
    api.balance().then(setBalance).catch(() => {});
    const t = setInterval(() => api.balance().then(setBalance).catch(() => {}), 5000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    api.listUnlocked().then((r) => setUnlocked(r.unlocked)).catch(() => {});
    const t = setInterval(() => api.listUnlocked().then((r) => setUnlocked(r.unlocked)).catch(() => {}), 5000);
    return () => clearInterval(t);
  }, []);
  const visibleOnglets = ONGLETS.filter((o) => o.id !== "lampe" || unlocked.includes("lampe_revealed"));
  const courant = visibleOnglets.find((o) => o.id === actif) ?? visibleOnglets[0];
  const assistantContext: AssistantContext = { tabId: courant.id, tabLabel: courant.label, sessionId, visibleData: { panel: courant.id, scope: "la-caverne-aux-40-voleurs" }, onGotoTab: setActif };
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">🏴 La Caverne aux 40 Voleurs</span>
        <span className="tagline">« Sésame, ouvre-toi »</span>
        {balance && (
          <span style={{ marginLeft: "auto", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ opacity: 0.7 }}>Balance :</span>
            <span style={{ color: (balance.economiePct ?? 0) > 0 ? "#7ad67a" : "#e67" }}>{(balance.economiePct ?? 0) > 0 ? "+" : ""}{balance.economiePct}% économie</span>
            <span style={{ opacity: 0.5 }}>· {balance.tokensBande.toLocaleString()} tok bande · {balance.tokensSolo.toLocaleString()} tok solo</span>
          </span>
        )}
      </header>
      <nav className="tabs">{visibleOnglets.map((o) => <button key={o.id} className={o.id === actif ? "tab active" : "tab"} onClick={() => setActif(o.id)}>{o.label}</button>)}</nav>
      <div className="workspace"><main className="panel">{courant.el}</main><AssistantPanel context={assistantContext} /></div>
    </div>
  );
}
