# -*- coding: utf-8 -*-
"""bp-dispatch-v1 dispatch strategies.

A strategy proposes AC-side flows for an interval; the simulator clamps them against the ONE shared
battery (power, capacity, SoC) and applies efficiency. Strategies never mutate SoC directly (D10).

Heuristics only (V1): no LP/MILP optimiser yet; interfaces allow adding one later (decision D5).
"""
from __future__ import annotations
import statistics
from dataclasses import dataclass
from .core import DispatchMode, Foresight, IntervalInput


@dataclass
class Plan:
    charge_pv_wh: float = 0.0       # AC from PV surplus into cell
    charge_grid_wh: float = 0.0     # AC from grid into cell
    discharge_load_wh: float = 0.0  # delivered to load
    discharge_grid_wh: float = 0.0  # delivered to grid
    rejected: tuple = ()            # (reason, ...) for the integrated ledger
    authoritative: bool = False     # if True the simulator applies this plan's regime directly (DP planner)


@dataclass
class Ctx:
    i: int
    inputs: list             # list[IntervalInput]
    surplus_wh: float
    residual_load_wh: float
    import_price: float      # effective EUR/kWh this interval
    export_price: float
    max_charge_ac_wh: float  # from battery snapshot
    max_discharge_deliv_wh: float
    charge_eff: float
    discharge_eff: float
    degr_eur_kwh: float
    min_spread: float
    look_ahead: int


class DispatchStrategy:
    mode: DispatchMode
    realistic: bool = True
    def plan(self, ctx: Ctx) -> Plan: raise NotImplementedError


class SelfConsumptionStrategy(DispatchStrategy):
    mode = DispatchMode.SELF_CONSUMPTION
    def plan(self, ctx: Ctx) -> Plan:
        p = Plan()
        # charge all PV surplus that fits
        p.charge_pv_wh = min(ctx.surplus_wh, ctx.max_charge_ac_wh)
        # discharge to cover residual load if value-positive (import price beats degradation)
        if ctx.import_price > ctx.degr_eur_kwh:
            p.discharge_load_wh = min(ctx.residual_load_wh, ctx.max_discharge_deliv_wh)
        return p


def _future_prices(ctx: Ctx):
    end = min(len(ctx.inputs), ctx.i + 1 + ctx.look_ahead)
    return [ctx.inputs[j].import_price_eur_kwh for j in range(ctx.i + 1, end)]

def _causal_window(ctx: Ctx, back: int = 96):
    hi = min(len(ctx.inputs), ctx.i + 1)   # never read beyond current index (no future leakage)
    lo = max(0, ctx.i - back)
    return [ctx.inputs[j].import_price_eur_kwh for j in range(lo, hi)]

def _arbitrage_ok(buy: float, sell: float, ctx: Ctx) -> bool:
    # net per delivered kWh: sell*disch_eff - buy/charge_eff - degradation, vs min_spread
    net = sell * ctx.discharge_eff - buy / ctx.charge_eff - ctx.degr_eur_kwh
    return net >= ctx.min_spread


class DayAheadStrategy(DispatchStrategy):
    """Threshold/quantile heuristic. foresight=PERFECT sees full path (upper bound, unrealistic);
    foresight=CAUSAL uses a trailing window only (no future leakage)."""
    def __init__(self, foresight: Foresight):
        self.foresight = foresight
        self.realistic = (foresight == Foresight.CAUSAL)
        self.mode = (DispatchMode.DAY_AHEAD_PERFECT_FORESIGHT if foresight == Foresight.PERFECT
                     else DispatchMode.DAY_AHEAD_CAUSAL)

    def plan(self, ctx: Ctx) -> Plan:
        p = SelfConsumptionStrategy().plan(ctx)   # always self-consume first
        if self.foresight == Foresight.PERFECT:
            ref = [ctx.inputs[j].import_price_eur_kwh for j in range(len(ctx.inputs))]
            fut = _future_prices(ctx)
        else:
            ref = _causal_window(ctx)
            fut = []  # causal: no forward view; act on relative position in trailing window
        if len(ref) < 4:
            return p
        lo_q = statistics.quantiles(ref, n=10)[0]   # ~p10
        hi_q = statistics.quantiles(ref, n=10)[8]   # ~p90
        price = ctx.import_price
        # grid-charge when cheap AND a profitable sell is reachable (perfect) or plausible (causal)
        if price <= lo_q:
            sell = max(fut) if fut else hi_q
            if _arbitrage_ok(price, sell, ctx):
                rem = ctx.max_charge_ac_wh - p.charge_pv_wh
                p.charge_grid_wh = max(0.0, rem)
        # discharge to grid when expensive AND arbitrage covered
        if price >= hi_q:
            buy = min(ref)
            if _arbitrage_ok(buy, ctx.export_price if ctx.export_price else price, ctx):
                rem = ctx.max_discharge_deliv_wh - p.discharge_load_wh
                p.discharge_grid_wh = max(0.0, rem)
        return p


