// Tests voor de slimme-meter-leadcontext (leadContext.js): de compacte,
// geaggregeerde samenvatting die met een lead meegaat. Tegen dezelfde ECHTE
// backend-response-fixtures als de analysetests (synthetisch huishouden).
// Kernpunten: allowlist (nooit ruwe kwartierwaarden, CSV of praktijk-
// referentie-rijen), geen automatische kandidaatkeuze, zelfconsumptie alleen
// na expliciet verzoek en altijd als MODEL gelabeld.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  SMARTMETER_LEAD_SOURCE,
  SMARTMETER_LEAD_PRIVACY_NOTE,
  TRADING_BAND_DISCLAIMER,
  buildLeadAnalysisContext,
  buildSalesSummary,
  buildSmartMeterLeadPayload,
  findCandidate,
} from "../src/smartmeter/leadContext.js";

const fixture = (name) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), "utf-8")
  );
const PHYSICAL = fixture("smartmeter-analysis-physical.json");
const FINANCIAL = fixture("smartmeter-analysis-financial.json");

// ── Basiscontract ──────────────────────────────────────────────────────────

test("lead source is het afgesproken smartmeter-kanaal", () => {
  assert.equal(SMARTMETER_LEAD_SOURCE, "smartmeter_homewizard");
  assert.ok(SMARTMETER_LEAD_SOURCE.length <= 50); // past in Lead.source (CharField 50)
});

test("context bevat het geaggregeerde netprofiel uit de response", () => {
  const ctx = buildLeadAnalysisContext(PHYSICAL, { selectedCandidateId: "t14" });
  assert.equal(ctx.source, "homewizard");
  assert.equal(ctx.interval_count, 35040);
  assert.equal(ctx.observed_days, 365);
  assert.equal(ctx.grid_profile.import_kwh, 3008.305);
  assert.equal(ctx.grid_profile.export_kwh, 4008.305);
});

test("geklikte kandidaat wordt de geselecteerde context (allowlist-velden)", () => {
  const ctx = buildLeadAnalysisContext(PHYSICAL, { selectedCandidateId: "t14" });
  assert.equal(ctx.selected_candidate_id, "t14");
  const sc = ctx.selected_candidate;
  assert.equal(sc.product_name, "Dyness S3 Tower T14");
  assert.equal(sc.nominal_capacity_kwh, 14.2);
  assert.equal(sc.usable_capacity_kwh, 12.78);
  assert.equal(sc.inverter_power_kw, 6);
  assert.equal(sc.export_capture_pct, 41.3);
  assert.equal(sc.equivalent_full_cycles, 114.7);
  // Exact de afgesproken sleutels — niets extra's lekt mee.
  assert.deepEqual(Object.keys(sc).sort(), [
    "equivalent_full_cycles",
    "export_capture_pct",
    "id",
    "inverter_power_kw",
    "label",
    "nominal_capacity_kwh",
    "product_name",
    "usable_capacity_kwh",
  ]);
});

test("handelscase = calculatorband van de gekozen kandidaat, dynamisch contract", () => {
  const ctx = buildLeadAnalysisContext(PHYSICAL, { selectedCandidateId: "t14" });
  const band = ctx.trading_business_case;
  assert.equal(band.contract_type, "dynamic");
  assert.equal(band.annual_range_min_eur, 781);
  assert.equal(band.annual_range_max_eur, 1349);
  assert.equal(band.disclaimer, TRADING_BAND_DISCLAIMER);
});

// ── Geen automatische selectie ─────────────────────────────────────────────

test("zonder klik geen kandidaat — ook al is recommendation null en zijn er banden", () => {
  assert.equal(PHYSICAL.recommendation, null); // vaststaand backend-contract
  const ctx = buildLeadAnalysisContext(PHYSICAL);
  assert.equal(ctx.selected_candidate_id, null);
  assert.equal(ctx.selected_candidate, null);
  assert.equal(ctx.trading_business_case, null);
});

test("onbekend kandidaat-id gedraagt zich als geen selectie", () => {
  assert.equal(findCandidate(PHYSICAL, "t99"), null);
  const ctx = buildLeadAnalysisContext(PHYSICAL, { selectedCandidateId: "t99" });
  assert.equal(ctx.selected_candidate, null);
});

// ── Ruwe-data-uitsluiting ──────────────────────────────────────────────────

