# Blocked-visual specifications — `wat-levert-een-thuisbatterij-op`

*These visuals are NOT built (no reproducible/canonical source). No invented, interpolated or linearly scaled values. Build only after the read-only Render export restores the data with provenance. Capacity-vs-power has its own file (`CAPACITEIT_VERMOGEN_SVG_BLOCKED.md`).*

## `marktjaar-2024-versus-2025.svg` — BLOCKED
- **Missing:** the 2024 result/range (€1.260–1.460) is `ARCHIVED_SOURCE_PENDING` (original model output on Render). The 2025 side is READY (canonical €654–878).
- **Build when:** the 2024 run is restored with the same system/profiles/assumptions.
- **Then show:** 2025 vs 2024 range, absolute + % difference, identical-system note; label 2024 a favourable historical market year (not a norm).

## `verdienmodel-2026-versus-2027.svg` — BLOCKED
- **Missing:** the per-component 2026/2027 values (handel, waarde eigen verbruik, vermeden terugleverkosten) are single-profile archived runs, not in `CANONICAL_METRICS.json`; 2027 values are scenario/assumption.
- **Build when:** the single-profile dispatch components are exported per component.
- **Then show:** 2026 (handel, waarde opslag onder saldering) vs 2027 (handel, +waarde eigen verbruik, vermeden export); label every 2027 value scenario/assumption/niet gegarandeerd.

## `opbouw-jaaropbrengst.svg` (waterfall) — BLOCKED
- **Missing:** components (self-consumption, gross trading, paid charging, losses, EMS fee, revenue sharing, net) exist only as matrix-wide ranges, not as one profile's separable exact values.
- **Build when:** a single named profile's component breakdown is exported and sums exactly to its total.

## `maand-model-versus-praktijk.svg` — BLOCKED
- **Missing:** monthly model and monthly practice series (only the December qualitative note exists).
- **Build when:** monthly series are exported for both.

## `opbrengstmatrix-groter-systeem-model.svg` (21,8 kWh / 12 kW) — BLOCKED
- **Missing:** the full 25-profile larger-system matrix. Do not base it on the single €1.012 reference.
- **Build when:** `research/data/render-simulation-export.json` provides the exact config, all cells, market year, assumptions and provenance (see `RENDER_EXPORT_COMMANDS.md`). Then add a side-by-side comparison SVG vs the 14 kWh matrix.
