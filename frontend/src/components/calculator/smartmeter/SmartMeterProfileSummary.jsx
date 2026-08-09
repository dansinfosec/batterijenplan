import { annualizeProfile, intervalLabel } from "../../../smartmeter/model.js";

// ── Energieprofiel-samenvatting na een geslaagde import ────────────────────
// Alle waarden komen uit het geparsede bestand (buildEnergyProfile); hier
// wordt niets berekend behalve formatteren. Piekvermogens zijn gemiddelden
// per meetinterval — dat staat er ook bij, we claimen geen echte piekmeting.

const nf0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
// Metertijden zijn een naïeve uniforme klok en worden door de parser als UTC
// genormaliseerd; hier dus ook als UTC tonen (anders schuiven datumgrenzen).
const df = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default function SmartMeterProfileSummary({
  data,
  onCalculate,
  onUseInQuick,
}) {
  const { profile, fileName } = data;
  const points = `${nf0.format(profile.pointCount)} ${intervalLabel(profile.intervalMinutes, profile.pointCount)}`;
  const annualized = annualizeProfile(profile);

  const metrics = [
    {
      label: "Analyseperiode",
      value: `${df.format(profile.periodStart)} – ${df.format(profile.periodEnd)}`,
      wide: true,
    },
    { label: "Meetpunten", value: points },
    {
      label: "Meetinterval",
      value: profile.intervalMinutes ? `${profile.intervalMinutes} minuten` : "—",
    },
    { label: "Netafname", value: `${nf0.format(profile.totalImportKwh)} kWh` },
    { label: "Teruglevering", value: `${nf0.format(profile.totalExportKwh)} kWh` },
    {
      label: "Hoogste gemiddeld importvermogen per meetinterval",
      value: profile.maxImportKw != null ? `${nf1.format(profile.maxImportKw)} kW` : "—",
    },
    {
      label: "Hoogste gemiddeld exportvermogen per meetinterval",
      value: profile.maxExportKw != null ? `${nf1.format(profile.maxExportKw)} kW` : "—",
    },
    {
      label: "Datacompleetheid",
      value:
        profile.completenessPct != null ? `${nf1.format(profile.completenessPct)}%` : "—",
    },
  ];

  return (
    <section className="calc-report calc2-report calc2-sm-profile" aria-labelledby="sm-profile-title">
      <div className="calc2-report-success" role="status">
        <span className="calc2-report-check" aria-hidden="true">✓</span>
        <span className="calc2-report-success-text">Uw bestand is succesvol ingelezen</span>
      </div>

      <span className="mono calc-report-eyebrow calc2-report-eyebrow" id="sm-profile-title">
        Energieprofiel
      </span>

      {fileName && (
        <p className="calc2-sm-filechip" title={fileName}>
          <span className="calc2-sm-filechip-icon" aria-hidden="true">▤</span>
          <span className="calc2-sm-filechip-name">{fileName}</span>
        </p>
      )}

      <dl className="calc2-sm-metrics">
        {metrics.map((m) => (
          <div key={m.label} className={`calc2-sm-metric${m.wide ? " calc2-sm-metric--wide" : ""}`}>
            <dt>{m.label}</dt>
            <dd>{m.value}</dd>
          </div>
        ))}
      </dl>

      {profile.maxImportKw != null && (
        <p className="calc2-sm-metric-note">
          Import- en exportwaarden in kW zijn het gemiddelde vermogen per
          meetinterval van {profile.intervalMinutes} minuten.
        </p>
      )}

      <div className="calc-step-nav calc2-sm-profile-nav">
        <button type="button" className="field-submit-button" onClick={onCalculate}>
          Bereken mijn batterijadvies
        </button>
        {annualized && onUseInQuick && (
          <button
            type="button"
            className="calc2-sm-linkbtn"
            onClick={() => onUseInQuick(annualized)}
          >
            Of gebruik deze gegevens in de snelle berekening
            {annualized.scaled ? " (omgerekend naar 12 maanden)" : ""}
          </button>
        )}
      </div>
    </section>
  );
}
