"""Tests voor de smartmeter-batterijanalyse (gehard contract).

De volledige-jaar-fixture (frontend/tests/fixtures/homewizard) wordt via
dezelfde semantiek als de frontend-parser omgezet naar genormaliseerde
intervallen en door het echte API-pad gestuurd. Alles is stateloos:
SimpleTestCase, geen database.
"""

import csv
import math
import time
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.core.cache import cache
from django.test import SimpleTestCase
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from .analysis import CANDIDATE_SPECS, run_analysis
from .api import SmartMeterAnalysisAPIView
from .validation import (
    MAX_INTERVALS,
    MIN_INTERVALS,
    SmartMeterValidationError,
    validate_request,
)

FIXTURE = (
    Path(settings.BASE_DIR)
    / "frontend" / "tests" / "fixtures" / "homewizard"
    / "homewizard-365days-solar-synthetic.csv"
)
EXPECTED_IMPORT_KWH = 3008.305
EXPECTED_EXPORT_KWH = 4008.305
TOTAL_TOL_KWH = 0.5

RT_EFF = 0.90
CHARGE_LOSS_FRAC = 1.0 - math.sqrt(RT_EFF)
DISCHARGE_LOSS_FRAC = 1.0 / math.sqrt(RT_EFF) - 1.0

URL = "/api/smartmeter/analysis/"


