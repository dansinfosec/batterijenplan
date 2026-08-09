# -*- coding: utf-8 -*-
"""bp-dispatch-v1 · 2027 study — feed-in-cost (terugleverkosten) structures.

Post-2027 suppliers may charge for exported energy in several different ways. This module makes the
structure EXPLICIT so the study never calls a tiered or fixed fee a per-kWh cost. It computes the
ANNUAL fee from the annual (and, where relevant, monthly) exported energy — a settlement-boundary
calculation layered on top of the physical simulation. It does NOT touch the per-interval engine.

Structures:
  NONE          : no feed-in cost.
  PER_KWH       : rate € per exported kWh (every avoided export kWh saves rate).
  MONTHLY_TIER  : monthly export placed in a tier (kWh threshold -> € fee for that month); savings
                  arise only when battery operation moves a month into a cheaper tier.
  ANNUAL_TIER   : annual export placed in a tier (kWh threshold -> € annual fee).
  FIXED_MONTHLY : a flat € per month regardless of export (never affected by export reduction).
  HYBRID        : FIXED_MONTHLY plus a PER_KWH component.

A "tier" is (max_kwh, fee_eur): the first tier whose max_kwh >= volume applies; the last tier is the
cap (use math.inf for open-ended).
"""
from __future__ import annotations
import math
from dataclasses import dataclass, field

NONE = "NONE"
PER_KWH = "PER_KWH"
MONTHLY_TIER = "MONTHLY_TIER"
ANNUAL_TIER = "ANNUAL_TIER"
FIXED_MONTHLY = "FIXED_MONTHLY"
HYBRID = "HYBRID"

STRUCTURES = (NONE, PER_KWH, MONTHLY_TIER, ANNUAL_TIER, FIXED_MONTHLY, HYBRID)


@dataclass
class FeedInCostConfig:
    structure: str = PER_KWH
    per_kwh: float = 0.0                     # € per exported kWh (PER_KWH, HYBRID)
    fixed_monthly: float = 0.0               # € per month (FIXED_MONTHLY, HYBRID)
    tiers: list = field(default_factory=list)  # [(max_kwh, fee_eur), ...] ascending by max_kwh


def _tier_of(volume_kwh: float, tiers: list) -> tuple[int, float]:
    """Return (tier_index, fee) for a volume. First tier whose max_kwh >= volume applies."""
    for i, (max_kwh, fee) in enumerate(tiers):
        if volume_kwh <= max_kwh + 1e-9:
            return i, fee
    # above the last defined threshold -> last tier's fee (treat last as open-ended cap)
    return len(tiers) - 1, tiers[-1][1] if tiers else 0.0


def annual_fee(cfg: FeedInCostConfig, annual_export_kwh: float,
               monthly_export_kwh: list[float] | None = None) -> float:
    """Annual feed-in fee (EUR) for a given export profile. monthly_export_kwh is a 12-length list
    (required for MONTHLY_TIER)."""
    s = cfg.structure
    if s == NONE:
        return 0.0
    if s == PER_KWH:
        return max(0.0, annual_export_kwh) * cfg.per_kwh
    if s == FIXED_MONTHLY:
        return 12.0 * cfg.fixed_monthly
    if s == HYBRID:
        return 12.0 * cfg.fixed_monthly + max(0.0, annual_export_kwh) * cfg.per_kwh
    if s == ANNUAL_TIER:
        return _tier_of(max(0.0, annual_export_kwh), cfg.tiers)[1]
    if s == MONTHLY_TIER:
        if monthly_export_kwh is None:
            raise ValueError("MONTHLY_TIER requires monthly_export_kwh (12 values)")
        return sum(_tier_of(max(0.0, m), cfg.tiers)[1] for m in monthly_export_kwh)
    raise ValueError(f"unknown feed-in-cost structure {s!r}")


def avoided_feed_in_cost(cfg: FeedInCostConfig,
                         export_no_battery_kwh: float, export_battery_kwh: float,
                         monthly_no_battery: list[float] | None = None,
                         monthly_battery: list[float] | None = None) -> dict:
    """AVOIDED_FEED_IN_COST = fee(no battery) - fee(with battery). Returns a transparent breakdown
    including the tier each case falls into and the export reduction needed to reach the next tier."""
    fee_nb = annual_fee(cfg, export_no_battery_kwh, monthly_no_battery)
    fee_b = annual_fee(cfg, export_battery_kwh, monthly_battery)
    out = {
        "structure": cfg.structure,
        "annual_export_no_battery_kwh": round(export_no_battery_kwh, 3),
        "annual_export_battery_kwh": round(export_battery_kwh, 3),
        "annual_fee_no_battery_eur": round(fee_nb, 4),
        "annual_fee_battery_eur": round(fee_b, 4),
        "avoided_fee_eur": round(fee_nb - fee_b, 4),
    }
    if cfg.structure in (ANNUAL_TIER,):
        i_nb, _ = _tier_of(export_no_battery_kwh, cfg.tiers)
        i_b, _ = _tier_of(export_battery_kwh, cfg.tiers)
        out["tier_no_battery"] = i_nb
        out["tier_battery"] = i_b
        # export reduction needed to drop below the no-battery tier's lower boundary
        lower = cfg.tiers[i_nb - 1][0] if i_nb > 0 else 0.0
        out["export_reduction_for_next_tier_kwh"] = round(max(0.0, export_no_battery_kwh - lower), 3)
    return out
