# BLOCKED spec — `capaciteit-versus-omvormervermogen.svg`

**Status: BLOCKED — awaiting the read-only Render export.** The editorial section
("## 5. Waarom omvormervermogen vaak belangrijker is dan extra capaciteit")
stays in the article as qualitative copy; only the *quantified* chart is blocked.
Do not invent, interpolate or linearly scale the missing values.

## Why blocked — exact data points missing
A controlled capacity×power chart needs reproducible per-configuration runs that
are not in the repository (they live in the Render research data, pending export):

- annual net yield for the **same battery capacity** at **5 / 6 / 10 / 12 kW** inverter;
- annual net yield for the **same inverter power** at a **smaller** and a **larger** battery;
- for each: cycles, curtailed trading opportunities, and the number of price/imbalance
  windows where inverter power was the limiting factor.

Currently reproducible: only €812 (14 kWh / 10 kW, 4.500 kWh / 1,2× cell). The
previously-quoted +46% (5→10 kW), €641 (large/weak), and ±€45/min are held in
`QUANT_CLAIM_REGISTRY.md` as `ARCHIVED_SOURCE_PENDING`.

## Required controlled comparison (after export)
Hold every non-varied dimension identical: household profile · PV ratio · market
year (2025) · EMS logic · tariff assumptions · usable battery capacity · efficiency
and degradation.

1. **Same capacity, vary inverter:** 5 kW · 6 kW · 10 kW · 12 kW
2. **Same inverter, vary battery:** smaller vs larger battery

Report per configuration: annual net yield · absolute difference · percentage
difference · yield per additional inverter kW · cycles · curtailed trading
opportunities · count of windows where inverter power was the binding constraint.

## Consistency checks before use
- the 5→10 kW delta should reconcile with the archived +46% once restored;
- €812 (14 kWh / 10 kW) must reappear as an anchor cell;
- reject any run whose assumptions differ from the 14 kWh matrix (`CANONICAL_METRICS.json`).

## Visual (build only when data is restored, with provenance)
- filename: `capaciteit-versus-omvormervermogen.svg` (matrix or bubble: capacity kWh × inverter kW → € net yield)
- main message: **"Meer opslag helpt alleen wanneer het systeem die opslag snel genoeg kan benutten."**
- labels: MODEL/SCENARIO; state profile, PV ratio, market year; text ≥16 px; title+desc; role="img".


## Interne provenance-notitie (verplaatst uit de publieke tekst, 2026-08-02)

> In onze gearchiveerde simulaties had omvormervermogen meer invloed op de jaaropbrengst dan dezelfde investering in extra opslagcapaciteit. De exacte gevoeligheidsruns worden opnieuw controleerbaar toegevoegd zodra de onderliggende onderzoeksdata is hersteld.

Deze status hoort niet in de publieke tekst; de gevoeligheidscijfers (+46%, €641, €45/min, €15) staan als ARCHIVED_SOURCE_PENDING in QUANT_CLAIM_REGISTRY.md en QUANTITATIVE_CLAIM_REGISTRY.json.
