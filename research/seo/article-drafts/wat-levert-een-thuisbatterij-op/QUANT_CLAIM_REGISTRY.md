# Quantitative claim registry — `wat-levert-een-thuisbatterij-op`

*Internal. Tracks the provenance/status of every numeric claim so nothing archived or unsupported is published as a reproducible own-simulation. Not for production apply.*

Statuses: **REPRODUCIBLE** (derivable now from `CANONICAL_METRICS.json`) · **ARCHIVED_SOURCE_PENDING** (was produced by the original model runs; raw data on Render, pending read-only export) · **BLOCKED_WEIGHTS_UNDOCUMENTED** · **PRACTICE/REFERENCE** (external, user/MijnBatterij.nl) · **UNSUPPORTED**.

## Reproducible now (published)
| Claim | Value | Status | Source |
|---|---|---|---|
| Matrix min / max / range | €654 / €878 / €224 | REPRODUCIBLE | canonical, 25 cells |
| Arithmetic mean (unweighted) | €744 | REPRODUCIBLE | canonical |
| Median (unweighted) | €734 | REPRODUCIBLE | canonical |
| P10–P90 (linear) | €678–830 | REPRODUCIBLE | canonical |
| Per nominal kWh | ~€53 (range €47–63) | REPRODUCIBLE | canonical (mean ÷ 14) |
| No-solar column | €654–686 | REPRODUCIBLE | canonical |
| €812 (small battery / strong inverter) | €812 | REPRODUCIBLE | matrix cell 4.500 kWh / 1,2× |
| Platform cost €10/mo → −€120/yr | −€120 | REPRODUCIBLE | arithmetic |
| 15% winstdeling ≈ −€90/yr | −€90 | REPRODUCIBLE (indicative) | article §8/§suppliers |

## Removed from published copy — held ARCHIVED_SOURCE_PENDING
| Claim | Archived value | Where it was | Restore requires |
|---|---|---|---|
| 5 kW → 10 kW inverter | **+46%** | §4 insight, FAQ ×2, §5 caption | inverter sweep runs (same profile/PV/year/EMS/tariff) |
| Large battery / weak inverter | **€641** | §"Invloed" caption | the exact (kWh, kW) config + its run |
| Signal-delay sensitivity | **±€45 per minute** | §4 insight | delay-sweep runs |
| Round-trip 86% vs 94% | **±€15/yr** | §4 insight, FAQ rendement | efficiency-sweep runs |
| 24.2 kWh / 12 kW single run | **€1,012/yr** | §6 validation (kept, explicitly labelled "één referentiepunt, geen matrix") | full per-profile run |
| 21.8 kWh / 12 kW matrix | (none published) | pending | full 25-profile run |

*In the article these are now expressed qualitatively plus the standing note: "In onze gearchiveerde simulaties had omvormervermogen meer invloed op de jaaropbrengst dan dezelfde investering in extra opslagcapaciteit. De exacte gevoeligheidsruns worden opnieuw controleerbaar toegevoegd zodra de onderliggende onderzoeksdata is hersteld."*

## Blocked — weights undocumented
| Claim | Value | Status |
|---|---|---|
| Weighted average | €750 | BLOCKED_WEIGHTS_UNDOCUMENTED — replaced in copy by unweighted €744 |
| Weighted median | €764 | BLOCKED — replaced by unweighted €734 |
| Weighted P10–P90 | €695–839 | BLOCKED — replaced by €678–830 |
| Market-year factor 2024 vs 2025 | ×1,9 | derived from the archived 2024 range €1.260–1.460 (favourable historical year); kept only as a historical comparison, not a forecast |

## Practice / reference (external, labelled in-article)
Zonneplan 20 kWh N=267 €992–1.123 · Sigenergy 24,2 kWh N=25 €733–1.800 (+ N=1 €1.688,37) · Tibber 13,3 kWh N=11 €1.162–1.298 · Bliq 20 kWh N=3 €966,68–1.276,68 · GivEnergy 20,4 kWh N=4 €639,44–1.363,55 · Dyness–Solis 21,3 kWh N=1 €1.139,71 · HYXiPOWER 21,2 kWh N=1 €657,19. All PRACTICE/REFERENCE, ranges shown as published min–max (no median/mean derived from a range).
