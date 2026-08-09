# -*- coding: utf-8 -*-
"""bp-dispatch-v1 VOLUME-AWARE day-ahead planner (RT-3 fix).

RESEARCH OPTIMISATION MODE — PERFECT FORESIGHT. This is an UPPER BOUND, not a realistic commercial
EMS result. It replaces the local threshold heuristic with a deterministic dynamic program that plans
the finite battery energy volume across the whole horizon subject to power, capacity, efficiency,
degradation, reserve, terminal-SoC and optional throughput/cycle constraints. The hold (no-trade)
schedule is always feasible, so the optimum is never worse than hold.

Method: DP over a discretised SoC grid (and an optional discretised cumulative-throughput dimension).
No LP/MILP, no solver dependency (none is available in this environment — see review/RT3_*). The
physical kernel (physics.py) does NOT depend on this module; this module depends only on core/settlements.

Complexity: O(N * S^2 * T) where N=intervals, S=soc_levels, T=throughput buckets (T=1 when uncapped).
Simultaneous charge+discharge is structurally impossible: each transition is a single signed SoC delta.
"""
from __future__ import annotations
import math
from dataclasses import dataclass, field
from .core import (SettlementMode, TerminalSoc, BatteryConfig, TariffConfig, ScenarioConfig,
                   OptimizerParams, IntervalInput, wh_to_kwh, kwh_to_wh)
from .settlements import resolve_prices

NEG_INF = float("-inf")


@dataclass
class DispatchPlan:
    charge_pv_wh: list          # per-interval, aligned to inputs
    charge_grid_wh: list
    discharge_load_wh: list
    discharge_grid_wh: list
    schedule: list              # per-interval inspection rows
    summary: dict
    status: str


def _interval_value(mode, tariff: TariffConfig, s2b, g2b, b2l, b2g, imp, exp, degr):
    """Float mirror of settlements.settle_interval (+ battery degradation). All flows in kWh.
    Returns total interval battery value (EUR). Kept in lock-step with settlements.py."""
    fic = tariff.feed_in_cost_eur_kwh
    cs = tariff.customer_share
    v = b2l * imp                      # avoided_grid_import
    v -= (b2l + b2g) * degr            # degradation (throughput-based; matches engine override)
    if mode == SettlementMode.PRE_2027_NET_METERING:
        v += -s2b * imp + s2b * fic - g2b * imp + cs * b2g * (imp - fic)
    elif mode == SettlementMode.POST_2027_FIXED:
        v += s2b * fic - s2b * exp - g2b * imp + cs * b2g * (exp - fic)
    elif mode == SettlementMode.POST_2027_DYNAMIC:
        v += s2b * fic - s2b * exp + cs * (-g2b * imp) + cs * b2g * exp
    elif mode == SettlementMode.RAW_MARKET_RESEARCH:
        v += -s2b * exp - g2b * imp + b2g * exp
    else:
        raise ValueError(mode)
    return v


