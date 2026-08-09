# -*- coding: utf-8 -*-
"""Deterministic, manually-calculable fixtures for the volume-aware DAY-AHEAD planner (RT-3, task 9).

Pure day-ahead arbitrage: no imbalance market here (day-ahead and imbalance are separate markets).
Most fixtures use RAW_MARKET_RESEARCH settlement so value = b2g·exp − g2b·imp − throughput·degr, which is
hand-calculable. rt=0.81 (ce=de=0.9) makes the arithmetic round.
"""
from __future__ import annotations
from datetime import date, timedelta
from .core import IntervalInput, build_day, kwh_to_wh

_DAY = date(2025, 6, 15)   # 96 intervals
_DAY2 = date(2025, 6, 16)  # next day, for cross-midnight fixtures (0..95 = day1, 96..191 = day2)


def _two_day(prices, load_kwh_by_idx=None, pv_kwh_by_idx=None):
    ivs = build_day(_DAY) + build_day(_DAY2)
    load_kwh_by_idx = load_kwh_by_idx or {}
    pv_kwh_by_idx = pv_kwh_by_idx or {}
    out = []
    for k, iv in enumerate(ivs):
        p = prices(k) if callable(prices) else prices[k]
        out.append(IntervalInput(interval=iv, load_wh=kwh_to_wh(load_kwh_by_idx.get(k, 0.0)),
                                 pv_wh=kwh_to_wh(pv_kwh_by_idx.get(k, 0.0)),
                                 import_price_eur_kwh=p, export_price_eur_kwh=p))
    return out


def _day(prices, load_kwh_by_idx=None, pv_kwh_by_idx=None):
    ivs = build_day(_DAY)
    n = len(ivs)
    load_kwh_by_idx = load_kwh_by_idx or {}
    pv_kwh_by_idx = pv_kwh_by_idx or {}
    out = []
    for k, iv in enumerate(ivs):
        p = prices(k) if callable(prices) else prices[k]
        out.append(IntervalInput(interval=iv, load_wh=kwh_to_wh(load_kwh_by_idx.get(k, 0.0)),
                                 pv_wh=kwh_to_wh(pv_kwh_by_idx.get(k, 0.0)),
                                 import_price_eur_kwh=p, export_price_eur_kwh=p))
    return out


def _windowed(low_idx, low_p, high_idx, high_p, base=0.30):
    def pr(k):
        if k in low_idx:
            return low_p
        if k in high_idx:
            return high_p
        return base
    return pr


# A — one obvious profitable cycle
def one_profitable_cycle():
    prices = _windowed(range(8, 14), 0.10, range(72, 78), 0.50, base=0.30)
    return _day(prices)


# B — two competing discharge peaks; not enough energy for both -> pick the higher
def two_discharge_peaks():
    def pr(k):
        if k in range(8, 14): return 0.10          # charge valley
        if k in range(40, 44): return 0.40          # lower peak
        if k in range(72, 76): return 0.60          # higher peak
        return 0.30
    return _day(pr)


# C — two competing charge valleys; not enough capacity for both -> pick the cheaper
def two_charge_valleys():
    def pr(k):
        if k in range(8, 12): return 0.05           # cheaper valley
        if k in range(30, 34): return 0.12          # pricier valley
        if k in range(72, 80): return 0.55          # single discharge peak
        return 0.30
    return _day(pr)


# D — no profitable spread -> hold
def no_profitable_spread():
    return _day(lambda k: 0.20)


# E — negative charging price
def negative_charge_price():
    def pr(k):
        if k in range(8, 14): return -0.05          # paid to charge
        if k in range(72, 78): return 0.45
        return 0.30
    return _day(pr)


# F — terminal-SoC trap: a tempting high price only at the very last interval
def terminal_soc_trap():
    def pr(k):
        return 0.60 if k >= 94 else 0.20            # spike at end only
    return _day(pr)


# G — degradation changes the decision (small spread)
def degradation_marginal():
    prices = _windowed(range(8, 14), 0.20, range(72, 78), 0.28, base=0.24)
    return _day(prices)


# H — power-limited short spike (single interval each)
def power_limited_spike():
    def pr(k):
        if k == 10: return 0.05
        if k == 76: return 0.70
        return 0.30
    return _day(pr)


# I — capacity-limited broad spread (long windows)
def capacity_limited_broad():
    def pr(k):
        if k in range(0, 24): return 0.06           # 6h cheap
        if k in range(64, 92): return 0.45          # 7h expensive
        return 0.25
    return _day(pr)


# ---- cross-midnight (2-day) fixtures for the horizon-boundary audit ----

def cross_midnight_price():
    """A. Cheap 23:00-00:00 (day1) then high 06:00-07:00 (day2). Day2 has no cheap charging window, so
    the only profitable cycle carries SoC across midnight. Calendar-day EQUAL_INITIAL blocks it."""
    def pr(k):
        if 92 <= k <= 95: return 0.05     # 23:00-00:00 day1
        if 120 <= k <= 123: return 0.60   # 06:00-07:00 day2
        return 0.40
    return _two_day(pr)


def cross_midnight_pv_load():
    """B. High PV late afternoon day1; high household load next morning. Carrying stored PV across
    midnight serves the morning load (self-consumption). Flat price 0.30, POST_2027_FIXED settlement."""
    pv = {k: 8.0 / 9 for k in range(64, 73)}            # ~16:00-18:00 day1, 8 kWh PV
    load = {96 + k: 6.0 / 9 for k in range(28, 37)}     # ~07:00-09:00 day2, 6 kWh load
    return _two_day(lambda k: 0.30, load, pv)


def cross_midnight_two_day_sequence():
    """C. Two-day price path where the optimal schedule must carry SoC across BOTH midnights would apply;
    here a single cheap night-1 valley and a bigger day-2 evening peak require crossing midnight."""
    def pr(k):
        if 8 <= k <= 12: return 0.06                    # day1 early morning cheap
        if 160 <= k <= 168: return 0.58                 # day2 evening peak (~16:00-18:00)
        if 40 <= k <= 44: return 0.30                   # day1 midday (mild)
        return 0.34
    return _two_day(pr)


def final_vs_intermediate_terminal():
    """D. Same as A but used to contrast the final-day terminal rule vs intermediate continuation."""
    return cross_midnight_price()
