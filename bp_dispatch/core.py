# -*- coding: utf-8 -*-
"""bp-dispatch-v1 core foundation: version, enums, exceptions, units, timebase, schemas, provenance.

NEW V1 implementation (Batterijenplan Integrated Dispatch Engine V1). Not recovered code.
Consolidated foundation module (see 03_DECISION_LOG.md, decision D1). Stdlib-only. Django-free.
"""
from __future__ import annotations
import hashlib
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from enum import Enum
from zoneinfo import ZoneInfo

ENGINE_NAME = "Batterijenplan Integrated Dispatch Engine V1"
ENGINE_ID = "bp-dispatch-v1"
VERSION = "1.0.0"
TZ = ZoneInfo("Europe/Amsterdam")

# --------------------------------------------------------------------------- enums
class DispatchMode(str, Enum):
    SELF_CONSUMPTION = "self_consumption"
    # legacy prototype heuristics (kept for comparison; RT-3 defect lives here):
    DAY_AHEAD_PERFECT_FORESIGHT = "day_ahead_perfect_foresight"
    DAY_AHEAD_CAUSAL = "day_ahead_causal"
    DAY_AHEAD_PERFECT_FORESIGHT_HEURISTIC = "day_ahead_perfect_foresight_heuristic"  # alias of the above
    DAY_AHEAD_CAUSAL_HEURISTIC = "day_ahead_causal_heuristic"                        # alias of the above
    # NEW (RT-3 fix): volume-aware DP planner. Clearer name — day-ahead prices are KNOWN (cleared,
    # not leakage); the "perfect" quality is perfect load & PV knowledge.
    DAY_AHEAD_KNOWN_PRICES_PERFECT_LOAD_PV = "day_ahead_known_prices_perfect_load_pv"
    DAY_AHEAD_VOLUME_AWARE_PERFECT = "day_ahead_volume_aware_perfect"   # DEPRECATED ALIAS of the above
    MULTI_MARKET = "multi_market"
    IMBALANCE_EXPERIMENT = "imbalance_experiment"


class TerminalSoc(str, Enum):
    """End-of-horizon SoC rule for the volume-aware planner (RT-3, task 5)."""
    EQUAL_INITIAL = "equal_initial"                 # default for isolated daily arbitrage
    MINIMUM = "minimum"                             # only require SoC >= floor at the end
    TARGET_WITH_PENALTY = "target_with_penalty"     # penalise |terminal - target|
    FREE = "free"                                   # research-only; allows end-of-horizon dumping


class PriceInformation(str, Enum):
    """What day-ahead price knowledge the planner assumes. Cleared next-day prices ARE knowable before
    delivery (published after the ~12:00 CET auction), so knowing them is NOT future leakage."""
    KNOWN_CLEARED_DAY_AHEAD = "known_cleared_day_ahead"          # realistic for day-ahead scheduling
    FORECAST_DAY_AHEAD = "forecast_day_ahead"                    # NOT IMPLEMENTED (causal step)
    REALISED_FUTURE_PRICE_RESEARCH_ONLY = "realised_future_price_research_only"  # leakage; research bound


class LoadInformation(str, Enum):
    PERFECT_ACTUAL = "perfect_actual"       # uses realised load -> upper bound (leakage source)
    FORECAST = "forecast"                   # NOT IMPLEMENTED (causal step)
    PERSISTENCE = "persistence"             # NOT IMPLEMENTED (causal step)
    SYNTHETIC_PROFILE = "synthetic_profile" # deterministic profile (knowable-ish)


class PvInformation(str, Enum):
    PERFECT_ACTUAL = "perfect_actual"       # uses realised PV -> upper bound (leakage source)
    FORECAST = "forecast"                   # NOT IMPLEMENTED (causal step)
    SYNTHETIC_PROFILE = "synthetic_profile"


class HorizonMode(str, Enum):
    """How the planning horizon is cut. CALENDAR_DAY = current per-local-day segmentation."""
    CALENDAR_DAY = "calendar_day"           # solve each local day independently (may block cross-midnight)
    FULL = "full"                           # one horizon over the whole input list
    ROLLING = "rolling"                     # receding horizon: window + commit (overlap-and-replan)

class SettlementMode(str, Enum):
    PRE_2027_NET_METERING = "pre_2027_net_metering"
    POST_2027_FIXED = "post_2027_fixed"
    POST_2027_DYNAMIC = "post_2027_dynamic"
    RAW_MARKET_RESEARCH = "raw_market_research"

class Action(str, Enum):
    HOLD = "hold"
    CHARGE_PV = "charge_pv"
    CHARGE_GRID = "charge_grid"
    DISCHARGE_LOAD = "discharge_load"
    DISCHARGE_GRID = "discharge_grid"

class Foresight(str, Enum):
    CAUSAL = "causal"
    PERFECT = "perfect_foresight"

