# SVG asset index — `wat-levert-een-thuisbatterij-op`

*All READY SVGs read their numbers from canonical JSON (`CANONICAL_METRICS.json`, `data/practice/CANONICAL_PRACTICE_REFERENCE.json` (verplaatst uit deze map)); mappings in `SVG_DATA_LINEAGE.json`. Editable text, valid XML, `role="img"` + title/desc, ≥16 px labels, brand palette. PNG = review preview only; publish the SVG. Not for production apply.*

## READY (built) — in `brand-assets/article-visuals/wat-levert-een-thuisbatterij-op/diagrams/`
| # | File (.svg + .png) | Data source | Status | Placement |
|---|---|---|---|---|
| 1 | opbrengstmatrix-14kwh-10kw-model | CANONICAL_METRICS.json → cells + unweighted stats | READY | **§4 (SELECTED)** |
| 2 | opbrengst-per-woningprofiel-14kwh | CANONICAL_METRICS.json → cells | READY | **§4 (SELECTED)** |
| 3 | invloed-zonnepanelen-op-opbrengst | CANONICAL_METRICS.json → cells[3] (4.500) | READY | supporting |
| 4 | model-versus-praktijk | CANONICAL_METRICS (model) + PRACTICE_REFERENCE | READY | **§7 (SELECTED)** |
| 5 | opbrengst-per-kwh-praktijk | CANONICAL_METRICS + PRACTICE_REFERENCE | READY | **§6 (SELECTED)** |
| 6 | bewijs-achter-de-opbrengst | methodology (no numbers) | READY | **§Verantwoording (SELECTED)** |
| 7 | welke-opbrengst-past-bij-mijn-situatie | decision (no numbers) | READY | **near CTA (SELECTED)** |
| — | praktijkresultaten-20-24kwh | PRACTICE_REFERENCE | READY | supporting (was §7; de-selected to avoid duplicate practice message) |
| — | opbrengst-variabelen | approved earlier diagram | READY | supporting/social |

## BLOCKED (specs kept) — not built, no invented values
| File | Reason | Spec |
|---|---|---|
| capaciteit-versus-omvormervermogen.svg | inverter/capacity sweep runs not in repo | `CAPACITEIT_VERMOGEN_SVG_BLOCKED.md` |
| opbrengstmatrix-groter-systeem-model.svg | 21.8 kWh/12 kW matrix pending Render | `BLOCKED_VISUALS_SPECS.md` |
| marktjaar-2024-versus-2025.svg | 2024 range €1.260–1.460 is ARCHIVED_SOURCE_PENDING | `BLOCKED_VISUALS_SPECS.md` |
| verdienmodel-2026-versus-2027.svg | per-component values are single-profile archived runs, not canonical | `BLOCKED_VISUALS_SPECS.md` |
| opbouw-jaaropbrengst.svg (waterfall) | components exist only as matrix-wide ranges | `BLOCKED_VISUALS_SPECS.md` |
| maand-model-versus-praktijk.svg | monthly series not in repo | `BLOCKED_VISUALS_SPECS.md` |

Any chart using +46%, €641, €45/min, €15 or €1.012 stays BLOCKED (see `QUANTITATIVE_CLAIM_REGISTRY.json`).
