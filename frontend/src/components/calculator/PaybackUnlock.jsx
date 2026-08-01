// Vergrendelde terugverdientijd-kaart die het bestaande leadformulier in de
// resultaatervaring integreert. Toont uitsluitend neutrale placeholders
// ("— jaar", "€ — per maand") met een slot-icoon — nooit verzonnen of
// geblurde cijfers: het echte rapport bestaat pas na de Stage 2-berekening
// van de backend. Het formulier zelf (velden, consent, payload, analytics)
// wordt ongewijzigd als children doorgegeven vanuit Calculator.jsx.
const AFTER_STEPS = [
  "Wij slaan uw berekening op.",
  "U beantwoordt enkele korte aanvullende vragen.",
  "Uw indicatieve terugverdientijd wordt direct getoond.",
];

function LockIcon() {
  return (
    <svg
      className="calc2-unlock-lock"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10 V7 a4 4 0 0 1 8 0 v3" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="15" r="1.6" fill="currentColor" />
    </svg>
  );
}

export default function PaybackUnlock({ hasResult, children }) {
  return (
    <div className="calc2-unlock">
      <div className="calc2-unlock-head">
        <span className="mono calc2-unlock-eyebrow">Volgende inzicht</span>
        <h2 className="calc2-unlock-title">Ontdek uw persoonlijke terugverdientijd</h2>
        <p className="calc2-unlock-text">
          {hasResult
            ? "Uw capaciteit is berekend. Laat uw gegevens achter en beantwoord daarna enkele korte vragen om uw indicatieve maandvoordeel en terugverdientijd te bekijken."
            : "Laat uw gegevens achter en beantwoord daarna enkele korte vragen om uw indicatieve maandvoordeel en terugverdientijd te bekijken."}
        </p>
      </div>

      {/* Vergrendelde metriek-preview: neutrale placeholders, geen data. */}
      <div className="calc2-unlock-metrics" aria-hidden="true">
        <div className="calc2-unlock-metric">
          <span className="calc2-unlock-metric-label mono">Indicatief maandvoordeel</span>
          <span className="calc2-unlock-metric-value">
            <LockIcon />
            € — per maand
          </span>
        </div>
        <div className="calc2-unlock-metric">
          <span className="calc2-unlock-metric-label mono">Indicatieve terugverdientijd</span>
          <span className="calc2-unlock-metric-value">
            <LockIcon />
            — jaar
          </span>
        </div>
        {/* Energielijn richting de metrics: analyse-in-opbouw, geen waarde. */}
        <span className="calc2-unlock-wire" />
      </div>

      <ol className="calc2-unlock-steps">
        {AFTER_STEPS.map((step, i) => (
          <li key={step}>
            <span className="calc2-unlock-step-num mono" aria-hidden="true">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      {/* Het bestaande LeadCaptureForm — ongewijzigde props/payload/gedrag. */}
      <div className="calc2-unlock-form">{children}</div>
    </div>
  );
}