def _precompute_deltas(inputs, battery: BatteryConfig, tariff, mode, levels, step, ce, de, degr, params):
    """For each interval i and signed level-delta d, precompute feasibility, value, flows (Wh) and
    discharged energy (kWh, for throughput). Cost is a function of d only within an interval, so this
    is O(N*(2S-1)) instead of O(N*S^2)."""
    S = len(levels)
    per = []
    for iv in inputs:
        sec = iv.interval.seconds
        hours = sec / 3600.0
        surplus_wh = max(0.0, iv.pv_wh - min(iv.load_wh, iv.pv_wh))
        residual_wh = max(0.0, iv.load_wh - min(iv.load_wh, iv.pv_wh))
        max_charge_ac = battery.charge_power_kw * 1000.0 * hours
        max_disch = battery.discharge_power_kw * 1000.0 * hours
        imp, exp = resolve_prices(mode, tariff, iv.import_price_eur_kwh, iv.export_price_eur_kwh)
        row = {}
        for d in range(-(S - 1), S):
            dstored = d * step
            if abs(dstored) < params.min_action_wh and d != 0:
                continue  # sub-threshold action disallowed (falls back to hold at d=0)
            if d == 0:
                row[0] = (0.0, 0.0, 0.0, 0.0, 0.0, 0.0)   # value, s2b,g2b,b2l,b2g, discharged_kwh
                continue
            if dstored > 0:  # charging
                ac_in = dstored / ce
                if ac_in > max_charge_ac + 1e-9:
                    continue
                s2b_wh = min(ac_in, surplus_wh)
                g2b_wh = ac_in - s2b_wh
                if g2b_wh > 1e-9 and not battery.allow_grid_charge:
                    continue
                val = _interval_value(mode, tariff, wh_to_kwh(s2b_wh), wh_to_kwh(g2b_wh), 0.0, 0.0, imp, exp, degr)
                row[d] = (val, s2b_wh, g2b_wh, 0.0, 0.0, 0.0)
            else:            # discharging
                from_cell = -dstored
                delivered = from_cell * de
                if delivered > max_disch + 1e-9:
                    continue
                b2l_wh = min(delivered, residual_wh)
                b2g_wh = delivered - b2l_wh
                if b2g_wh > 1e-9 and not battery.allow_battery_export:
                    continue
                val = _interval_value(mode, tariff, 0.0, 0.0, wh_to_kwh(b2l_wh), wh_to_kwh(b2g_wh), imp, exp, degr)
                row[d] = (val, 0.0, 0.0, b2l_wh, b2g_wh, wh_to_kwh(delivered))
        per.append(row)
    return per


