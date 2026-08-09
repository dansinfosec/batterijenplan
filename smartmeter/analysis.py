"""Slimme-meterdata batterijanalyse — dunne orkestratie om bp-dispatch-v1.

Alle batterijfysica, dispatch en settlement komt uit de gevalideerde engine
(het getrackte package ``bp_dispatch`` in de repo-root); deze module bouwt
alleen de engine-inputs uit het genormaliseerde P1-profiel, draait de
kandidaten en vertaalt RunSummary's naar het API-contract.

ARCHITECTUUR:
- FYSIEK en FINANCIEEL zijn gescheiden. De fysieke simulatie (netstromen,
  SoC, verliezen, cycli, clipping) is deterministisch en onafhankelijk van
  tariefaannames. Financiële waarde bestaat alleen binnen een expliciet
  benoemd scenario (financial_scenario) en kan worden weggelaten.
- GEEN AANBEVELING: er bestaat in deze repository geen gevalideerde
  aanbevelings-/sizingregel voor intervalprofielen (calculators.services is
  een jaartotalen-heuristiek voor de snelle calculator en is hier niet op
  ontworpen). De API geeft daarom recommendation: null plus objectieve
  vergelijkingsmetrics; de keuze blijft bij de gebruiker/adviseur.

P1-NETDATA-SEMANTIEK — "15-minute normalized net-flow model": een P1-profiel
bevat NETTO netstromen per kwartier. Bruto PV-productie, bruto
huishoudverbruik en momentane eigen consumptie achter de meter zijn hieruit
NIET afleidbaar, en kwartierdata kan de exacte chronologie van afname en
teruglevering bínnen een kwartier niet reconstrueren. Kwartieren met zowel
afname als teruglevering (bidirectioneel, bijv. rond tariefwissels) worden
daarom vóór de simulatie genet: de engine ontvangt uitsluitend
max(import-export, 0) / max(export-import, 0). De genette overlap wordt
apart gerapporteerd en NOOIT als batterijbesparing geteld; alle reducties
zijn gedefinieerd t.o.v. de GENORMALISEERDE baseline. Veldnamen beschrijven
uitsluitend netstromen en batterijstromen (bijv.
``grid_export_charged_into_battery_kwh``), nooit "zelfconsumptie van PV".

TIJDBASIS: tijdstempels zijn genormaliseerde lokale meterkloklabels
(uniform 15-minutenraster, gecodeerd met UTC-rekenkunde) — géén echte
UTC-markttijdstempels. v1 lijnt uploads NIET uit met EPEX-/TenneT-reeksen;
zie methodology.time_basis en limitations.

PRIVACY: geen database-writes, geen logging van intervaldata; volledig
stateloos.
"""

import time
from datetime import datetime, timezone

from bp_dispatch.core import (
    ENGINE_ID,
    VERSION as ENGINE_VERSION,
    DispatchMode,
    Interval,
    IntervalInput,
    ScenarioConfig,
    SettlementMode,
    TariffConfig,
    config_hash,
)
from bp_dispatch.engine import simulate
from bp_dispatch.study2027 import self_consumption_battery

API_MODEL_VERSION = "smartmeter-analysis-v1"

# Tijdbasis-metadata (zie module-docstring + methodology).
TIME_BASIS = "local_wall_clock_normalized"
METER_TIMEZONE = "Europe/Amsterdam"

# ── Financiële scenario's ──────────────────────────────────────────────────
# Eén expliciet benoemd scenario in v1: de aannames van de bp-dispatch
# 2027-studie (POST_2027_FIXED). De cijfers worden NIET hier gedupliceerd
# maar uit de engine-defaults gelezen (TariffConfig/BatteryConfig zijn de
# canonieke drager van deze studie-aannames). Dit zijn STUDIE-aannames, geen
# universeel Batterijenplan-tarievenmodel — dat staat ook zo in de response.
STUDY_2027_SCENARIO_ID = "study_2027_post_fixed"
SUPPORTED_FINANCIAL_SCENARIOS = {STUDY_2027_SCENARIO_ID}

