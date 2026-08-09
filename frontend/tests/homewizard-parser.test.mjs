import test from "node:test";
import assert from "node:assert/strict";

import { parseHomeWizardCsv, SmartMeterParseError } from "../src/smartmeter/parsers/homewizard.js";
import { buildEnergyProfile, annualizeProfile, intervalLabel } from "../src/smartmeter/model.js";
import { buildDemoHomeWizardCsv } from "../src/smartmeter/fixtures/demoBatteryAnalysis.js";

// ── Hulpjes ────────────────────────────────────────────────────────────────
function cumulativeCsv() {
  // Cumulatieve tellerstanden (zoals HomeWizard-exports), kwartierinterval,
  // puntdecimalen, ;-gescheiden. Eerste regel is het startpunt.
  return [
    "time_stamp;import_t1_kwh;import_t2_kwh;export_t1_kwh;export_t2_kwh",
    "2025-01-01 00:00;1000.000;2000.000;500.000;700.000",
    "2025-01-01 00:15;1000.100;2000.000;500.000;700.000",
    "2025-01-01 00:30;1000.250;2000.000;500.000;700.050",
    "2025-01-01 00:45;1000.250;2000.100;500.200;700.050",
  ].join("\n");
}

test("HomeWizard cumulatieve tellers: deltas per kwartier", () => {
  const { intervals, meta } = parseHomeWizardCsv(cumulativeCsv());
  assert.equal(meta.intervalMinutes, 15);
  assert.equal(meta.cumulativeCounters, true);
  // Eerste regel is startpunt → 3 intervallen.
  assert.equal(intervals.length, 3);
  assert.ok(Math.abs(intervals[0].import_kwh - 0.1) < 1e-9);
  assert.ok(Math.abs(intervals[1].import_kwh - 0.15) < 1e-9);
  // Laatste interval: import T2 +0.1, export T1 +0.2.
  assert.ok(Math.abs(intervals[2].import_kwh - 0.1) < 1e-9);
  assert.ok(Math.abs(intervals[2].export_kwh - 0.2) < 1e-9);
});

test("losse 'time'-kolom met volledige datum-tijden (HomeWizard-schema)", () => {
  // Kop zoals de HomeWizard-export: "time" + "Import/Export T1/T2 kWh",
  // komma-gescheiden cumulatieve standen.
  const csv = [
    "time,Import T1 kWh,Import T2 kWh,Export T1 kWh,Export T2 kWh",
    "2025-01-01 00:00,100.000,200.000,50.000,60.000",
    "2025-01-01 00:15,100.100,200.000,50.000,60.000",
    "2025-01-01 00:30,100.100,200.050,50.200,60.000",
  ].join("\n");
  const { intervals, meta } = parseHomeWizardCsv(csv);
  assert.equal(meta.intervalMinutes, 15);
  assert.equal(meta.cumulativeCounters, true);
  assert.equal(intervals.length, 2);
  // Delta's worden gelabeld met de STARTtijd van het interval.
  assert.equal(new Date(intervals[0].timestamp).toISOString(), "2025-01-01T00:00:00.000Z");
  assert.ok(Math.abs(intervals[0].import_kwh - 0.1) < 1e-9);
  assert.ok(Math.abs(intervals[1].import_kwh - 0.05) < 1e-9);
  assert.ok(Math.abs(intervals[1].export_kwh - 0.2) < 1e-9);
});

test("per-interval waarden met decimale komma en NL-datums", () => {
  const csv = [
    "Datum;Tijd;Verbruik (kWh);Teruglevering (kWh)",
    "01-06-2025;10:00;0,25;0,00",
    "01-06-2025;11:00;0,10;0,80",
    "01-06-2025;12:00;0,05;1,20",
  ].join("\n");
  const { intervals, meta } = parseHomeWizardCsv(csv);
  assert.equal(meta.intervalMinutes, 60);
  assert.equal(meta.cumulativeCounters, false);
  assert.equal(intervals.length, 3);
  assert.ok(Math.abs(intervals[1].export_kwh - 0.8) < 1e-9);
});

