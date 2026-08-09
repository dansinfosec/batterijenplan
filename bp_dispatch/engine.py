# -*- coding: utf-8 -*-
"""bp-dispatch-v1 engine: simulator, validation, matrix runner, scenario helpers, exports.

The simulator owns the single shared battery. Strategies only *propose* flows; the simulator gates
them so no interval both charges and discharges (D-balance), clamps to power/SoC, applies efficiency,
and checks the AC energy balance + SoC consistency every interval.
"""
from __future__ import annotations
import csv as _csv
import json
import statistics
from dataclasses import dataclass, field, asdict
from datetime import timezone
from decimal import Decimal
from .core import (Action, DispatchMode, SettlementMode, Foresight, ScenarioConfig, IntervalInput,
                   Provenance, ENGINE_ID, VERSION, TZ, wh_to_kwh, money, config_hash, EnergyBalanceError)
from .physics import Battery, household_split, ValueLedger
from .settlements import settle_interval, resolve_prices
from .dispatch import make_strategy, Ctx

BALANCE_TOL_WH = 1e-6


@dataclass
class RunSummary:
    scenario_name: str
    dispatch_mode: str
    settlement_mode: str
    foresight: str
    n_intervals: int
    total_battery_value_eur: float
    components_eur: dict
    physical_kwh: dict
    grid_import_kwh: float
    grid_export_kwh: float
    direct_self_consumption_kwh: float
    charged_kwh: float
    discharged_kwh: float
    losses_kwh: float
    equivalent_full_cycles: float
    final_soc_frac: float
    max_balance_error_wh: float
    warnings: list
    provenance: dict
    validation_status: str
    dispatch_plan: dict = None      # DP planner summary (volume-aware mode only), else None


