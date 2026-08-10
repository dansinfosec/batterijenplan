// Tests voor de slimme-meter-analysekoppeling: payload/foutafhandeling
// (analysisClient) en presentatieselectors (presentAnalysis), tegen ECHTE
// backend-responses die met de echte parser + lokale Django zijn vastgelegd
// (fixtures/smartmeter-analysis-*.json; synthetisch huishouden — geen
// klantdata en geen empirisch bewijs).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  ANALYSIS_PATH,
  SELF_CONSUMPTION_SCENARIO,
  SMARTMETER_PRIVACY_NOTICE,
  SmartMeterApiError,
  buildAnalysisPayload,
  mapHttpError,
  mapTransportError,
  requestAnalysis,
} from "../src/smartmeter/analysisClient.js";
import {
  N1_BADGE,
  NOT_ADDITIVE_NOTE,
  candidateViewModels,
  exportObservationLabel,
} from "../src/smartmeter/presentAnalysis.js";

const fixture = (name) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), "utf-8")
  );
const PHYSICAL = fixture("smartmeter-analysis-physical.json");
const FINANCIAL = fixture("smartmeter-analysis-financial.json");

const INTERVALS = [
  { timestamp: 1735689600000, import_kwh: 0.1, export_kwh: 0 },
  { timestamp: 1735690500000, import_kwh: 0, export_kwh: 0.05 },
];

const FORBIDDEN_STAT_KEYS =
  /(median|mediaan|(^|[^a-z])mean|gemiddeld|average|p10|p50|p90|percentile|percentiel)/i;

function* walkKeys(obj, path = "") {
  if (Array.isArray(obj)) {
    for (const [i, v] of obj.entries()) yield* walkKeys(v, `${path}[${i}]`);
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      yield [`${path}.${k}`, k];
      yield* walkKeys(v, `${path}.${k}`);
    }
  }
}

// ── Payload-contract ──
test("payload volgt het echte API-contract", () => {
  const payload = buildAnalysisPayload(INTERVALS, { intervalMinutes: 15 });
  assert.deepEqual(Object.keys(payload), ["source", "interval_minutes", "intervals"]);
  assert.equal(payload.source, "homewizard");
  assert.equal(payload.interval_minutes, 15);
  assert.equal(payload.intervals, INTERVALS); // zelfde array — geen kopie/transformatie
});

test("financial_scenario wordt standaard weggelaten en alleen op verzoek meegestuurd", () => {
  assert.equal("financial_scenario" in buildAnalysisPayload(INTERVALS), false);
  const withScenario = buildAnalysisPayload(INTERVALS, {
    financialScenario: SELF_CONSUMPTION_SCENARIO,
  });
  assert.equal(withScenario.financial_scenario, "study_2027_post_fixed");
});

// ── Foutafhandeling + retry ──
test("statusfouten worden vertaald: 400 (met serverdetail), 429, 500, 503", () => {
  const badRequest = mapHttpError(400, "Interval 12 ontbreekt.");
  assert.equal(badRequest.kind, "validation");
  assert.equal(badRequest.userMessage, "Interval 12 ontbreekt.");
  assert.equal(badRequest.retryable, false);
  assert.equal(mapHttpError(429).kind, "rate_limited");
  assert.match(mapHttpError(429).userMessage, /blijft bewaard/);
  assert.equal(mapHttpError(500).kind, "server");
  assert.equal(mapHttpError(503).kind, "unavailable");
});

test("netwerkfout en timeout krijgen eigen, herbruikbare melding", () => {
  assert.equal(mapTransportError(new TypeError("fetch failed")).kind, "network");
  const abort = new Error("aborted");
  abort.name = "AbortError";
  assert.equal(mapTransportError(abort).kind, "timeout");
});

test("requestAnalysis gooit een SmartMeterApiError bij een API-fout", async () => {
  const failingFetch = async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: { code: "throttled", detail: null } }),
  });
  await assert.rejects(
    requestAnalysis(failingFetch, "/api", INTERVALS),
    (err) => err instanceof SmartMeterApiError && err.kind === "rate_limited"
  );
});

test("retry hergebruikt exact dezelfde geparsede intervallen (geen nieuw bestand nodig)", async () => {
  const bodies = [];
  const fetchImpl = async (url, opts) => {
    bodies.push(JSON.parse(opts.body));
    assert.equal(url, `/api${ANALYSIS_PATH}`);
    return { ok: true, status: 200, json: async () => PHYSICAL };
  };
  await requestAnalysis(fetchImpl, "/api", INTERVALS);
  await requestAnalysis(fetchImpl, "/api", INTERVALS); // retry-pad
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[0], bodies[1]);
  assert.deepEqual(bodies[0].intervals, INTERVALS);
});

// ── Kandidaten + handelsband ──
test("kandidaten komen dynamisch uit de response (5 stuks, API-volgorde)", () => {
  const models = candidateViewModels(PHYSICAL);
  assert.deepEqual(
    models.map((m) => m.id),
    PHYSICAL.candidates.map((c) => c.id)
  );
  assert.equal(models.length, 5);
  for (const m of models) {
    assert.ok(m.label);
    assert.ok(m.tradingBand, `${m.id}: calculator_trading_band aanwezig`);
    assert.ok(m.practice, `${m.id}: reported_practice_evidence aanwezig`);
  }
});

test("handelsband is 1-op-1 de calculator_trading_band uit de API (geen herberekening)", () => {
  const models = candidateViewModels(PHYSICAL);
  for (const [i, m] of models.entries()) {
    const band = PHYSICAL.candidates[i].calculator_trading_band;
    assert.deepEqual(m.tradingBand.primary.annualRange, band.annual_range_eur_by_contract.dynamic);
    for (const row of m.tradingBand.allContracts) {
      assert.deepEqual(row.annualRange, band.annual_range_eur_by_contract[row.key]);
    }
  }
});

