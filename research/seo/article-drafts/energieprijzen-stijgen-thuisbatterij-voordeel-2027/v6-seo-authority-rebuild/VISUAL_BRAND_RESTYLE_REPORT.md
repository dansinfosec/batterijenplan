# VISUAL BRAND RESTYLE REPORT — V6 (2027 article)

Date 2026-08-03. Restyled all six article SVGs from a generic blue/green/red chart palette to the
Batterijenplan "industrieel energielabel" identity (paper/ink/volt-yellow/copper). Tokens verified in
`frontend/src/styles/global.css`. See `VISUAL_BRAND_TOKENS.json`. **No numerical value, label, ordering,
scale or data relationship changed** — only palette, outlines, hard-offset-shadow framing and classification
badges. Files in `visuals/` and `production-visuals/` are byte-identical.

## Global changes (all six)
- **Previous palette:** navy `#0f2f4a`, teal `#3d7ea6`, dark-teal `#25526e`, green `#2e8b57`, red `#c94b4b`,
  blue-greys `#5a6b78`/`#8a97a1`/`#c3ccd3`/`#eef1f3`/`#a7b1b9`, white `#ffffff`.
- **New palette:** paper `#F7F6F2`, ink `#12130F` (+ `#4C4D46`/`#6B6C64` secondary), volt `#FFD100`
  (+ `#8A6D00` for yellow text on light), copper `#B4592E`, warm rules `#C9C5BA`/`#E7E3DA`.
- **Framing:** paper canvas + 2.5px ink card border + hard offset ink shadow (+8) + volt accent tab
  (matches site cards/buttons). Font stack now names Inter/Archivo (site fonts) with system fallback.
- **Classification badge:** paper chip with mono label — solid ink border = ENGINE RESULT; dashed ink
  border = SCENARIO-OVERLAY. Grayscale-safe (labels/patterns, never colour alone).
- **Old-palette occurrences removed:** 100% (validated: 0 remaining across both folders).

## Per chart

### 1. policy-versus-fee-waterfall.svg
- Colours: policy/self-consumption bar green→**volt**; avoided feed-in bar teal→**copper**; interaction grey line→**ink** marker + €0; total navy→**ink with volt hard-offset shadow**; all bars 2px ink outline; red representative-note→**copper**.
- Legend added: "GEEL = ZUIVER BELEIDSEFFECT · KOPER = VERMEDEN TERUGLEVERKOSTEN · ZWART = TOTAAL · HANDEL NIET MEEGEREKEND".
- Meaning: yellow = policy/self-consumption, copper = avoided feed-in cost, ink = total; excludes trading.
- Accessibility: values `+€390 / +€202 / €0 / €592` and `€390 + €202 + €0 = €592` unchanged; grayscale via +/€ labels + shape hierarchy.
- Data integrity: **no value changed.** SHA-256 `5952ea937605d670e4a45a48535bd08bb7c01b9d5471949e59330010207a9af6` (visuals/ == production-visuals/).

### 2. pure-policy-effect-heatmap.svg
- Colours: blue-grey sequential scale → **paper → pale-volt → volt → ink** sequential (monotone luminance, no blue/rainbow); cell grid white→**1.5px ink**; text ink on light cells, paper on dark cells; legend gradient updated.
- Meaning: darker/more-yellow = higher policy effect; ENGINE RESULT badge.
- Accessibility: all 25 cell values + `€172…€761` legend unchanged; explicit legend; readable at mobile.
- Data integrity: **no value changed.** SHA-256 `6fd7ae6b079b89dc00fa39f9789cad3e8fa488c90b00b04e33d9a7d696536a80`.

### 3. feed-in-structure-comparison.svg
- Colours: per-kWh bars teal→**volt**; staffel/hybride dark-teal→**copper**; fixed €0 red sliver→**paper fill + ink outline + "€0"**; legend swatches updated; all bars 2px ink outline.
- Meaning: per-kWh continuously avoidable (yellow), staffel/hybride only at a boundary (copper), fixed = no avoidable value (outlined paper); 12,6 kWh scope note retained.
- Data integrity: **no value changed.** SHA-256 `e18fb0b62b3e22ba8848ba68a0361d76bcf764e67718f922f280c8fce72af6d7`.

### 4. battery-size-diminishing-returns.svg
- Colours: median bars navy→**volt**; maximum bars teal→**copper**; trend line/axes→**ink**; green annotation→**volt_dk**; legend updated.
- Added scope label "ZELFCONSUMPTIE-EFFECT — HANDELSWAARDE NIET MEEGEREKEND" (does not imply larger batteries lack trading value).
- Median vs maximum distinguished by colour **and** position/label.
- Data integrity: **no value changed** (7/10/12,6/21,8 kWh; €391/€539/€404/€669/€405/€761/€407/€895). SHA-256 `3c08444b4ae369cbb6697e695b68ce697e319f543e4d2e5615bc29bcb29acc2b`.

### 5. optional-trading-downside.svg
- Visible title → **"Wanneer voegt handel netto waarde toe?"**; bars teal→**copper**; 100% "nooit rendabel" line red→**bold ink dashed**; card border **dashed** (overlay); prominent **SCENARIO-OVERLAY — GEEN GESIMULEERDE HANDELSOPBRENGST** badge; note "Een EMS doet alleen mee als de netto incrementele waarde positief is."
- Does not imply trading revenue must decline; frames trading as optional additional value.
- Data integrity: **no value changed** (42/21/14/10%; €126; €300–€1.200). SHA-256 `f147a3111d417a86c32ad6d77cedd1e2135eceb32c8359ec1e420d0c2aa3d8bf`.

### 6. reserve-opportunity-cost-distribution.svg
- Colours: median bars navy→**volt**; mean bars teal→**copper**; maximum grey→**ink hatch (paper+ink pattern)**; green note→**volt_dk**; legend updated.
- Subtitle adds "opportuniteitskost — vergelijk met incrementele handelsopbrengst" (framed as cost to weigh against trading revenue, not purely negative).
- Median/mean/max distinguished by colour **and** pattern (hatch) **and** label.
- Data integrity: **no value changed** (median/mean/max per 10–50% reserve). SHA-256 `05a97152dd7335ccb18dabbed5d52a9ff272594b6a15d2b37f70bd594f76926f`.

## Refinements during preview
- Reserve/max hatch changed from a rotated pattern to a cheaper non-rotated diagonal (same visual intent) to avoid a browser rasterisation freeze during screenshot capture — no data/meaning change.
- Trading SCENARIO-OVERLAY badge moved from the chart footer to below the subtitle to remove a text overlap with the €126 note.
- Checksums above are the FINAL values after these refinements (visuals/ == production-visuals/).

## Mobile
All six use responsive `viewBox` + `width="100%" height="auto"`; verified no page-level horizontal overflow
at 390px in the rebuilt article preview (see `production-preview/brand-restyle/`). Wide infographics still
compress on mobile (main labels readable; small footnotes small) — unchanged from before, a size trade-off.

## Confirmation
No numerical value changed in any chart (data-integrity check: every original value still present; 0 missing).
No old generic blue/green/red palette remains (0 occurrences). All six valid XML, unique IDs, role=img +
aria-labelledby, no external scripts/fonts/images.