test("profiel-aggregatie: totalen, piek-kW en compleetheid", () => {
  const csv = [
    "time_stamp,import_kwh,export_kwh",
    "2025-01-01 00:00,0.2,0.0",
    "2025-01-01 00:15,0.4,0.1",
    // gat van één kwartier (00:30 ontbreekt)
    "2025-01-01 00:45,0.1,1.0",
  ].join("\n");
  const { intervals, meta } = parseHomeWizardCsv(csv);
  const profile = buildEnergyProfile(intervals, meta);
  assert.ok(Math.abs(profile.totalImportKwh - 0.7) < 1e-9);
  assert.ok(Math.abs(profile.totalExportKwh - 1.1) < 1e-9);
  // 0.4 kWh in een kwartier = 1.6 kW gemiddeld vermogen.
  assert.ok(Math.abs(profile.maxImportKw - 1.6) < 1e-9);
  assert.ok(Math.abs(profile.maxExportKw - 4.0) < 1e-9);
  // 3 van de 4 verwachte kwartieren aanwezig → 75%.
  assert.ok(Math.abs(profile.completenessPct - 75) < 1e-9);
});

test("dagtotalen: geen piekvermogen afleiden", () => {
  const rows = ["Datum;Verbruik;Teruglevering"];
  for (let d = 1; d <= 10; d++) {
    rows.push(`2025-05-${String(d).padStart(2, "0")};8,4;6,1`);
  }
  const { intervals, meta } = parseHomeWizardCsv(rows.join("\n"));
  const profile = buildEnergyProfile(intervals, meta);
  assert.equal(meta.intervalMinutes, 1440);
  assert.equal(profile.maxImportKw, null);
  assert.equal(intervalLabel(meta.intervalMinutes, profile.pointCount), "dagen");
});

test("onherkenbaar bestand geeft een duidelijke fout", () => {
  assert.throws(
    () => parseHomeWizardCsv("kolom_a;kolom_b\n1;2\n3;4"),
    (err) => err instanceof SmartMeterParseError && err.code === "NO_TIMESTAMP"
  );
  assert.throws(
    () => parseHomeWizardCsv(""),
    (err) => err instanceof SmartMeterParseError && err.code === "EMPTY_FILE"
  );
});

test("negatieve delta (meterreset) wordt op 0 geklemd en geteld", () => {
  // Realistische reeks: gestaag stijgende teller met één reset halverwege.
  const rows = ["time_stamp;import_t1"];
  let v = 1000;
  for (let i = 0; i < 24; i++) {
    if (i === 12) v = 100; // meterwissel/reset
    v += 0.3;
    const min = String((i % 4) * 15).padStart(2, "0");
    const hour = String(Math.floor(i / 4)).padStart(2, "0");
    rows.push(`2025-01-01 ${hour}:${min};${v.toFixed(3)}`);
  }
  const { intervals, meta } = parseHomeWizardCsv(rows.join("\n"));
  assert.equal(meta.cumulativeCounters, true);
  assert.equal(meta.anomalies.negativeDeltas, 1);
  assert.ok(intervals.every((iv) => iv.import_kwh >= 0));
});

test("demo-fixture parseert tot een compleet jaarachtig profiel", () => {
  const csv = buildDemoHomeWizardCsv(21);
  const { intervals, meta } = parseHomeWizardCsv(csv);
  const profile = buildEnergyProfile(intervals, meta);
  assert.equal(meta.intervalMinutes, 15);
  assert.ok(profile.pointCount > 1900);
  assert.ok(profile.completenessPct > 99);
  assert.ok(profile.totalImportKwh > 0 && profile.totalExportKwh > 0);
  const annual = annualizeProfile(profile);
  assert.ok(annual.yearlyUsageKwh > 0);
  assert.equal(annual.scaled, true);
});
