import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// Interactieve voorbeeldberekening in de hero. BEWUST: de getallen zijn de
// bestaande, al gepubliceerde voorbeeldwaarden (4.500 / 3.200 / 14 kWh) — er
// wordt niets nieuws berekend of beloofd. De doel-toggle wisselt alleen de
// uitleg en de visuele energiestroom, niet het voorbeeldgetal; het echte
// advies volgt uit de calculator.
const GOALS = {
  self: {
    label: "Meer eigen stroom",
    explanation:
      "Overdag zonnestroom opslaan en die 's avonds zelf gebruiken, in plaats van terugleveren.",
  },
  trading: {
    label: "Dynamische handel",
    explanation:
      "De batterij laadt bij lage stroomprijzen en levert of ontlaadt bij hoge prijzen (EMS-sturing).",
  },
};

export default function BatteryPreview() {
  const [goal, setGoal] = useState("self");

  // Animatielus (energiestroom + batterijvulling) alleen laten draaien terwijl
  // het paneel echt in beeld is — geen loops off-screen.
  const rootRef = useRef(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !("IntersectionObserver" in window)) {
      setLive(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setLive(entries.some((e) => e.isIntersecting)),
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <aside
      ref={rootRef}
      className={`hp2-preview${live ? " is-live" : ""}`}
      aria-label="Voorbeeldberekening"
    >
      <div className="hp2-preview-head">
        <span className="hp2-preview-title">Energieprofiel</span>
        <span className="hp2-preview-tag">Voorbeeldberekening</span>
      </div>

      {/* Doel-toggle: verandert uitleg + stroomrichting, niet het voorbeeldgetal. */}
      <div className="hp2-goal-toggle" role="group" aria-label="Kies een energiedoel">
        {Object.entries(GOALS).map(([key, g]) => (
          <button
            key={key}
            type="button"
            className={`hp2-goal-btn${goal === key ? " active" : ""}`}
            aria-pressed={goal === key}
            onClick={() => setGoal(key)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Energiestroom: zon → woning → batterij (eigen stroom) of
          net ⇄ batterij (handel). Puur illustratief, inline SVG. */}
      <svg
        className={`hp2-flow hp2-flow--${goal}`}
        viewBox="0 0 280 96"
        aria-hidden="true"
        focusable="false"
      >
        {/* Zon */}
        <g className="hp2-node hp2-node-sun">
          <circle cx="34" cy="26" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <g stroke="currentColor" strokeWidth="2.5">
            <line x1="34" y1="6" x2="34" y2="12" />
            <line x1="34" y1="40" x2="34" y2="46" />
            <line x1="14" y1="26" x2="20" y2="26" />
            <line x1="48" y1="26" x2="54" y2="26" />
          </g>
        </g>
        {/* Woning */}
        <g className="hp2-node">
          <path d="M118 34 L140 16 L162 34" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="miter" />
          <rect x="124" y="34" width="32" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </g>
        {/* Batterij */}
        <g className="hp2-node">
          <rect x="228" y="20" width="34" height="34" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <rect x="240" y="14" width="10" height="6" fill="currentColor" />
          <rect className="hp2-batt-fill" x="232" y="42" width="26" height="8" />
        </g>
        {/* Net (alleen actief bij handel) */}
        <g className="hp2-node hp2-node-grid">
          <path d="M28 68 L40 68 M34 62 L34 88 M26 88 L42 88" stroke="currentColor" strokeWidth="2.5" fill="none" />
        </g>
        {/* Stromen */}
        <path className="hp2-wire hp2-wire-sun" d="M56 26 H116" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
        <path className="hp2-wire hp2-wire-house" d="M164 34 H226" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
        <path className="hp2-wire hp2-wire-grid" d="M44 76 H200 Q212 76 216 62 L222 50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
      </svg>

      {/* Uitleg wisselt met het doel; aria-live zodat de wijziging wordt
          voorgelezen zonder focus te verplaatsen. */}
      <p className="hp2-preview-explain" aria-live="polite">
        {GOALS[goal].explanation}
      </p>

      <div className="hp2-prows">
        <div className="hp2-prow">
          <span className="hp2-prow-label">Jaarverbruik</span>
          <span className="hp2-prow-value">4.500 kWh</span>
        </div>
        <div className="hp2-prow">
          <span className="hp2-prow-label">Teruglevering</span>
          <span className="hp2-prow-value">3.200 kWh</span>
        </div>
        <div className="hp2-prow hp2-prow--result">
          <span className="hp2-prow-label">Indicatief advies</span>
          <span className="hp2-result-value">
            <span className="hp2-batt-icon" aria-hidden="true" />
            14 kWh
          </span>
        </div>
      </div>

      <p className="hp2-preview-note">
        Uw doel en teruglevering bepalen het advies — bereken uw eigen situatie.
      </p>
      <Link to="/calculator" className="hp2-preview-cta">
        Start uw berekening
        <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
}