def solve_horizon(inputs, battery: BatteryConfig, tariff, mode, params: OptimizerParams,
                  initial_soc_wh: float, terminal_ref_wh: float | None = None) -> DispatchPlan:
    """terminal_ref_wh: absolute SoC (Wh) the EQUAL_INITIAL / TARGET terminal should aim for. Defaults to
    this horizon's initial SoC. In rolling horizons the FINAL window passes the ORIGINAL initial SoC so
    'equal initial' means the battery's true start, not the mid-horizon carried SoC."""
    usable = kwh_to_wh(battery.usable_capacity_kwh)
    floor = max(usable * battery.min_soc_frac, usable * battery.reserve_soc_frac)
    top = usable * battery.max_soc_frac
    S = max(2, params.soc_levels)
    step = (top - floor) / (S - 1)
    levels = [floor + k * step for k in range(S)]
    ce = math.sqrt(battery.round_trip_efficiency)
    de = ce
    degr = battery.degradation_eur_per_kwh
    N = len(inputs)

    # throughput cap (discharged/delivered energy, kWh). None -> single state (unconstrained).
    # Tracked EXACTLY in integer SoC-level units of *stored* energy discharged (from_cell), because
    # every discharge is an integer number of SoC levels. delivered = from_cell*de; from_cell = levels*step.
    # This avoids the rounding bug where increments smaller than a bucket vanished.
    caps = [c for c in (params.max_discharge_kwh_day, params.max_throughput_kwh,
                        (params.max_cycles * battery.usable_capacity_kwh if params.max_cycles else None))
            if c is not None]
    thr_cap = min(caps) if caps else None
    if thr_cap is not None and step > 0:
        # max cumulative discharge in levels: delivered_cap_wh = thr_cap*1000; from_cell = levels*step
        L_max = int(math.floor(kwh_to_wh(thr_cap) / (step * de) + 1e-9))
        T = L_max + 1
    else:
        T, L_max = 1, 0

    k_init = min(max(round((initial_soc_wh - floor) / step) if step > 0 else 0, 0), S - 1)
    ref_wh = initial_soc_wh if terminal_ref_wh is None else terminal_ref_wh
    k_ref = min(max(round((ref_wh - floor) / step) if step > 0 else 0, 0), S - 1)

    per = _precompute_deltas(inputs, battery, tariff, mode, levels, step, ce, de, degr, params)

    # terminal value V[N][k] (throughput does not affect terminal)
    def terminal_value(k):
        if params.terminal_soc == TerminalSoc.EQUAL_INITIAL:
            return 0.0 if k == k_ref else NEG_INF
        if params.terminal_soc == TerminalSoc.MINIMUM:
            return 0.0                       # any k (all >= floor by construction)
        if params.terminal_soc == TerminalSoc.FREE:
            return 0.0
        if params.terminal_soc == TerminalSoc.TARGET_WITH_PENALTY:
            target_wh = usable * params.terminal_target_frac
            return -abs(levels[k] - target_wh) / 1000.0 * params.terminal_penalty_eur_kwh
        raise ValueError(params.terminal_soc)

    # DP tables. V[k][t]; policy[i][k*T+t] = (d, t')
    V = [[terminal_value(k) for _ in range(T)] for k in range(S)]
    policy = [None] * N
    for i in range(N - 1, -1, -1):
        row = per[i]
        Vnext = V
        Vnew = [[NEG_INF] * T for _ in range(S)]
        pol = [None] * (S * T)
        for k in range(S):
            for t in range(T):
                best = NEG_INF
                best_move = None
                for d, (val, s2b, g2b, b2l, b2g, disch_kwh) in row.items():
                    kp = k + d
                    if kp < 0 or kp >= S:
                        continue
                    if T > 1 and d < 0:
                        tp = t + (-d)                 # exact: discharge adds |d| levels of throughput
                        if tp > T - 1:
                            continue                  # would exceed throughput/cycle cap
                    else:
                        tp = t
                    nxt = Vnext[kp][tp]
                    if nxt == NEG_INF:
                        continue
                    cand = val + nxt
                    # deterministic tie-break: prefer smaller |d| (less action), then smaller d
                    if (cand > best + 1e-12) or (abs(cand - best) <= 1e-12 and best_move is not None
                                                 and (abs(d), d) < (abs(best_move[0]), best_move[0])):
                        best = cand
                        best_move = (d, tp)
                Vnew[k][t] = best
                pol[k * T + t] = best_move
        V = Vnew
        policy[i] = pol

    status = "optimal" if V[k_init][0] > NEG_INF else "infeasible"
    # forward extraction from (k_init, t=0)
    cpv = [0.0] * N; cgr = [0.0] * N; dld = [0.0] * N; dgr = [0.0] * N
    sched = []
    k, t = k_init, 0
    cum = 0.0
    thr_used = 0.0
    for i in range(N):
        move = policy[i][k * T + t] if status == "optimal" else (0, t)
        if move is None:
            move = (0, t)
        d, tp = move
        val, s2b, g2b, b2l, b2g, disch_kwh = per[i].get(d, (0.0, 0.0, 0.0, 0.0, 0.0, 0.0))
        cpv[i], cgr[i], dld[i], dgr[i] = s2b, g2b, b2l, b2g
        soc_before = levels[k]
        soc_after = levels[k + d]
        cum += val
        thr_used += disch_kwh
        iv = inputs[i]
        imp, exp = resolve_prices(mode, tariff, iv.import_price_eur_kwh, iv.export_price_eur_kwh)
        gross = wh_to_kwh(b2l) * imp + wh_to_kwh(b2g) * exp
        eff_cost = (wh_to_kwh((s2b + g2b)) * (1 - ce) + wh_to_kwh((b2l + b2g)) * (1 / de - 1)) * imp
        degr_cost = wh_to_kwh(b2l + b2g) * degr
        remaining = (thr_cap - thr_used) if thr_cap is not None else None
        action = ("hold" if d == 0 else ("charge_pv" if g2b == 0 and s2b > 0 else
                  "charge_grid" if g2b > 0 else "discharge_load" if b2g == 0 else "discharge_grid"))
        sched.append({
            "i": i, "start": iv.interval.start.isoformat(), "import_price": imp, "export_price": exp,
            "soc_before_kwh": round(wh_to_kwh(soc_before), 4),
            "planned_charge_wh": round(s2b + g2b, 3), "planned_discharge_wh": round(b2l + b2g, 3),
            "soc_after_kwh": round(wh_to_kwh(soc_after), 4),
            "marginal_gross_eur": round(gross, 5), "efficiency_cost_eur": round(eff_cost, 5),
            "degradation_cost_eur": round(degr_cost, 5), "expected_net_eur": round(val, 5),
            "cumulative_eur": round(cum, 5),
            "remaining_throughput_kwh": (round(remaining, 4) if remaining is not None else None),
            "action": action})
        k, t = k + d, tp

    charged_kwh = wh_to_kwh(sum(cpv) + sum(cgr))
    discharged_kwh = wh_to_kwh(sum(dld) + sum(dgr))
    net = cum
    summary = {
        "status": status, "mode": "DAY_AHEAD_VOLUME_AWARE_PERFECT",
        "research_label": "RESEARCH OPTIMISATION MODE — PERFECT FORESIGHT (upper bound, not causal)",
        "planned_charged_kwh": round(charged_kwh, 4), "planned_discharged_kwh": round(discharged_kwh, 4),
        "equivalent_full_cycles": round(discharged_kwh / battery.usable_capacity_kwh, 4) if battery.usable_capacity_kwh else 0.0,
        "gross_arbitrage_eur": round(sum(s["marginal_gross_eur"] for s in sched), 4),
        "degradation_eur": round(sum(s["degradation_cost_eur"] for s in sched), 4),
        "net_value_eur": round(net, 4),
        "initial_soc_kwh": round(wh_to_kwh(levels[k_init]), 4),
        "terminal_soc_kwh": round(wh_to_kwh(levels[k]), 4),
        "terminal_soc_policy": params.terminal_soc.value,
        "n_actions": sum(1 for s in sched if s["action"] != "hold"),
        "soc_levels": S, "throughput_buckets": T,
        "soc_step_wh": round(step, 3)}
    return DispatchPlan(cpv, cgr, dld, dgr, sched, summary, status)


