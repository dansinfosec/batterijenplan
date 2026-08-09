// Integratietest: volledige-jaar HomeWizard-style fixture door de echte
// parser + profielbouwer. Synthetic HomeWizard-style fixture — geen echte
// klantdata; nog niet gevalideerd tegen een echte HomeWizard-export.
//
// De fixture (35.041 cumulatieve meetregels → 35.040 kwartierintervallen)
// wordt gegenereerd door scripts/testdata/generate_homewizard_dummy.py; de
// bijbehorende .expected.json bevat de bedoelde (ongeronde) jaartotalen.
// Test-only: dit bestand wordt nooit door productie-/browsercode geladen.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseHomeWizardCsv } from "../src/smartmeter/parsers/homewizard.js";
import { buildEnergyProfile } from "../src/smartmeter/model.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, "fixtures", "homewizard", "homewizard-365days-solar-synthetic.csv");
const EXPECTED = JSON.parse(
  fs.readFileSync(
    path.join(here, "fixtures", "homewizard", "homewizard-365days-solar-synthetic.expected.json"),
    "utf8"
  )
);

// Tellerstanden zijn op 3 decimalen afgerond; per kanaal telescopeert de som
// van de deltas naar (afgeronde eindstand − afgeronde beginstand). Over vier
// kanalen is een tolerantie van 0,5 kWh op ~3000–4000 kWh ruim voldoende en
// verhult geen structurele fouten.
const TOTAL_TOLERANCE_KWH = 0.5;
// Eén interval-delta van afgeronde standen kan ±0,001 kWh per kanaal afwijken.
const INTERVAL_TOLERANCE_KWH = 0.005;

const text = fs.readFileSync(FIXTURE, "utf8");
const { intervals, meta } = parseHomeWizardCsv(text);

test("jaarfixture parseert zonder fouten met het juiste meetinterval", () => {
  assert.equal(meta.source, "homewizard");
  assert.equal(meta.intervalMinutes, EXPECTED.interval_minutes);
  assert.equal(meta.cumulativeCounters, true);
  assert.equal(meta.anomalies.skippedRows, 0);
  assert.equal(meta.anomalies.duplicateTimestamps, 0);
  assert.equal(meta.anomalies.negativeDeltas, 0);
});

test("cumulatieve T1/T2-kolommen worden als import/export herkend", () => {
  assert.deepEqual(meta.columns.importColumns, ["Import T1 kWh", "Import T2 kWh"]);
  assert.deepEqual(meta.columns.exportColumns, ["Export T1 kWh", "Export T2 kWh"]);
});

test("35.041 meetregels leveren exact 35.040 kwartierintervallen", () => {
  assert.equal(EXPECTED.reading_rows, 35041);
  assert.equal(intervals.length, EXPECTED.interval_count);
  assert.equal(intervals.length, 365 * 24 * 4);
});

test("tijdstempels zijn strikt chronologisch met vaste kwartierstap", () => {
  for (let i = 1; i < intervals.length; i++) {
    assert.equal(
      intervals[i].timestamp - intervals[i - 1].timestamp,
      15 * 60 * 1000,
      `stap bij index ${i} is geen kwartier`
    );
  }
});

test("geen interval heeft negatieve import of export", () => {
  for (const iv of intervals) {
    assert.ok(iv.import_kwh >= 0, `negatieve import op ${new Date(iv.timestamp).toISOString()}`);
    assert.ok(iv.export_kwh >= 0, `negatieve export op ${new Date(iv.timestamp).toISOString()}`);
  }
});

test("jaartotalen komen overeen met de generator-doelen", () => {
  let totImp = 0;
  let totExp = 0;
  let maxImp = 0;
  let maxExp = 0;
  for (const iv of intervals) {
    totImp += iv.import_kwh;
    totExp += iv.export_kwh;
    if (iv.import_kwh > maxImp) maxImp = iv.import_kwh;
    if (iv.export_kwh > maxExp) maxExp = iv.export_kwh;
  }
  assert.ok(totImp > 0 && totExp > 0, "zowel afname als teruglevering aanwezig");
  assert.ok(
    Math.abs(totImp - EXPECTED.total_import_kwh) < TOTAL_TOLERANCE_KWH,
    `jaarimport ${totImp.toFixed(3)} wijkt af van doel ${EXPECTED.total_import_kwh}`
  );
  assert.ok(
    Math.abs(totExp - EXPECTED.total_export_kwh) < TOTAL_TOLERANCE_KWH,
    `jaarexport ${totExp.toFixed(3)} wijkt af van doel ${EXPECTED.total_export_kwh}`
  );
  assert.ok(Math.abs(maxImp - EXPECTED.max_interval_import_kwh) < INTERVAL_TOLERANCE_KWH);
  assert.ok(Math.abs(maxExp - EXPECTED.max_interval_export_kwh) < INTERVAL_TOLERANCE_KWH);
});

test("profielbouwer accepteert het jaar en meldt ~100% compleetheid", () => {
  const profile = buildEnergyProfile(intervals, meta);
  assert.ok(profile);
  assert.equal(profile.pointCount, EXPECTED.interval_count);
  assert.ok(profile.completenessPct > 99.9, `compleetheid ${profile.completenessPct}`);
  assert.ok(Math.abs(profile.totalImportKwh - EXPECTED.total_import_kwh) < TOTAL_TOLERANCE_KWH);
  assert.ok(Math.abs(profile.totalExportKwh - EXPECTED.total_export_kwh) < TOTAL_TOLERANCE_KWH);
  // Piekvermogen = grootste interval-energie / 0,25 uur.
  assert.ok(Math.abs(profile.maxImportKw - EXPECTED.max_interval_import_kwh * 4) < INTERVAL_TOLERANCE_KWH * 4);
  assert.ok(Math.abs(profile.maxExportKw - EXPECTED.max_interval_export_kwh * 4) < INTERVAL_TOLERANCE_KWH * 4);
  // Periode: eerste interval start 1 jan 2025; laatste start 31 dec 23:45.
  assert.equal(new Date(profile.periodStart).toISOString(), "2025-01-01T00:00:00.000Z");
  assert.equal(new Date(profile.periodEnd).toISOString(), "2025-12-31T23:45:00.000Z");
});
