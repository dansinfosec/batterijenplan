import { useEffect, useState } from "react";

// ── Stap: waar komen uw energiegegevens vandaan? ───────────────────────────
// HomeWizard is de eerste ondersteunde bron; de "andere bron"-kaart is een
// eerlijke bèta (zelfde tolerante parser, badge "Binnenkort meer formaten").
// Het HomeWizard-label is bewust een neutraal monogram in de eigen
// Batterijenplan-stijl — geen merkkleuren door de interface heen.

function HelpModal({ onClose }) {
  // Escape sluit het paneel; focus blijft simpel (één sluitknop).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="lead-modal-backdrop" onClick={onClose}>
      <div
        className="lead-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sm-help-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="lead-modal-close" aria-label="Sluiten" onClick={onClose}>
          ×
        </button>
        <div className="calc2-sm-help">
          <span className="mono calc2-sm-help-eyebrow">HomeWizard · export</span>
          <h3 id="sm-help-title">Hoe exporteer ik mijn HomeWizard-data?</h3>
          <ol className="calc2-sm-help-steps">
            <li>Open de HomeWizard Energy-app op uw telefoon.</li>
            <li>Kies uw energiemeter (P1-meter).</li>
            <li>
              Ga naar het exporteren van meetgegevens. Voor export per
              meetinterval is een Energy+-abonnement van HomeWizard nodig.
            </li>
            <li>Kies de gewenste periode en exporteer als CSV.</li>
            <li>Deel of mail het bestand naar uzelf en upload het hier.</li>
          </ol>
          <p className="calc2-sm-help-note">
            De exacte menunamen kunnen per app-versie verschillen. Lukt het
            exporteren niet? Dan kunt u altijd de snelle berekening gebruiken.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SmartMeterSourcePicker({ onPickSource }) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <section className="calc-step-panel" aria-labelledby="sm-source-title">
      <h2 id="sm-source-title" className="calc-form-start">
        Waar komen uw energiegegevens vandaan?
      </h2>

      <div className="calc2-sm-source-grid">
        {/* HomeWizard — eerste ondersteunde merk-bron */}
        <article className="calc2-sm-source calc2-sm-source--primary">
          <div className="calc2-sm-source-head">
            <span className="calc2-sm-source-mark" aria-hidden="true">HW</span>
            <div>
              <h3 className="calc2-sm-source-title">HomeWizard</h3>
              <p className="mono calc2-sm-source-sub">Upload uw Energy+ CSV</p>
            </div>
          </div>
          <p className="calc2-sm-option-text">
            Gebruik uw geëxporteerde slimme-meterdata om uw historische afname
            en teruglevering te analyseren.
          </p>
          <div className="calc2-sm-option-actions">
            <button
              type="button"
              className="field-submit-button"
              onClick={() => onPickSource("homewizard")}
            >
              HomeWizard-bestand uploaden
            </button>
            <button
              type="button"
              className="calc2-sm-linkbtn"
              onClick={() => setHelpOpen(true)}
            >
              Hoe exporteer ik mijn HomeWizard-data?
            </button>
          </div>
        </article>

        {/* Andere bronnen — puur informatief zolang er geen parser voor
            bestaat: geen uploadactie, geen navigatie naar de uploadstap.
            HomeWizard is de enige ingeschakelde importbron. */}
        <article className="calc2-sm-source calc2-sm-source--disabled">
          <span className="calc2-sm-badge calc2-sm-badge--soon">Binnenkort</span>
          <div className="calc2-sm-source-head">
            <span className="calc2-sm-source-mark calc2-sm-source-mark--other" aria-hidden="true">
              CSV
            </span>
            <div>
              <h3 className="calc2-sm-source-title">Andere slimme-meterdata</h3>
            </div>
          </div>
          <p className="calc2-sm-option-text">
            We voegen ondersteuning voor meer P1-meters en energieleveranciers
            toe.
          </p>
        </article>
      </div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </section>
  );
}