# ── Batterijkandidaten ─────────────────────────────────────────────────────
# Capaciteiten (nominaal): Dyness S3 Tower-catalogus in calculators.services
# (RESIDENTIAL_CATALOG). De repository bevat GEEN geverifieerde residentiële
# omvormerspecificaties en geen geverifieerd bruikbaar-aandeel; beide zijn
# daarom expliciet gemarkeerde aannames:
#   - usable = 0.9 x nominaal (conventie van bp_dispatch.study2027);
#   - vermogens uit de 2027-studieklassen (7/3, 10/5, 21.8/6), voor 14/28 de
#     dichtstbijzijnde studieklasse.
USABLE_FRACTION_OF_NOMINAL = 0.9
FLAG_USABLE_ESTIMATED = "usable_capacity_estimated_0.9_of_nominal"
FLAG_POWER_STUDY_CLASS = "inverter_power_from_study_class_not_product_verified"
FLAG_POWER_NEAREST_CLASS = "inverter_power_assumed_nearest_study_class"

CANDIDATE_SPECS = [
    {"id": "t7", "label": "7 kWh", "product_name": "Dyness S3 Tower T7",
     "nominal_kwh": 7.10, "power_kw": 3.0,
     "power_source": "bp-dispatch 2027-studieklasse 7kWh/3kW",
     "power_flag": FLAG_POWER_STUDY_CLASS},
    {"id": "t10", "label": "10 kWh", "product_name": "Dyness S3 Tower T10",
     "nominal_kwh": 10.15, "power_kw": 5.0,
     "power_source": "bp-dispatch 2027-studieklasse 10kWh/5kW",
     "power_flag": FLAG_POWER_STUDY_CLASS},
    {"id": "t14", "label": "14 kWh", "product_name": "Dyness S3 Tower T14",
     "nominal_kwh": 14.20, "power_kw": 6.0,
     "power_source": "aanname: dichtstbijzijnde studieklasse (6 kW)",
     "power_flag": FLAG_POWER_NEAREST_CLASS},
    {"id": "t21", "label": "21 kWh", "product_name": "Dyness S3 Tower T21",
     "nominal_kwh": 21.30, "power_kw": 6.0,
     "power_source": "bp-dispatch 2027-studieklasse 21.8kWh/6kW",
     "power_flag": FLAG_POWER_STUDY_CLASS},
    {"id": "t28", "label": "28 kWh", "product_name": "Dyness S3 Tower T28",
     "nominal_kwh": 28.40, "power_kw": 6.0,
     "power_source": "aanname: dichtstbijzijnde studieklasse (6 kW)",
     "power_flag": FLAG_POWER_NEAREST_CLASS},
]
CAPACITY_SOURCE = "calculators.services.RESIDENTIAL_CATALOG (Dyness S3 Tower)"

# Vanaf dit aantal waargenomen dagen geldt het resultaat als "observed" jaar;
# daaronder wordt de FINANCIËLE jaarwaarde geannualiseerd (en zo gelabeld).
FULL_YEAR_MIN_DAYS = 350.0
SEASONAL_BIAS_WARN_DAYS = 300.0

_EPS_WH = 1e-3


class _PhysicalAggregator:
    """Streaming interval_sink: aggregeert fysieke detailmetrics (piek-SoC,
    clipping) zonder de 35k+ detail-dicts in geheugen te houden. De engine
    roept alleen .append() aan."""

    def __init__(self, usable_wh: float, max_charge_wh: float, max_discharge_wh: float):
        self.usable_wh = usable_wh
        self.max_charge_wh = max_charge_wh
        self.max_discharge_wh = max_discharge_wh
        self.peak_soc_wh = 0.0
        self.capacity_limited_charge = 0
        self.power_limited_charge = 0
        self.power_limited_discharge = 0

    def append(self, r: dict):
        soc = r["soc_after_wh"]
        if soc > self.peak_soc_wh:
            self.peak_soc_wh = soc
        charged = r["solar_to_batt_wh"] + r["grid_to_batt_wh"]
        surplus_unstored = r["surplus_wh"] - r["solar_to_batt_wh"]
        if surplus_unstored > _EPS_WH:
            if self.usable_wh - soc <= _EPS_WH:
                self.capacity_limited_charge += 1
            elif charged >= self.max_charge_wh - _EPS_WH:
                self.power_limited_charge += 1
        discharged = r["batt_to_load_wh"] + r["batt_to_grid_wh"]
        residual_unserved = r["residual_load_wh"] - r["batt_to_load_wh"]
        if residual_unserved > _EPS_WH and discharged >= self.max_discharge_wh - _EPS_WH:
            self.power_limited_discharge += 1


