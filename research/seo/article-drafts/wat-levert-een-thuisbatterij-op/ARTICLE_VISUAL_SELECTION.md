# Article visual selection & performance plan — `wat-levert-een-thuisbatterij-op`

*Selected six for the main article; each adds a distinct evidence layer (no repeated conclusion in a second format). Not for production apply.*

## Selected visuals (in reading order)

| # | SVG | Appears after heading | New information it adds | Duplicates? | Desktop width | Mobile-simplified? | Est. size (SVG) | Inline or `<img>` | Loading |
|---|---|---|---|---|---|---|---|---|---|
| 1 | opbrengstmatrix-14kwh-10kw-model | `## 4. De opbrengstmatrix: 25 profielen` (after the table) | the full own-model result surface (25 cells + stats) | visualises the §4 table (same data, spatial heatmap) — kept as the anchor | 100% col (≤760 px; viewBox 980×600) | no (scales; cells stay ≥16 px) | ~10 KB | inline SVG | **eager** (first important visual) |
| 2 | opbrengst-per-woningprofiel-14kwh | end of `## 4` (after the "Drie inzichten" list) | how much the *household profile* moves the result (spread €224) | no — different lens (profile spread, not the grid) | 100% col | no | ~8 KB | `<img loading=lazy>` | lazy |
| 3 | opbrengst-per-kwh-praktijk | `## 6. Validatie…` (before "de kern in drie punten") | normalisation: model vs practice per nominal kWh | no — €/kWh lens, not absolute € | 100% col | no | ~7 KB | `<img loading=lazy>` | lazy |
| 4 | model-versus-praktijk | `## 7. Praktijkresultaten…` | absolute model-vs-practice ranges + sample sizes | no — absolute € + N labels (per-kWh chart is a different axis) | 100% col | no (720 px tall; rows stack) | ~9 KB | `<img loading=lazy>` | lazy |
| 5 | bewijs-achter-de-opbrengst | before `## Verantwoording en bronnen` | methodology/credibility ladder (no numbers) | no — method, not results | 100% col | no | ~5 KB | `<img loading=lazy>` | lazy |
| 6 | welke-opbrengst-past-bij-mijn-situatie | end of article, at the CTA | the reader's own decision factors → calculator | no — action/decision, not evidence | 100% col | no | ~5 KB | `<img loading=lazy>` | lazy |

**Market-year comparison (preferred slot #5) is intentionally omitted** — its 2024 range is `ARCHIVED_SOURCE_PENDING`, so it is not READY.

## Editorial flow honoured
direct answer + summary card → 14 kWh matrix (1) → household/PV influence (2) → per-kWh normalisation (3) → model vs practice (4) → evidence ladder (5) → decision/calculator at the CTA (6). No two large visuals sit back-to-back without HTML: (1) and (2) are separated by the "Drie inzichten" copy; every other visual has its section prose around it. The calculator/decision visual sits by the final CTA, not in the research sequence.

## Not selected (supporting assets)
`invloed-zonnepanelen-op-opbrengst` (overlaps #2's profile message), `praktijkresultaten-20-24kwh` (overlaps #4's practice message), `opbrengst-variabelen` (superseded by the prose capacity section). Retained for social / related-post / calculator-explainer use.

## Performance
- SVG markup is hand-generated (no editor metadata, no unused groups, no filters/shadows/masks); text is not converted to paths.
- No embedded base64 raster inside any SVG; all far below the 150 KB target (largest ≈10 KB).
- Accessible `<title>`/`<desc>` + `role="img"` on every file; stable `viewBox`.
- PNG exports are review-only; the website should serve the `.svg`.
- Mobile: 980-px viewBox scales to the column; all data labels ≥15–16 px so text stays readable without horizontal scroll (verified on the 390-px preview).