test("payload bevat nooit intervallen, CSV-context of praktijkreferentie-rijen", () => {
  // Zelfs een vervuilde input (caller geeft per ongeluk intervallen/bestand
  // mee) lekt niet door: de opbouw is allowlist-gebaseerd.
  const poisoned = {
    ...PHYSICAL,
    intervals: [[1735689600000, 0.1, 0]],
    file: { name: "export.csv" },
    fileName: "export.csv",
  };
  const payload = buildSmartMeterLeadPayload(poisoned, {
    selectedCandidateId: "t14",
    selfConsumptionAnalysis: FINANCIAL,
  });
  const str = JSON.stringify(payload);
  for (const forbidden of [
    '"intervals"',
    '"file"',
    '"fileName"',
    '"timestamp"',
    '"reported_practice_evidence"',
    '"nearest_hardware_matches"',
    '"large_sample_reference"',
    '"sample_n"',
    '"evidence_distance"',
  ]) {
    assert.ok(!str.includes(forbidden), `payload bevat verboden sleutel ${forbidden}`);
  }
  // Compact: een orde van grootte kleiner dan de analyse-response, en ver
  // onder de omvang van 35.040 kwartierwaarden.
  assert.ok(str.length < 4000, `payload te groot: ${str.length} tekens`);
});

// ── Zelfconsumptie: alleen op expliciet verzoek, altijd MODEL ─────────────

test("zelfconsumptie ontbreekt zonder expliciete tweede aanvraag", () => {
  const ctx = buildLeadAnalysisContext(PHYSICAL, { selectedCandidateId: "t14" });
  assert.ok(!("self_consumption_model" in ctx));
});

test("zelfconsumptie na opt-in: apart MODEL-blok, los van de handelsband", () => {
  const ctx = buildLeadAnalysisContext(PHYSICAL, {
    selectedCandidateId: "t14",
    selfConsumptionAnalysis: FINANCIAL,
  });
  const model = ctx.self_consumption_model;
  assert.equal(model.evidence_type, "MODEL");
  assert.equal(model.scenario_id, "study_2027_post_fixed");
  assert.equal(model.annual_value_eur_by_candidate.t14, 258.96);
  // Nooit gecombineerd: de handelscase kent geen modelwaarde en andersom.
  assert.ok(!("modeled_annual_value_eur" in ctx.trading_business_case));
  assert.ok(!("annual_range_min_eur" in model));
});

// ── Sales-samenvatting ─────────────────────────────────────────────────────

test("sales-samenvatting gebruikt echte waarden in nl-NL-notatie", () => {
  const ctx = buildLeadAnalysisContext(PHYSICAL, { selectedCandidateId: "t14" });
  const summary = buildSalesSummary(ctx);
  assert.ok(summary.startsWith("Smartmeterlead — HomeWizard"));
  assert.match(summary, /365 dagen \/ 35\.040 kwartieren/);
  assert.match(summary, /Netafname: 3\.008 kWh/);
  assert.match(summary, /Teruglevering: 4\.008 kWh/);
  assert.match(summary, /Interesse: 14 kWh \(Dyness S3 Tower T14\)/);
  assert.match(summary, /14,2 kWh nominaal \/ 12,8 kWh bruikbaar \/ 6 kW/);
  assert.match(summary, /41,3% teruglevering benut/);
  assert.match(summary, /115 equivalente cycli/);
  assert.match(summary, /€ 781 – € 1\.349 per jaar/);
  assert.ok(summary.includes(TRADING_BAND_DISCLAIMER));
  // Nooit een N=1-referentie als klantclaim in de samenvatting.
  assert.ok(!summary.includes("Groene Vrienden"));
  assert.ok(!summary.includes("N=1"));
});

test("sales-samenvatting zonder kandidaat: algemene aanvraag, geen band", () => {
  const summary = buildSalesSummary(buildLeadAnalysisContext(PHYSICAL));
  assert.ok(summary.includes("algemene adviesaanvraag"));
  assert.ok(!summary.includes("handelsband"));
});

// ── Payload-vorm voor het bestaande leadformulier ──────────────────────────

test("payload past in de bestaande JSON-velden van het leadformulier", () => {
  const payload = buildSmartMeterLeadPayload(PHYSICAL, { selectedCandidateId: "t14" });
  assert.deepEqual(Object.keys(payload).sort(), ["calculator_inputs", "calculator_result"]);
  assert.equal(payload.calculator_inputs.path, "smartmeter_analysis");
  assert.equal(payload.calculator_inputs.analysis_context.selected_candidate_id, "t14");
  assert.equal(payload.calculator_result.type, "smartmeter_summary");
  assert.ok(payload.calculator_result.sales_summary.includes("Dyness S3 Tower T14"));
});

test("privacytekst benoemt samenvatting én uitsluiting van CSV/kwartierwaarden", () => {
  assert.ok(SMARTMETER_LEAD_PRIVACY_NOTE.includes("samenvatting"));
  assert.ok(SMARTMETER_LEAD_PRIVACY_NOTE.includes("CSV-bestand"));
  assert.ok(SMARTMETER_LEAD_PRIVACY_NOTE.includes("kwartierwaarden"));
});