def _build_inputs(intervals, interval_minutes):
    seconds = interval_minutes * 60
    out = []
    for ts_ms, imp_kwh, exp_kwh in intervals:
        start = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
        out.append(
            IntervalInput(
                interval=Interval(start=start, seconds=seconds),
                load_wh=imp_kwh * 1000.0,
                pv_wh=exp_kwh * 1000.0,
            )
        )
    return out


def _normalize_net_flow(intervals):
    """Netting per kwartier (15-minute normalized net-flow model).

    Bidirectionele kwartieren (raw import > 0 én raw export > 0) worden genet
    tot één richting; de overlap (min(import, export)) wordt apart geteld en
    telt nooit mee als batterij-effect.
    Returns: (normalized_intervals, stats).
    """
    normalized = []
    bidirectional_count = 0
    overlap_kwh = 0.0
    raw_import = 0.0
    raw_export = 0.0
    for ts, imp, exp in intervals:
        raw_import += imp
        raw_export += exp
        if imp > 0.0 and exp > 0.0:
            bidirectional_count += 1
            overlap_kwh += min(imp, exp)
        net = imp - exp
        normalized.append((ts, net if net > 0.0 else 0.0, -net if net < 0.0 else 0.0))
    stats = {
        "raw_import_kwh": raw_import,
        "raw_export_kwh": raw_export,
        "normalized_import_kwh": raw_import - overlap_kwh,
        "normalized_export_kwh": raw_export - overlap_kwh,
        "bidirectional_interval_count": bidirectional_count,
        "overlap_kwh": overlap_kwh,
    }
    return normalized, stats


def _profile_block(intervals, net_stats, interval_minutes, annualized, warnings):
    step_ms = interval_minutes * 60_000
    start_ms = intervals[0][0]
    end_ms = intervals[-1][0]
    span_intervals = (end_ms - start_ms) // step_ms + 1
    missing = int(span_intervals - len(intervals))
    completeness = (len(intervals) / span_intervals * 100.0) if span_intervals else 0.0
    observed_days = (end_ms - start_ms + step_ms) / 86_400_000.0
    return {
        "interval_count": len(intervals),
        "start": datetime.fromtimestamp(start_ms / 1000.0, tz=timezone.utc).isoformat(),
        "end": datetime.fromtimestamp(end_ms / 1000.0, tz=timezone.utc).isoformat(),
        "interval_minutes": interval_minutes,
        "time_basis": TIME_BASIS,
        "timezone": METER_TIMEZONE,
        "completeness_pct": round(completeness, 2),
        "annualized": annualized,
        "raw_grid_import_kwh": round(net_stats["raw_import_kwh"], 3),
        "raw_grid_export_kwh": round(net_stats["raw_export_kwh"], 3),
        "normalized_grid_import_kwh": round(net_stats["normalized_import_kwh"], 3),
        "normalized_grid_export_kwh": round(net_stats["normalized_export_kwh"], 3),
        "bidirectional_interval_count": net_stats["bidirectional_interval_count"],
        "bidirectional_energy_overlap_kwh": round(net_stats["overlap_kwh"], 3),
        "observed_days": round(observed_days, 2),
        "missing_intervals": missing,
        "duplicate_intervals": 0,  # duplicaten worden in validatie geweigerd
        "warnings": warnings,
    }


def _financial_scenario_block(tariff, battery):
    """Scenario-metadata, gelezen uit de engine-configuraties zelf (geen
    gedupliceerde constanten in smartmeter-code)."""
    return {
        "id": STUDY_2027_SCENARIO_ID,
        "label": "2027-studie: vaste prijzen, geen saldering (POST_2027_FIXED)",
        "rulepack_version": f"{ENGINE_ID}@{ENGINE_VERSION}/study-2027",
        "universally_applicable": False,
        "source": (
            "Aannames van de bp-dispatch 2027-studie (engine-defaults in "
            "TariffConfig/BatteryConfig); geen actueel leverancierstarief."
        ),
        "assumptions": {
            "settlement_mode": tariff.settlement_mode.value,
            "import_price_eur_kwh": tariff.import_price_eur_kwh,
            "feed_in_compensation_eur_kwh": tariff.feed_in_compensation_eur_kwh,
            "feed_in_cost_eur_kwh": tariff.feed_in_cost_eur_kwh,
            "degradation_eur_per_kwh_throughput": battery.degradation_eur_per_kwh,
        },
    }


