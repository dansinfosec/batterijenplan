# -*- coding: utf-8 -*-
"""bp-dispatch-v1 settlement modules — separate from dispatch (decision D3).

Every mode maps the interval's *physical flows* to a value decomposition that sums exactly to the
interval battery value (delta vs a no-battery baseline). No total is computed first and split later.

Modes: PRE_2027_NET_METERING, POST_2027_FIXED, POST_2027_DYNAMIC, RAW_MARKET_RESEARCH.
"""
from __future__ import annotations
from decimal import Decimal
from .core import SettlementMode, TariffConfig, wh_to_kwh, money


def settle_interval(mode: SettlementMode, tariff: TariffConfig, flows_wh: dict,
                    import_price_eur_kwh: float, export_price_eur_kwh: float) -> dict:
    """Return {component: Decimal} for one interval. import/export prices are the effective
    per-kWh prices for this interval (caller resolves fixed vs dynamic)."""
    s2b = wh_to_kwh(flows_wh.get("solar_to_batt_wh", 0.0))
    g2b = wh_to_kwh(flows_wh.get("grid_to_batt_wh", 0.0))
    b2l = wh_to_kwh(flows_wh.get("batt_to_load_wh", 0.0))
    b2g = wh_to_kwh(flows_wh.get("batt_to_grid_wh", 0.0))
    throughput = b2l + b2g
    fic = tariff.feed_in_cost_eur_kwh
    cs = tariff.customer_share
    c = {k: Decimal("0") for k in
         ["avoided_grid_import", "feed_in_cost_avoided", "lost_feed_in_compensation",
          "lost_saldering_credit", "grid_charge_cost", "battery_to_grid_revenue",
          "day_ahead_value", "imbalance_value", "degradation_cost", "standby_cost", "supplier_fees"]}

    c["avoided_grid_import"] = money(b2l * import_price_eur_kwh)
    c["degradation_cost"] = money(-throughput * tariff.__dict__.get("degradation_eur_per_kwh", 0.0)) \
        if hasattr(tariff, "degradation_eur_per_kwh") else Decimal("0")

    if mode == SettlementMode.PRE_2027_NET_METERING:
        # saldering: fed-in kWh nets against import at full retail; storing forgoes that credit.
        c["lost_saldering_credit"] = money(-s2b * import_price_eur_kwh)
        c["feed_in_cost_avoided"] = money(s2b * fic)
        c["grid_charge_cost"] = money(-g2b * import_price_eur_kwh)
        c["battery_to_grid_revenue"] = money(cs * b2g * (import_price_eur_kwh - fic))
    elif mode == SettlementMode.POST_2027_FIXED:
        c["feed_in_cost_avoided"] = money(s2b * fic)
        c["lost_feed_in_compensation"] = money(-s2b * export_price_eur_kwh)
        c["grid_charge_cost"] = money(-g2b * import_price_eur_kwh)
        c["battery_to_grid_revenue"] = money(cs * b2g * (export_price_eur_kwh - fic))
    elif mode == SettlementMode.POST_2027_DYNAMIC:
        c["feed_in_cost_avoided"] = money(s2b * fic)
        c["lost_feed_in_compensation"] = money(-s2b * export_price_eur_kwh)
        c["grid_charge_cost"] = money(cs * -g2b * import_price_eur_kwh)
        c["battery_to_grid_revenue"] = money(cs * b2g * export_price_eur_kwh)
    elif mode == SettlementMode.RAW_MARKET_RESEARCH:
        # research upper bound: raw prices, no tax/feed-in cost
        c["lost_feed_in_compensation"] = money(-s2b * export_price_eur_kwh)
        c["grid_charge_cost"] = money(-g2b * import_price_eur_kwh)
        c["battery_to_grid_revenue"] = money(b2g * export_price_eur_kwh)
    else:
        raise ValueError(f"unknown settlement mode {mode}")
    return c


def resolve_prices(mode: SettlementMode, tariff: TariffConfig, iv_import: float, iv_export: float):
    """Return (import_price, export_price) effective for the interval."""
    if mode in (SettlementMode.POST_2027_DYNAMIC, SettlementMode.RAW_MARKET_RESEARCH):
        imp = iv_import + tariff.supplier_markup_eur_kwh
        exp = iv_export - tariff.supplier_export_deduction_eur_kwh
        return imp, exp
    # fixed / pre: tariff constants
    return tariff.import_price_eur_kwh, tariff.feed_in_compensation_eur_kwh