from dataclasses import replace as _replace
from .core import (PriceInformation, LoadInformation, PvInformation, HorizonMode)


def _validate_information(p: OptimizerParams):
    """Only PERFECT/SYNTHETIC data + KNOWN/REALISED prices are implemented. FORECAST/PERSISTENCE need a
    separate forecast model -> that is the causal controller (a later step), so refuse them here."""
    if p.price_information == PriceInformation.FORECAST_DAY_AHEAD:
        raise NotImplementedError("FORECAST_DAY_AHEAD price info is the causal step; not implemented in this pass")
    if p.load_information in (LoadInformation.FORECAST, LoadInformation.PERSISTENCE):
        raise NotImplementedError(f"{p.load_information.value} load info is the causal step; not implemented")
    if p.pv_information == PvInformation.FORECAST:
        raise NotImplementedError("FORECAST PV info is the causal step; not implemented")


def _info_block(p: OptimizerParams) -> dict:
    return {"price_information": p.price_information.value, "load_information": p.load_information.value,
            "pv_information": p.pv_information.value, "intraday_information": "not_available",
            "imbalance_information": "not_available",
            "upper_bound_source": ("perfect load & PV knowledge" if
                                   (p.load_information == LoadInformation.PERFECT_ACTUAL or
                                    p.pv_information == PvInformation.PERFECT_ACTUAL)
                                   else "none (prices are legitimately known cleared day-ahead)")}


def _stitch(segments_plans, bat, p, init_soc, horizon_label, commit_counts=None):
    """Concatenate committed portions of segment plans into one DispatchPlan."""
    cpv = []; cgr = []; dld = []; dgr = []; sched = []
    net = gross = degr_tot = charged = discharged = 0.0
    statuses = set()
    for idx, pl in enumerate(segments_plans):
        commit = commit_counts[idx] if commit_counts else len(pl.charge_pv_wh)
        cpv += pl.charge_pv_wh[:commit]; cgr += pl.charge_grid_wh[:commit]
        dld += pl.discharge_load_wh[:commit]; dgr += pl.discharge_grid_wh[:commit]
        base = len(sched)
        for r in pl.schedule[:commit]:
            r = dict(r); r["i"] = base + (r["i"] - pl.schedule[0]["i"]); sched.append(r)
        statuses.add(pl.status)
    charged = wh_to_kwh(sum(cpv) + sum(cgr)); discharged = wh_to_kwh(sum(dld) + sum(dgr))
    net = round(sum(s["expected_net_eur"] for s in sched), 4)
    gross = round(sum(s["marginal_gross_eur"] for s in sched), 4)
    degr_tot = round(sum(s["degradation_cost_eur"] for s in sched), 4)
    term_soc = sched[-1]["soc_after_kwh"] if sched else wh_to_kwh(init_soc)
    summary = {
        "status": "optimal" if statuses <= {"optimal"} else "partial:" + ",".join(sorted(statuses)),
        "mode": "DAY_AHEAD_KNOWN_PRICES_PERFECT_LOAD_PV", "horizon": horizon_label,
        "segments": len(segments_plans),
        "research_label": "RESEARCH — day-ahead prices KNOWN (cleared); upper bound from perfect load/PV; not causal",
        "planned_charged_kwh": round(charged, 4), "planned_discharged_kwh": round(discharged, 4),
        "equivalent_full_cycles": round(discharged / bat.usable_capacity_kwh, 4) if bat.usable_capacity_kwh else 0.0,
        "gross_arbitrage_eur": gross, "degradation_eur": degr_tot, "net_value_eur": net,
        "initial_soc_kwh": round(wh_to_kwh(init_soc), 4), "terminal_soc_kwh": round(term_soc, 4),
        "terminal_soc_policy": p.terminal_soc.value, "n_actions": sum(1 for s in sched if s["action"] != "hold"),
        "information": _info_block(p)}
    return DispatchPlan(cpv, cgr, dld, dgr, sched, summary, summary["status"])


