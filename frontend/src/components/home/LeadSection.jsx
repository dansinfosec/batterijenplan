import AdviceForm from "../AdviceForm.jsx";
import SectionReveal from "./SectionReveal.jsx";

// Conversiesectie rond het bestaande AdviceForm. Het formulier zelf (velden,
// consent, payload, validatie, analytics) blijft volledig ongewijzigd — deze
// component voegt alleen context en vertrouwen toe. Geen cijferclaims.
const AFTER_STEPS = [
  {
    title: "Wij bekijken uw situatie",
    text: "Uw gegevens en eventuele berekening worden door een specialist bekeken.",
  },
  {
    title: "Telefonisch overleg",
    text: "We bespreken welke batterijcapaciteit en systeemopbouw logisch zijn.",
  },
  {
    title: "Persoonlijk advies",
    text: "U beslist zelf — het advies is gratis en vrijblijvend.",
  },
];

export default function LeadSection() {
  return (
    <section className="hp-section hp2-lead">
      <div className="container">
        <div className="hp2-lead-panel">
          <SectionReveal className="hp2-lead-context">
            <span className="hp-kicker">Gratis situatiecheck</span>
            <h2 className="hp-h2">Laat uw situatie gratis controleren</h2>
            <p className="hp-section-intro">
              Vertel ons kort over uw woning. We bekijken welke
              batterijcapaciteit en systeemopbouw logisch zijn.
            </p>

            <ol className="hp2-after-steps">
              {AFTER_STEPS.map((step, i) => (
                <li className="hp2-after-step" key={step.title}>
                  <span className="hp2-after-num mono" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <span className="hp2-after-title">{step.title}</span>
                    <p className="hp2-after-text">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="hp2-trust-chips">
              <span className="hp2-chip">Gratis</span>
              <span className="hp2-chip">Vrijblijvend</span>
              <span className="hp2-chip">Onafhankelijk</span>
            </p>
          </SectionReveal>

          <SectionReveal className="hp2-lead-form">
            <AdviceForm
              variant="compact"
              headline="Vraag uw gratis advies aan"
              text="Binnen één minuut ingevuld — wij nemen daarna contact met u op."
              button="Vraag gratis advies aan"
              source="homepage_quick_check"
              submitEvent="homepage_advice_submit"
            />
          </SectionReveal>
        </div>
      </div>
    </section>
  );
}
