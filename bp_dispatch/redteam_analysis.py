# -*- coding: utf-8 -*-
"""bp-dispatch-v1 RED-TEAM analysis overlays (non-invasive).

Provides:
  - run_with_intervals: run the engine and also collect per-interval detail via the sink.
  - candidate_action_table: for each interval, the candidate actions with feasible energy, expected
    net value, whether selected, and rejection reason (task 6).
  - power_capacity_report: charged/discharged/unused/clipped/value/cycles per system (task 5).
  - counterfactual_attribution: value with a capability removed, vs base (task 7).
These read the engine's outputs; they do not reimplement dispatch.
"""
from __future__ import annotations
import copy
from dataclasses import replace
from .core import ScenarioConfig, IntervalInput, SettlementMode, DispatchMode
from .engine import simulate


def run_with_intervals(scenario: ScenarioConfig, inputs: list[IntervalInput]):
    sink: list = []
    summ = simulate(scenario, inputs, experiment="redteam", interval_sink=sink)
    return summ, sink


ACTIONS = ["charge_pv", "charge_grid", "discharge_load", "discharge_grid", "hold"]


def candidate_action_table(scenario: ScenarioConfig, inputs: list[IntervalInput], only_active=True):
    """Per-interval candidate actions with expected net value and selected/rejected reason.

    Net value convention (EUR, per interval), relative to doing nothing:
      charge_pv       : feed_in_cost avoided (+) minus forgone export (-)   [self-consumption leg]
      discharge_load  : import price avoided minus degradation
      charge_grid     : (later sell*disch_eff - buy/charge_eff - degr) proxy -> arbitrage net if executed
      discharge_grid  : export*disch_eff - degradation
      hold            : 0
    Feasible energy is the actually-executed energy for selected legs and the residual budget proxy
    for rejected legs (reported qualitatively). Rejection reasons come from the strategy's own ledger.
    """
    _, rows = run_with_intervals(scenario, inputs)
    degr = scenario.battery.degradation_eur_per_kwh
    fcost = scenario.tariff.feed_in_cost_eur_kwh
    disch_eff = scenario.battery.round_trip_efficiency ** 0.5
    charge_eff = disch_eff
    table = []
    for r in rows:
        ip, ep = r["import_price"], r["export_price"]
        s2b = r["solar_to_batt_wh"] / 1000.0
        g2b = r["grid_to_batt_wh"] / 1000.0
        b2l = r["batt_to_load_wh"] / 1000.0
        b2g = r["batt_to_grid_wh"] / 1000.0
        rej = r.get("rejected", [])
        cands = []
        # charge_pv
        cands.append({"action": "charge_pv", "energy_kwh": round(s2b, 4),
                      "net_eur": round(s2b * fcost - s2b * ep, 5),
                      "selected": s2b > 1e-9, "reason": "" if s2b > 1e-9 else "no PV surplus / no headroom"})
        # discharge_load
        cands.append({"action": "discharge_load", "energy_kwh": round(b2l, 4),
                      "net_eur": round(b2l * ip - b2l * degr, 5),
                      "selected": b2l > 1e-9,
                      "reason": "" if b2l > 1e-9 else ("import<degradation" if ip <= degr else "no residual load / empty")})
        # charge_grid
        cands.append({"action": "charge_grid", "energy_kwh": round(g2b, 4),
                      "net_eur": round(-g2b * ip, 5),   # cost now; sell value realised later
                      "selected": g2b > 1e-9,
                      "reason": "" if g2b > 1e-9 else next((x for x in rej if x.startswith("charge_grid")), "not cheap enough / no headroom")})
        # discharge_grid
        cands.append({"action": "discharge_grid", "energy_kwh": round(b2g, 4),
                      "net_eur": round(b2g * ep * disch_eff - b2g * degr, 5),
                      "selected": b2g > 1e-9,
                      "reason": "" if b2g > 1e-9 else next((x for x in rej if x.startswith("discharge_grid")), "not expensive enough / no budget / export off")})
        # hold
        acted = (s2b + g2b + b2l + b2g) > 1e-9
        cands.append({"action": "hold", "energy_kwh": 0.0, "net_eur": 0.0,
                      "selected": not acted, "reason": "" if not acted else "action taken"})
        if only_active and not acted:
            continue
        table.append({"i": r["i"], "start": r["start"], "import_price": ip, "export_price": ep,
                      "soc_before_kwh": round(r["soc_before_wh"] / 1000, 3),
                      "soc_after_kwh": round(r["soc_after_wh"] / 1000, 3),
                      "candidates": cands})
    return table


