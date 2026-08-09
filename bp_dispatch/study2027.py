# -*- coding: utf-8 -*-
"""bp-dispatch-v1 · BP-2027 SELF-CONSUMPTION AND SETTLEMENT SCENARIO STUDY — core.

Computes, for a synthetic-year household + battery, the four separate values:
  1 PRE_2027_BATTERY_VALUE   = no-battery bill (annual netting)      - battery bill (annual netting)
  2 POST_2027_BATTERY_VALUE  = no-battery bill (no netting)          - battery bill (no netting)
  3 INCREMENTAL_2027_VALUE   = POST - PRE
  4 AVOIDED_FEED_IN_COST      = feed-in fee (no battery)             - feed-in fee (with battery)
Identical physical inputs / battery / initial conditions for pre & post; only the settlement changes.

Self-consumption study invariants (enforced): grid charging OFF, battery export OFF, energy balance = 0,
sum(value components) == POST value, POST value == no-battery bill - battery bill (economics, same rows).

Post-2027 value is split as energy-component (avoided import - lost export compensation - degradation,
feed-in cost EXCLUDED here) PLUS the feed-in-cost component from feed_in_cost.py — so any feed-in-cost
structure (per-kWh, tiered, fixed, hybrid) plugs in uniformly.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from . import year as yearmod
from . import economics as ec
from . import feed_in_cost as fic
from .core import (BatteryConfig, TariffConfig, ScenarioConfig, DispatchMode, SettlementMode,
                   config_hash)
from .engine import simulate

TOL = 0.02  # euro reconciliation tolerance


def self_consumption_battery(name, usable_kwh, power_kw, rt=0.90, degr=0.04, standby_w=10.0,
                             initial_soc_frac=0.0, usable_fraction=1.0) -> BatteryConfig:
    """Battery for the self-consumption study: NO grid charging, NO battery export. usable_fraction<1
    models a reserved-for-trading capacity (available usable = usable_kwh*usable_fraction)."""
    eff_usable = usable_kwh * usable_fraction
    return BatteryConfig(
        name=name, nominal_capacity_kwh=round(usable_kwh / 0.9, 2), usable_capacity_kwh=eff_usable,
        charge_power_kw=power_kw, discharge_power_kw=power_kw, round_trip_efficiency=rt,
        standby_w=standby_w, degradation_eur_per_kwh=degr, initial_soc_frac=initial_soc_frac,
        allow_grid_charge=False, allow_battery_export=False)


@dataclass
class PhysicalRun:
    inputs: list
    batt_rows: list
    no_batt_rows: list
    summary: object
    ledger: dict
    monthly_export_nb: list
    monthly_export_b: list
    config_sha: str


def run_physical(consumption_kwh, pv_ratio, battery: BatteryConfig, ip=0.30, fc=0.075,
                 dynamic=False) -> PhysicalRun:
    inputs = yearmod.build_year(consumption_kwh, pv_ratio, dynamic=dynamic, fixed_import=ip, fixed_export=fc)
    tariff = TariffConfig(settlement_mode=SettlementMode.POST_2027_FIXED, import_price_eur_kwh=ip,
                          feed_in_compensation_eur_kwh=fc, feed_in_cost_eur_kwh=0.0)
    scn = ScenarioConfig(name="sc", battery=battery, tariff=tariff, dispatch_mode=DispatchMode.SELF_CONSUMPTION)
    sink = []
    summ = simulate(scn, inputs, experiment="2027-study", interval_sink=sink)
    if summ.physical_kwh.get("grid_to_batt_wh", 0) != 0:
        raise AssertionError("grid charging occurred in self-consumption study")
    if summ.physical_kwh.get("batt_to_grid_wh", 0) != 0:
        raise AssertionError("battery export occurred in self-consumption study")
    if summ.max_balance_error_wh > 1e-3:
        raise AssertionError("energy balance not closed")

    # battery-case rows for the independent bill (grid_import already includes standby draw)
    batt_rows = [{
        "grid_import_wh": r["grid_import_wh"], "grid_export_wh": r["grid_export_wh"],
        "batt_to_load_wh": r["batt_to_load_wh"], "batt_to_grid_wh": r["batt_to_grid_wh"],
        "standby_wh": r["standby_wh"], "import_price": r["import_price"], "export_price": r["export_price"],
    } for r in sink]
    no_batt_rows = ec.no_battery_rows(inputs)  # battery-free house (no standby): honest headline baseline

    # monthly export (kWh) for MONTHLY_TIER structures
    monthly_nb = [0.0] * 12
    monthly_b = [0.0] * 12
    for iv, br in zip(inputs, sink):
        m = iv.interval.start.month - 1
        direct = min(iv.load_wh, iv.pv_wh)
        monthly_nb[m] += (iv.pv_wh - direct) / 1000.0
        monthly_b[m] += br["grid_export_wh"] / 1000.0

    # physical ledger (kWh)
    def s(k): return sum(r[k] for r in sink) / 1000.0
    load = sum(iv.load_wh for iv in inputs) / 1000.0
    pv = sum(iv.pv_wh for iv in inputs) / 1000.0
    export_nb = sum(r["grid_export_wh"] for r in no_batt_rows) / 1000.0
    import_nb = sum(r["grid_import_wh"] for r in no_batt_rows) / 1000.0
    sec = inputs[0].interval.seconds
    max_charge_wh = battery.charge_power_kw * 1000 * sec / 3600
    max_disch_wh = battery.discharge_power_kw * 1000 * sec / 3600
    peak_soc = max((r["soc_after_wh"] for r in sink), default=0.0) / 1000.0
    ledger = {
        "annual_load_kwh": round(load, 1), "annual_pv_kwh": round(pv, 1),
        "direct_pv_consumption_kwh": round(sum(min(iv.load_wh, iv.pv_wh) for iv in inputs) / 1000.0, 1),
        "pv_export_no_battery_kwh": round(export_nb, 1),
        "pv_export_battery_kwh": round(s("grid_export_wh"), 1),
        "grid_import_no_battery_kwh": round(import_nb, 1),
        "grid_import_battery_kwh": round(s("grid_import_wh"), 1),
        "pv_to_battery_kwh": round(s("solar_to_batt_wh"), 1),
        "grid_to_battery_kwh": round(s("grid_to_batt_wh"), 3),
        "battery_to_load_kwh": round(s("batt_to_load_wh"), 1),
        "battery_to_grid_kwh": round(s("batt_to_grid_wh"), 3),
        "charge_losses_kwh": round(s("charge_loss_wh"), 2),
        "discharge_losses_kwh": round(s("discharge_loss_wh"), 2),
        "standby_kwh": round(s("standby_wh"), 2),
        "throughput_kwh": round(s("batt_to_load_wh") + s("batt_to_grid_wh"), 1),
        "equivalent_full_cycles": summ.equivalent_full_cycles,
        "usable_capacity_kwh": battery.usable_capacity_kwh,
        "peak_soc_kwh": round(peak_soc, 2),
        "unused_capacity_kwh": round(battery.usable_capacity_kwh - peak_soc, 2),
        "charge_clipping_intervals": sum(1 for r in sink if (r["solar_to_batt_wh"] + r["grid_to_batt_wh"]) >= max_charge_wh - 1e-6),
        "discharge_clipping_intervals": sum(1 for r in sink if (r["batt_to_load_wh"] + r["batt_to_grid_wh"]) >= max_disch_wh - 1e-6),
    }
    return PhysicalRun(inputs, batt_rows, no_batt_rows, summ, ledger, monthly_nb, monthly_b, config_hash(scn))


def evaluate(phys: PhysicalRun, battery: BatteryConfig, ip=0.30, fc=0.075,
             feed_in_cfg: fic.FeedInCostConfig | None = None) -> dict:
    """Compute the 4 values + value ledger for one feed-in-cost structure on an already-run physical case."""
    degr = battery.degradation_eur_per_kwh
    feed_in_cfg = feed_in_cfg or fic.FeedInCostConfig(structure=fic.PER_KWH, per_kwh=0.0)
    tariff = TariffConfig(settlement_mode=SettlementMode.POST_2027_FIXED, import_price_eur_kwh=ip,
                          feed_in_compensation_eur_kwh=fc, feed_in_cost_eur_kwh=0.0)

    # PRE-2027: annual netting (no feed-in cost under saldering)
    pre = ec.battery_value_independent(SettlementMode.PRE_2027_NET_METERING, tariff,
                                       phys.no_batt_rows, phys.batt_rows, degr, ec.NETTING_ANNUAL)
    pre_value = pre["battery_value_eur"]

    # POST-2027 energy component: no netting, feed-in cost EXCLUDED (added via structure below)
    post_energy = ec.battery_value_independent(SettlementMode.POST_2027_FIXED, tariff,
                                               phys.no_batt_rows, phys.batt_rows, degr, ec.NETTING_ANNUAL)
    post_energy_value = post_energy["battery_value_eur"]

    # feed-in-cost component (any structure)
    exp_nb = phys.ledger["pv_export_no_battery_kwh"]
    exp_b = phys.ledger["pv_export_battery_kwh"]
    avoided = fic.avoided_feed_in_cost(feed_in_cfg, exp_nb, exp_b, phys.monthly_export_nb, phys.monthly_export_b)
    avoided_feed_in = avoided["avoided_fee_eur"]

    post_value = round(post_energy_value + avoided_feed_in, 4)
    incremental = round(post_value - pre_value, 4)

    # value ledger (POST) — sums EXACTLY to post_value by construction
    nb, bb = post_energy["no_battery_bill"], post_energy["battery_bill"]
    avoided_grid_import = round((nb.import_kwh - bb.import_kwh) * ip, 4)
    lost_export_comp = round((bb.export_kwh - nb.export_kwh) * fc, 4)
    degradation_cost = round(-bb.throughput_kwh * degr, 4)
    ledger = {
        "avoided_grid_import_eur": avoided_grid_import,
        "lost_export_compensation_eur": lost_export_comp,
        "feed_in_cost_avoided_eur": round(avoided_feed_in, 4),
        "degradation_cost_eur": degradation_cost,
    }
    ledger_sum = round(sum(ledger.values()), 4)
    # informational derived figures (NOT summed into total to avoid double counting)
    informational = {
        "conversion_loss_kwh": round(phys.ledger["charge_losses_kwh"] + phys.ledger["discharge_losses_kwh"], 2),
        "conversion_loss_cost_eur_at_import": round((phys.ledger["charge_losses_kwh"] + phys.ledger["discharge_losses_kwh"]) * ip, 2),
        "standby_kwh": phys.ledger["standby_kwh"],
        "standby_cost_eur_at_import": round(phys.ledger["standby_kwh"] * ip, 2),
        "net_self_consumption_value_eur": round(avoided_grid_import + lost_export_comp + ledger["feed_in_cost_avoided_eur"], 4),
    }
    return {
        "pre_2027_battery_value_eur": pre_value,
        "post_2027_battery_value_eur": post_value,
        "incremental_2027_battery_value_eur": incremental,
        "avoided_feed_in_cost_value_eur": round(avoided_feed_in, 4),
        "percentage_increase": round((incremental / pre_value * 100.0), 1) if abs(pre_value) > 1e-6 else None,
        "value_ledger_eur": ledger,
        "value_ledger_sum_eur": ledger_sum,
        "ledger_sum_equals_post": abs(ledger_sum - post_value) < TOL,
        "post_equals_bill_delta": abs(post_energy_value + avoided_feed_in - post_value) < 1e-9,
        "informational": informational,
        "feed_in_detail": avoided,
        "bills": {"pre_no_battery": pre["no_battery_bill"].total_bill, "pre_battery": pre["battery_bill"].total_bill,
                  "post_energy_no_battery": nb.total_bill, "post_energy_battery": bb.total_bill},
    }


def reserve_opportunity_cost(consumption_kwh, pv_ratio, usable_kwh, power_kw, ip=0.30, fc=0.075,
                             feed_in_cfg=None, reserves=(0.0, 0.1, 0.2, 0.3, 0.5),
                             rt=0.90, degr=0.04, standby_w=10.0) -> list:
    """Rerun self-consumption with a fraction of usable capacity reserved for trading; the lost
    self-consumption value vs the full battery is the OPPORTUNITY COST OF TRADING RESERVE."""
    out = []
    base_val = None
    for res in reserves:
        bat = self_consumption_battery(f"{usable_kwh}kWh/{power_kw}kW/res{int(res*100)}", usable_kwh, power_kw,
                                       rt=rt, degr=degr, standby_w=standby_w, usable_fraction=1.0 - res)
        phys = run_physical(consumption_kwh, pv_ratio, bat, ip=ip, fc=fc)
        ev = evaluate(phys, bat, ip=ip, fc=fc, feed_in_cfg=feed_in_cfg)
        val = ev["post_2027_battery_value_eur"]
        if res == 0.0:
            base_val = val
        out.append({
            "reserve_fraction": res,
            "available_usable_kwh": round(usable_kwh * (1.0 - res), 2),
            "self_consumption_value_eur": val,
            "lost_self_consumption_eur": round((base_val - val), 2) if base_val is not None else 0.0,
        })
    return out
