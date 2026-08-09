# -*- coding: utf-8 -*-
"""bp-dispatch-v1 RED-TEAM economics: an INDEPENDENT household-bill calculator.

This module deliberately does NOT reuse settlements.settle_interval (which computes a value *delta*
directly). Instead it builds the full household energy bill for the battery case and the no-battery
case separately, then defines battery_value = no_battery_bill - battery_bill. If the engine is
correct, that independent delta must equal engine.simulate(...).total_battery_value_eur.

It also implements pre-2027 saldering as BOTH:
  - NETTING_INTERVAL : every exported kWh credited at retail with no annual cap (what the engine approximates)
  - NETTING_ANNUAL   : export nets against import only up to the annual import volume (the real mechanism)

Money in float EUR here (reconciliation reporting); the engine keeps Decimal internally.
"""
from __future__ import annotations
from dataclasses import dataclass
from .core import SettlementMode, TariffConfig, IntervalInput

NETTING_INTERVAL = "interval_netting_approximation"
NETTING_ANNUAL = "annual_netting_settlement"


@dataclass
class Bill:
    label: str
    import_kwh: float
    export_kwh: float
    throughput_kwh: float
    import_cost: float
    export_revenue: float          # money received for exported energy (>=0)
    feed_in_cost: float            # post-2027 per-exported-kWh charge (>=0, a cost)
    saldering_credit: float        # pre-2027 value of netted export at retail (>=0)
    degradation_cost: float        # >=0
    standby_cost: float            # >=0 (grid energy consumed by standby, battery case only)
    total_bill: float              # net money out of the household (higher = worse)


def no_battery_rows(inputs: list[IntervalInput]) -> list[dict]:
    """Physical flows with NO battery and NO standby (a battery-free house)."""
    rows = []
    for iv in inputs:
        direct = min(iv.load_wh, iv.pv_wh)
        rows.append({
            "grid_import_wh": iv.load_wh - direct,
            "grid_export_wh": iv.pv_wh - direct,
            "batt_to_load_wh": 0.0, "batt_to_grid_wh": 0.0,
            "standby_wh": 0.0,
            "import_price": iv.import_price_eur_kwh, "export_price": iv.export_price_eur_kwh})
    return rows


def no_battery_rows_with_standby(inputs: list[IntervalInput], standby_w: float) -> list[dict]:
    """No-battery baseline that DOES carry the standby load (apples-to-apples with the engine's
    implicit baseline, which folds standby into load). Isolates standby as a definitional choice."""
    rows = []
    for iv in inputs:
        load = iv.load_wh + standby_w * iv.interval.hours
        direct = min(load, iv.pv_wh)
        rows.append({
            "grid_import_wh": load - direct, "grid_export_wh": iv.pv_wh - direct,
            "batt_to_load_wh": 0.0, "batt_to_grid_wh": 0.0, "standby_wh": standby_w * iv.interval.hours,
            "import_price": iv.import_price_eur_kwh, "export_price": iv.export_price_eur_kwh})
    return rows


def _agg(rows: list[dict]) -> tuple[float, float, float, float]:
    imp = sum(r["grid_import_wh"] for r in rows) / 1000.0
    exp = sum(r["grid_export_wh"] for r in rows) / 1000.0
    thr = sum((r.get("batt_to_load_wh", 0.0) + r.get("batt_to_grid_wh", 0.0)) for r in rows) / 1000.0
    standby = sum(r.get("standby_wh", 0.0) for r in rows) / 1000.0
    return imp, exp, thr, standby


def compute_bill(mode: SettlementMode, tariff: TariffConfig, rows: list[dict],
                 degr_eur_per_kwh: float, netting: str = NETTING_ANNUAL, label: str = "") -> Bill:
    imp, exp, thr, standby = _agg(rows)
    ip = tariff.import_price_eur_kwh
    fc = tariff.feed_in_compensation_eur_kwh
    fcost = tariff.feed_in_cost_eur_kwh
    degr = thr * degr_eur_per_kwh
    # standby energy that came from the grid is already inside grid_import; report its notional cost for transparency
    standby_cost = standby * ip

    import_cost = export_revenue = feed_in_cost = saldering_credit = 0.0

    if mode == SettlementMode.POST_2027_FIXED:
        import_cost = imp * ip
        export_revenue = exp * fc
        feed_in_cost = exp * fcost
        total = import_cost - export_revenue + feed_in_cost + degr

    elif mode == SettlementMode.POST_2027_DYNAMIC:
        # per-interval dynamic prices (markup/deduction applied at adapter already in rows' prices)
        import_cost = sum(r["grid_import_wh"] / 1000.0 * r["import_price"] for r in rows)
        export_revenue = sum(r["grid_export_wh"] / 1000.0 * r["export_price"] for r in rows)
        total = import_cost - export_revenue + degr

    elif mode == SettlementMode.PRE_2027_NET_METERING:
        if netting == NETTING_ANNUAL:
            saldered = min(imp, exp)                      # netting capped at annual import
            residual_import = imp - saldered
            residual_export = exp - saldered
            import_cost = residual_import * ip
            saldering_credit = saldered * ip              # netted export offsets import at full retail
            export_revenue = residual_export * fc         # surplus beyond netting paid feed-in comp
            total = import_cost - export_revenue + degr    # saldered nets to zero (credit == avoided import)
        else:  # NETTING_INTERVAL: every exported kWh credited at retail, no annual cap
            import_cost = imp * ip
            saldering_credit = exp * ip                   # unlimited netting at retail
            total = import_cost - saldering_credit + degr

    elif mode == SettlementMode.RAW_MARKET_RESEARCH:
        import_cost = sum(r["grid_import_wh"] / 1000.0 * r["import_price"] for r in rows)
        export_revenue = sum(r["grid_export_wh"] / 1000.0 * r["export_price"] for r in rows)
        total = import_cost - export_revenue + degr
    else:
        raise ValueError(mode)

    return Bill(label=label, import_kwh=round(imp, 4), export_kwh=round(exp, 4),
                throughput_kwh=round(thr, 4), import_cost=round(import_cost, 4),
                export_revenue=round(export_revenue, 4), feed_in_cost=round(feed_in_cost, 4),
                saldering_credit=round(saldering_credit, 4), degradation_cost=round(degr, 4),
                standby_cost=round(standby_cost, 4), total_bill=round(total, 4))


def battery_value_independent(mode, tariff, no_batt_rows, batt_rows, degr, netting=NETTING_ANNUAL) -> dict:
    nb = compute_bill(mode, tariff, no_batt_rows, 0.0, netting, "no_battery")
    bb = compute_bill(mode, tariff, batt_rows, degr, netting, "battery")
    value = nb.total_bill - bb.total_bill
    return {"netting": netting, "no_battery_bill": nb, "battery_bill": bb,
            "battery_value_eur": round(value, 4)}
