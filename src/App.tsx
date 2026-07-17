import { useState } from "react";
import { LeCamp } from "./panels/LeCamp";
import { LeRepaire } from "./panels/LeRepaire";
import { LeConseil } from "./panels/LeConseil";
import { LeGenie } from "./panels/LeGenie";
import { LesTresors } from "./panels/LesTresors";
import { LAtelier } from "./panels/LAtelier";
import { LaNuitEtoilee } from "./panels/LaNuitEtoilee";
import { LeMiroir } from "./panels/LeMiroir";
import AssistantPanel from "./components/AssistantPanel";
import type { AssistantContext } from "./types/maxi";

const ONGLETS = [
  { id: "camp", label: "Le Camp", el: <LeCamp /> },
  { id: "repaire", label: "Le Repaire", el: <LeRepaire /> },
  { id: "genie", label: "Le Génie", el: <LeGenie /> },
  { id: "conseil", label: "Le Conseil", el: <LeConseil /> },
  { id: "miroir", label: "Le Miroir", el: <LeMiroir /> },
  { id: "atelier", label: "L'Atelier", el: <LAtelier /> },
  { id: "etoile", label: "Nuit Étoilée", el: <LaNuitEtoilee /> },
  { id: "tresors", label: "Les Trésors", el: <LesTresors /> },
] as const;

export function App() {
  const [actif, setActif] = useState<string>("genie");
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 10));
  const courant = ONGLETS.find((o) => o.id === actif) ?? ONGLETS[0];
  const assistantContext: AssistantContext = { tabId: courant.id, tabLabel: courant.label, sessionId, visibleData: { panel: courant.id, scope: "la-caverne-aux-40-voleurs" }, onGotoTab: setActif };
  return (
    <div className="app">
      <header className="topbar"><span className="brand">🏴 La Caverne aux 40 Voleurs</span><span className="tagline">« Sésame, ouvre-toi »</span></header>
      <nav className="tabs">{ONGLETS.map((o) => <button key={o.id} className={o.id === actif ? "tab active" : "tab"} onClick={() => setActif(o.id)}>{o.label}</button>)}</nav>
      <div className="workspace"><main className="panel">{courant.el}</main><AssistantPanel context={assistantContext} /></div>
    </div>
  );
}

