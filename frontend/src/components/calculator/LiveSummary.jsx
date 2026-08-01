import { useState } from "react";

// Sticky live-samenvatting naast de wizard. Toont uitsluitend waarden die de
// bezoeker zelf al heeft ingevuld — er wordt niets berekend of geschat op de
// client. Vóór het resultaat: "Uw advies wordt opgebouwd". Op mobiel is dit
// een inklapbaar "Uw invoer"-blok boven de wizard.
const SOLAR_LABELS = { yes: "Ja", no: "Nee", planned: "Wordt geplaatst" };
const CONTRACT_LABELS = {
  fixed: "Vast",
  variable: "Variabel",
  dynamic: "Dynamisch",
  unknown: "Weet ik niet",
};

export default function LiveSummary({
  customerTypeLabel,
  hasSolar,
  solarPath,
  form,
  noSolarForm,
  goalLabel,
  hasResult,
  remainingLabel,
}) {
  const [openMobile, setOpenMobile] = useState(false);

  const rows = [];
  rows.push({ label: "Type klant", value: customerTypeLabel });
  if (hasSolar !== null) {
    rows.push({ label: "Zonnepanelen", value: SOLAR_LABELS[hasSolar] || "—" });
  }
  const usage = solarPath ? form.yearly_usage : noSolarForm.yearly_usage;
  if (usage) rows.push({ label: "Jaarverbruik", value: `${usage} kWh` });
  if (solarPath && form.exported_energy) {
    rows.push({ label: "Teruglevering", value: `${form.exported_energy} kWh` });
  }
  if (!solarPath && hasSolar === "no" && noSolarForm.contract_type) {
    rows.push({
      label: "Contract",
      value: CONTRACT_LABELS[noSolarForm.contract_type] || noSolarForm.contract_type,
    });
  }
  if (goalLabel) rows.push({ label: "Energiedoel", value: goalLabel });

  const body = (
    <>
      <div className="calc2-summary-rows">
        {rows.map((row) => (
          <div className="calc2-summary-row" key={row.label}>
            <span className="calc2-summary-label">{row.label}</span>
            <span className="calc2-summary-value">{row.value}</span>
          </div>
        ))}
      </div>

      <div className={`calc2-summary-status${hasResult ? " is-done" : ""}`}>
        {/* Neutrale batterij-visual: vulniveau is decoratief, geen berekening. */}
        <span className="calc2-summary-batt" aria-hidden="true">
          <span className="calc2-summary-batt-fill" />
        </span>
        <span aria-live="polite">
          {hasResult ? "Uw advies staat klaar" : "Uw advies wordt opgebouwd"}
        </span>
      </div>
      {!hasResult && remainingLabel && (
        <p className="calc2-summary-remaining mono">{remainingLabel}</p>
      )}
    </>
  );

  return (
    <>
      {/* Desktop: sticky paneel rechts */}
      <aside className="calc2-summary calc2-summary--desktop" aria-label="Uw invoer">
        <div className="calc2-summary-head">
          <span>Uw invoer</span>
          <span className="mono">live</span>
        </div>
        {body}
      </aside>

      {/* Mobiel: inklapbaar blok boven de wizard */}
      <div className="calc2-summary calc2-summary--mobile">
        <button
          type="button"
          className="calc2-summary-toggle"
          aria-expanded={openMobile}
          onClick={() => setOpenMobile((v) => !v)}
        >
          Uw invoer
          <span className="hp2-acc-chevron" aria-hidden="true" />
        </button>
        {openMobile && <div className="calc2-summary-mobile-body">{body}</div>}
      </div>
    </>
  );
}
