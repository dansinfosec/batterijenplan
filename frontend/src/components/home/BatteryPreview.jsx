import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// Interactieve voorbeeldberekening in de hero. BEWUST: de invoer is het
// bestaande, al gepubliceerde voorbeeld (4.500 / 3.200 kWh) en de twee
// adviesgetallen zijn vaste voorbeeldwaarden per doel — er wordt niets
// client-side berekend of beloofd; het echte advies volgt uit de calculator.
const GOALS = {
  self: {
    label: "Meer eigen stroom",
    advice: "14 kWh",
    explanation:
      "Overdag zonnestroom opslaan en die 's avonds zelf gebruiken, in plaats van terugleveren.",
  },
  trading: {
    label: "Dynamische handel",
    // 21 kWh is een bewust gekozen illustratieve homepage-preview
    // (PRESENTATION EXAMPLE, zie research/assumptions/calculator-values.md).
    // NIET door de backend berekend en NOOIT hergebruiken als
    // calculator-resultaat — het echte advies komt uitsluitend uit
    // calculators.services via POST /api/calculator/.
    advice: "21 kWh",
    explanation:
      "De batterij laadt bij lage stroomprijzen en levert of ontlaadt bij hoge prijzen (EMS-sturing).",
  },
};

export default function BatteryPreview() {
  const [goal, setGoal] = useState("self");
  // Animatie-cyclus: elke doelwissel (of hernieuwde zichtbaarheid) verhoogt de
  // teller. De teller zit in de React-key van de SVG, waardoor alleen de
  // energiestroom-visual remount en zijn run-once CSS-animaties opnieuw
  // starten. De kaart zelf remount niet.
  const [cycle, setCycle] = useState(0);

  // Alleen animeren terwijl het paneel echt in beeld is — geen werk off-screen.
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

  // Zodra het paneel (weer) zichtbaar wordt: één keer opnieuw afspelen.
  useEffect(() => {
    if (live) setCycle((c) => c + 1);
  }, [live]);

  const selectGoal = (key) => {
    setGoal(key);
    // Ook bij herselectie van hetzelfde doel (muis of toetsenbord) herstart
    // de visual — de key verandert door de teller.
    setCycle((c) => c + 1);
  };

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
            onClick={() => selectGoal(key)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Energiestroom: zon → woning → batterij (eigen stroom) of
          net ⇄ batterij (handel). Puur illustratief, inline SVG. */}
      <svg
        key={`${goal}-${cycle}`}
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
          {/* Basisrect = volledige (eind)vulling; de run-once animatie schaalt
              vanaf laag naar vol. Zonder animatie (reduced-motion / off-screen)
              staat de batterij dus direct in de eindtoestand. */}
          <rect className="hp2-batt-fill" x="232" y="24" width="26" height="26" />
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
          {/* aria-live: de waarde wisselt met het gekozen doel (14/21 kWh). */}
          <span className="hp2-result-value" aria-live="polite">
            <span className="hp2-batt-icon" aria-hidden="true" />
            {GOALS[goal].advice}
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