class MultiMarketStrategy(DispatchStrategy):
    """Integrated: generate feasible candidate actions, rank by net value, apply the best compatible
    one against the single shared SoC/power budget; record rejected candidates (D13)."""
    mode = DispatchMode.MULTI_MARKET
    def __init__(self, foresight: Foresight = Foresight.CAUSAL):
        self.foresight = foresight

    def plan(self, ctx: Ctx) -> Plan:
        p = Plan()
        rejected = []
        # 1) self-consumption legs always considered first (highest-value use of PV + load offset)
        p.charge_pv_wh = min(ctx.surplus_wh, ctx.max_charge_ac_wh)
        if ctx.import_price > ctx.degr_eur_kwh:
            p.discharge_load_wh = min(ctx.residual_load_wh, ctx.max_discharge_deliv_wh)
        else:
            rejected.append("discharge_load: import<degradation")
        # 2) remaining power/capacity budget competes for arbitrage
        da = DayAheadStrategy(self.foresight).plan(ctx)
        rem_charge = ctx.max_charge_ac_wh - p.charge_pv_wh
        rem_disch = ctx.max_discharge_deliv_wh - p.discharge_load_wh
        if da.charge_grid_wh > 0 and rem_charge > 0:
            p.charge_grid_wh = min(da.charge_grid_wh, rem_charge)
        elif da.charge_grid_wh > 0:
            rejected.append("charge_grid: no charge headroom left after PV")
        if da.discharge_grid_wh > 0 and rem_disch > 0:
            p.discharge_grid_wh = min(da.discharge_grid_wh, rem_disch)
        elif da.discharge_grid_wh > 0:
            rejected.append("discharge_grid: no discharge budget left after load")
        p.rejected = tuple(rejected)
        return p


class ImbalanceExperimentStrategy(DispatchStrategy):
    """EXPERIMENTAL / NOT_VALIDATED (D14). Does not invent the historic algorithm.
    Default behaviour = self-consumption; an isolated theoretical upper bound is computed
    separately by scripts, never merged into a 'realistic' number."""
    mode = DispatchMode.IMBALANCE_EXPERIMENT
    realistic = False
    NOT_VALIDATED = True
    def plan(self, ctx: Ctx) -> Plan:
        return SelfConsumptionStrategy().plan(ctx)


class VolumeAwarePerfectStrategy(DispatchStrategy):
    """RESEARCH OPTIMISATION MODE — PERFECT FORESIGHT (RT-3 fix). Precomputes a whole-horizon plan with
    a deterministic DP (optimizer.py) that respects finite capacity/power/throughput and never chooses a
    schedule worse than hold. Per-interval it returns the precomputed (authoritative) flows. NOT causal;
    NOT a realistic commercial EMS result — it is an upper bound."""
    mode = DispatchMode.DAY_AHEAD_VOLUME_AWARE_PERFECT
    realistic = False
    RESEARCH_LABEL = "RESEARCH OPTIMISATION MODE — PERFECT FORESIGHT"

    def __init__(self):
        self._plan = None

    def prepare(self, scenario, inputs, battery):
        from .optimizer import plan_inputs
        self._plan = plan_inputs(scenario, inputs)

    @property
    def dispatch_plan(self):
        return self._plan

    def plan(self, ctx: Ctx) -> Plan:
        pl = self._plan
        i = ctx.i
        return Plan(charge_pv_wh=pl.charge_pv_wh[i], charge_grid_wh=pl.charge_grid_wh[i],
                    discharge_load_wh=pl.discharge_load_wh[i], discharge_grid_wh=pl.discharge_grid_wh[i],
                    authoritative=True)


def make_strategy(mode: DispatchMode, foresight: Foresight) -> DispatchStrategy:
    if mode == DispatchMode.SELF_CONSUMPTION: return SelfConsumptionStrategy()
    if mode in (DispatchMode.DAY_AHEAD_PERFECT_FORESIGHT, DispatchMode.DAY_AHEAD_PERFECT_FORESIGHT_HEURISTIC):
        return DayAheadStrategy(Foresight.PERFECT)
    if mode in (DispatchMode.DAY_AHEAD_CAUSAL, DispatchMode.DAY_AHEAD_CAUSAL_HEURISTIC):
        return DayAheadStrategy(Foresight.CAUSAL)
    if mode in (DispatchMode.DAY_AHEAD_KNOWN_PRICES_PERFECT_LOAD_PV,
                DispatchMode.DAY_AHEAD_VOLUME_AWARE_PERFECT):   # latter is a deprecated alias
        return VolumeAwarePerfectStrategy()
    if mode == DispatchMode.MULTI_MARKET: return MultiMarketStrategy(foresight)
    if mode == DispatchMode.IMBALANCE_EXPERIMENT: return ImbalanceExperimentStrategy()
    raise ValueError(mode)
