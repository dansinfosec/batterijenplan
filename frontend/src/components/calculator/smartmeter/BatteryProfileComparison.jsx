// ── Batterijvergelijking op basis van het huishoudprofiel ──────────────────
// Presentatiecomponent voor het (toekomstige) analyse-antwoord van de
// backend: kandidaten + eventueel één expliciete aanbeveling. De frontend
// bepaalt zelf nooit welke batterij "het beste" is — zonder
// analysis.recommendation wordt er niets uitgelicht. Met analysis.demo
// verschijnt altijd de conceptweergave-banner.

const nf0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });

function metricRows(c) {
  return [
    { label: "Bruikbare capaciteit", value: `${nf1.format(c.usable_capacity_kwh)} kWh` },
    { label: "Laad-/ontlaadvermogen", value: `${nf1.format(c.inverter_power_kw)} kW` },
    { label: "Teruglevering benut", value: `${nf0.format(c.export_captured_pct)}%` },
    { label: "Extra zelfconsumptie", value: `${nf0.format(c.added_self_consumption_kwh)} kWh/jaar` },
    { label: "Verwachte cycli", value: `${nf0.format(c.expected_cycles_per_year)} per jaar` },
    { label: "Minder afname", value: `${nf0.format(c.grid_import_reduction_kwh)} kWh/jaar` },
    { label: "Minder teruglevering", value: `${nf0.format(c.grid_export_reduction_kwh)} kWh/jaar` },
    { label: "Gemodelleerde jaarwaarde", value: `€ ${nf0.format(c.modeled_annual_value_eur)}` },
  ];
}

export default function BatteryProfileComparison({ analysis }) {
  // Geen analyse beschikbaar (productie zonder rekenmodule): eerlijke
  // "in ontwikkeling"-kaart in plaats van verzonnen resultaten.
  if (!analysis) {
    return (
      <section className="calc-step-panel calc2-sm-pending" aria-labelledby="sm-compare-title">
        <h2 id="sm-compare-title" className="calc-form-start">
          Welke batterij past het beste bij uw profiel?
        </h2>
        <p className="calc2-sm-entry-sub">
          De rekenmodule die uw geüploade verbruiksprofiel doorrekent tegen
          meerdere batterijcapaciteiten is in ontwikkeling. Uw profiel is
          succesvol ingelezen — gebruik ondertussen de snelle berekening voor
          een eerste indicatie.
        </p>
      </section>
    );
  }

  const { candidates = [], recommendation, demo } = analysis;
  const recommendedId = recommendation?.candidate_id || null;

  return (
    <section className="calc2-sm-compare" aria-labelledby="sm-compare-title">
      <h2 id="sm-compare-title" className="calc-form-start">
        Welke batterij past het beste bij uw profiel?
      </h2>

      {demo && (
        <p className="calc2-sm-demo-note" role="note">
          Conceptweergave met voorbeelddata — deze vergelijking is nog niet
          gekoppeld aan uw geüploade profiel.
        </p>
      )}

      <div className="calc2-sm-compare-grid">
        {candidates.map((c, i) => {
          const recommended = c.id === recommendedId;
          const prev = i > 0 ? candidates[i - 1] : null;
          return (
            <article
              key={c.id}
              className={`calc2-sm-batt-card${recommended ? " is-recommended" : ""}`}
            >
              {recommended && (
                <span className="calc2-sm-badge calc2-sm-badge--card">Aanbevolen voor uw profiel</span>
              )}
              <p className="calc2-sm-batt-size">{c.label}</p>
              <dl className="calc2-sm-batt-rows">
                {metricRows(c).map((row) => (
                  <div key={row.label} className="calc2-sm-batt-row">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
              {c.improvement_over_previous_pct != null && prev && (
                <p className="calc2-sm-batt-delta">
                  +{nf0.format(c.improvement_over_previous_pct)}% t.o.v. {prev.label}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
