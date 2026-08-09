# -*- coding: utf-8 -*-
"""bp-dispatch-v1 RED-TEAM fixtures that force the behaviour under test to actually bind.

These exist because the original experiments C (efficiency) and B (power vs capacity) produced
identical numbers — the intended effect was masked. Each fixture here is engineered so the effect
is the *binding* constraint. Deterministic; no real data.
"""
from __future__ import annotations
from datetime import date
from .core import IntervalInput, build_day, kwh_to_wh

_DAY = date(2025, 6, 15)   # 96 intervals, no DST


def efficiency_cycle_day(surplus_kwh: float = 5.0, evening_load_kwh: float = 12.0,
                         import_price=0.30, export_price=0.075) -> list[IntervalInput]:
    """Force a full charge->discharge cycle where EFFICIENCY is the binding constraint.

    - Midday: a FIXED PV surplus (no load) that is fully absorbed for every efficiency level, so the
      AC charged is identical across efficiencies -> stored = surplus * charge_eff differs by eff.
    - Evening: a load far larger than any deliverable energy, so ALL stored energy is discharged to
      load (discharge is efficiency-bound, not load-bound). Battery must be big enough that capacity
      never binds and power never binds over the multi-interval windows.
    delivered = surplus * round_trip_efficiency ; strictly monotone in efficiency.
    """
    ivs = build_day(_DAY)
    n = len(ivs)
    out = []
    # midday charge window: intervals ~ 11:00-13:00 (indices 44..52), spread the surplus evenly
    charge_idx = list(range(44, 52))
    evening_idx = list(range(72, 84))   # 18:00-21:00
    for k, iv in enumerate(ivs):
        load = pv = 0.0
        if k in charge_idx:
            pv = kwh_to_wh(surplus_kwh / len(charge_idx))
        if k in evening_idx:
            load = kwh_to_wh(evening_load_kwh / len(evening_idx))
        out.append(IntervalInput(interval=iv, load_wh=load, pv_wh=pv,
                                 import_price_eur_kwh=import_price, export_price_eur_kwh=export_price))
    return out


def _blank(ivs, imp=0.20, exp=0.20):
    return {k: IntervalInput(interval=iv, load_wh=0.0, pv_wh=0.0,
                             import_price_eur_kwh=imp, export_price_eur_kwh=exp) for k, iv in enumerate(ivs)}


def power_spike_day(low=0.02, high=0.60) -> list[IntervalInput]:
    """Scenario A: a SHORT cheap window and a SHORT expensive window (one interval each far apart).
    High-power wins: in 15 min a 10 kW battery moves 2.5 kWh vs 6 kW moves 1.5 kWh; capacity irrelevant."""
    ivs = build_day(_DAY)
    d = _blank(ivs)
    ci, di = 12, 76   # 03:00 cheap spike, 19:00 expensive spike (single intervals)
    for k in (ci,):
        d[k] = IntervalInput(interval=ivs[k], load_wh=0.0, pv_wh=0.0, import_price_eur_kwh=low, export_price_eur_kwh=low)
    for k in (di,):
        d[k] = IntervalInput(interval=ivs[k], load_wh=0.0, pv_wh=0.0, import_price_eur_kwh=high, export_price_eur_kwh=high)
    return [d[k] for k in range(len(ivs))]


def short_pv_cycle_day(surplus_kwh=8.0, load_kwh=8.0, import_price=0.30, export_price=0.075,
                       charge_intervals=2, discharge_intervals=2) -> list[IntervalInput]:
    """Clean POWER test via SELF_CONSUMPTION (no arbitrage heuristic): a SHORT PV surplus window and a
    SHORT large-load window. Higher charge/discharge power captures more of the brief windows; capacity
    is not binding. Avoids the day-ahead quantile pathology (RT-3)."""
    ivs = build_day(_DAY)
    out = []
    ci = list(range(46, 46 + charge_intervals))     # ~11:30, short midday burst
    di = list(range(76, 76 + discharge_intervals))  # ~19:00, short evening burst
    for k, iv in enumerate(ivs):
        load = pv = 0.0
        if k in ci:
            pv = kwh_to_wh(surplus_kwh / len(ci))
        if k in di:
            load = kwh_to_wh(load_kwh / len(di))
        out.append(IntervalInput(interval=iv, load_wh=load, pv_wh=pv,
                                 import_price_eur_kwh=import_price, export_price_eur_kwh=export_price))
    return out


def broad_spread_day(low=0.05, high=0.40) -> list[IntervalInput]:
    """Scenario B: many cheap hours (night) then many expensive hours (evening). Large CAPACITY wins;
    power is not binding because the windows are long."""
    ivs = build_day(_DAY)
    out = []
    for k, iv in enumerate(ivs):
        h = (k + 0.5) * 24.0 / len(ivs)
        p = low if 0 <= h < 6 else (high if 16 <= h <= 23 else 0.20)
        out.append(IntervalInput(interval=iv, load_wh=0.0, pv_wh=0.0, import_price_eur_kwh=p, export_price_eur_kwh=p))
    return out


def limited_surplus_day(surplus_kwh=3.0, import_price=0.30, export_price=0.075) -> list[IntervalInput]:
    """Scenario C: both systems get the SAME small PV surplus and the same evening load. Neither should
    gain from unused nominal capacity — value must be equal (no phantom value from bigger capacity)."""
    ivs = build_day(_DAY)
    out = []
    charge_idx = list(range(46, 50))
    evening_idx = list(range(74, 82))
    for k, iv in enumerate(ivs):
        load = pv = 0.0
        if k in charge_idx:
            pv = kwh_to_wh(surplus_kwh / len(charge_idx))
        if k in evening_idx:
            load = kwh_to_wh(6.0 / len(evening_idx))
        out.append(IntervalInput(interval=iv, load_wh=load, pv_wh=pv,
                                 import_price_eur_kwh=import_price, export_price_eur_kwh=export_price))
    return out
