// Tests voor de HomeWizard-SEO-landingspagina. Broncontroles (het project
// heeft geen React-DOM-testharnas): de zichtbare/statische copy, de meta,
// de canonieke route, de calculator-CTA's, de privacy-formulering en de
// prerender-/sitemap-integratie. De gegenereerde HTML wordt daarnaast na de
// build handmatig geverifieerd.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");

const PAGE = read("../src/pages/HomeWizardLanding.jsx");
const PRERENDER = read("../scripts/prerender-blog-meta.mjs");
const APP = read("../src/App.jsx");

const EXPECTED_TITLE = "HomeWizard thuisbatterij | Bereken met uw slimme-meterdata";
const EXPECTED_PATH = "/homewizard-thuisbatterij";
const CANONICAL = "https://www.batterijenplan.nl/homewizard-thuisbatterij";

// ── Route ──────────────────────────────────────────────────────────────────

test("de route /homewizard-thuisbatterij is in App.jsx geregistreerd", () => {
  assert.ok(APP.includes('path="/homewizard-thuisbatterij"'));
  assert.ok(APP.includes("HomeWizardLanding"));
});

// ── Titel / meta / canoniek ─────────────────────────────────────────────────

test("verwachte SEO-titel, uniek van de calculator", () => {
  assert.ok(PAGE.includes(EXPECTED_TITLE));
  // Niet de calculator-titel gebruiken (geen kannibalisatie).
  assert.ok(!PAGE.includes("Thuisbatterij Calculator | Bereken"));
});

test("meta-beschrijving benoemt HomeWizard, verbruik en teruglevering", () => {
  const m = PAGE.match(/PAGE_DESCRIPTION\s*=\s*([\s\S]*?);/);
  assert.ok(m, "PAGE_DESCRIPTION niet gevonden");
  const desc = m[1];
  assert.ok(desc.includes("HomeWizard"));
  assert.ok(desc.includes("teruglevering"));
  assert.ok(!/gegarandeerd|garantie|exact/i.test(desc));
});

test("pad en canonieke URL kloppen", () => {
  assert.ok(PAGE.includes(`PAGE_PATH = "${EXPECTED_PATH}"`));
  assert.ok(PAGE.includes("canonicalUrl(PAGE_PATH)"));
});

// ── Exact één H1, niet de calculator-H1 ─────────────────────────────────────

test("de pagina rendert precies één H1 en niet 'Thuisbatterij Calculator'", () => {
  const h1Open = (PAGE.match(/<h1[\s>]/g) || []).length;
  assert.equal(h1Open, 1);
  assert.ok(PAGE.includes("HomeWizard thuisbatterij berekenen met uw meterdata"));
  assert.ok(!/<h1[^>]*>\s*Thuisbatterij Calculator/.test(PAGE));
});

// ── Calculator-CTA's zonder verzonnen query-deeplink ────────────────────────

test("alle hoofd-CTA's wijzen naar /calculator, zonder fragiele query-parameter", () => {
  // Minimaal drie CTA-links naar de calculator (hero, midden, slot).
  const calcLinks = (PAGE.match(/to="\/calculator"/g) || []).length;
  assert.ok(calcLinks >= 3, `verwacht >=3 calculator-CTA's, kreeg ${calcLinks}`);
  // Geen verzonnen deeplink-query op de calculator.
  assert.ok(!PAGE.includes('to="/calculator?'));
});

// ── Privacy-formulering ─────────────────────────────────────────────────────

test("privacy: kwartierwaarden gaan tijdelijk naar de rekenmodule; niet opgeslagen", () => {
  assert.ok(PAGE.includes("SMARTMETER_PRIVACY_NOTICE"));
  assert.ok(PAGE.includes("niet als bestand geüpload"));
});

test("de pagina claimt NIET dat alle data volledig in de browser blijft", () => {
  const forbidden = [
    "alle data blijft volledig in uw browser",
    "blijft volledig in uw browser",
    "verlaat uw browser niet",
    "wordt niet verstuurd",
  ];
  for (const phrase of forbidden) {
    assert.ok(!PAGE.toLowerCase().includes(phrase), `verboden privacyclaim: "${phrase}"`);
  }
});

// ── Geen valse claims ───────────────────────────────────────────────────────

