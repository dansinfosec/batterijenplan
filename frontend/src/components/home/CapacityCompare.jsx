import SectionReveal from "./SectionReveal.jsx";

// Legt visueel uit dat batterijcapaciteit niet gelijk is aan jaarverbruik:
// de teruglevering (per zonnige dag) is de maat, niet het jaartotaal.
// Cijfers = de bestaande voorbeeldwaarden uit de hero (4.500 / 3.200 kWh);
// er wordt niets nieuws berekend of beloofd.
const COMPARE_POINTS = [
  {
    term: "Bruikbare capaciteit",
    text: "Niet de bruto-kWh, maar wat u werkelijk kunt gebruiken (ontlaaddiepte).",
  },
  {
    term: "Laad- en ontlaadvermogen",
    text: "Hoe snel de batterij kan laden en leveren, uitgedrukt in kW.",
  },
  {
    term: "Garantie en restcapaciteit",
    text: "Aantal cycli of jaren en de capaciteit die daarna gegarandeerd overblijft.",
  },
  {
    term: "EMS en slimme aansturing",
    text: "Sturing op verbruik, teruglevering en dynamische stroomprijzen.",
  },
  {
    term: "Uitbreidbaarheid",
    text: "Kunt u later modules bijplaatsen als uw verbruik groeit?",
  },
  {
    term: "Compatibiliteit met omvormer en woning",
    text: "Past het systeem bij uw omvormer, meterkast en netaansluiting?",
  },
];

export default function CapacityCompare() {
  return (
    <section className="hp-section hp2-capacity">
      <div className="container">
        <div className="hp2-capacity-grid">
          <SectionReveal className="hp2-capacity-story">
            <span className="hp-kicker">Capaciteit begrijpen</span>
            <h2 className="hp-h2">
              Een batterij kiest u niet op uw jaarverbruik
            </h2>
            <p className="hp-section-intro">
              Een hoog jaarverbruik betekent niet automatisch een grote
              batterij. Bepalend is hoeveel zonnestroom u per zonnige dag kunt
              opslaan — en wat u daarmee wilt doen.
            </p>

            {/* Visuele vergelijking op de bestaande voorbeeldcijfers. */}
            <div className="hp2-bars" role="img" aria-label="Voorbeeld: jaarverbruik 4.500 kilowattuur vergeleken met teruglevering 3.200 kilowattuur per jaar. De batterijcapaciteit volgt uit de teruglevering per zonnige dag, niet uit het jaarverbruik.">
              <div className="hp2-bar-row">
                <span className="hp2-bar-label">Jaarverbruik</span>
                <div className="hp2-bar-track">
                  <div className="hp2-bar hp2-bar--usage" style={{ "--w": "100%" }} />
                </div>
                <span className="hp2-bar-value mono">4.500 kWh</span>
              </div>
              <div className="hp2-bar-row">
                <span className="hp2-bar-label">Teruglevering</span>
                <div className="hp2-bar-track">
                  <div className="hp2-bar hp2-bar--export" style={{ "--w": "71%" }} />
                </div>
                <span className="hp2-bar-value mono">3.200 kWh</span>
              </div>
              <p className="hp2-bars-note">
                De teruglevering — verdeeld over de zonnige dagen — bepaalt wat
                er dagelijks te opslaan valt. Dat is de basis van het
                capaciteitsadvies.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal className="hp2-capacity-points">
            <h3 className="hp2-points-title">
              Vergelijken doet u op meer dan capaciteit
            </h3>
            <div className="hp2-accordion">
              {COMPARE_POINTS.map((point) => (
                <details className="hp2-acc-item" key={point.term}>
                  <summary className="hp2-acc-summary">
                    {point.term}
                    <span className="hp2-acc-chevron" aria-hidden="true" />
                  </summary>
                  <p className="hp2-acc-body">{point.text}</p>
                </details>
              ))}
            </div>
          </SectionReveal>
        </div>
      </div>
    </section>
  );
}
