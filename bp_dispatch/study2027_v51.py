# -*- coding: utf-8 -*-
"""bp-dispatch-v1 · BP-2027 V5.1 — SYMMETRIC 2x2 POLICY / FEED-IN-FEE DECOMPOSITION.

V5 reported one headline "incremental_2027" value = D - A, which MIXES two distinct changes:
  (1) the end of annual net metering (saldering), and
  (2) the value of avoiding a feed-in cost (terugleverkosten).
V5.1 separates them with a symmetric 2x2 settlement design, holding the physical simulation identical:

    +-----------------+---------------------------+---------------------------+
    |                 |   NO FEE                   |   WITH FEE                |
    +-----------------+---------------------------+---------------------------+
    | ANNUAL NETTING  | A  PRE_2027_NO_FEE         | B  PRE_2027_WITH_FEE      |
    | (pre-2027)      |                           |                           |
    +-----------------+---------------------------+---------------------------+
    | NO NETTING      | C  POST_2027_NO_FEE       | D  POST_2027_WITH_FEE     |
    | (post-2027)     |                           |                           |
    +-----------------+---------------------------+---------------------------+

Each cell is the BATTERY VALUE (no-battery bill - battery bill) under that settlement world, computed on
the SAME physical run (same household, same battery, same dispatch). Only the settlement / fee changes.

Decomposition:
    PURE_POLICY_EFFECT_NO_FEE   = C - A
    PURE_POLICY_EFFECT_WITH_FEE = D - B
    FEED_IN_COST_VALUE_PRE      = B - A
    FEED_IN_COST_VALUE_POST     = D - C
    INTERACTION_EFFECT          = (D - C) - (B - A)
    TOTAL_CHANGE_A_TO_D         = D - A
Identities (both must hold): TOTAL = (C-A) + (D-C) = (B-A) + (D-B).

Because terugleverkosten are levied on GROSS PHYSICAL EXPORT — which is identical across A/B/C/D (only
settlement changes, never the physics) — the fee-avoidance value is settlement-independent, so
B - A == D - C and the interaction is structurally 0. This is a RESULT of the model, verified per row,
not an assumption: it means the policy effect and the fee effect are additively separable in a
self-consumption battery. It does NOT hold for grid-charging / export-arbitrage batteries (out of scope).

Reuses study2027.run_physical / evaluate: a single evaluate() call already yields A (pre value, no fee),
D (post value with fee) and the fee value; C = D - fee and B = A + fee.
"""
from __future__ import annotations
import math
import statistics
from . import study2027 as st
from . import feed_in_cost as fic
from . import imbalance_overlay as imb

TOL = 0.02  # euro tolerance for identity checks


# --------------------------------------------------------------------------- fee structure catalogue
def fee_structures() -> dict:
    """The 8 fee structures required by the V5.1 plan. Same definition is used pre- and post-2027."""
    ANNUAL_TIERS = [(500, 0.0), (1500, 60.0), (3000, 150.0), (float("inf"), 300.0)]
    MONTHLY_TIERS = [(50, 0.0), (150, 8.0), (float("inf"), 20.0)]
    return {
        "NONE": fic.FeedInCostConfig(structure=fic.NONE),
        "PER_KWH_0.05": fic.FeedInCostConfig(structure=fic.PER_KWH, per_kwh=0.05),
        "PER_KWH_0.10": fic.FeedInCostConfig(structure=fic.PER_KWH, per_kwh=0.10),
        "PER_KWH_0.15": fic.FeedInCostConfig(structure=fic.PER_KWH, per_kwh=0.15),
        "MONTHLY_TIER": fic.FeedInCostConfig(structure=fic.MONTHLY_TIER, tiers=MONTHLY_TIERS),
        "ANNUAL_TIER": fic.FeedInCostConfig(structure=fic.ANNUAL_TIER, tiers=ANNUAL_TIERS),
        "FIXED_MONTHLY": fic.FeedInCostConfig(structure=fic.FIXED_MONTHLY, fixed_monthly=10.0),
        "HYBRID": fic.FeedInCostConfig(structure=fic.HYBRID, fixed_monthly=5.0, per_kwh=0.05),
    }