def _ts_ms(text):
    return int(
        datetime.strptime(text, "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc).timestamp() * 1000
    )


def load_fixture_intervals():
    """Cumulatieve meetregels -> intervallen, zoals de frontend-parser dat doet."""
    rows = list(csv.reader(FIXTURE.open(encoding="utf-8")))
    intervals, prev = [], None
    for r in rows[1:]:
        t = _ts_ms(r[0])
        vals = [float(x) for x in r[1:5]]
        if prev is not None:
            imp = max(0.0, vals[0] - prev[1][0]) + max(0.0, vals[1] - prev[1][1])
            exp = max(0.0, vals[2] - prev[1][2]) + max(0.0, vals[3] - prev[1][3])
            intervals.append(
                {"timestamp": prev[0], "import_kwh": round(imp, 6), "export_kwh": round(exp, 6)}
            )
        prev = (t, vals)
    return intervals


def _request_body(intervals, **extra):
    body = {"source": "homewizard", "interval_minutes": 15, "intervals": intervals}
    body.update(extra)
    return body


def _synthetic_day_intervals(days=2, import_kwh=0.1, export_kwh=0.0, start_ms=1_735_689_600_000):
    return [
        {
            "timestamp": start_ms + i * 900_000,
            "import_kwh": import_kwh,
            "export_kwh": export_kwh,
        }
        for i in range(days * 96)
    ]


class EnginePackagingTests(SimpleTestCase):
    """De rekenengine moet als normaal getrackt package in de repo-root staan
    — een productie-image zonder engine mag niet meer kunnen bestaan."""

    def test_engine_is_root_level_package(self):
        import bp_dispatch

        path = Path(bp_dispatch.__file__).resolve()
        base = Path(settings.BASE_DIR).resolve()
        self.assertEqual(path.parent.parent, base, "bp_dispatch moet direct in de repo-root staan")
        self.assertNotIn("research", path.parts, "engine mag niet meer uit research/ komen")

    def test_engine_import_is_plain(self):
        # geen sys.path-manipulatie meer nodig
        import importlib

        spec = importlib.util.find_spec("bp_dispatch.engine")
        self.assertIsNotNone(spec)


class FullYearFixtureTests(SimpleTestCase):
    """Volledige jaarfixture door het echte POST-pad — twee keer:
    A) financial_scenario weggelaten (fysiek-only default);
    B) expliciet "study_2027_post_fixed"."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cache.clear()
        cls.intervals = load_fixture_intervals()
        client = APIClient()
        cls.response_a = client.post(URL, _request_body(cls.intervals), format="json")
        cls.body_a = cls.response_a.json()
        t0 = time.perf_counter()
        cls.response = client.post(
            URL,
            _request_body(cls.intervals, financial_scenario="study_2027_post_fixed"),
            format="json",
        )
        cls.request_seconds = time.perf_counter() - t0
        cls.body = cls.response.json()

    def test_full_year_accepted(self):
        self.assertEqual(self.response.status_code, 200)
        p = self.body["profile"]
        self.assertEqual(p["interval_count"], 35040)
        self.assertEqual(p["interval_minutes"], 15)
        self.assertEqual(p["missing_intervals"], 0)
        self.assertAlmostEqual(p["completeness_pct"], 100.0, places=1)
        self.assertFalse(p["annualized"])

    def test_annual_raw_totals_match_fixture(self):
        p = self.body["profile"]
        self.assertLess(abs(p["raw_grid_import_kwh"] - EXPECTED_IMPORT_KWH), TOTAL_TOL_KWH)
        self.assertLess(abs(p["raw_grid_export_kwh"] - EXPECTED_EXPORT_KWH), TOTAL_TOL_KWH)

    def test_physical_only_default_when_scenario_omitted(self):
        self.assertEqual(self.response_a.status_code, 200)
        self.assertIsNone(self.body_a["financial_scenario"])
        for c in self.body_a["candidates"]:
            self.assertIsNone(c["financial"])
        self.assertEqual(self.body_a["methodology"]["included_value_streams"], [])

    def test_physical_identical_between_default_and_study_run(self):
        for a, b in zip(self.body_a["candidates"], self.body["candidates"]):
            self.assertEqual(a["physical"], b["physical"])
        self.assertEqual(self.body_a["profile"], self.body["profile"])
        self.assertEqual(self.body_a["baseline"], self.body["baseline"])

    def test_raw_vs_normalized_accounting_identity(self):
        p = self.body["profile"]
        overlap = p["bidirectional_energy_overlap_kwh"]
        self.assertGreaterEqual(p["bidirectional_interval_count"], 0)
        self.assertLess(
            abs((p["raw_grid_import_kwh"] - overlap) - p["normalized_grid_import_kwh"]), 0.01
        )
        self.assertLess(
            abs((p["raw_grid_export_kwh"] - overlap) - p["normalized_grid_export_kwh"]), 0.01
        )
        # baseline voor reducties = de genormaliseerde totalen
        self.assertEqual(self.body["baseline"]["basis"], "normalized_net_flow")
        self.assertAlmostEqual(
            self.body["baseline"]["grid_import_kwh"], p["normalized_grid_import_kwh"], places=3
        )
        self.assertAlmostEqual(
            self.body["baseline"]["grid_export_kwh"], p["normalized_grid_export_kwh"], places=3
        )

    def test_candidate_reductions_vs_normalized_baseline(self):
        p = self.body["profile"]
        for c in self.body["candidates"]:
            ph = c["physical"]
            self.assertLess(
                abs((p["normalized_grid_import_kwh"] - ph["adjusted_grid_import_kwh"])
                    - ph["grid_import_reduction_kwh"]), 0.03,
                f"importreductie-identiteit faalt voor {c['id']}",
            )
            self.assertLess(
                abs((p["normalized_grid_export_kwh"] - ph["adjusted_grid_export_kwh"])
                    - ph["grid_export_reduction_kwh"]), 0.03,
                f"exportreductie-identiteit faalt voor {c['id']}",
            )

    def test_fixture_has_no_bidirectional_quarters(self):
        # De synthetische generator kent per kwartier óf afname óf
        # teruglevering toe; overlap hoort hier exact 0 te zijn en raw ==
        # normalized. (Overlap-uitsluiting zelf: BidirectionalNettingTests.)
        p = self.body["profile"]
        self.assertEqual(p["bidirectional_interval_count"], 0)
        self.assertEqual(p["bidirectional_energy_overlap_kwh"], 0.0)
        self.assertEqual(p["raw_grid_import_kwh"], p["normalized_grid_import_kwh"])
        self.assertEqual(p["raw_grid_export_kwh"], p["normalized_grid_export_kwh"])

    def test_export_reduction_is_battery_charge_plus_standby_only(self):
        # Exportreductie = in de batterij geladen surplus + het (kleine)
        # standby-verbruik van het batterijsysteem dat uit surplus wordt
        # gedekt (10 W -> max ~88 kWh/jaar). Nooit meer dan dat.
        for c in self.body["candidates"]:
            ph = c["physical"]
            extra = ph["grid_export_reduction_kwh"] - ph["grid_export_charged_into_battery_kwh"]
            self.assertGreaterEqual(extra, -0.06)
            self.assertLessEqual(extra, 90.0, f"onverklaarde exportreductie bij {c['id']}")

    def test_time_basis_metadata(self):
        self.assertEqual(self.body["profile"]["time_basis"], "local_wall_clock_normalized")
        self.assertEqual(self.body["profile"]["timezone"], "Europe/Amsterdam")
        m = self.body["methodology"]
        self.assertEqual(m["time_basis"], "local_wall_clock_normalized")
        self.assertEqual(m["timezone"], "Europe/Amsterdam")
        self.assertTrue(any("EPEX" in lim for lim in m["limitations"]))

    def test_candidates_have_physical_financial_split(self):
        cands = self.body["candidates"]
        self.assertEqual(len(cands), 5)
        self.assertEqual([c["id"] for c in cands], [s["id"] for s in CANDIDATE_SPECS])
        physical_required = {
            "basis", "adjusted_grid_import_kwh", "adjusted_grid_export_kwh",
            "grid_import_reduction_kwh", "grid_export_reduction_kwh",
            "grid_export_charged_into_battery_kwh",
            "battery_discharge_offsetting_grid_import_kwh",
            "charge_losses_kwh", "discharge_losses_kwh",
            "equivalent_full_cycles", "export_capture_pct",
            "peak_soc_kwh", "capacity_utilization_pct",
            "capacity_limited_charge_intervals",
            "power_limited_charge_intervals",
            "power_limited_discharge_intervals",
        }
        for c in cands:
            self.assertTrue(physical_required.issubset(c["physical"].keys()))
            self.assertEqual(c["physical"]["basis"], "observed")
            self.assertIsNotNone(c["financial"])
            self.assertIn("modeled_annual_value_eur", c["financial"])
            self.assertIn("value_components_eur", c["financial"])
            self.assertEqual(c["financial"]["scenario_id"], "study_2027_post_fixed")

    def test_p1_terminology(self):
        # Geen dubbelzinnige zelfconsumptieclaims uit P1-only data: geen enkel
        # veld mag een "added_self…"-claim dragen (letterlijke naam bewust
        # niet in deze test, zodat de mechanische repo-grep schoon is).
        banned_prefix = "added_" + "self"
        for c in self.body["candidates"]:
            for key in list(c.keys()) + list(c["physical"].keys()):
                self.assertFalse(key.startswith(banned_prefix), f"verboden veld {key}")
        m = self.body["methodology"]
        self.assertTrue(any("netto netstromen" in lim for lim in m["limitations"]))
        self.assertEqual(m["model"], "15-minute normalized net-flow model")
        self.assertTrue(any("chronologie" in lim for lim in m["limitations"]))

    def test_assumption_flags(self):
        for c in self.body["candidates"]:
            self.assertIn("usable_capacity_estimated_0.9_of_nominal", c["assumption_flags"])
            self.assertTrue(any(f.startswith("inverter_power_") for f in c["assumption_flags"]))
            self.assertIn("capacity_source", c)
            self.assertIn("power_source", c)
            self.assertGreater(c["nominal_capacity_kwh"], c["usable_capacity_kwh"])
        # de 14/28 kWh-vermogens zijn expliciet 'nearest class'-aannames
        by_id = {c["id"]: c for c in self.body["candidates"]}
        for cid in ("t14", "t28"):
            self.assertIn(
                "inverter_power_assumed_nearest_study_class", by_id[cid]["assumption_flags"]
            )

    def test_no_negative_flows_or_impossible_capture(self):
        baseline_export = self.body["baseline"]["grid_export_kwh"]
        baseline_import = self.body["baseline"]["grid_import_kwh"]
        for c in self.body["candidates"]:
            ph = c["physical"]
            self.assertGreaterEqual(ph["adjusted_grid_import_kwh"], 0.0)
            self.assertGreaterEqual(ph["adjusted_grid_export_kwh"], 0.0)
            self.assertGreaterEqual(ph["export_capture_pct"], 0.0)
            self.assertLessEqual(ph["export_capture_pct"], 100.0)
            self.assertLessEqual(ph["grid_export_reduction_kwh"], baseline_export + TOTAL_TOL_KWH)
            self.assertLessEqual(ph["grid_import_reduction_kwh"], baseline_import + TOTAL_TOL_KWH)
            self.assertLessEqual(ph["peak_soc_kwh"], c["usable_capacity_kwh"] + 0.01)
            self.assertLessEqual(ph["capacity_utilization_pct"], 100.1)

    def test_capture_monotone_and_utilization_decreasing(self):
        captures = [c["physical"]["export_capture_pct"] for c in self.body["candidates"]]
        self.assertEqual(captures, sorted(captures))
        cycles = [c["physical"]["equivalent_full_cycles"] for c in self.body["candidates"]]
        self.assertEqual(cycles, sorted(cycles, reverse=True), "grotere batterij cyclet minder")

    def test_losses_follow_efficiency_model(self):
        for c in self.body["candidates"]:
            ph = c["physical"]
            charged = ph["grid_export_charged_into_battery_kwh"]
            discharged = ph["battery_discharge_offsetting_grid_import_kwh"]
            if charged > 100:
                self.assertLess(abs(ph["charge_losses_kwh"] / charged - CHARGE_LOSS_FRAC), 0.004)
            if discharged > 100:
                self.assertLess(
                    abs(ph["discharge_losses_kwh"] / discharged - DISCHARGE_LOSS_FRAC), 0.004
                )

    def test_clipping_metrics_plausible(self):
        by_id = {c["id"]: c for c in self.body["candidates"]}
        # 3 kW-kandidaat moet vaker vermogensbegrensd zijn dan de 6 kW-varianten
        self.assertGreater(
            by_id["t7"]["physical"]["power_limited_charge_intervals"],
            by_id["t28"]["physical"]["power_limited_charge_intervals"],
        )
        # kleinste batterij loopt het vaakst vol
        self.assertGreater(
            by_id["t7"]["physical"]["capacity_limited_charge_intervals"],
            by_id["t28"]["physical"]["capacity_limited_charge_intervals"],
        )

    def test_no_invented_recommendation(self):
        self.assertIsNone(self.body["recommendation"])
        self.assertIn("Geen aanbeveling", self.body["methodology"]["recommendation_policy"])

    def test_comparison_metrics(self):
        cands = self.body["candidates"]
        self.assertIsNone(cands[0]["comparison"]["reference_id"])
        for i in range(1, len(cands)):
            comp = cands[i]["comparison"]
            self.assertEqual(comp["reference_id"], cands[i - 1]["id"])
            self.assertIn("incremental_value_eur", comp)
            self.assertIn("incremental_value_pct", comp)
            self.assertIn("additional_import_reduction_kwh", comp)

    def test_financial_scenario_block(self):
        fs = self.body["financial_scenario"]
        self.assertEqual(fs["id"], "study_2027_post_fixed")
        self.assertFalse(fs["universally_applicable"])
        self.assertIn("rulepack_version", fs)
        a = fs["assumptions"]
        self.assertEqual(a["settlement_mode"], "post_2027_fixed")
        # waarden komen uit de engine-defaults (TariffConfig/BatteryConfig)
        from bp_dispatch.core import BatteryConfig, TariffConfig, SettlementMode

        t = TariffConfig(settlement_mode=SettlementMode.POST_2027_FIXED)
        self.assertEqual(a["import_price_eur_kwh"], t.import_price_eur_kwh)
        self.assertEqual(a["feed_in_compensation_eur_kwh"], t.feed_in_compensation_eur_kwh)
        self.assertEqual(
            a["degradation_eur_per_kwh_throughput"],
            BatteryConfig(name="x", nominal_capacity_kwh=1, usable_capacity_kwh=1,
                          charge_power_kw=1, discharge_power_kw=1).degradation_eur_per_kwh,
        )

    def test_full_year_runtime_practical(self):
        self.assertLess(self.request_seconds, 30.0)

    def test_deterministic_output(self):
        v = validate_request(_request_body(self.intervals))
        a, b = run_analysis(v), run_analysis(v)
        a.pop("timings_ms"), b.pop("timings_ms")
        self.assertEqual(a, b)


class PhysicalFinancialSeparationTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.month = load_fixture_intervals()[: 30 * 96]

    def test_physical_identical_without_financial_scenario(self):
        with_fin = run_analysis(
            validate_request(
                _request_body(self.month, financial_scenario="study_2027_post_fixed")
            )
        )
        without = run_analysis(
            validate_request(_request_body(self.month, financial_scenario=None))
        )
        self.assertIsNone(without["financial_scenario"])
        for a, b in zip(with_fin["candidates"], without["candidates"]):
            self.assertEqual(a["physical"], b["physical"])
            self.assertIsNotNone(a["financial"])
            self.assertIsNone(b["financial"])
        self.assertEqual(without["methodology"]["included_value_streams"], [])
        self.assertIsNone(without["methodology"]["results_basis"]["financial"])
        self.assertEqual(without["methodology"]["results_basis"]["physical"], "observed")

    def test_partial_year_annualizes_financial_not_physical(self):
        res = run_analysis(
            validate_request(
                _request_body(self.month, financial_scenario="study_2027_post_fixed")
            )
        )
        self.assertTrue(res["profile"]["annualized"])
        self.assertGreater(res["methodology"]["annualization_factor"], 11.0)
        for c in res["candidates"]:
            self.assertEqual(c["physical"]["basis"], "observed")
            self.assertEqual(c["financial"]["basis"], "annualized")
        self.assertTrue(any("geannualiseerde" in w for w in res["warnings"]))
        self.assertTrue(any("seizoen" in w for w in res["warnings"]))


class DstTransitionTests(SimpleTestCase):
    """Genormaliseerde meterklok: uniforme kwartierrasters over beide
    zomertijdovergangen moeten zonder duplicaat-/gatenproblemen doorlopen."""

    client_class = APIClient

    def _uniform_days(self, start_iso_utc):
        start_ms = int(
            datetime.fromisoformat(start_iso_utc).replace(tzinfo=timezone.utc).timestamp() * 1000
        )
        return _synthetic_day_intervals(days=2, import_kwh=0.1, export_kwh=0.05, start_ms=start_ms)

    def _assert_clean(self, intervals):
        cache.clear()
        response = self.client.post(URL, _request_body(intervals), format="json")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["profile"]["interval_count"], 192)
        self.assertEqual(body["profile"]["missing_intervals"], 0)
        self.assertEqual(body["profile"]["duplicate_intervals"], 0)
        self.assertAlmostEqual(body["profile"]["completeness_pct"], 100.0, places=1)

    def test_spring_dst_transition(self):
        # 2025-03-29/30: klok verspringt lokaal 02:00 -> 03:00
        self._assert_clean(self._uniform_days("2025-03-29T00:00:00"))

    def test_autumn_dst_transition(self):
        # 2025-10-25/26: klok valt lokaal terug 03:00 -> 02:00
        self._assert_clean(self._uniform_days("2025-10-25T00:00:00"))


class BidirectionalNettingTests(SimpleTestCase):
    """Kwartieren met zowel afname als teruglevering: de overlap wordt genet,
    gerapporteerd en nooit als batterijbesparing geteld."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # 4 dagen; elk kwartier bidirectioneel: import 0.2, export 0.5
        # -> overlap 0.2/kwartier, genormaliseerd: import 0, export 0.3.
        cls.intervals = _synthetic_day_intervals(days=4, import_kwh=0.2, export_kwh=0.5)
        cls.res = run_analysis(validate_request(_request_body(cls.intervals)))

    def test_overlap_reported(self):
        p = self.res["profile"]
        n = len(self.intervals)
        self.assertEqual(p["bidirectional_interval_count"], n)
        self.assertAlmostEqual(p["bidirectional_energy_overlap_kwh"], n * 0.2, places=3)
        self.assertAlmostEqual(p["raw_grid_import_kwh"], n * 0.2, places=3)
        self.assertAlmostEqual(p["raw_grid_export_kwh"], n * 0.5, places=3)
        self.assertAlmostEqual(p["normalized_grid_import_kwh"], 0.0, places=3)
        self.assertAlmostEqual(p["normalized_grid_export_kwh"], n * 0.3, places=3)
        self.assertTrue(any("genet" in w for w in self.res["warnings"]))

    def test_accounting_identity_with_overlap(self):
        p = self.res["profile"]
        overlap = p["bidirectional_energy_overlap_kwh"]
        self.assertLess(
            abs((p["raw_grid_import_kwh"] - overlap) - p["normalized_grid_import_kwh"]), 0.01
        )
        self.assertLess(
            abs((p["raw_grid_export_kwh"] - overlap) - p["normalized_grid_export_kwh"]), 0.01
        )

    def test_overlap_never_attributed_to_battery(self):
        p = self.res["profile"]
        overlap = p["bidirectional_energy_overlap_kwh"]
        for c in self.res["candidates"]:
            ph = c["physical"]
            # identiteit t.o.v. de GENORMALISEERDE baseline
            self.assertLess(
                abs((p["normalized_grid_import_kwh"] - ph["adjusted_grid_import_kwh"])
                    - ph["grid_import_reduction_kwh"]), 0.03
            )
            self.assertLess(
                abs((p["normalized_grid_export_kwh"] - ph["adjusted_grid_export_kwh"])
                    - ph["grid_export_reduction_kwh"]), 0.03
            )
            # de ruwe delta is overlap groter dan de gerapporteerde reductie:
            # dat verschil is netting, geen batterijeffect
            raw_delta_exp = p["raw_grid_export_kwh"] - ph["adjusted_grid_export_kwh"]
            self.assertAlmostEqual(
                raw_delta_exp - ph["grid_export_reduction_kwh"], overlap, delta=0.03
            )
            # genormaliseerde import is 0: er valt niets te reduceren
            self.assertLessEqual(ph["grid_import_reduction_kwh"], 0.01)


class ThrottleTests(SimpleTestCase):
    client_class = APIClient

    def test_throttle_configured_on_view(self):
        self.assertIn(ScopedRateThrottle, SmartMeterAnalysisAPIView.throttle_classes)
        self.assertEqual(SmartMeterAnalysisAPIView.throttle_scope, "smartmeter_analysis")
        rates = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
        self.assertIn("smartmeter_analysis", rates)

    def test_throttle_enforced(self):
        class OneShotThrottle(ScopedRateThrottle):
            THROTTLE_RATES = {"smartmeter_analysis": "1/hour"}

        cache.clear()
        body = _request_body(_synthetic_day_intervals())
        with mock.patch.object(
            SmartMeterAnalysisAPIView, "throttle_classes", [OneShotThrottle]
        ):
            first = self.client.post(URL, body, format="json")
            second = self.client.post(URL, body, format="json")
        cache.clear()
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 429)


