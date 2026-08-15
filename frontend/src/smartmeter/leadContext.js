// ── Slimme-meter-leadcontext: pure opbouwlogica ────────────────────────────
// Bouwt de compacte, geaggregeerde analyse-samenvatting die met een lead
// wordt meegestuurd (in de bestaande JSON-velden calculator_inputs/
// calculator_result — geen backend-wijziging). HARDE REGELS:
// - ALLEEN expliciet benoemde velden uit de analyse-response (allowlist);
//   ruwe kwartierwaarden, het CSV-bestand of praktijkreferentie-rijen komen
//   hier nooit in terecht — ook niet als een caller ze per ongeluk meegeeft.
// - Er wordt nooit zelf een kandidaat gekozen: selectie komt uitsluitend van
//   een expliciete gebruikersklik (analysis.recommendation is en blijft null
//   en wordt hier bewust niet gelezen).
// - De zelfconsumptie-modelwaarde gaat alleen mee wanneer de gebruiker dat
//   model expliciet heeft opgevraagd, gelabeld als MODEL — nooit gecombineerd
//   met de praktijkband.

export const SMARTMETER_LEAD_SOURCE = "smartmeter_homewizard";

export const SMARTMETER_LEAD_PRIVACY_NOTE =
  "Bij uw aanvraag sturen we alleen een samenvatting van deze analyse mee, " +
  "zoals uw totale afname, teruglevering en gekozen batterij. Uw CSV-bestand " +
  "en losse kwartierwaarden worden niet bij de aanvraag opgeslagen.";

export const TRADING_BAND_DISCLAIMER =
  "De handelsband is praktijkdata; geen garantie.";

const nf0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });

export function findCandidate(analysis, candidateId) {
  if (!candidateId) return null;
  return (analysis?.candidates || []).find((c) => c.id === candidateId) || null;
}

// Kandidaat-samenvatting: alleen identificatie + de kerncijfers die sales
// nodig heeft. Bewust géén praktijkreferentie-rijen (reported_practice_
// evidence) — de handelsband hieronder is de enige commerciële indicatie.
function candidateSummary(candidate) {
  const physical = candidate.physical || {};
  return {
    id: candidate.id,
    label: candidate.label,
    product_name: candidate.product_name,
    nominal_capacity_kwh: candidate.nominal_capacity_kwh,
    usable_capacity_kwh: candidate.usable_capacity_kwh,
    inverter_power_kw: candidate.inverter_power_kw,
    export_capture_pct: physical.export_capture_pct ?? null,
    equivalent_full_cycles: physical.equivalent_full_cycles ?? null,
  };
}

// Handelscase = de bestaande calculator-praktijkband van de GEKOZEN
// kandidaat, primaire contractvorm (dynamisch). Nooit de volledige
// referentiedataset, nooit een klantvoorspelling.
function tradingBusinessCase(candidate) {
  const band = candidate.calculator_trading_band;
  const range = band?.annual_range_eur_by_contract?.dynamic;
  if (!range) return null;
  return {
    contract_type: "dynamic",
    contract_label: "dynamisch contract",
    annual_range_min_eur: range[0],
    annual_range_max_eur: range[1],
    source: band.source,
    disclaimer: TRADING_BAND_DISCLAIMER,
  };
}

// Zelfconsumptie-model: apart gelabeld als MODEL, per kandidaat-id, zodat het
// nooit als (of bij) de praktijkband gelezen kan worden.
function selfConsumptionModel(scAnalysis) {
  const values = {};
  let scenarioId = null;
  let basis = null;
  for (const candidate of scAnalysis?.candidates || []) {
    const f = candidate.financial;
    if (!f) continue;
    values[candidate.id] = f.modeled_annual_value_eur;
    scenarioId = f.scenario_id;
    basis = f.basis;
  }
  if (scenarioId === null) return null;
  return {
    evidence_type: "MODEL",
    scenario_id: scenarioId,
    basis,
    annual_value_eur_by_candidate: values,
    note:
      "Modelwaarde op expliciet verzoek; niet optellen bij of vergelijken " +
      "met de praktijkband voor handel.",
  };
}