# --------------------------------------------------------------------------- 2x2 evaluation
def evaluate_2x2(phys, battery, ip, fc, feed_in_cfg) -> dict:
    """Return the four 2x2 battery-value cells + the decomposition for one physical run + fee structure.

    A = PRE_2027_NO_FEE   (annual netting, no feed-in cost)
    B = PRE_2027_WITH_FEE (annual netting, with feed-in cost)     = A + avoided_fee
    C = POST_2027_NO_FEE  (no netting, no feed-in cost)           = D - avoided_fee
    D = POST_2027_WITH_FEE(no netting, with feed-in cost)
    """
    ev = st.evaluate(phys, battery, ip=ip, fc=fc, feed_in_cfg=feed_in_cfg)
    A = ev["pre_2027_battery_value_eur"]              # annual netting, feed-in cost EXCLUDED
    D = ev["post_2027_battery_value_eur"]             # no netting + feed-in cost
    fee = ev["avoided_feed_in_cost_value_eur"]        # settlement-independent (gross physical export)
    C = round(D - fee, 4)                             # no netting, no fee
    B = round(A + fee, 4)                             # annual netting, with fee

    pure_policy_no_fee = round(C - A, 4)
    pure_policy_with_fee = round(D - B, 4)
    fee_value_pre = round(B - A, 4)
    fee_value_post = round(D - C, 4)
    interaction = round((D - C) - (B - A), 4)
    total = round(D - A, 4)

    # identities
    id_policy_first = round(pure_policy_no_fee + fee_value_post, 4)
    id_fee_first = round(fee_value_pre + pure_policy_with_fee, 4)
    identities_ok = (abs(id_policy_first - total) < TOL) and (abs(id_fee_first - total) < TOL)

    fid = ev["feed_in_detail"]
    return {
        "A_pre_2027_no_fee_eur": A,
        "B_pre_2027_with_fee_eur": B,
        "C_post_2027_no_fee_eur": C,
        "D_post_2027_with_fee_eur": D,
        "pure_policy_effect_no_fee_eur": pure_policy_no_fee,
        "pure_policy_effect_with_fee_eur": pure_policy_with_fee,
        "feed_in_cost_value_pre_eur": fee_value_pre,
        "feed_in_cost_value_post_eur": fee_value_post,
        "interaction_effect_eur": interaction,
        "total_change_a_to_d_eur": total,
        "identity_policy_plus_feepost_eur": id_policy_first,
        "identity_feepre_plus_policyw_eur": id_fee_first,
        "identities_ok": identities_ok,
        "annual_export_no_battery_kwh": fid["annual_export_no_battery_kwh"],
        "annual_export_battery_kwh": fid["annual_export_battery_kwh"],
        "annual_fee_no_battery_eur": fid["annual_fee_no_battery_eur"],
        "annual_fee_battery_eur": fid["annual_fee_battery_eur"],
    }


# --------------------------------------------------------------------------- summary statistics
def stats(vals) -> dict:
    vals = sorted(vals)
    if not vals:
        return {"n": 0}
    q = statistics.quantiles(vals, n=4) if len(vals) >= 4 else [vals[0], statistics.median(vals), vals[-1]]
    return {
        "n": len(vals),
        "min": round(min(vals), 1), "q1": round(q[0], 1),
        "median": round(statistics.median(vals), 1), "mean": round(statistics.mean(vals), 1),
        "q3": round(q[2], 1), "max": round(max(vals), 1),
    }


# --------------------------------------------------------------------------- reserve opportunity cost
def reserve_full_matrix(consumptions, pv_ratios, batteries, ip, fc, feed_in_cfg,
                        reserves=(0.0, 0.1, 0.2, 0.3, 0.5)) -> list:
    """Reserve opportunity cost across ALL profiles x ALL batteries x reserve fractions.
    Lost self-consumption vs the 0%-reserve battery is the trading-reserve opportunity cost."""
    rows = []
    for c in consumptions:
        for r in pv_ratios:
            for (bname, usable, power) in batteries:
                for row in st.reserve_opportunity_cost(c, r, usable, power, ip=ip, fc=fc,
                                                       feed_in_cfg=feed_in_cfg, reserves=reserves):
                    rows.append({"profile_id": f"C{c}_R{r:.2f}", "consumption_kwh": c, "pv_ratio": r,
                                 "battery": bname, **row})
    return rows


