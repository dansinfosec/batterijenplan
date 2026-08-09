# -*- coding: utf-8 -*-
"""bp-dispatch-v1 physics: battery cell, household energy flow, value ledger.

NEW V1 implementation. SoC is tracked in *stored* Wh. Round-trip efficiency is split
symmetrically (charge_eff = discharge_eff = sqrt(rt)) — V1 DECISION D2 (reversible).
"""
from __future__ import annotations
import math
from dataclasses import dataclass, field
from decimal import Decimal
from .core import BatteryConfig, kwh_to_wh, money


class Battery:
    """A single battery cell with power/capacity/efficiency/SoC constraints (Wh, W)."""
    def __init__(self, cfg: BatteryConfig):
        self.cfg = cfg
        self.usable_wh = kwh_to_wh(cfg.usable_capacity_kwh)
        self.soc_min_wh = self.usable_wh * cfg.min_soc_frac
        self.soc_max_wh = self.usable_wh * cfg.max_soc_frac
        self.reserve_wh = max(self.soc_min_wh, self.usable_wh * cfg.reserve_soc_frac)
        eff = math.sqrt(cfg.round_trip_efficiency)
        self.charge_eff = eff
        self.discharge_eff = eff
        self.charge_power_w = cfg.charge_power_kw * 1000.0
        self.discharge_power_w = cfg.discharge_power_kw * 1000.0
        self.soc_wh = self.usable_wh * cfg.initial_soc_frac
        self.throughput_out_wh = 0.0     # discharged (delivered) Wh, for degradation/cycles

    def headroom_stored_wh(self) -> float:
        return max(0.0, self.soc_max_wh - self.soc_wh)

    def available_stored_wh(self, respect_reserve: bool = True) -> float:
        floor = self.reserve_wh if respect_reserve else self.soc_min_wh
        return max(0.0, self.soc_wh - floor)

    def max_charge_ac_wh(self, seconds: int) -> float:
        p = self.charge_power_w * (seconds / 3600.0)
        return min(p, self.headroom_stored_wh() / self.charge_eff)

    def max_discharge_delivered_wh(self, seconds: int, respect_reserve: bool = True) -> float:
        p = self.discharge_power_w * (seconds / 3600.0)
        return min(p, self.available_stored_wh(respect_reserve) * self.discharge_eff)

    def do_charge(self, ac_wh: float) -> float:
        """Draw ac_wh from a source into the cell. Returns charge loss (Wh)."""
        ac_wh = max(0.0, min(ac_wh, self.max_charge_ac_wh_now()))
        stored = ac_wh * self.charge_eff
        self.soc_wh += stored
        return ac_wh - stored

    def max_charge_ac_wh_now(self) -> float:
        return self.headroom_stored_wh() / self.charge_eff if self.charge_eff else 0.0

    def do_discharge(self, delivered_wh: float) -> float:
        """Deliver delivered_wh out of the cell. Returns discharge loss (Wh)."""
        max_deliv = self.available_stored_wh(respect_reserve=False) * self.discharge_eff
        delivered_wh = max(0.0, min(delivered_wh, max_deliv))
        from_cell = delivered_wh / self.discharge_eff if self.discharge_eff else 0.0
        self.soc_wh -= from_cell
        self.throughput_out_wh += delivered_wh
        return from_cell - delivered_wh

    @property
    def equivalent_full_cycles(self) -> float:
        return self.throughput_out_wh / self.usable_wh if self.usable_wh else 0.0


@dataclass
class HouseholdFlow:
    direct_pv_wh: float
    residual_load_wh: float
    surplus_wh: float

def household_split(load_wh: float, pv_wh: float) -> HouseholdFlow:
    direct = min(load_wh, pv_wh)
    return HouseholdFlow(direct_pv_wh=direct,
                         residual_load_wh=load_wh - direct,
                         surplus_wh=pv_wh - direct)


# Fixed component keys — every value stream is recorded separately; sum == total by construction.
VALUE_COMPONENTS = [
    "avoided_grid_import",       # battery-to-load valued at import price
    "feed_in_cost_avoided",      # not paying feed-in cost on stored surplus
    "lost_feed_in_compensation", # forgone export compensation on stored surplus (<=0)
    "lost_saldering_credit",     # pre-2027 only: forgone saldering credit on stored surplus (<=0)
    "grid_charge_cost",          # cost of grid charging (<=0)
    "battery_to_grid_revenue",   # export from battery (may be <0)
    "day_ahead_value",           # net arbitrage attributed (dynamic)
    "imbalance_value",           # experimental; 0 unless imbalance mode
    "degradation_cost",          # <=0
    "standby_cost",              # <=0 (standby modelled as added load; kept for reporting=0)
    "supplier_fees",             # <=0
]

class ValueLedger:
    """Accumulates value components (Decimal EUR). total() == sum of components."""
    def __init__(self):
        self.components = {k: Decimal("0") for k in VALUE_COMPONENTS}
        self.physical = {k: 0.0 for k in
                         ["solar_to_batt_wh", "grid_to_batt_wh", "batt_to_load_wh",
                          "batt_to_grid_wh", "charge_loss_wh", "discharge_loss_wh", "throughput_out_wh"]}

    def add(self, comp: dict, phys: dict | None = None):
        for k, v in comp.items():
            if k not in self.components:
                raise KeyError(f"unknown value component {k!r}")
            self.components[k] += money(v)
        if phys:
            for k, v in phys.items():
                self.physical[k] = self.physical.get(k, 0.0) + v

    def total(self) -> Decimal:
        return sum(self.components.values(), Decimal("0"))
