import { Link } from "react-router-dom";
import SectionReveal from "./SectionReveal.jsx";

// Vier verbonden stappen van energieprofiel naar persoonlijk advies.
// Informatie is altijd zichtbaar (geen verborgen content); hover/reveal is
// puur visuele ondersteuning.
const STEPS = [
  {
    num: "01",
    title: "Energieprofiel",
    text: "Uw jaarlijkse stroomverbruik vormt het vertrekpunt van de berekening.",
    icon: (
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="M17 4 L9 18 h6 L13 28 L23 13 h-6 Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="miter" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Zonnepanelen en teruglevering",
    text: "Hoeveel stroom u teruglevert bepaalt wat er op een zonnige dag te opslaan valt.",
    icon: (
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <g stroke="currentColor" strokeWidth="2.2">
          <line x1="16" y1="3" x2="16" y2="7" />
          <line x1="16" y1="25" x2="16" y2="29" />
          <line x1="3" y1="16" x2="7" y2="16" />
          <line x1="25" y1="16" x2="29" y2="16" />
        </g>
      </svg>
    ),
  },
  {
    num: "03",
    title: "Gebruiksdoel",
    text: "Meer eigen stroom gebruiken of dynamische handel — het doel stuurt de capaciteit.",
    icon: (
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="16" cy="16" r="1.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "Persoonlijk batterijadvies",
    text: "U ontvangt een passende indicatie voor capaciteit en systeemopbouw.",
    icon: (
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <rect x="7" y="9" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <rect x="12" y="5" width="8" height="4" fill="currentColor" />
        <rect x="10.5" y="20" width="11" height="4" fill="currentColor" />
      </svg>
    ),
  },
];

export default function AdviceJourney() {
  return (
    <section className="hp-section hp2-journey">
      <div className="container">
        <div className="hp-section-head">
          <span className="hp-kicker">Zo werkt het</span>
          <h2 className="hp-h2">Van energieprofiel naar batterijadvies</h2>
        </div>

        <ol className="hp2-journey-track">
          {STEPS.map((step, i) => (
            <SectionReveal
              as="li"
              key={step.num}
              className="hp2-journey-step"
              style={{ "--reveal-delay": `${i * 90}ms` }}
            >
              <div className="hp2-journey-marker" aria-hidden="true">
                <span className="hp2-journey-icon">{step.icon}</span>
              </div>
              <span className="hp2-journey-num mono">{step.num}</span>
              <h3 className="hp2-journey-title">{step.title}</h3>
              <p className="hp2-journey-text">{step.text}</p>
            </SectionReveal>
          ))}
        </ol>

        <div className="hp-section-cta">
          <Link to="/calculator" className="hp-link">
            Start de berekening
            <span aria-hidden="true" className="hp-link-arrow">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