test("exportwaarneming claimt teruglevering, nooit zonnepanelen", () => {
  const band = PHYSICAL.candidates[0].calculator_trading_band;
  const label = exportObservationLabel(band);
  assert.match(label, /teruglevering gemeten/);
  assert.doesNotMatch(label, /zonnepanelen/);
  assert.doesNotMatch(JSON.stringify(candidateViewModels(PHYSICAL)), /U heeft zonnepanelen/i);
});

// ── Praktijkreferenties ──
test("praktijkreferenties behouden provider, N, range, periode en afstandscontext", () => {
  for (const m of candidateViewModels(PHYSICAL)) {
    for (const ref of m.practice.nearest) {
      assert.ok(ref.system);
      assert.ok(Number.isFinite(ref.sampleN));
      assert.ok(ref.sampleClass);
      assert.equal(ref.period, "2025");
      assert.ok(Number.isFinite(ref.annualMinEur));
      assert.ok(Number.isFinite(ref.annualMaxEur));
      assert.match(ref.distance, /geen gelijkwaardigheid/);
      assert.ok(Number.isFinite(ref.capacityDifferencePct));
    }
  }
});

test("T10 toont Tibber 13,3 kWh als dichtstbijzijnde referentie met 31%-afstand", () => {
  const t10 = candidateViewModels(PHYSICAL).find((m) => m.id === "t10");
  const nearest = t10.practice.nearest[0];
  assert.equal(nearest.id, "tibber_homevolt_133");
  assert.equal(nearest.capacityDifferencePct, 31);
  assert.match(nearest.distance, /31.*groter/);
});

test("large_sample_reference staat los van de hardware-matches, als marktcontext", () => {
  for (const m of candidateViewModels(PHYSICAL)) {
    const large = m.practice.largeSample;
    assert.equal(large.id, "zonneplan_nexus_20");
    assert.equal(large.sampleN, 267);
    assert.match(large.role, /markt-\/praktijkcontext/i);
    assert.match(large.role, /GEEN\s+hardware-equivalente/i);
    assert.equal(
      m.practice.nearest.some((r) => r.id === large.id),
      false,
      `${m.id}: grote steekproef niet dubbel in nearest`
    );
  }
});

test("GV/Dyness–Solis blijft N=1 met generalisatiewaarschuwing", () => {
  const t21 = candidateViewModels(PHYSICAL).find((m) => m.id === "t21");
  const gv = t21.practice.nearest.find((r) => r.id === "dyness_solis_213");
  assert.equal(gv.provider, "Groene Vrienden");
  assert.match(gv.title, /^Gerapporteerde Dyness–Solis-praktijkreferentie$/);
  assert.equal(gv.isN1, true);
  assert.equal(gv.sampleN, 1);
  assert.ok(gv.warnings.some((w) => /niet generaliseren/.test(w)));
  assert.match(N1_BADGE, /N=1 — niet representatief voor een vlootgemiddelde\./);
});

// ── Geen verzonnen statistiek, geen totalen, geen "beste" ──
test("geen mediaan/gemiddelde/percentiel-velden in response of weergavemodel", () => {
  for (const source of [PHYSICAL.candidates, candidateViewModels(PHYSICAL)]) {
    for (const [path, key] of walkKeys(source)) {
      assert.doesNotMatch(key, FORBIDDEN_STAT_KEYS, path);
    }
  }
});

test("handelsband en zelfconsumptie-model worden nooit opgeteld", () => {
  const models = candidateViewModels(FINANCIAL);
  for (const m of models) {
    assert.ok(m.selfConsumption, `${m.id}: modelwaarde beschikbaar na opt-in`);
    // Geen gecombineerde/opgetelde geldbedragen; tellingen (zoals
    // totalReportedInstallations) zijn toegestaan.
    for (const [path, key] of walkKeys(m)) {
      assert.doesNotMatch(key, /combined/i, path);
      assert.doesNotMatch(key, /total.*(eur|value)|(eur|value).*total/i, path);
    }
  }
  assert.match(NOT_ADDITIVE_NOTE, /Niet optellen bij de praktijkband/);
  assert.match(NOT_ADDITIVE_NOTE, /dezelfde batterijcapaciteit/);
});

test("fysiek-only default: response zonder scenario heeft geen financiële waarden", () => {
  assert.equal(PHYSICAL.financial_scenario, null);
  for (const m of candidateViewModels(PHYSICAL)) {
    assert.equal(m.selfConsumption, null);
  }
});

test("recommendation is en blijft null; het weergavemodel verzint geen 'beste'", () => {
  assert.equal(PHYSICAL.recommendation, null);
  assert.equal(FINANCIAL.recommendation, null);
  for (const [path, key] of walkKeys(candidateViewModels(PHYSICAL))) {
    assert.doesNotMatch(key, /(best|recommend|aanbevolen)/i, path);
  }
});

// ── Privacytekst ──
test("privacytekst beschrijft het echte gedrag (lokaal lezen, kwartierwaarden versturen, geen opslag)", () => {
  assert.equal(
    SMARTMETER_PRIVACY_NOTICE,
    "Uw CSV-bestand wordt lokaal in uw browser gelezen. Voor de berekening " +
      "sturen we de uitgelezen kwartierwaarden tijdelijk naar onze rekenmodule. " +
      "De meetdata wordt niet opgeslagen."
  );
  // De oude, niet langer juiste claim mag nergens terugkomen.
  assert.doesNotMatch(SMARTMETER_PRIVACY_NOTICE, /niet geüpload/);
});