class EdgeProfileTests(SimpleTestCase):
    def _analyze(self, intervals):
        return run_analysis(validate_request(_request_body(intervals)))

    def test_no_export_profile(self):
        res = self._analyze(_synthetic_day_intervals(days=4, import_kwh=0.15, export_kwh=0.0))
        self.assertIsNone(res["recommendation"])
        for c in res["candidates"]:
            self.assertEqual(c["physical"]["grid_export_reduction_kwh"], 0.0)
        self.assertTrue(any("Geen teruglevering" in w for w in res["warnings"]))

    def test_no_import_profile(self):
        res = self._analyze(_synthetic_day_intervals(days=4, import_kwh=0.0, export_kwh=0.3))
        self.assertEqual(len(res["candidates"]), 5)
        self.assertIsNone(res["recommendation"])

    def test_flat_profile(self):
        res = self._analyze(_synthetic_day_intervals(days=4, import_kwh=0.1, export_kwh=0.0))
        self.assertEqual(len(res["candidates"]), 5)


class ValidationTests(SimpleTestCase):
    client_class = APIClient

    def setUp(self):
        cache.clear()

    def _post(self, body):
        return self.client.post(URL, body, format="json")

    def _assert_code(self, response, code):
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], code)

    def test_empty_request(self):
        self._assert_code(self._post({}), "UNSUPPORTED_SOURCE")

    def test_unsupported_source(self):
        body = _request_body(_synthetic_day_intervals())
        body["source"] = "essent"
        self._assert_code(self._post(body), "UNSUPPORTED_SOURCE")

    def test_unsupported_interval(self):
        body = _request_body(_synthetic_day_intervals())
        body["interval_minutes"] = 60
        self._assert_code(self._post(body), "UNSUPPORTED_INTERVAL")

    def test_financial_scenario_omitted_defaults_to_physical_only(self):
        response = self._post(_request_body(_synthetic_day_intervals()))
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIsNone(body["financial_scenario"])
        self.assertTrue(all(c["financial"] is None for c in body["candidates"]))

    def test_financial_scenario_explicit_null_is_physical_only(self):
        response = self._post(
            _request_body(_synthetic_day_intervals(), financial_scenario=None)
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["financial_scenario"])

    def test_financial_scenario_explicit_study_enables_financials(self):
        response = self._post(
            _request_body(_synthetic_day_intervals(), financial_scenario="study_2027_post_fixed")
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["financial_scenario"]["id"], "study_2027_post_fixed")
        self.assertTrue(all(c["financial"] is not None for c in body["candidates"]))

    def test_unknown_financial_scenario(self):
        body = _request_body(_synthetic_day_intervals(), financial_scenario="dynamic_2026")
        self._assert_code(self._post(body), "UNKNOWN_FINANCIAL_SCENARIO")

    def test_empty_intervals(self):
        self._assert_code(self._post(_request_body([])), "MISSING_INTERVALS")

    def test_too_few_intervals(self):
        self._assert_code(
            self._post(_request_body(_synthetic_day_intervals()[: MIN_INTERVALS - 1])),
            "TOO_FEW_INTERVALS",
        )

    def test_oversized_request(self):
        too_many = [{"timestamp": 0, "import_kwh": 0, "export_kwh": 0}] * (MAX_INTERVALS + 1)
        with self.assertRaises(SmartMeterValidationError) as ctx:
            validate_request(_request_body(too_many))
        self.assertEqual(ctx.exception.code, "TOO_MANY_INTERVALS")

    def test_malformed_timestamp(self):
        ints = _synthetic_day_intervals()
        ints[10]["timestamp"] = "geen-datum"
        self._assert_code(self._post(_request_body(ints)), "INVALID_TIMESTAMP")

    def test_iso_timestamps_accepted(self):
        ints = _synthetic_day_intervals()
        for iv in ints:
            iv["timestamp"] = datetime.fromtimestamp(
                iv["timestamp"] / 1000.0, tz=timezone.utc
            ).isoformat()
        self.assertEqual(self._post(_request_body(ints)).status_code, 200)

    def test_duplicate_timestamps(self):
        ints = _synthetic_day_intervals()
        ints[5]["timestamp"] = ints[4]["timestamp"]
        self._assert_code(self._post(_request_body(ints)), "DUPLICATE_TIMESTAMP")

    def test_negative_energy(self):
        ints = _synthetic_day_intervals()
        ints[3]["import_kwh"] = -0.1
        self._assert_code(self._post(_request_body(ints)), "NEGATIVE_ENERGY")

    def test_non_finite_energy(self):
        ints = _synthetic_day_intervals()
        ints[3]["export_kwh"] = float("inf")
        with self.assertRaises(SmartMeterValidationError) as ctx:
            validate_request(_request_body(ints))
        self.assertEqual(ctx.exception.code, "INVALID_ENERGY")

    def test_implausible_energy(self):
        ints = _synthetic_day_intervals()
        ints[3]["import_kwh"] = 500.0
        self._assert_code(self._post(_request_body(ints)), "IMPLAUSIBLE_ENERGY")

    def test_interval_mismatch(self):
        ints = _synthetic_day_intervals()
        for i, iv in enumerate(ints):
            iv["timestamp"] = 1_735_689_600_000 + i * 3_600_000
        self._assert_code(self._post(_request_body(ints)), "INTERVAL_MISMATCH")

    def test_unsorted_input_is_normalized(self):
        ints = list(reversed(_synthetic_day_intervals(days=2, import_kwh=0.1)))
        response = self._post(_request_body(ints))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["profile"]["interval_count"], 192)
