import { Link } from "react-router-dom";
import SectionReveal from "./SectionReveal.jsx";

// "Berekeningen die u kunt volgen" als interactieve audit-trail: per
// rekenfactor een uitklapbare uitleg (native <details>, dus ook zonder JS
// volledig bruikbaar). Geen nieuwe cijfers of beloftes — alleen uitleg over
// wélke invoer meetelt.
const FACTORS = [
  {
    factor: "Jaarlijks stroomverbruik",
    unit: "kWh / jaar",
    detail:
      "Uw verbruik geeft context bij het advies, maar bepaalt de batterijgrootte niet rechtstreeks — zo voorkomt de berekening onnodig grote systemen.",
  },
  {
    factor: "Teruglevering",
    unit: "kWh / jaar",
    detail:
      "De stroom die u jaarlijks teruglevert wordt verdeeld over de zonnige dagen: dat bepaalt wat er per dag te opslaan valt.",
  },
  {
    factor: "Zonnepanelen",
    unit: "vermogen / aantal",
    detail:
      "Met of zonder zonnepanelen verschilt de route: opslag van eigen opwek, of sturing op dynamische prijzen.",
  },
  {
    factor: "Energiecontract",
    unit: "vast / dynamisch",
    detail:
      "Bij een dynamisch contract kan de batterij extra ruimte benutten door te laden en ontladen op prijsverschillen.",
  },
  {
    factor: "Energieverlies",
    unit: "rendement",
    detail:
      "Laden en ontladen kost energie; het advies gaat uit van bruikbare capaciteit in plaats van bruto-cijfers.",
  },
  {
    factor: "Toekomstig verbruik",
    unit: "EV / warmtepomp",
    detail:
      "Een elektrische auto of warmtepomp verhoogt uw eigen verbruik — dat nemen we mee in het adviesgesprek.",
  },
];

export default function CalcTransparency() {
  return (
    <section className="hp-method hp2-method" id="rekenmethode">
      <div className="container">
        <div className="hp2-method-grid">
          <SectionReveal className="hp2-method-intro">
            <span className="hp-kicker">Rekenmethode</span>
            <h2 className="hp-h2">Berekeningen die u kunt volgen</h2>
            <p className="hp-section-intro">
              Wij rekenen niet met vaste beloftes, maar met uw eigen situatie.
              Elke stap van invoer naar advies is navolgbaar — klap de factoren
              open om te zien wat meetelt en waarom.
            </p>
            <div className="hp2-method-chain" aria-hidden="true">
              <span className="hp2-chain-node">Invoer</span>
              <span className="hp2-chain-wire" />
              <span className="hp2-chain-node">Berekening</span>
              <span className="hp2-chain-wire" />
              <span className="hp2-chain-node hp2-chain-node--result">Advies</span>
            </div>
            <div className="hp-section-cta">
              {/* Er bestaat (nog) geen aparte rekenmethode-route. Bewust naar de
                  calculator gelinkt i.p.v. een gebroken route aan te maken. */}
              <Link to="/calculator" className="hp-link">
                Bekijk de rekenmethode in de calculator
                <span aria-hidden="true" className="hp-link-arrow">→</span>
              </Link>
            </div>
          </SectionReveal>

          <SectionReveal className="hp2-audit">
            <div className="hp2-audit-head">
              <span>Rekenfactoren</span>
              <span className="mono">invoer → advies</span>
            </div>
            {FACTORS.map((row) => (
              <details className="hp2-audit-row" key={row.factor}>
                <summary className="hp2-audit-summary">
                  <span className="hp2-audit-factor">{row.factor}</span>
                  <span className="hp2-audit-unit mono">{row.unit}</span>
                  <span className="hp2-acc-chevron" aria-hidden="true" />
                </summary>
                <p className="hp2-audit-detail">{row.detail}</p>
              </details>
            ))}
            <div className="hp2-audit-total">
              <span className="hp2-audit-factor">Passend batterijadvies</span>
              <span className="hp2-audit-unit mono">kWh-capaciteit</span>
            </div>
          </SectionReveal>
        </div>
      </div>
    </section>
  );
}