def power_capacity_report(name: str, scenario: ScenarioConfig, inputs: list[IntervalInput]) -> dict:
    summ, rows = run_with_intervals(scenario, inputs)
    usable = scenario.battery.usable_capacity_kwh
    peak_soc = max((r["soc_after_wh"] for r in rows), default=0.0) / 1000.0
    charged = sum(r["solar_to_batt_wh"] + r["grid_to_batt_wh"] for r in rows) / 1000.0
    discharged = sum(r["batt_to_load_wh"] + r["batt_to_grid_wh"] for r in rows) / 1000.0
    # clipped charge opportunity: intervals where more energy was cheap/available but power capped charging
    sec = inputs[0].interval.seconds if inputs else 900
    max_charge_ac = scenario.battery.charge_power_kw * (sec / 3600.0)
    max_disch = scenario.battery.discharge_power_kw * (sec / 3600.0)
    clip_charge = sum(1 for r in rows if (r["solar_to_batt_wh"] + r["grid_to_batt_wh"]) / 1000.0 >= max_charge_ac - 1e-6)
    clip_disch = sum(1 for r in rows if (r["batt_to_load_wh"] + r["batt_to_grid_wh"]) / 1000.0 >= max_disch - 1e-6)
    return {"system": name, "usable_kwh": usable,
            "charge_power_kw": scenario.battery.charge_power_kw,
            "discharge_power_kw": scenario.battery.discharge_power_kw,
            "peak_soc_kwh": round(peak_soc, 3),
            "unused_capacity_kwh": round(usable - peak_soc, 3),
            "charged_kwh": round(charged, 3), "discharged_kwh": round(discharged, 3),
            "power_clipped_charge_intervals": clip_charge,
            "power_clipped_discharge_intervals": clip_disch,
            "cycles": summ.equivalent_full_cycles,
            "value_eur_day": summ.total_battery_value_eur}


def counterfactual_attribution(base: ScenarioConfig, inputs: list[IntervalInput]) -> dict:
    """Remove one capability at a time; report the value delta. This is a DIRECT-ACCOUNTING probe:
    the delta of removing a capability is its marginal contribution GIVEN the others (order-dependent),
    NOT an independent additive value."""
    base_val = simulate(base, inputs).total_battery_value_eur
    out = {"base_value_eur": base_val, "removals": {}}

    def val(scn):
        return simulate(scn, inputs).total_battery_value_eur

    # remove day-ahead capability -> pure self-consumption
    scn = replace(base, dispatch_mode=DispatchMode.SELF_CONSUMPTION)
    out["removals"]["remove_day_ahead"] = round(base_val - val(scn), 4)
    # remove export permission
    b = replace(base.battery, allow_battery_export=False)
    out["removals"]["remove_export"] = round(base_val - val(replace(base, battery=b)), 4)
    # remove grid charging
    b = replace(base.battery, allow_grid_charge=False)
    out["removals"]["remove_grid_charge"] = round(base_val - val(replace(base, battery=b)), 4)
    # remove degradation cost
    b = replace(base.battery, degradation_eur_per_kwh=0.0)
    out["removals"]["remove_degradation"] = round(base_val - val(replace(base, battery=b)), 4)
    # remove feed-in cost (post-2027 charge on export)
    t = replace(base.tariff, feed_in_cost_eur_kwh=0.0)
    out["removals"]["remove_feed_in_cost"] = round(base_val - val(replace(base, tariff=t)), 4)
    out["note"] = ("Deltas are order-dependent marginal contributions given the other capabilities, "
                   "not independent additive values; they will not sum to base_value.")
    return out