def reserve_summary(rows) -> list:
    """Per reserve fraction: distribution of the lost self-consumption (opportunity cost)."""
    out = []
    fracs = sorted({r["reserve_fraction"] for r in rows})
    for f in fracs:
        losses = [r["lost_self_consumption_eur"] for r in rows if r["reserve_fraction"] == f]
        n = len(losses)
        s = stats(losses) if losses else {}
        out.append({
            "reserve_fraction": f, "n": n,
            "min_loss_eur": s.get("min"), "median_loss_eur": s.get("median"),
            "mean_loss_eur": s.get("mean"), "max_loss_eur": s.get("max"),
            "pct_le_5": round(100.0 * sum(1 for x in losses if x <= 5.0) / n, 1) if n else None,
            "pct_gt_25": round(100.0 * sum(1 for x in losses if x > 25.0) / n, 1) if n else None,
            "pct_gt_50": round(100.0 * sum(1 for x in losses if x > 50.0) / n, 1) if n else None,
            "pct_gt_100": round(100.0 * sum(1 for x in losses if x > 100.0) / n, 1) if n else None,
        })
    return out


# --------------------------------------------------------------------------- optional imbalance participation
def imbalance_optional(self_consumption_value_eur, gross_refs=(300.0, 600.0, 900.0, 1200.0),
                       market_factors=(1.00, 0.75, 0.50, 0.25, 0.00),
                       customer_share=0.85, fixed_ems_cost=80.0, variable_ems_cost=0.0,
                       extra_degradation=25.0, reserve_opportunity_cost=0.0) -> list:
    """Optional imbalance PARTICIPATION overlay (NOT a simulated market result).

    For every (gross_ref, market_factor) compute the net overlay, then:
      FORCED_PARTICIPATION_TOTAL  = self_consumption_value + net_overlay
      OPTIMAL_PARTICIPATION_TOTAL = self_consumption_value + max(0, net_overlay)   (opt out if net < 0)
    participate = net_overlay > 0. At market_factor 0 the overlay is negative (only costs) -> opt out,
    so OPTIMAL_PARTICIPATION_TOTAL == self_consumption_value.
    """
    rows = []
    for g in gross_refs:
        for m in market_factors:
            ov = imb.net_overlay(g, m, customer_share, fixed_ems_cost, variable_ems_cost,
                                 extra_degradation, reserve_opportunity_cost)
            net = ov["net_overlay_eur"]
            participate = net > 0.0
            forced = round(self_consumption_value_eur + net, 2)
            optimal = round(self_consumption_value_eur + max(0.0, net), 2)
            rows.append({
                "gross_reference_eur": g, "market_value_factor": m,
                "customer_share": customer_share,
                "net_overlay_eur": net,
                "aggregator_share_eur": ov["aggregator_share_eur"],
                "fixed_ems_cost_eur": fixed_ems_cost, "variable_ems_cost_eur": variable_ems_cost,
                "extra_degradation_eur": extra_degradation,
                "reserve_opportunity_cost_eur": reserve_opportunity_cost,
                "self_consumption_value_eur": round(self_consumption_value_eur, 2),
                "participate": participate,
                "forced_participation_total_eur": forced,
                "optimal_participation_total_eur": optimal,
                "label": imb.LABEL,
            })
    return rows


def break_even(gross_refs=(300.0, 600.0, 900.0, 1200.0), customer_share=0.85,
               fixed_ems_cost=80.0, variable_ems_cost=0.0, extra_degradation=25.0,
               reserve_opportunity_cost=0.0) -> list:
    """Break-even market_value_factor and break-even gross reference for each gross reference.

    net = gross*f*share - costs = 0  =>  f_be = costs / (gross*share).
    break-even gross (at f=1) = costs / share.  If f_be > 1 the gross reference can NEVER be worth it.
    """
    costs = fixed_ems_cost + variable_ems_cost + extra_degradation + reserve_opportunity_cost
    be_gross = round(costs / customer_share, 2) if customer_share else None
    rows = []
    for g in gross_refs:
        denom = g * customer_share
        f_be = (costs / denom) if denom else None
        rows.append({
            "gross_reference_eur": g, "customer_share": customer_share,
            "total_costs_eur": round(costs, 2),
            "break_even_market_factor": round(f_be, 4) if f_be is not None else None,
            "achievable": (f_be is not None and f_be <= 1.0),
            "break_even_gross_reference_eur": be_gross,
            "reserve_opportunity_cost_eur": reserve_opportunity_cost,
            "label": imb.LABEL,
        })
    return rows