export function buildLeadAnalysisContext(
  analysis,
  { selectedCandidateId = null, selfConsumptionAnalysis = null } = {}
) {
  const profile = analysis?.profile || {};
  const candidate = findCandidate(analysis, selectedCandidateId);
  const context = {
    source: "homewizard",
    interval_count: profile.interval_count ?? null,
    observed_days: profile.observed_days ?? null,
    completeness_pct: profile.completeness_pct ?? null,
    grid_profile: {
      import_kwh: profile.raw_grid_import_kwh ?? null,
      export_kwh: profile.raw_grid_export_kwh ?? null,
    },
    selected_candidate_id: candidate ? candidate.id : null,
    selected_candidate: candidate ? candidateSummary(candidate) : null,
    trading_business_case: candidate ? tradingBusinessCase(candidate) : null,
  };
  if (selfConsumptionAnalysis) {
    const model = selfConsumptionModel(selfConsumptionAnalysis);
    if (model) context.self_consumption_model = model;
  }
  return context;
}

// Menselijk leesbare sales-samenvatting op basis van de opgebouwde context —
// zichtbaar in de bestaande admin-leadweergave (calculator_result-JSON).
export function buildSalesSummary(context) {
  const lines = ["Smartmeterlead — HomeWizard"];
  if (context.observed_days != null && context.interval_count != null) {
    lines.push(
      `Meetprofiel: ${nf0.format(context.observed_days)} dagen / ` +
        `${nf0.format(context.interval_count)} kwartieren`
    );
  }
  const grid = context.grid_profile || {};
  if (grid.import_kwh != null) lines.push(`Netafname: ${nf0.format(grid.import_kwh)} kWh`);
  if (grid.export_kwh != null) lines.push(`Teruglevering: ${nf0.format(grid.export_kwh)} kWh`);

  const sc = context.selected_candidate;
  if (sc) {
    lines.push("", `Interesse: ${sc.label} (${sc.product_name})`);
    lines.push(
      `${nf1.format(sc.nominal_capacity_kwh)} kWh nominaal / ` +
        `${nf1.format(sc.usable_capacity_kwh)} kWh bruikbaar / ` +
        `${nf1.format(sc.inverter_power_kw)} kW`
    );
    if (sc.export_capture_pct != null || sc.equivalent_full_cycles != null) {
      lines.push("", "Profielresultaat:");
      if (sc.export_capture_pct != null) {
        lines.push(`${nf1.format(sc.export_capture_pct)}% teruglevering benut`);
      }
      if (sc.equivalent_full_cycles != null) {
        lines.push(`${nf0.format(sc.equivalent_full_cycles)} equivalente cycli`);
      }
    }
  } else {
    lines.push("", "Interesse: algemene adviesaanvraag (geen batterij geselecteerd)");
  }

  const band = context.trading_business_case;
  if (band) {
    lines.push(
      "",
      "Indicatieve handelsband:",
      `€ ${nf0.format(band.annual_range_min_eur)} – € ${nf0.format(band.annual_range_max_eur)} per jaar`,
      band.contract_label,
      "",
      band.disclaimer
    );
  }

  if (context.self_consumption_model) {
    lines.push(
      "",
      `Zelfconsumptie-model (MODEL, ${context.self_consumption_model.scenario_id}): ` +
        "op verzoek meegerekend — staat los van de handelsband."
    );
  }
  return lines.join("\n");
}

// Volledige lead-payload-bijdrage: de bestaande JSON-velden van het
// leadformulier, gevuld met uitsluitend geaggregeerde analysecontext.
export function buildSmartMeterLeadPayload(analysis, options = {}) {
  const analysisContext = buildLeadAnalysisContext(analysis, options);
  return {
    calculator_inputs: {
      path: "smartmeter_analysis",
      analysis_context: analysisContext,
    },
    calculator_result: {
      type: "smartmeter_summary",
      sales_summary: buildSalesSummary(analysisContext),
    },
  };
}
