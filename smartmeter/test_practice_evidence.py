"""Tests voor de gerapporteerde-praktijk-laag (practice_evidence) en de
API-koppeling.

Bewijst de harde regels uit practice_evidence:
- rijen zijn 1-op-1 gelijk aan het canonieke bronbestand (geen herberekening);
- N, sample_class, partial_year, N1-labels en provider blijven behouden;
- er wordt geen mediaan/gemiddelde/percentiel uit ranges afgeleid;
- de referentie-ranking is deterministisch, drempelloos en gebruikt alleen
  dataset-dimensies (capaciteit, vermogen); afstand is expliciet gelabeld;
- de sterkste steekproef (LARGE) blijft als aparte context zichtbaar;
- huishoudprofielen veranderen de gerapporteerde euro's nooit;
- het canonieke bestand staat op een neutraal pad en is de enige
  gestructureerde numerieke bron;
- recommendation blijft null;
- zelfconsumptie-model en gerapporteerde praktijk worden niet opgeteld.
"""

import json
import subprocess

from django.conf import settings
from django.test import SimpleTestCase
from rest_framework.test import APIClient

from calculators.stage2 import NO_SOLAR_BENEFIT_BANDS, SOLAR_BENEFIT_BANDS

from . import practice_evidence
from .analysis import CANDIDATE_SPECS, run_analysis

URL = "/api/smartmeter/analysis/"

# Verwachte deterministische top-3 (|capaciteitsafstand|, dan
# |vermogensafstand|, dan id) — drempelloos, dus ook T7/T10 krijgen
# referenties, expliciet gelabeld als verre referentie.
EXPECTED_NEAREST_IDS = {
    "t7": ["tibber_homevolt_133", "alphaess_19", "bliq_20"],
    "t10": ["tibber_homevolt_133", "alphaess_19", "bliq_20"],
    "t14": ["tibber_homevolt_133", "alphaess_19", "bliq_20"],
    "t21": ["dyness_solis_213", "hyxipower_212", "givenergy_204"],
    "t28": ["sigenergy_242", "sigenergy_242_single", "dyness_solis_213"],
}

FORBIDDEN_STAT_KEY_PARTS = (
    "median", "mediaan", "mean", "gemiddeld", "average",
    "p10", "p50", "p90", "percentile", "percentiel", "expected_return",
)

# Sentinel-waarde (Zonneplan eur_max) voor de één-bron-test; lineage-
# manifesten mogen citeren mits ze expliciet naar het canonieke pad verwijzen.
# Samengesteld uit delen zodat dit (getrackte) testbestand zichzelf niet als
# duplicaat aanmerkt zodra git grep het doorzoekt.
SENTINEL_VALUE = "1122" + ".71"
CANONICAL_RELPATH = "data/practice/CANONICAL_PRACTICE_REFERENCE.json"
ALLOWED_CITING_MANIFESTS = {
    "research/seo/article-drafts/wat-levert-een-thuisbatterij-op/"
    "QUANTITATIVE_CLAIM_REGISTRY.json",
    "research/seo/article-drafts/wat-levert-een-thuisbatterij-op/"
    "SVG_DATA_LINEAGE.json",
}


def _tuple_intervals(days=2, import_kwh=0.1, export_kwh=0.05,
                     start_ms=1_735_689_600_000):
    """Synthetisch profiel met gescheiden import-/exportkwartieren, zodat de
    netting-laag de export niet wegstreept (bidirectionele kwartieren worden
    vóór simulatie genet)."""
    out = []
    for i in range(days * 96):
        ts = start_ms + i * 900_000
        if export_kwh > 0 and i % 2 == 0:
            out.append((ts, 0.0, export_kwh))
        else:
            out.append((ts, import_kwh, 0.0))
    return out


def _validated(intervals, scenario=None):
    return {
        "intervals": intervals,
        "interval_minutes": 15,
        "financial_scenario": scenario,
    }


def _walk_keys(obj, path=""):
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield f"{path}.{key}", key
            yield from _walk_keys(value, f"{path}.{key}")
    elif isinstance(obj, list):
        for i, value in enumerate(obj):
            yield from _walk_keys(value, f"{path}[{i}]")