class MissingDataPolicy(str, Enum):
    RAISE = "raise"
    ZERO_FILL = "zero_fill"
    FORWARD_FILL = "forward_fill"

# --------------------------------------------------------------------------- exceptions
class BpDispatchError(Exception): ...
class UnitError(BpDispatchError): ...
class TimebaseError(BpDispatchError): ...
class EnergyBalanceError(BpDispatchError): ...
class ConfigError(BpDispatchError): ...
class ProvenanceError(BpDispatchError): ...

# --------------------------------------------------------------------------- units
# Canonical internal units: power=W, interval energy=Wh (float), reporting=kWh,
# market price at adapters=EUR/MWh, internal energy price=EUR/kWh, money=Decimal EUR.
def wh_to_kwh(wh: float) -> float: return wh / 1000.0
def kwh_to_wh(kwh: float) -> float: return kwh * 1000.0
def w_to_kw(w: float) -> float: return w / 1000.0
def kw_to_w(kw: float) -> float: return kw * 1000.0
def eur_per_mwh_to_eur_per_kwh(p: float) -> float: return p / 1000.0
def eur_per_kwh_to_eur_per_mwh(p: float) -> float: return p * 1000.0

def money(x) -> Decimal:
    """Money as Decimal EUR, quantised to 6 dp internally (round at reporting)."""
    return Decimal(str(x)).quantize(Decimal("0.000001"))

def require_positive(name: str, v: float) -> float:
    if v is None or v < 0: raise UnitError(f"{name} must be >= 0, got {v!r}")
    return v

# --------------------------------------------------------------------------- timebase
@dataclass(frozen=True)
class Interval:
    start: datetime          # tz-aware
    seconds: int             # exact interval length in seconds
    def __post_init__(self):
        if self.start.tzinfo is None:
            raise TimebaseError("Interval.start must be timezone-aware")
        if self.seconds <= 0:
            raise TimebaseError("Interval.seconds must be > 0")
    @property
    def end(self) -> datetime: return self.start + timedelta(seconds=self.seconds)
    @property
    def hours(self) -> float: return self.seconds / 3600.0

def build_day(date_local, interval_seconds: int = 900) -> list[Interval]:
    """Build all intervals for one local calendar day in Europe/Amsterdam.

    DST-correct: a spring day has 92 quarter-hours, an autumn day 100. We walk
    absolute UTC instants between local-midnight boundaries so the count is real.
    """
    start_local = datetime(date_local.year, date_local.month, date_local.day, 0, 0, tzinfo=TZ)
    next_local = start_local + timedelta(days=1)
    # normalise across DST by comparing absolute UTC instants
    start_utc = start_local.astimezone(timezone.utc)
    end_utc = next_local.astimezone(timezone.utc)
    out, t = [], start_utc
    while t < end_utc:
        out.append(Interval(start=t.astimezone(TZ), seconds=interval_seconds))
        t = t + timedelta(seconds=interval_seconds)
    return out

def validate_timebase(intervals: list[Interval]) -> list[str]:
    """Return warnings for duplicates / gaps / unsorted (does not mutate)."""
    warns = []
    starts = [iv.start.astimezone(timezone.utc) for iv in intervals]
    if starts != sorted(starts):
        warns.append("timebase: intervals not sorted ascending")
    seen = set()
    for i, iv in enumerate(intervals):
        key = iv.start.astimezone(timezone.utc)
        if key in seen: warns.append(f"timebase: duplicate interval at index {i} ({iv.start.isoformat()})")
        seen.add(key)
        if i > 0:
            prev = intervals[i-1]
            gap = (iv.start - prev.end).total_seconds()
            if abs(gap) > 1:
                warns.append(f"timebase: gap/overlap {gap:.0f}s before index {i}")
    return warns

# --------------------------------------------------------------------------- schemas
@dataclass
class IntervalInput:
    interval: Interval
    load_wh: float                       # household consumption this interval (Wh)
    pv_wh: float                         # PV generation this interval (Wh)
    import_price_eur_kwh: float = 0.0    # all-in import price (levering+belasting+btw or dynamic)
    export_price_eur_kwh: float = 0.0    # feed-in compensation (net of feed-in costs handled in settlement)
    imbalance_price_eur_kwh: float | None = None  # optional TenneT settlement price (experimental)
    signal_knowable_at: datetime | None = None    # when the imbalance signal became knowable

@dataclass
class BatteryConfig:
    name: str
    nominal_capacity_kwh: float
    usable_capacity_kwh: float
    charge_power_kw: float
    discharge_power_kw: float
    round_trip_efficiency: float = 0.90   # split sqrt/sqrt -> D2
    standby_w: float = 10.0
    degradation_eur_per_kwh: float = 0.04 # per discharged (throughput) kWh
    min_soc_frac: float = 0.0
    max_soc_frac: float = 1.0
    initial_soc_frac: float = 0.0
    reserve_soc_frac: float = 0.0
    allow_grid_charge: bool = True
    allow_battery_export: bool = True