def simulate(scenario: ScenarioConfig, inputs: list[IntervalInput], experiment: str = "run",
             interval_sink: list | None = None) -> RunSummary:
    """If interval_sink is a list, per-interval physical+financial detail dicts are appended to it
    (additive instrumentation for the red-team reconciliation; default off, no behaviour change)."""
    bat = Battery(scenario.battery)
    strat = make_strategy(scenario.dispatch_mode, scenario.foresight)
    if hasattr(strat, "prepare"):
        strat.prepare(scenario, inputs, bat)   # whole-horizon planners (DP) precompute here
    ledger = ValueLedger()
    degr = scenario.battery.degradation_eur_per_kwh
    mode = scenario.tariff.settlement_mode
    max_bal = 0.0
    grid_imp = grid_exp = direct = charged = discharged = closs = dloss = 0.0
    warns = []

    for i, iv in enumerate(inputs):
        sec = iv.interval.seconds
        standby_wh = scenario.battery.standby_w * iv.interval.hours
        load = iv.load_wh + standby_wh                      # standby modelled as added load (D-standby)
        hh = household_split(load, iv.pv_wh)
        direct += hh.direct_pv_wh
        imp_p, exp_p = resolve_prices(mode, scenario.tariff, iv.import_price_eur_kwh, iv.export_price_eur_kwh)
        soc_before = bat.soc_wh
        ctx = Ctx(i=i, inputs=inputs, surplus_wh=hh.surplus_wh, residual_load_wh=hh.residual_load_wh,
                  import_price=imp_p, export_price=exp_p,
                  max_charge_ac_wh=bat.max_charge_ac_wh(sec),
                  max_discharge_deliv_wh=bat.max_discharge_delivered_wh(sec),
                  charge_eff=bat.charge_eff, discharge_eff=bat.discharge_eff,
                  degr_eur_kwh=degr, min_spread=scenario.min_spread_eur_kwh,
                  look_ahead=scenario.look_ahead_intervals)
        plan = strat.plan(ctx)

        # regime gate: the BATTERY is charged XOR discharged in an interval. Serving a (small) load from
        # the grid while grid-charging is physically fine and NOT a conflict — the XOR is battery-only.
        # (RT-2 fix: previously any residual load, incl. tiny standby, forced discharging and silently
        #  disabled grid-charge arbitrage whenever standby_w>0.)
        s2b = g2b = b2l = b2g = 0.0
        cl = dl = 0.0
        if getattr(plan, "authoritative", False):
            # DP planner: regime is dictated by the plan (XOR guaranteed by the optimiser). Still clipped
            # to physical maxima below as a safety net.
            is_charge = (plan.charge_pv_wh + plan.charge_grid_wh) > 0
            is_discharge = (plan.discharge_load_wh + plan.discharge_grid_wh) > 0
            charging_regime = is_charge
            discharging_regime = is_discharge and not is_charge
        else:
            want_charge = hh.surplus_wh > 0 or plan.charge_grid_wh > 0
            want_discharge = plan.discharge_load_wh > 0 or plan.discharge_grid_wh > 0
            if want_charge and want_discharge:
                if hh.surplus_wh > 0:
                    want_discharge = False                # storing/exporting PV surplus takes priority
                elif plan.charge_grid_wh > (plan.discharge_load_wh + plan.discharge_grid_wh):
                    want_discharge = False                # stronger grid-charge intent wins
                else:
                    want_charge = False
            charging_regime = want_charge
            discharging_regime = want_discharge and not want_charge
        allow_grid_charge = scenario.battery.allow_grid_charge
        allow_batt_export = scenario.battery.allow_battery_export
        if charging_regime:
            amt = min(max(0.0, plan.charge_pv_wh), hh.surplus_wh, bat.max_charge_ac_wh(sec))
            cl += bat.do_charge(amt); s2b = amt
            grid_req = plan.charge_grid_wh if allow_grid_charge else 0.0   # RT-1: honour allow_grid_charge
            amt = min(max(0.0, grid_req), bat.max_charge_ac_wh(sec))
            cl += bat.do_charge(amt); g2b = amt
        elif discharging_regime:
            amt = min(max(0.0, plan.discharge_load_wh), hh.residual_load_wh, bat.max_discharge_delivered_wh(sec))
            dl += bat.do_discharge(amt); b2l = amt
            grid_req = plan.discharge_grid_wh if allow_batt_export else 0.0  # RT-1: honour allow_battery_export
            amt = min(max(0.0, grid_req), bat.max_discharge_delivered_wh(sec, respect_reserve=False))
            dl += bat.do_discharge(amt); b2g = amt

        grid_import = (hh.residual_load_wh - b2l) + g2b
        grid_export = (hh.surplus_wh - s2b) + b2g
        b_in, b_out = s2b + g2b, b2l + b2g
        # AC energy balance (losses are SoC-internal, checked via SoC below)
        bal = (iv.pv_wh + grid_import + b_out) - (load + grid_export + b_in)
        if abs(bal) > 1e-3:
            raise EnergyBalanceError(f"interval {i}: AC balance error {bal:.6f} Wh")
        max_bal = max(max_bal, abs(bal))
        # SoC consistency: Δsoc == stored_in - from_cell_out
        stored_in = b_in * bat.charge_eff
        from_cell = (b_out / bat.discharge_eff) if bat.discharge_eff else 0.0
        if abs((bat.soc_wh - soc_before) - (stored_in - from_cell)) > 1e-3:
            raise EnergyBalanceError(f"interval {i}: SoC inconsistency")

        flows = {"solar_to_batt_wh": s2b, "grid_to_batt_wh": g2b, "batt_to_load_wh": b2l, "batt_to_grid_wh": b2g}
        comp = settle_interval(mode, scenario.tariff, flows, imp_p, exp_p)
        comp["degradation_cost"] = money(-wh_to_kwh(b_out) * degr)
        ledger.add(comp, {**flows, "charge_loss_wh": cl, "discharge_loss_wh": dl, "throughput_out_wh": b_out})
        grid_imp += grid_import; grid_exp += grid_export; charged += b_in; discharged += b_out
        closs += cl; dloss += dl
        if interval_sink is not None:
            interval_sink.append({
                "i": i, "start": iv.interval.start.isoformat(), "seconds": sec,
                "load_wh": iv.load_wh, "standby_wh": standby_wh, "pv_wh": iv.pv_wh,
                "direct_pv_wh": hh.direct_pv_wh, "residual_load_wh": hh.residual_load_wh, "surplus_wh": hh.surplus_wh,
                "import_price": imp_p, "export_price": exp_p,
                "solar_to_batt_wh": s2b, "grid_to_batt_wh": g2b,
                "batt_to_load_wh": b2l, "batt_to_grid_wh": b2g,
                "charge_loss_wh": cl, "discharge_loss_wh": dl,
                "grid_import_wh": grid_import, "grid_export_wh": grid_export,
                "soc_before_wh": soc_before, "soc_after_wh": bat.soc_wh,
                "balance_error_wh": bal, "value_eur": float(sum(comp.values())),
                "rejected": list(getattr(plan, "rejected", ())),
                "components": {k: float(v) for k, v in comp.items()}})

    prov = Provenance(engine_id=ENGINE_ID, engine_version=VERSION, experiment=experiment,
                      scenario_name=scenario.name, dispatch_mode=scenario.dispatch_mode.value,
                      settlement_mode=mode.value, foresight=scenario.foresight.value,
                      timezone=str(TZ), interval_seconds=(inputs[0].interval.seconds if inputs else 0),
                      config_sha256=config_hash(scenario),
                      input_date_range=[inputs[0].interval.start.isoformat(), inputs[-1].interval.end.isoformat()] if inputs else [],
                      warnings=warns, validation_status="pending")

    total = ledger.total()
    comp_out = {k: float(round(v, 4)) for k, v in ledger.components.items()}
    summ = RunSummary(
        scenario_name=scenario.name, dispatch_mode=scenario.dispatch_mode.value,
        settlement_mode=mode.value, foresight=scenario.foresight.value, n_intervals=len(inputs),
        total_battery_value_eur=float(round(total, 2)), components_eur=comp_out,
        physical_kwh={k: round(wh_to_kwh(v), 3) for k, v in ledger.physical.items()},
        grid_import_kwh=round(wh_to_kwh(grid_imp), 2), grid_export_kwh=round(wh_to_kwh(grid_exp), 2),
        direct_self_consumption_kwh=round(wh_to_kwh(direct), 2),
        charged_kwh=round(wh_to_kwh(charged), 2), discharged_kwh=round(wh_to_kwh(discharged), 2),
        losses_kwh=round(wh_to_kwh(closs + dloss), 3),
        equivalent_full_cycles=round(bat.equivalent_full_cycles, 2),
        final_soc_frac=round(bat.soc_wh / bat.usable_wh, 4) if bat.usable_wh else 0.0,
        max_balance_error_wh=round(max_bal, 9), warnings=warns, provenance=asdict(prov),
        validation_status="ok")
    # decomposition invariant
    if abs(float(total) - sum(comp_out.values())) > 0.05:
        summ.validation_status = "DECOMPOSITION_MISMATCH"
    dp = getattr(strat, "dispatch_plan", None)
    if dp is not None:
        summ.dispatch_plan = dp.summary
    return summ