class PracticeRowFidelityTests(SimpleTestCase):
    """Rijen zijn een read-only doorgeefluik van het canonieke bronbestand."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with open(practice_evidence.PRACTICE_REFERENCE_PATH, encoding="utf-8") as fh:
            cls.raw = json.load(fh)
        cls.rows = {r["id"]: r for r in practice_evidence.evidence_rows()}

    def test_every_source_system_is_exposed_exactly_once(self):
        self.assertEqual(
            sorted(system["id"] for system in self.raw["systems"]),
            sorted(self.rows.keys()),
        )

    def test_rows_retain_exact_source_values(self):
        for system in self.raw["systems"]:
            row = self.rows[system["id"]]
            self.assertEqual(row["capacity_kwh"], system["capacity_kwh"])
            self.assertEqual(row["inverter_power_kw"], system["inverter_kw"])
            self.assertEqual(row["sample_n"], system["n"])
            self.assertEqual(row["sample_class"], system["sample"])
            self.assertEqual(row["partial_year"], system["partial_year"])
            self.assertEqual(row["annual_return_min_eur"], system["eur_min"])
            self.assertEqual(row["annual_return_max_eur"], system["eur_max"])
            self.assertEqual(row["return_per_kwh_min"], system["eur_per_kwh_min"])
            self.assertEqual(row["return_per_kwh_max"], system["eur_per_kwh_max"])
            self.assertEqual(row["source"], self.raw["source"])
            self.assertEqual(row["evidence_class"], self.raw["classification"])

    def test_n1_rows_are_labelled_anecdotal(self):
        for row in self.rows.values():
            if row["sample_n"] == 1:
                self.assertEqual(row["sample_class"], "N1")
                self.assertTrue(
                    any("niet generaliseren" in w for w in row["warnings"]),
                    row["id"],
                )

    def test_partial_year_rows_carry_warning(self):
        partial = [r for r in self.rows.values() if r["partial_year"]]
        self.assertTrue(partial, "bron bevat een deeljaar-rij (alphaess_19)")
        for row in partial:
            self.assertTrue(any("deeljaar" in w.lower() for w in row["warnings"]))

    def test_groene_vrienden_is_n1_only(self):
        gv = [r for r in self.rows.values() if r["provider"] == "Groene Vrienden"]
        self.assertEqual([r["id"] for r in gv], ["dyness_solis_213"])
        self.assertEqual(gv[0]["sample_n"], 1)
        self.assertEqual(gv[0]["sample_class"], "N1")

    def test_provider_only_where_documented(self):
        self.assertEqual(self.rows["zonneplan_nexus_20"]["provider"], "Zonneplan")
        self.assertEqual(self.rows["tibber_homevolt_133"]["provider"], "Tibber")
        self.assertEqual(self.rows["bliq_20"]["provider"], "Bliq")
        self.assertIsNone(self.rows["sigenergy_242"]["provider"])
        self.assertIsNone(self.rows["hyxipower_212"]["provider"])

    def test_reported_terminology_not_observed_claims(self):
        self.assertIn("Gerapporteerde", practice_evidence.EVIDENCE_DISCLAIMER)
        self.assertIn(
            "geen eigen waarnemingen", practice_evidence.EVIDENCE_DISCLAIMER
        )
        meta = practice_evidence.methodology_block()
        self.assertIn("reported_practice_source", meta)
        self.assertIn("GERAPPORTEERDE", meta["terminology_note"])

    def test_dataset_metadata_counts_are_counts_not_statistics(self):
        meta = practice_evidence.dataset_metadata()
        self.assertEqual(meta["systems_count"], len(self.raw["systems"]))
        self.assertEqual(
            meta["total_reported_installations"],
            sum(s["n"] for s in self.raw["systems"]),
        )


class CanonicalSourceTests(SimpleTestCase):
    """Het canonieke bestand staat op een neutraal pad en is de enige
    gestructureerde numerieke bron in de getrackte repository."""

    def test_dataset_loads_from_neutral_path(self):
        path = practice_evidence.PRACTICE_REFERENCE_PATH
        self.assertTrue(path.exists(), path)
        self.assertNotIn("research", path.parts)
        self.assertIn("data", path.parts)
        self.assertIn("practice", path.parts)
        # En het laadt daadwerkelijk.
        self.assertEqual(len(practice_evidence.evidence_rows()), 9)

    def test_single_canonical_numerical_source(self):
        result = subprocess.run(
            ["git", "grep", "-l", SENTINEL_VALUE, "--", "*.py", "*.json"],
            capture_output=True, text=True, cwd=settings.BASE_DIR,
        )
        hits = set(filter(None, result.stdout.replace("\\", "/").splitlines()))
        self.assertIn(CANONICAL_RELPATH, hits)
        unexpected = hits - {CANONICAL_RELPATH} - ALLOWED_CITING_MANIFESTS
        self.assertEqual(
            unexpected, set(),
            "praktijkgetallen gedupliceerd buiten canonieke bron + lineage",
        )
        # De toegestane manifesten zijn citaties: ze moeten expliciet naar het
        # canonieke pad verwijzen.
        for manifest in ALLOWED_CITING_MANIFESTS & hits:
            with open(settings.BASE_DIR / manifest, encoding="utf-8") as fh:
                self.assertIn(CANONICAL_RELPATH, fh.read(), manifest)


class ReferenceRankingTests(SimpleTestCase):
    """Drempelloze, deterministische gelijkenis-ranking met expliciete
    afstandscontext — geen matchvenster-klif, geen interpolatie."""

    def test_ranking_is_deterministic_and_expected(self):
        for spec in CANDIDATE_SPECS:
            first = practice_evidence.reported_practice_evidence_block(
                spec["nominal_kwh"], spec["power_kw"]
            )
            second = practice_evidence.reported_practice_evidence_block(
                spec["nominal_kwh"], spec["power_kw"]
            )
            self.assertEqual(first, second, spec["id"])
            self.assertEqual(
                [m["id"] for m in first["nearest_hardware_matches"]],
                EXPECTED_NEAREST_IDS[spec["id"]],
                spec["id"],
            )

    def test_t10_surfaces_tibber_as_distant_nearest_reference(self):
        # Voorheen verdween Tibber (13,3 kWh) voor T10 door de ±30%-klif;
        # nu is het de dichtstbijzijnde referentie mét expliciete afstand.
        spec = next(s for s in CANDIDATE_SPECS if s["id"] == "t10")
        block = practice_evidence.reported_practice_evidence_block(
            spec["nominal_kwh"], spec["power_kw"]
        )
        nearest = block["nearest_hardware_matches"][0]
        self.assertEqual(nearest["id"], "tibber_homevolt_133")
        self.assertEqual(nearest["capacity_difference_pct"], 31.0)
        self.assertIn("31", nearest["evidence_distance"])
        self.assertIn("groter", nearest["evidence_distance"])
        self.assertIn("Dichtstbijzijnde", nearest["evidence_distance"])

    def test_every_reference_labels_distance_and_never_implies_equivalence(self):
        for spec in CANDIDATE_SPECS:
            block = practice_evidence.reported_practice_evidence_block(
                spec["nominal_kwh"], spec["power_kw"]
            )
            for match in block["nearest_hardware_matches"]:
                self.assertIn("capacity_difference_pct", match)
                self.assertIn("power_difference_pct", match)
                self.assertIn("geen gelijkwaardigheid", match["evidence_distance"])

    def test_coverage_note_when_candidate_outside_dataset_range(self):
        outside = {"t7", "t10", "t28"}  # 7,1 en 10,15 < 13,3; 28,4 > 24,2
        for spec in CANDIDATE_SPECS:
            block = practice_evidence.reported_practice_evidence_block(
                spec["nominal_kwh"], spec["power_kw"]
            )
            if spec["id"] in outside:
                self.assertIn("note", block["coverage"], spec["id"])
            else:
                self.assertNotIn("note", block["coverage"], spec["id"])

    def test_large_sample_reference_exposed_separately(self):
        for spec in CANDIDATE_SPECS:
            block = practice_evidence.reported_practice_evidence_block(
                spec["nominal_kwh"], spec["power_kw"]
            )
            large = block["large_sample_reference"]
            self.assertEqual(large["id"], "zonneplan_nexus_20")
            self.assertEqual(large["sample_n"], 267)
            self.assertEqual(large["sample_class"], "LARGE")
            self.assertEqual(large["provider"], "Zonneplan")
            # Semantiek: marktcontext, expliciet géén hardware-equivalent;
            # afstandscontext blijft ook voor verre kandidaten (T7/T10)
            # zichtbaar.
            self.assertEqual(large["reference_type"], "large_sample_market_context")
            self.assertIn("GEEN", large["role"])
            self.assertIn("capacity_difference_pct", large)
            self.assertIn("geen gelijkwaardigheid", large["evidence_distance"])
            self.assertFalse(large["also_listed_in_nearest_hardware_matches"])

    def test_references_never_interpolate_euros(self):
        raw_by_id = {
            s["id"]: s
            for s in practice_evidence.load_practice_reference()["systems"]
        }
        for spec in CANDIDATE_SPECS:
            block = practice_evidence.reported_practice_evidence_block(
                spec["nominal_kwh"], spec["power_kw"]
            )
            rows = list(block["nearest_hardware_matches"]) + [
                block["large_sample_reference"]
            ]
            for match in rows:
                source = raw_by_id[match["id"]]
                self.assertEqual(match["annual_return_min_eur"], source["eur_min"])
                self.assertEqual(match["annual_return_max_eur"], source["eur_max"])
                self.assertEqual(match["capacity_kwh"], source["capacity_kwh"])
                self.assertEqual(match["inverter_power_kw"], source["inverter_kw"])
                self.assertEqual(match["sample_n"], source["n"])
                self.assertIsNotNone(match.get("provider") or match["system"])

    def test_no_derived_statistics_anywhere(self):
        block = practice_evidence.reported_practice_evidence_block(14.2, 6.0)
        meta = practice_evidence.methodology_block()
        for path, key in list(_walk_keys(block)) + list(_walk_keys(meta)):
            for forbidden in FORBIDDEN_STAT_KEY_PARTS:
                self.assertNotIn(forbidden, key.lower(), path)


class AnalysisIntegrationTests(SimpleTestCase):
    """run_analysis: evidence-lagen aanwezig, huishoudonafhankelijk, niet
    opgeteld met de zelfconsumptie-modelwaarde, recommendation blijft null."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.result = run_analysis(
            _validated(_tuple_intervals(), scenario="study_2027_post_fixed")
        )

    def test_recommendation_remains_null(self):
        self.assertIsNone(self.result["recommendation"])

    def test_every_candidate_has_both_evidence_layers(self):
        for cand in self.result["candidates"]:
            band = cand["calculator_trading_band"]
            evidence = cand["reported_practice_evidence"]
            self.assertEqual(evidence["evidence_type"], "reported_practice_results")
            self.assertEqual(evidence["candidate_capacity_kwh"], cand["nominal_capacity_kwh"])
            self.assertIn("BP-PRACTICE-00", band["source"])
            self.assertEqual(band["basis_capacity_kwh"], cand["nominal_capacity_kwh"])

    def test_calculator_band_matches_stage2_bands_exactly(self):
        # Profiel met export > 0 -> zon-pad (solar-banddict van Stage 2).
        cand = self.result["candidates"][0]
        band = cand["calculator_trading_band"]
        self.assertEqual(band["stage2_band_set"], "solar")
        for contract, (low, high) in SOLAR_BENEFIT_BANDS.items():
            self.assertEqual(band["eur_per_kwh_year_by_contract"][contract], [low, high])
            self.assertEqual(
                band["annual_range_eur_by_contract"][contract],
                [round(cand["nominal_capacity_kwh"] * low),
                 round(cand["nominal_capacity_kwh"] * high)],
            )

    def test_calculator_band_is_labelled_not_statistical_not_p1(self):
        band = self.result["candidates"][0]["calculator_trading_band"]
        self.assertIn("GEEN statistisch betrouwbaarheidsinterval", band["nature"])
        self.assertIn("NIET geproduceerd door het", band["nature"])
        selection = band["band_set_selection"]
        self.assertEqual(selection["basis"], "observed_grid_export")
        # Export-observed inference: er wordt niet geclaimd dat de klant
        # zonnepanelen heeft.
        self.assertIn("export-observed", selection["equivalence_note"])
        self.assertIn("NIET geclaimd", selection["equivalence_note"])
        self.assertIn("zonnepanelen-antwoord", selection["equivalence_note"])

    def test_no_export_profile_selects_no_solar_band(self):
        result = run_analysis(_validated(_tuple_intervals(export_kwh=0.0)))
        band = result["candidates"][0]["calculator_trading_band"]
        self.assertEqual(band["stage2_band_set"], "no_solar")
        self.assertEqual(
            band["band_set_selection"]["observed"],
            "geen teruglevering in het genormaliseerde P1-profiel",
        )
        for contract, (low, high) in NO_SOLAR_BENEFIT_BANDS.items():
            self.assertEqual(band["eur_per_kwh_year_by_contract"][contract], [low, high])

    def test_household_profile_never_changes_trading_euros(self):
        # Twee sterk verschillende huishoudprofielen (beide met teruglevering):
        # de gerapporteerde evidence en de calculatorband moeten identiek zijn.
        low_usage = run_analysis(
            _validated(_tuple_intervals(import_kwh=0.05, export_kwh=0.02))
        )
        high_usage = run_analysis(
            _validated(_tuple_intervals(import_kwh=1.2, export_kwh=0.9))
        )
        for a, b in zip(low_usage["candidates"], high_usage["candidates"]):
            self.assertEqual(
                a["reported_practice_evidence"], b["reported_practice_evidence"]
            )
            self.assertEqual(a["calculator_trading_band"], b["calculator_trading_band"])

    def test_self_consumption_and_practice_trading_not_summed(self):
        note = self.result["methodology"]["trading_evidence"]["not_additive_note"]
        self.assertIn("NIET", note)
        for cand in self.result["candidates"]:
            # Geen enkel veld mag model + praktijk optellen: het financial-blok
            # bevat geen praktijkvelden en de evidence-blokken bevatten geen
            # (gecombineerde) modeltotalen.
            for path, key in _walk_keys(cand["reported_practice_evidence"]):
                self.assertNotIn("model", key.lower(), path)
                self.assertNotIn("combined", key.lower(), path)
                self.assertNotIn("expected", key.lower(), path)
            for path, key in _walk_keys(cand["financial"]):
                self.assertNotIn("practice", key.lower(), path)
                self.assertNotIn("reported", key.lower(), path)
                self.assertNotIn("combined", key.lower(), path)

    def test_no_derived_statistics_in_response(self):
        for cand in self.result["candidates"]:
            for path, key in _walk_keys(cand["reported_practice_evidence"]):
                for forbidden in FORBIDDEN_STAT_KEY_PARTS:
                    self.assertNotIn(forbidden, key.lower(), path)


class ApiContractTests(SimpleTestCase):
    def test_post_returns_evidence_blocks(self):
        intervals = []
        for i in range(2 * 96):
            ts = 1_735_689_600_000 + i * 900_000
            if i % 2 == 0:
                intervals.append(
                    {"timestamp": ts, "import_kwh": 0.0, "export_kwh": 0.05}
                )
            else:
                intervals.append(
                    {"timestamp": ts, "import_kwh": 0.1, "export_kwh": 0.0}
                )
        body = {"source": "homewizard", "interval_minutes": 15, "intervals": intervals}
        response = APIClient().post(URL, body, format="json")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsNone(payload["recommendation"])
        self.assertIn("trading_evidence", payload["methodology"])
        self.assertIn(
            "reported_practice_source", payload["methodology"]["trading_evidence"]
        )
        for cand in payload["candidates"]:
            self.assertIn("reported_practice_evidence", cand)
            self.assertIn("calculator_trading_band", cand)
            self.assertNotIn("observed_trading_evidence", cand)
