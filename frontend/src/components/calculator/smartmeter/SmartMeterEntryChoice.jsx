// ── Startscherm van de calculator: snelle berekening vs. slimme-meterdata ──
// Puur presentatie; de gekozen route komt van de aanroeper (Calculator.jsx).
// De slimme-meterkaart is visueel prominenter (dikkere rand, offset-schaduw,
// badge), maar de snelle berekening blijft een volwaardige, nette optie.

const SMART_BENEFITS = [
  "Analyse van verbruik en teruglevering",
  "Inzicht per meetinterval",
  "Betere vergelijking van batterijcapaciteiten",
  "Inzicht in benodigd laad- en ontlaadvermogen",
  "Vergelijking van meerdere batterijgroottes",
];

export default function SmartMeterEntryChoice({ onQuick, onSmart }) {
  return (
    <section className="calc-step-panel calc2-sm-entry" aria-labelledby="calc-entry-title">
      <span className="mono calc-progress">Start</span>
      <h2 id="calc-entry-title" className="calc-form-start calc2-sm-entry-title">
        Hoe wilt u uw thuisbatterij berekenen?
      </h2>
      <p className="calc2-sm-entry-sub">
        Gebruik uw jaarverbruik voor een snelle indicatie, of upload
        slimme-meterdata voor een analyse op basis van uw werkelijke
        verbruiksprofiel.
      </p>

      <div className="calc2-sm-entry-grid">
        {/* Optie 1 — Snel berekenen */}
        <article className="calc2-sm-option">
          <div className="calc2-sm-option-head">
            <h3 className="calc2-sm-option-title">Snel berekenen</h3>
            <span className="mono calc2-sm-option-meta">± 2 minuten</span>
          </div>
          <p className="calc2-sm-option-text">
            Bereken met uw jaarverbruik, teruglevering en zonnepanelen.
          </p>
          <div className="calc2-sm-option-actions">
            <button type="button" className="calc2-sm-btn-secondary" onClick={onQuick}>
              Start snelle berekening
            </button>
          </div>
        </article>

        {/* Optie 2 — Slimme-meterdata (prominenter) */}
        <article className="calc2-sm-option calc2-sm-option--premium">
          <span className="calc2-sm-badge">Meest persoonlijk</span>
          <div className="calc2-sm-option-head">
            <h3 className="calc2-sm-option-title">Berekenen met slimme-meterdata</h3>
          </div>
          <p className="calc2-sm-option-text">
            Upload uw energiegegevens en laat Batterijenplan uw echte
            verbruiks- en terugleverprofiel analyseren.
          </p>
          <ul className="calc2-sm-benefits">
            {SMART_BENEFITS.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <div className="calc2-sm-option-actions">
            <button type="button" className="field-submit-button" onClick={onSmart}>
              Gebruik mijn slimme-meterdata
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
