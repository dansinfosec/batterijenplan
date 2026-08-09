# -*- coding: utf-8 -*-
"""bp-dispatch-v1 synthetic fixtures (deterministic). No real market data. For tests & experiments."""
from __future__ import annotations
import math
from datetime import date
from .core import Interval, IntervalInput, build_day, kwh_to_wh

_DAY = date(2025, 6, 15)   # normal 96-interval summer day (no DST transition)


def _pv_shape(n: int) -> list[float]:
    """Non-negative bell over daylight; normalised to sum 1.0."""
    vals = []
    for k in range(n):
        hour = (k + 0.5) * 24.0 / n
        x = math.sin(math.pi * (hour - 6) / 14) if 6 <= hour <= 20 else 0.0
        vals.append(max(0.0, x))
    s = sum(vals) or 1.0
    return [v / s for v in vals]

def _load_shape(n: int) -> list[float]:
    """Two peaks (morning ~7-9, evening ~18-22) + base; normalised to sum 1.0."""
    vals = []
    for k in range(n):
        hour = (k + 0.5) * 24.0 / n
        base = 0.4
        morn = 1.0 * math.exp(-((hour - 8) ** 2) / 2.0)
        eve = 1.6 * math.exp(-((hour - 20) ** 2) / 3.0)
        vals.append(base + morn + eve)
    s = sum(vals) or 1.0
    return [v / s for v in vals]


def solar_day(consumption_kwh_year: float, pv_ratio: float,
              import_price=0.30, export_price=0.075, interval_seconds=900) -> list[IntervalInput]:
    ivs = build_day(_DAY, interval_seconds)
    n = len(ivs)
    day_load = consumption_kwh_year / 365.0
    day_pv = pv_ratio * consumption_kwh_year / 365.0
    ls, ps = _load_shape(n), _pv_shape(n)
    out = []
    for k, iv in enumerate(ivs):
        out.append(IntervalInput(interval=iv, load_wh=kwh_to_wh(day_load * ls[k]),
                                 pv_wh=kwh_to_wh(day_pv * ps[k]),
                                 import_price_eur_kwh=import_price, export_price_eur_kwh=export_price))
    return out


def flat_day(load_kwh_day: float, import_price=0.30, export_price=0.075, interval_seconds=900) -> list[IntervalInput]:
    ivs = build_day(_DAY, interval_seconds); n = len(ivs)
    per = kwh_to_wh(load_kwh_day) / n
    return [IntervalInput(interval=iv, load_wh=per, pv_wh=0.0,
                          import_price_eur_kwh=import_price, export_price_eur_kwh=export_price) for iv in ivs]


def price_spread_day(load_kwh_day: float, pv_kwh_day: float, low=0.05, high=0.45, export_follows=True,
                     interval_seconds=900) -> list[IntervalInput]:
    """Cheap at night, expensive in the evening — for arbitrage tests. Dynamic prices."""
    ivs = build_day(_DAY, interval_seconds); n = len(ivs)
    ls, ps = _load_shape(n), _pv_shape(n)
    out = []
    for k, iv in enumerate(ivs):
        hour = (k + 0.5) * 24.0 / n
        price = low if (hour < 6) else (high if 17 <= hour <= 21 else 0.20)
        exp = price if export_follows else 0.075
        out.append(IntervalInput(interval=iv, load_wh=kwh_to_wh(load_kwh_day * ls[k]),
                                 pv_wh=kwh_to_wh(pv_kwh_day * ps[k]),
                                 import_price_eur_kwh=price, export_price_eur_kwh=exp))
    return out


def negative_price_day(load_kwh_day: float, pv_kwh_day: float, interval_seconds=900) -> list[IntervalInput]:
    ivs = build_day(_DAY, interval_seconds); n = len(ivs)
    ls, ps = _load_shape(n), _pv_shape(n)
    out = []
    for k, iv in enumerate(ivs):
        hour = (k + 0.5) * 24.0 / n
        price = -0.05 if 11 <= hour <= 14 else 0.25
        out.append(IntervalInput(interval=iv, load_wh=kwh_to_wh(load_kwh_day * ls[k]),
                                 pv_wh=kwh_to_wh(pv_kwh_day * ps[k]),
                                 import_price_eur_kwh=price, export_price_eur_kwh=max(price, -0.05)))
    return out
