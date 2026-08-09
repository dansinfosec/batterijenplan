# -*- coding: utf-8 -*-
"""bp-dispatch-v1 · 2027 study — IMBALANCE REVENUE DOWNSIDE SCENARIO OVERLAY.

CRITICAL: the engine has NO validated causal imbalance controller. Nothing here simulates the imbalance
market. This module only takes an EXPLICIT external reference gross value and derives a scenario net
value under downside assumptions. Every result MUST be labelled:

    SCENARIO OVERLAY — NOT PHYSICALLY SIMULATED IMBALANCE REVENUE

Formula:
    net = reference_gross × market_value_factor × customer_share
          − fixed_ems_cost − variable_ems_cost − extra_degradation
          − reserve_opportunity_cost
The reserve opportunity cost (lost self-consumption from reserving battery capacity for trading) is
computed by the study core (physical reruns), NOT here — it is passed in.
"""
from __future__ import annotations
import math
from dataclasses import dataclass

LABEL = "SCENARIO OVERLAY — NOT PHYSICALLY SIMULATED IMBALANCE REVENUE"

# source classifications for a reference figure
SRC_REALISED_FLEET = "realised_fleet_value"
SRC_HISTORICAL = "historically_reported"
SRC_MARKETING = "commercial_marketing_figure"
SRC_RESEARCH = "manual_research_reference"

# normalisation methods
NORM_NONE = "none"
NORM_PER_KWH = "per_usable_kwh"
NORM_PER_KW = "per_kw"
NORM_BOTH = "min_of_kwh_and_kw"
NORM_USER = "user_defined"


@dataclass
class ImbalanceReference:
    amount_eur: float
    year: int
    capacity_kwh: float
    power_kw: float
    gross: bool = True                 # True=gross, False=already-net
    source: str = SRC_RESEARCH
    verified: bool = False             # independently verified?
    note: str = ""


def normalize_reference(ref: ImbalanceReference, target_capacity_kwh: float, target_power_kw: float,
                        method: str = NORM_NONE, user_factor: float = 1.0) -> dict:
    """Scale a reference figure to a target battery. Revenue does NOT necessarily scale linearly with
    capacity — every scaled result is flagged as an approximation. The unscaled figure is shown first."""
    base = ref.amount_eur
    if method == NORM_NONE:
        scaled, factor = base, 1.0
    elif method == NORM_PER_KWH:
        factor = target_capacity_kwh / ref.capacity_kwh if ref.capacity_kwh else 1.0
        scaled = base * factor
    elif method == NORM_PER_KW:
        factor = target_power_kw / ref.power_kw if ref.power_kw else 1.0
        scaled = base * factor
    elif method == NORM_BOTH:
        f_kwh = target_capacity_kwh / ref.capacity_kwh if ref.capacity_kwh else 1.0
        f_kw = target_power_kw / ref.power_kw if ref.power_kw else 1.0
        factor = min(f_kwh, f_kw)
        scaled = base * factor
    elif method == NORM_USER:
        factor, scaled = user_factor, base * user_factor
    else:
        raise ValueError(f"unknown normalisation method {method!r}")
    return {
        "unscaled_reference_eur": round(base, 2),
        "normalisation_method": method,
        "scale_factor": round(factor, 4),
        "scaled_reference_eur": round(scaled, 2),
        "approximation": method != NORM_NONE,
        "warning": "revenue may not scale linearly with capacity/power" if method != NORM_NONE else "",
        "reference_meta": {"year": ref.year, "capacity_kwh": ref.capacity_kwh, "power_kw": ref.power_kw,
                           "gross": ref.gross, "source": ref.source, "verified": ref.verified, "note": ref.note},
    }


def net_overlay(reference_gross_eur: float, market_value_factor: float, customer_share: float,
                fixed_ems_cost: float = 0.0, variable_ems_cost: float = 0.0,
                extra_degradation: float = 0.0, reserve_opportunity_cost: float = 0.0) -> dict:
    """Net scenario overlay value. customer_share is applied to REVENUE only (never to costs)."""
    gross_after_market = reference_gross_eur * market_value_factor
    customer_gross = gross_after_market * customer_share       # aggregator keeps (1-share)
    aggregator_share_eur = gross_after_market * (1.0 - customer_share)
    net = (customer_gross
           - fixed_ems_cost - variable_ems_cost - extra_degradation - reserve_opportunity_cost)
    return {
        "label": LABEL,
        "reference_gross_eur": round(reference_gross_eur, 2),
        "market_value_factor": market_value_factor,
        "gross_after_market_eur": round(gross_after_market, 2),
        "customer_share": customer_share,
        "aggregator_share_eur": round(aggregator_share_eur, 2),
        "customer_gross_eur": round(customer_gross, 2),
        "fixed_ems_cost_eur": round(fixed_ems_cost, 2),
        "variable_ems_cost_eur": round(variable_ems_cost, 2),
        "extra_degradation_eur": round(extra_degradation, 2),
        "reserve_opportunity_cost_eur": round(reserve_opportunity_cost, 2),
        "net_overlay_eur": round(net, 2),
    }