def plan_inputs(scenario: ScenarioConfig, inputs: list[IntervalInput]) -> DispatchPlan:
    """Plan the whole input list under the configured HorizonMode.

    CALENDAR_DAY: solve each local day independently (default; may block cross-midnight arbitrage).
    FULL:         one horizon over the whole list (terminal rule at the true end only).
    ROLLING:      receding horizon (window + commit): solve window with a FREE tail, commit only the
                  first `rolling_commit_hours`, advance, re-plan; last window uses the real terminal rule.
    """
    p = scenario.optimizer
    _validate_information(p)
    bat = scenario.battery
    mode = scenario.tariff.settlement_mode
    tariff = scenario.tariff
    init_soc = kwh_to_wh(bat.usable_capacity_kwh) * bat.initial_soc_frac
    if not inputs:
        return solve_horizon(inputs, bat, tariff, mode, p, init_soc)

    horizon = p.horizon
    if not p.segment_daily:            # legacy flag: segment_daily=False -> whole-list horizon
        horizon = HorizonMode.FULL

    if horizon == HorizonMode.FULL:
        pl = solve_horizon(inputs, bat, tariff, mode, p, init_soc)
        pl.summary["horizon"] = "full"; pl.summary["information"] = _info_block(p)
        pl.summary["mode"] = "DAY_AHEAD_KNOWN_PRICES_PERFECT_LOAD_PV"
        return pl

    if horizon == HorizonMode.ROLLING:
        sec = inputs[0].interval.seconds
        iph = 3600.0 / sec
        win = max(1, int(round(p.rolling_window_hours * iph)))
        commit = max(1, int(round(p.rolling_commit_hours * iph)))
        plans, commits = [], []
        pos, soc = 0, init_soc
        n = len(inputs)
        while pos < n:
            window = inputs[pos:pos + win]
            is_last = (pos + win >= n)
            pw = p if is_last else _replace(p, terminal_soc=TerminalSoc.FREE)
            # final window: 'equal initial'/target refer to the ORIGINAL battery start, not carried SoC
            ref = init_soc if is_last else None
            pl = solve_horizon(window, bat, tariff, mode, pw, soc, terminal_ref_wh=ref)
            c = len(window) if is_last else min(commit, len(window))
            plans.append(pl); commits.append(c)
            soc = kwh_to_wh(pl.schedule[c - 1]["soc_after_kwh"]) if c > 0 else soc
            pos += c
        return _stitch(plans, bat, p, init_soc, f"rolling_{p.rolling_window_hours}h/commit_{p.rolling_commit_hours}h", commits)

    # CALENDAR_DAY (default)
    segments, cur, cur_date = [], [], None
    for iv in inputs:
        d = iv.interval.start.date()
        if cur_date is None or d == cur_date:
            cur.append(iv); cur_date = d
        else:
            segments.append(cur); cur = [iv]; cur_date = d
    if cur:
        segments.append(cur)
    plans, soc = [], init_soc
    for seg in segments:
        pl = solve_horizon(seg, bat, tariff, mode, p, soc)
        plans.append(pl)
        soc = kwh_to_wh(pl.summary["terminal_soc_kwh"])
    return _stitch(plans, bat, p, init_soc, "calendar_day")