@dataclass
class TariffConfig:
    settlement_mode: SettlementMode
    import_price_eur_kwh: float = 0.30
    feed_in_compensation_eur_kwh: float = 0.075
    feed_in_cost_eur_kwh: float = 0.12
    energy_tax_eur_kwh: float = 0.11085
    vat_rate: float = 0.21
    fixed_charge_eur_year: float = 0.0
    supplier_markup_eur_kwh: float = 0.0       # dynamic import adder
    supplier_export_deduction_eur_kwh: float = 0.0  # dynamic export deduction
    customer_share: float = 1.0                # fraction of trading value kept by customer

@dataclass
class OptimizerParams:
    """Deterministic-DP planner parameters (volume-aware day-ahead). No solver dependency."""
    soc_levels: int = 101                       # SoC discretisation grid points
    terminal_soc: TerminalSoc = TerminalSoc.EQUAL_INITIAL
    terminal_target_frac: float = 0.0           # for TARGET_WITH_PENALTY
    terminal_penalty_eur_kwh: float = 1.0       # penalty per kWh deviation from target
    max_discharge_kwh_day: float | None = None  # cap on discharged energy per horizon/day
    max_throughput_kwh: float | None = None     # cap on total discharged (throughput)
    max_cycles: float | None = None             # cap on equivalent full cycles (via usable capacity)
    throughput_buckets: int = 16                # discretisation of the throughput state dimension
    min_action_wh: float = 0.0                  # ignore battery actions smaller than this
    segment_daily: bool = True                  # deprecated; use horizon. True -> CALENDAR_DAY
    # --- information model (RT-day-ahead pass). Defaults classify the current DP exactly. ---
    price_information: PriceInformation = PriceInformation.KNOWN_CLEARED_DAY_AHEAD
    load_information: LoadInformation = LoadInformation.PERFECT_ACTUAL
    pv_information: PvInformation = PvInformation.PERFECT_ACTUAL
    # --- horizon boundary ---
    horizon: HorizonMode = HorizonMode.CALENDAR_DAY
    rolling_window_hours: int = 36              # ROLLING: look-ahead window
    rolling_commit_hours: int = 24             # ROLLING: how much of each window is committed


@dataclass
class ScenarioConfig:
    name: str
    battery: BatteryConfig
    tariff: TariffConfig
    dispatch_mode: DispatchMode
    foresight: Foresight = Foresight.CAUSAL
    min_spread_eur_kwh: float = 0.05           # day-ahead threshold
    look_ahead_intervals: int = 96
    reserve_soc_frac: float = 0.0
    optimizer: OptimizerParams = field(default_factory=OptimizerParams)
    notes: str = ""

@dataclass
class IntervalResult:
    interval: Interval
    action: Action
    load_wh: float
    pv_wh: float
    direct_pv_wh: float
    grid_import_wh: float
    grid_export_wh: float
    batt_charge_in_wh: float      # energy delivered into the cell
    batt_discharge_out_wh: float  # energy delivered out of the cell to load/grid
    charge_loss_wh: float
    discharge_loss_wh: float
    standby_wh: float
    soc_before_wh: float
    soc_after_wh: float
    value_eur: Decimal
    balance_error_wh: float
    warnings: list[str] = field(default_factory=list)

# --------------------------------------------------------------------------- provenance
def config_hash(obj) -> str:
    """Deterministic sha256 over normalised JSON of a config/dataclass."""
    def norm(o):
        if hasattr(o, "__dataclass_fields__"): return {k: norm(v) for k, v in asdict(o).items()}
        if isinstance(o, Enum): return o.value
        if isinstance(o, Decimal): return str(o)
        if isinstance(o, (datetime,)): return o.isoformat()
        if isinstance(o, dict): return {k: norm(v) for k, v in sorted(o.items())}
        if isinstance(o, (list, tuple)): return [norm(v) for v in o]
        return o
    return hashlib.sha256(json.dumps(norm(obj), sort_keys=True, ensure_ascii=False).encode()).hexdigest()

def file_sha256(path: str) -> str:
    return hashlib.sha256(open(path, "rb").read()).hexdigest()

@dataclass
class Provenance:
    engine_id: str
    engine_version: str
    experiment: str
    scenario_name: str
    dispatch_mode: str
    settlement_mode: str
    foresight: str
    timezone: str
    interval_seconds: int
    config_sha256: str
    input_hashes: dict = field(default_factory=dict)
    input_date_range: list = field(default_factory=list)
    git_commit: str | None = None
    warnings: list = field(default_factory=list)
    validation_status: str = "unknown"