def run_analysis(validated: dict) -> dict:
    """Volledige analyse van een gevalideerd request -> API-response-dict."""
    t_total = time.perf_counter()
    intervals = validated["intervals"]
    interval_minutes = validated["interval_minutes"]
    # Fysiek-only is de default; financieel is expliciet opt-in (validatie
    # levert None wanneer het veld ontbreekt of null is).
    scenario_id = validated.get("financial_scenario")
    include_financial = scenario_id is not None

    # Netting vóór simulatie: de engine ziet uitsluitend eenrichtings-
    # kwartieren; reducties worden t.o.v. de GENORMALISEERDE baseline
    # gedefinieerd zodat de overlap nooit als batterijbesparing telt.
    normalized_intervals, net_stats = _normalize_net_flow(intervals)
    baseline_import_kwh = net_stats["normalized_import_kwh"]
    baseline_export_kwh = net_stats["normalized_export_kwh"]

    step_ms = interval_minutes * 60_000
    observed_days = (intervals[-1][0] - intervals[0][0] + step_ms) / 86_400_000.0
    annualized = observed_days < FULL_YEAR_MIN_DAYS
    factor = (365.0 / observed_days) if annualized and observed_days > 0 else 1.0

    warnings = []
    if annualized:
        warnings.append(
            "Minder dan een vol jaar aan data: financiële jaarcijfers zijn "
            "geannualiseerde schattingen (factor %.2f), geen gemeten historie." % factor
        )
    if annualized and observed_days < SEASONAL_BIAS_WARN_DAYS:
        warnings.append(
            "De waargenomen periode dekt niet alle seizoenen; geannualiseerde "
            "cijfers kunnen seizoensvertekend zijn."
        )
    if baseline_export_kwh <= 0:
        warnings.append(
            "Geen teruglevering gemeten: zonder opslaadbaar overschot is het "
            "fysieke effect van een batterij op dit profiel verwaarloosbaar."
        )
    if net_stats["overlap_kwh"] > 1.0:
        warnings.append(
            "%d kwartieren bevatten zowel afname als teruglevering; %.1f kWh "
            "overlap is vóór de simulatie genet en telt niet als batterijbesparing."
            % (net_stats["bidirectional_interval_count"], net_stats["overlap_kwh"])
        )

    engine_inputs = _build_inputs(normalized_intervals, interval_minutes)

    # Tarief: engine-defaults van de 2027-studie; terugleverkosten expliciet
    # op 0 (leverancierspecifiek, uitgesloten stream). De fysieke dispatch
    # (laad PV-overschot, ontlaad naar restlast) is in de praktijk
    # prijsonafhankelijk; het tarief bepaalt alleen de financiële waardering.
    tariff = TariffConfig(
        settlement_mode=SettlementMode.POST_2027_FIXED,
        feed_in_cost_eur_kwh=0.0,
    )

    candidates = []
    timings = {}
    config_hashes = {}
    scenario_block = None
    battery_assumptions = None
    interval_hours = interval_minutes / 60.0

    for spec in CANDIDATE_SPECS:
        t_c = time.perf_counter()
        usable = round(spec["nominal_kwh"] * USABLE_FRACTION_OF_NOMINAL, 2)
        battery = self_consumption_battery(spec["id"], usable, spec["power_kw"])
        scenario = ScenarioConfig(
            name=f"smartmeter-{spec['id']}",
            battery=battery,
            tariff=tariff,
            dispatch_mode=DispatchMode.SELF_CONSUMPTION,
        )
        agg = _PhysicalAggregator(
            usable_wh=usable * 1000.0,
            max_charge_wh=spec["power_kw"] * 1000.0 * interval_hours,
            max_discharge_wh=spec["power_kw"] * 1000.0 * interval_hours,
        )
        summary = simulate(scenario, engine_inputs, experiment=API_MODEL_VERSION,
                           interval_sink=agg)
        config_hashes[spec["id"]] = config_hash(scenario)
        if scenario_block is None:
            scenario_block = _financial_scenario_block(tariff, battery)
            battery_assumptions = {
                "round_trip_efficiency": battery.round_trip_efficiency,
                "efficiency_split": "charge_eff = discharge_eff = sqrt(round_trip)",
                "standby_w": battery.standby_w,
                "initial_soc_frac": battery.initial_soc_frac,
                "grid_charging": battery.allow_grid_charge,
                "battery_export": battery.allow_battery_export,
            }

        phys_kwh = summary.physical_kwh
        import_reduction = baseline_import_kwh - summary.grid_import_kwh
        export_reduction = baseline_export_kwh - summary.grid_export_kwh
        capture_pct = (
            (export_reduction / baseline_export_kwh * 100.0) if baseline_export_kwh > 0 else 0.0
        )
        peak_soc_kwh = agg.peak_soc_wh / 1000.0

        physical = {
            # Alle fysieke waarden zijn WAARGENOMEN over de aangeleverde
            # periode (niet geannualiseerd) en tariefonafhankelijk.
            "basis": "observed",
            "adjusted_grid_import_kwh": summary.grid_import_kwh,
            "adjusted_grid_export_kwh": summary.grid_export_kwh,
            "grid_import_reduction_kwh": round(import_reduction, 2),
            "grid_export_reduction_kwh": round(export_reduction, 2),
            "grid_export_charged_into_battery_kwh": round(phys_kwh["solar_to_batt_wh"], 1),
            "battery_discharge_offsetting_grid_import_kwh": round(phys_kwh["batt_to_load_wh"], 1),
            "charge_losses_kwh": round(phys_kwh["charge_loss_wh"], 2),
            "discharge_losses_kwh": round(phys_kwh["discharge_loss_wh"], 2),
            "equivalent_full_cycles": summary.equivalent_full_cycles,
            "export_capture_pct": round(capture_pct, 1),
            "peak_soc_kwh": round(peak_soc_kwh, 2),
            "capacity_utilization_pct": round(
                (peak_soc_kwh / usable * 100.0) if usable else 0.0, 1
            ),
            "capacity_limited_charge_intervals": agg.capacity_limited_charge,
            "power_limited_charge_intervals": agg.power_limited_charge,
            "power_limited_discharge_intervals": agg.power_limited_discharge,
        }

        financial = None
        if include_financial:
            financial = {
                "scenario_id": STUDY_2027_SCENARIO_ID,
                "basis": "annualized" if annualized else "observed",
                "annualization_factor": round(factor, 4),
                "modeled_annual_value_eur": round(summary.total_battery_value_eur * factor, 2),
                "value_components_eur": {
                    k: round(v * factor, 2)
                    for k, v in summary.components_eur.items()
                    if v != 0.0
                },
            }

        candidates.append({
            "id": spec["id"],
            "label": spec["label"],
            "product_name": spec["product_name"],
            "nominal_capacity_kwh": spec["nominal_kwh"],
            "usable_capacity_kwh": usable,
            "inverter_power_kw": spec["power_kw"],
            "capacity_source": CAPACITY_SOURCE,
            "power_source": spec["power_source"],
            "assumption_flags": [FLAG_USABLE_ESTIMATED, spec["power_flag"]],
            "physical": physical,
            "financial": financial,
            "comparison": None,  # ingevuld na de lus
        })
        timings[spec["id"]] = round((time.perf_counter() - t_c) * 1000.0, 1)

    # Objectieve vergelijkingsmetrics t.o.v. de vorige (kleinere) kandidaat —
    # informatief, zonder "beste" aan te wijzen.
    for i, cand in enumerate(candidates):
        if i == 0:
            cand["comparison"] = {"reference_id": None}
            continue
        prev = candidates[i - 1]
        comp = {
            "reference_id": prev["id"],
            "additional_import_reduction_kwh": round(
                cand["physical"]["grid_import_reduction_kwh"]
                - prev["physical"]["grid_import_reduction_kwh"], 2
            ),
            "additional_export_capture_pct": round(
                cand["physical"]["export_capture_pct"]
                - prev["physical"]["export_capture_pct"], 1
            ),
        }
        if include_financial and prev["financial"]["modeled_annual_value_eur"] > 0:
            delta = (cand["financial"]["modeled_annual_value_eur"]
                     - prev["financial"]["modeled_annual_value_eur"])
            comp["incremental_value_eur"] = round(delta, 2)
            comp["incremental_value_pct"] = round(
                delta / prev["financial"]["modeled_annual_value_eur"] * 100.0, 1
            )
        cand["comparison"] = comp

    methodology = {
        "api_model_version": API_MODEL_VERSION,
        "model": "15-minute normalized net-flow model",
        "engine_version": f"{ENGINE_ID}@{ENGINE_VERSION}",
        "rulepack_version": scenario_block["rulepack_version"] if include_financial else None,
        "dispatch_mode": DispatchMode.SELF_CONSUMPTION.value,
        "time_basis": TIME_BASIS,
        "timezone": METER_TIMEZONE,
        "battery_assumptions": battery_assumptions,
        "candidate_source": {
            "capacity": CAPACITY_SOURCE,
            "inverter_power": "bp-dispatch 2027-studieklassen (niet productgeverifieerd)",
            "usable_fraction_of_nominal": USABLE_FRACTION_OF_NOMINAL,
        },
        "included_value_streams": (
            ["avoided_grid_import", "lost_feed_in_compensation", "degradation_cost"]
            if include_financial else []
        ),
        "excluded_value_streams": [
            {"stream": "day_ahead_trading",
             "reason": "geen dag-ahead-prijsreeks gekoppeld aan geüploade profielen in v1"},
            {"stream": "imbalance_flex",
             "reason": "onbalanssturing is experimenteel in de engine en niet gevalideerd voor dit pad"},
            {"stream": "feed_in_cost_avoided",
             "reason": "terugleverkosten zijn leverancierspecifiek; aanname EUR 0,00/kWh in v1"},
        ],
        "results_basis": {
            "physical": "observed",
            "financial": ("annualized" if annualized else "observed") if include_financial else None,
        },
        "annualization_factor": round(factor, 4),
        "recommendation_policy": (
            "Geen aanbeveling: er bestaat geen gevalideerde sizing-/aanbevelings"
            "regel voor intervalprofielen in deze repository. De API levert "
            "alle kandidaatresultaten plus objectieve vergelijkingsmetrics."
        ),
        "limitations": [
            "P1-netdata: bruto PV-productie, bruto verbruik en momentane eigen "
            "consumptie achter de meter zijn niet afleidbaar; alle metrics "
            "beschrijven netto netstromen en batterijstromen.",
            "Tijdstempels zijn genormaliseerde lokale meterkloklabels (uniform "
            "15-minutenraster via UTC-rekenkunde), geen echte UTC-markttijden; "
            "v1 lijnt niet uit met EPEX-/TenneT-reeksen.",
            "Omvormervermogens zijn studieklassen, geen geverifieerde "
            "productspecificaties; bruikbare capaciteit is geschat op 90% van "
            "nominaal.",
            "Financiële waarde geldt alleen binnen het benoemde scenario en is "
            "geen tariefadvies.",
            "Kwartierdata kan de exacte chronologie van afname en teruglevering "
            "binnen een kwartier niet reconstrueren; bidirectionele kwartieren "
            "worden vóór simulatie genet (zie bidirectional_energy_overlap_kwh) "
            "en die overlap telt nooit als batterijbesparing.",
        ],
        "scenario_config_sha256": config_hashes,
        "data_retention": "stateloos; intervaldata wordt niet opgeslagen of gelogd",
    }

    return {
        "profile": _profile_block(intervals, net_stats, interval_minutes, annualized, warnings),
        # Reducties per kandidaat zijn gedefinieerd t.o.v. déze genormaliseerde
        # baseline — nooit t.o.v. de ruwe P1-totalen.
        "baseline": {
            "basis": "normalized_net_flow",
            "grid_import_kwh": round(baseline_import_kwh, 3),
            "grid_export_kwh": round(baseline_export_kwh, 3),
        },
        "financial_scenario": scenario_block if include_financial else None,
        "candidates": candidates,
        # Bewust null: liever geen aanbeveling dan een verzonnen regel.
        "recommendation": None,
        "methodology": methodology,
        "warnings": warnings,
        "timings_ms": {
            "simulation_per_candidate": timings,
            "total": round((time.perf_counter() - t_total) * 1000.0, 1),
        },
    }
