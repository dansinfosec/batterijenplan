// ── Presentatieselectors voor het analyse-antwoord ─────────────────────────
// Pure functies (node-testbaar) die de API-response omzetten naar
// weergavemodellen. HARDE REGELS, gespiegeld aan de backend:
// - geen mediaan/gemiddelde/percentielen afleiden uit gerapporteerde ranges;
// - geen provider-ranges mengen of tussen systemen interpoleren;
// - handelsband en zelfconsumptie-modelwaarde nooit optellen;
// - de frontend wijst nooit zelf een "beste" batterij aan
//   (analysis.recommendation is en blijft null tot de backend anders zegt);
// - N=1-referenties blijven expliciet anekdotisch gelabeld.

// Volgorde + NL-labels voor de contractbanden van Stage 2. "dynamic" is de
// primaire handelsindicatie (actieve handel vereist een dynamisch contract).
export const CONTRACT_LABELS = [
  ["dynamic", "Dynamisch contract (actieve handel)"],
  ["dynamic_self", "Dynamisch contract (eigen verbruik)"],
  ["variable", "Variabel contract"],
  ["fixed", "Vast contract"],
  ["unknown", "Contract onbekend"],
];
export const PRIMARY_CONTRACT = "dynamic";

export const NOT_ADDITIVE_NOTE =
  "Niet optellen bij de praktijkband voor handel; beide strategieën " +
  "gebruiken dezelfde batterijcapaciteit.";

export const N1_BADGE = "N=1 — niet representatief voor een vlootgemiddelde.";

// "Er is teruglevering gemeten" — nooit "u heeft zonnepanelen" claimen op
// basis van alleen P1-export (zie band_set_selection.equivalence_note).
export function exportObservationLabel(band) {
  return band?.stage2_band_set === "solar"
    ? "Er is teruglevering gemeten in uw profiel."
    : "Er is geen teruglevering gemeten in uw profiel.";
}

export function presentTradingBand(band) {
  if (!band) return null;
  const annual = band.annual_range_eur_by_contract || {};
  const perKwh = band.eur_per_kwh_year_by_contract || {};
  return {
    primary: {
      contract: PRIMARY_CONTRACT,
      contractLabel: CONTRACT_LABELS[0][1],
      annualRange: annual[PRIMARY_CONTRACT] || null, // [min, max] — 1-op-1 uit de API
      perKwhRange: perKwh[PRIMARY_CONTRACT] || null,
    },
    allContracts: CONTRACT_LABELS.filter(([key]) => annual[key]).map(
      ([key, label]) => ({ key, label, annualRange: annual[key], perKwhRange: perKwh[key] })
    ),
    observation: exportObservationLabel(band),
    nature: band.nature,
    correctionNote: band.correction_factors_note,
    source: band.source,
  };
}

// Eén praktijkreferentie-rij, 1-op-1 doorgegeven met alle verplichte context.
function practiceReference(row) {
  if (!row) return null;
  return {
    id: row.id,
    // Titel = systeemnaam zoals gepubliceerd ("Gerapporteerde X-praktijk-
    // referentie"); provider/EMS apart zichtbaar, nooit als opbrengstclaim.
    title: `Gerapporteerde ${row.system}-praktijkreferentie`,
    provider: row.provider || null,
    system: row.system,
    capacityKwh: row.capacity_kwh,
    powerKw: row.inverter_power_kw,
    sampleN: row.sample_n,
    sampleClass: row.sample_class,
    period: row.period,
    annualMinEur: row.annual_return_min_eur,
    annualMaxEur: row.annual_return_max_eur,
    distance: row.evidence_distance,
    capacityDifferencePct: row.capacity_difference_pct,
    isN1: row.sample_class === "N1",
    partialYear: Boolean(row.partial_year),
    warnings: row.warnings || [],
    role: row.role || null,
  };
}

export function presentPracticeEvidence(evidence) {
  if (!evidence) return null;
  const large = practiceReference(evidence.large_sample_reference);
  return {
    nearest: (evidence.nearest_hardware_matches || []).map(practiceReference),
    largeSample: large,
    coverageNote: evidence.coverage?.note || null,
    systemsCount: evidence.coverage?.systems_count ?? null,
    totalReportedInstallations:
      evidence.coverage?.total_reported_installations ?? null,
    disclaimer: evidence.disclaimer,
  };
}

export function presentPhysical(candidate, previous) {
  const p = candidate.physical || {};
  const comparison = candidate.comparison || {};
  return {
    // Kernmetrics — altijd zichtbaar op de kaart.
    importReductionKwh: p.grid_import_reduction_kwh,
    exportReductionKwh: p.grid_export_reduction_kwh,
    exportCapturePct: p.export_capture_pct,
    capacityUtilizationPct: p.capacity_utilization_pct,
    equivalentFullCycles: p.equivalent_full_cycles,
    incremental:
      previous && comparison.reference_id
        ? {
            referenceLabel: previous.label,
            importReductionKwh: comparison.additional_import_reduction_kwh,
            exportCapturePct: comparison.additional_export_capture_pct,
          }
        : null,
    // Technische details — achter een uitklap.
    technical: {
      chargedFromExportKwh: p.grid_export_charged_into_battery_kwh,
      dischargeOffsetKwh: p.battery_discharge_offsetting_grid_import_kwh,
      chargeLossesKwh: p.charge_losses_kwh,
      dischargeLossesKwh: p.discharge_losses_kwh,
      peakSocKwh: p.peak_soc_kwh,
      capacityLimitedIntervals: p.capacity_limited_charge_intervals,
      powerLimitedChargeIntervals: p.power_limited_charge_intervals,
      powerLimitedDischargeIntervals: p.power_limited_discharge_intervals,
    },
  };
}

// Zelfconsumptie-modelwaarde (alleen aanwezig na de expliciete tweede
// aanvraag met financial_scenario). Wordt apart gerenderd, nooit opgeteld.
export function presentSelfConsumption(candidate) {
  const f = candidate.financial;
  if (!f) return null;
  return {
    scenarioId: f.scenario_id,
    basis: f.basis, // 'observed' | 'annualized'
    annualValueEur: f.modeled_annual_value_eur,
    annualizationFactor: f.annualization_factor,
  };
}

// Hoofdselector: kandidaat-weergavemodellen in API-volgorde. Er wordt niets
// gesorteerd of uitgelicht: zonder backend-recommendation is er geen "beste".
export function candidateViewModels(analysis) {
  const candidates = analysis?.candidates || [];
  return candidates.map((candidate, i) => ({
    id: candidate.id,
    label: candidate.label,
    productName: candidate.product_name,
    nominalKwh: candidate.nominal_capacity_kwh,
    usableKwh: candidate.usable_capacity_kwh,
    powerKw: candidate.inverter_power_kw,
    tradingBand: presentTradingBand(candidate.calculator_trading_band),
    practice: presentPracticeEvidence(candidate.reported_practice_evidence),
    physical: presentPhysical(candidate, i > 0 ? candidates[i - 1] : null),
    selfConsumption: presentSelfConsumption(candidate),
  }));
}