test("geen positieve garantie-claim; ontkennende disclaimers zijn juist wél toegestaan", () => {
  // Verboden zijn POSITIEVE beloftes. Een ontkenning als
  // "geen gegarandeerde opbrengst" is juist de gewenste disclaimer.
  assert.ok(
    !/gegarandeerde opbrengst van|gegarandeerde besparing van|u verdient gegarandeerd|gegarandeerde terugverdientijd/i.test(PAGE),
  );
  assert.ok(!/exact hoeveel uw zonnepanelen produceren/i.test(PAGE));
  // De honest disclaimer moet aanwezig zijn. JSX breekt tekst over regels af,
  // dus witruimte normaliseren vóór de match.
  const flat = PAGE.replace(/\s+/g, " ");
  assert.ok(/geen gegarandeerde opbrengst/i.test(flat));
});

// ── Geen LLM-em-dash-stijl in de copy ──────────────────────────────────────

test("geen em-dash of en-dash in de landingspagina-copy", () => {
  assert.ok(!PAGE.includes("—"), "em-dash gevonden in HomeWizardLanding.jsx");
  assert.ok(!PAGE.includes("–"), "en-dash gevonden in HomeWizardLanding.jsx");
});

// ── Prerender + sitemap ─────────────────────────────────────────────────────

test("prerender STATIC_PAGES bevat de HomeWizard-pagina met titel + beschrijving", () => {
  assert.ok(PRERENDER.includes('slug: "homewizard-thuisbatterij"'));
  assert.ok(PRERENDER.includes(EXPECTED_TITLE));
  assert.ok(PRERENDER.includes("HOMEWIZARD_BODY"));
});

test("de statische prerender-body heeft precies één H1", () => {
  const m = PRERENDER.match(/const HOMEWIZARD_BODY = seoWrap\(`([\s\S]*?)`\);/);
  assert.ok(m, "HOMEWIZARD_BODY niet gevonden");
  const body = m[1];
  assert.equal((body.match(/<h1[\s>]/g) || []).length, 1);
});

test("sitemap bevat de HomeWizard-URL exact één keer", () => {
  const m = PRERENDER.match(/const entries = \[([\s\S]*?)\];/);
  assert.ok(m, "sitemap-entries niet gevonden");
  const occurrences = (m[1].match(/homewizard-thuisbatterij/g) || []).length;
  assert.equal(occurrences, 1);
});

// ── Voorbeeldkaart: cijfers zijn geankerd op de synthetische fixture ────────

test("de Voorbeeldanalyse-cijfers komen exact uit de synthetische jaar-fixture", () => {
  const fx = JSON.parse(
    read("./fixtures/smartmeter-analysis-physical.json"),
  );
  // Profielwaarden.
  assert.equal(fx.profile.interval_count, 35040);
  assert.equal(fx.profile.observed_days, 365);
  // raw_grid_import 3008.305 -> "3.008 kWh", raw_grid_export 4008.305 -> "4.008 kWh".
  assert.ok(Math.round(fx.profile.raw_grid_import_kwh) === 3008);
  assert.ok(Math.round(fx.profile.raw_grid_export_kwh) === 4008);
  const flat = PAGE.replace(/\s+/g, " ");
  assert.ok(flat.includes('value: "3.008 kWh"'));
  assert.ok(flat.includes('value: "4.008 kWh"'));
  assert.ok(flat.includes('value: "365 dagen"'));
  assert.ok(PAGE.includes("35.040 kwartierwaarden"));

  // Elke balkwaarde = physical.export_capture_pct van de bijbehorende kandidaat.
  const byId = Object.fromEntries(
    fx.candidates.map((c) => [c.id.toUpperCase(), c.physical.export_capture_pct]),
  );
  for (const id of ["T7", "T10", "T14", "T21", "T28"]) {
    const expected = byId[id];
    assert.ok(expected != null, `fixture mist ${id}`);
    // Bijv. { id: "T7", pct: 38.1 }
    const re = new RegExp(`id:\\s*"${id}",\\s*pct:\\s*${expected}\\b`);
    assert.ok(re.test(PAGE), `balk ${id} niet geankerd op fixture-waarde ${expected}`);
  }
});

test("geen verzonnen percentages meer in de voorbeeldkaart", () => {
  // De oude, gefabriceerde spreiding mag niet terugkeren.
  for (const bad of ["pct: 24", "pct: 32", "pct: 52", "pct: 57"]) {
    assert.ok(!PAGE.includes(bad), `verzonnen waarde teruggekeerd: ${bad}`);
  }
});

// ── Reciproque link vanuit /calculator ──────────────────────────────────────

test("de calculator linkt terug naar de HomeWizard-landingspagina", () => {
  const CALC = read("../src/pages/Calculator.jsx");
  assert.ok(CALC.includes('to="/homewizard-thuisbatterij"'));
  assert.ok(CALC.includes("Meer over thuisbatterijen berekenen met HomeWizard"));
});
