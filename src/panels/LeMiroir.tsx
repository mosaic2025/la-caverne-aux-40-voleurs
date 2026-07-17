// Onglet Le Miroir — visualise la fusion utilisateur (profil, courbe, vocabulaire).
import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface FusionProfile {
  userId: string;
  interactions: number;
  fusionPct: number;
  lenUser: number;
  lenGenie: number;
  lengthSimilarity: number;
  lexiconSimilarity: number;
  lexique: string[];
  lexiqueGenie: string[];
  voiceHint: string;
}

export function LeMiroir() {
  const [uid, setUid] = useState("chef");
  const [p, setP] = useState<FusionProfile | null>(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try { setP(await api.fusionProfile(uid)); }
    catch (e) { setErr(String(e)); setP(null); }
  };
  useEffect(() => { load(); }, [uid]);

  return (
    <section>
      <h2>Le Miroir de Fusion</h2>
      <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
        <b>À quoi ça sert :</b> Le Miroir mesure comment le Génie calque sa voix sur la tienne au fil des échanges.
        Plus le taux de fusion monte, plus il devient ta prolongation — même rythme, même vocabulaire, même ton.
        C'est la jauge d'<i>alignement</i> entre toi et ton MoE.
      </p>
      {err && <p style={{ color: "#e67" }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <input
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          style={{ background: "#0f0d0a", color: "#e8d5b5", border: "1px solid #2a2216", borderRadius: 6, padding: "6px 10px" }}
        />
        <button onClick={load}>Actualiser</button>
      </div>

      {!p ? (
        <p style={{ opacity: .6 }}>Aucun profil pour cet utilisateur. Discute avec le Génie pour faire naître le reflet.</p>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          {/* Fusion score */}
          <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>Fusion : {p.fusionPct}%</span>
              <span style={{ fontSize: 12, opacity: .6 }}>{p.interactions} échange{p.interactions > 1 ? "s" : ""}</span>
            </div>
            <div style={{ height: 10, background: "#0f0d0a", borderRadius: 5, marginBottom: 8, overflow: "hidden" }}>
              <div style={{ width: `${p.fusionPct}%`, height: "100%", background: "linear-gradient(90deg,#b8860b,#ffd700)", transition: "width .5s" }} />
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Similarité de longueur : {p.lengthSimilarity}% • Similarité de vocabulaire : {p.lexiconSimilarity}%
            </div>
          </div>

          {/* Longueurs moyennes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: .6 }}>Longueur moyenne — Toi</div>
              <div style={{ fontSize: 22, marginTop: 4 }}>{Math.round(p.lenUser)}</div>
              <div style={{ fontSize: 11, opacity: .5 }}>caractères/message</div>
            </div>
            <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: .6 }}>Longueur moyenne — Génie</div>
              <div style={{ fontSize: 22, marginTop: 4 }}>{Math.round(p.lenGenie)}</div>
              <div style={{ fontSize: 11, opacity: .5 }}>caractères/message</div>
            </div>
          </div>

          {/* Vocabulaire */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: .6, marginBottom: 8 }}>Tes mots fréquents</div>
              {p.lexique.length === 0 ? (
                <span style={{ opacity: .5, fontSize: 13 }}>Pas assez de données</span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {p.lexique.map((w) => (
                    <span key={w} style={{ background: "#0f0d0a", border: "1px solid #2a2216", borderRadius: 12, padding: "2px 8px", fontSize: 12 }}>{w}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: .6, marginBottom: 8 }}>Mots fréquents du Génie</div>
              {p.lexiqueGenie.length === 0 ? (
                <span style={{ opacity: .5, fontSize: 13 }}>Pas assez de données</span>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {p.lexiqueGenie.map((w) => (
                    <span key={w} style={{ background: "#0f0d0a", border: "1px solid #2a2216", borderRadius: 12, padding: "2px 8px", fontSize: 12 }}>{w}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Indice de voix */}
          {p.voiceHint && (
            <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 14, fontSize: 13, fontStyle: "italic", opacity: .9 }}>
              {p.voiceHint}
            </div>
          )}

          {/* Vocabulaire partagé = convergence de voix */}
          {(() => {
            const shared = p.lexique.filter((w) => p.lexiqueGenie.includes(w));
            return (
              <div style={{ background: "#14110b", border: "1px solid #2a2216", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, opacity: .6, marginBottom: 8 }}>
                  Vocabulaire partagé — signes de convergence ({shared.length})
                </div>
                {shared.length === 0 ? (
                  <span style={{ opacity: .5, fontSize: 13 }}>Pas encore de mots communs — échange davantage pour fusionner.</span>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {shared.map((w) => (
                      <span key={w} style={{ background: "linear-gradient(90deg,#2a2216,#3a2c1a)", border: "1px solid #b8860b", borderRadius: 12, padding: "2px 8px", fontSize: 12, color: "#ffd700" }}>{w}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </section>
  );
}