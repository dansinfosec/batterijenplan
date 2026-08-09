# -*- coding: utf-8 -*-
"""bp-dispatch-v1 deterministic SYNTHETIC YEAR (red-team task 8).

Replaces "one summer day x 365". Exercises seasonality: 12 monthly PV factors, seasonal + weekday/
weekend load, month-dependent daylight window, several price regimes, and negative-price midday
periods on high-PV spring/summer days. Illustrative only — NOT real EPEX/PVGIS/CBS data.

SoC carries continuously across the whole year (one interval list), which is the whole point:
seasonal winter deficits and summer surpluses interact through a single battery.
"""
from __future__ import annotations
import math
from datetime import date, timedelta
from .core import IntervalInput, build_day, kwh_to_wh

# Relative monthly PV yield (NL-like), sums to 1.0 across the year.
_PV_MONTH = [0.030, 0.050, 0.082, 0.112, 0.130, 0.128, 0.128, 0.110, 0.090, 0.060, 0.032, 0.048]
_PV_MONTH = [v / sum(_PV_MONTH) for v in _PV_MONTH]
# Relative monthly load weight (higher in winter). Normalised to mean 1.0 per day later.
_LOAD_MONTH = [1.20, 1.15, 1.05, 0.95, 0.85, 0.80, 0.80, 0.82, 0.90, 1.00, 1.10, 1.20]
# Month-dependent daylight window (sunrise, sunset) local hours.
_DAYLIGHT = [(8.3, 16.6), (7.8, 17.4), (7.0, 18.4), (6.7, 20.4), (5.8, 21.2), (5.3, 21.8),
             (5.6, 21.7), (6.3, 20.7), (7.1, 19.4), (7.9, 18.2), (7.9, 16.7), (8.5, 16.3)]


def _pv_shape(n: int, month: int) -> list[float]:
    sr, ss = _DAYLIGHT[month - 1]
    vals = []
    for k in range(n):
        h = (k + 0.5) * 24.0 / n
        x = math.sin(math.pi * (h - sr) / (ss - sr)) if sr <= h <= ss else 0.0
        vals.append(max(0.0, x))
    s = sum(vals) or 1.0
    return [v / s for v in vals]


def _load_shape(n: int) -> list[float]:
    vals = []
    for k in range(n):
        h = (k + 0.5) * 24.0 / n
        vals.append(0.4 + 1.0 * math.exp(-((h - 8) ** 2) / 2.0) + 1.6 * math.exp(-((h - 20) ** 2) / 3.0))
    s = sum(vals) or 1.0
    return [v / s for v in vals]


def _price_shape(n: int, month: int, allow_negative: bool) -> tuple[list[float], list[float]]:
    """Dynamic import & export price per interval (EUR/kWh). Winter costlier; evening peak;
    negative midday on high-PV months when allow_negative."""
    seasonal = 0.14 + 0.06 * math.cos(2 * math.pi * (month - 1) / 12.0)  # ~0.20 Jan, ~0.08 Jul base
    imp, exp = [], []
    for k in range(n):
        h = (k + 0.5) * 24.0 / n
        peak = 0.22 if 17 <= h <= 21 else (0.0 if h < 6 else 0.08)
        p = seasonal + peak
        if allow_negative and 11 <= h <= 15:
            p = -0.04 if month in (4, 5, 6, 7) else max(0.0, p - 0.10)
        imp.append(round(p, 5))
        exp.append(round(p, 5))   # dynamic export follows spot
    return imp, exp


def build_year(consumption_kwh_year: float, pv_ratio: float, year: int = 2025,
               dynamic: bool = False, fixed_import=0.30, fixed_export=0.075,
               interval_seconds: int = 900, negatives: bool = True) -> list[IntervalInput]:
    days = []
    d = date(year, 1, 1)
    while d.year == year:
        days.append(d)
        d = d + timedelta(days=1)
    # days-per-month for even distribution of monthly energy
    load_day_weight = []
    for dd in days:
        w = _LOAD_MONTH[dd.month - 1]
        if dd.weekday() >= 5:
            w *= 1.12                       # weekend uplift
        load_day_weight.append(w)
    load_norm = sum(load_day_weight) / len(load_day_weight)
    # per-month day counts for PV allocation
    month_days = [sum(1 for dd in days if dd.month == m) for m in range(1, 13)]

    out = []
    total_pv_year = pv_ratio * consumption_kwh_year
    for dd, lw in zip(days, load_day_weight):
        ivs = build_day(dd, interval_seconds)
        n = len(ivs)
        day_load_kwh = (consumption_kwh_year / len(days)) * (lw / load_norm)
        day_pv_kwh = total_pv_year * _PV_MONTH[dd.month - 1] / month_days[dd.month - 1]
        ls = _load_shape(n)
        ps = _pv_shape(n, dd.month)
        if dynamic:
            ip, ep = _price_shape(n, dd.month, negatives)
        for k, iv in enumerate(ivs):
            out.append(IntervalInput(
                interval=iv,
                load_wh=kwh_to_wh(day_load_kwh * ls[k]),
                pv_wh=kwh_to_wh(day_pv_kwh * ps[k]),
                import_price_eur_kwh=(ip[k] if dynamic else fixed_import),
                export_price_eur_kwh=(ep[k] if dynamic else fixed_export)))
    return out