def annual_from_day(day_summary_value: float, days: int = 365) -> float:
    return round(day_summary_value * days, 2)


def run_matrix25(base: ScenarioConfig, day_inputs_for, consumptions, pv_ratios, days: int = 365) -> dict:
    """day_inputs_for(consumption_kwh, pv_ratio) -> list[IntervalInput] for one representative day.
    Returns cells (annual EUR via day*days), plus unweighted stats. (Synthetic-day x days approximation.)"""
    cells, detail = [], []
    for c in consumptions:
        row = []
        for r in pv_ratios:
            s = simulate(base, day_inputs_for(c, r), experiment="matrix25")
            annual = annual_from_day(s.total_battery_value_eur, days)
            row.append(round(annual, 0))
            detail.append({"consumption_kwh": c, "pv_ratio": r, "annual_eur": round(annual, 0),
                           "components_day_eur": s.components_eur, "cycles_day": s.equivalent_full_cycles})
        cells.append(row)
    flat = [v for row in cells for v in row]
    q = statistics.quantiles(flat, n=4) if len(flat) >= 4 else [None, None, None]
    stats = {"n": len(flat), "min": min(flat), "max": max(flat),
             "mean": round(statistics.mean(flat), 2), "median": statistics.median(flat),
             "q1": q[0], "q3": q[2], "weighted_average": None,
             "note": "unweighted; no weighted statistic (weights unknown); synthetic-day x %d approximation" % days}
    return {"cells": cells, "consumptions_kwh": consumptions, "pv_ratios": pv_ratios,
            "statistics": stats, "detail": detail}


def export_summary(summary: RunSummary, json_path: str, csv_path: str | None = None):
    json.dump(asdict(summary), open(json_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2, default=str)
    if csv_path:
        with open(csv_path, "w", encoding="utf-8", newline="") as f:
            w = _csv.writer(f)
            w.writerow(["field", "value"])
            for k, v in asdict(summary).items():
                if not isinstance(v, (dict, list)):
                    w.writerow([k, v])
            for k, v in summary.components_eur.items():
                w.writerow(["component:" + k, v])
