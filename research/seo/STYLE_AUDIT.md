# Style Audit — four payback/comparison articles

**Date:** 2026-08-02 · Local review of the current production copy (read-only). Goal: make the copy read
like a real Dutch energy editor wrote it — human, concrete, scannable, credibly persuasive — without
losing research or overstating evidence.

Cross-cutting AI-tells found across the set:
- **One-sentence-per-paragraph rhythm** (worst in article 3): monotonous, no paragraph flow.
- **Rhetorical questions in bold** used as transitions ("**wanneer verdien ik hem terug?**").
- **Repetition**: the same idea/bullets restated in multiple sections.
- **Filler/telling instead of showing**: "een batterij is geen magische geldmachine", "logisch".
- **Overexplaining the obvious**: defining a laadcyclus mid-article.
- **First-person marketing drift** ("Daarom werkt Groene Vrienden niet met loze beloftes") in what is a Batterijenplan article — inconsistent voice.
- **Weak fact/assumption/example contrast**: model numbers, practice data and illustrations blur together without visual labels.

---

## 1. `thuisbatterij-vergelijken` (comparison pillar)
- **Too AI-like:** listy and even — every section is "X: waarop letten" + a bullet list, same cadence; intro is competent but generic; "u"-heavy hedging.
- **Strong already:** genuinely useful checklist content (usable vs nominal, AC/DC, EMS, garantie, noodstroom); answer-first §1; the comparison + AC/DC tables.
- **Simplify:** merge overlapping "waar u op let / waarom het telt" phrasing; trim the FAQ overlap with the body.
- **Cut:** repeated "niet alleen op prijs" restatements.
- **Rewrite:** intro → a sharper hook + a **"Vergelijk op deze 6 punten" callout**; turn the prose checklist into a real **comparison matrix** (capacity/power/AC-DC/EMS/garantie/noodstroom/installatie).
- **More concrete:** add one worked mini-example ("10 kWh nominaal, 80% DoD = 8 kWh bruikbaar").
- **Move up:** the checklist matrix directly under the answer.
- **To bullets/tables/callouts:** the 6-point summary → callout; the criteria → matrix.

## 2. `wat-levert-een-thuisbatterij-op` (canonical pillar)
- **Too AI-like:** least of the four — it already reads like a real analyst. Minor tells: a few "Let op wat hier gebeurt"-style nudges; dense number-walls without a 30-second summary card.
- **Strong already (KEEP):** the 135-simulation methodology, 25-profile matrix, 21-leverancier table, validation vs 300+ installs, limitations, bronnenregister, and the Groene-Vrienden **partnership disclosure** — this is the credibility engine. Do not touch the data.
- **Simplify:** tighten a few transition sentences; make the four opbrengstbronnen a labelled callout.
- **Cut:** nothing of substance — only trim connective fluff.
- **Rewrite:** add a **"Samenvatting in 30 seconden"** callout at the very top (mediaan € bandbreedte + "scenario, geen garantie" + the 2027 kantelpunt); add explicit **fact / model / practice / example labels** so readers see which numbers are measured vs modelled.
- **More concrete:** already concrete; keep.
- **Move up:** the "geen gegarandeerde opbrengsten" honesty line into the summary card.
- **To visuals:** a **"wat bepaalt de opbrengst"-variabelenkaart** (SVG) instead of prose about drivers.

## 3. `terugverdientijd-…-zelfconsumptie` (strategy decision) — WEAKEST, biggest upside
- **Too AI-like:** the strongest offender — one-sentence paragraphs throughout; the zelfconsumptie-vs-handel bullets appear **three times** (intro, "wat verdient sneller terug", "de simpele vergelijking"); bold rhetorical questions as section glue; filler ("geen magische geldmachine"); overexplains laadcycli; **first-person "wij/Groene Vrienden" marketing** breaks the editorial voice.
- **Strong already:** the core decision framing (self-consumption vs trading, "past bij uw doel"), the "grotere batterij ≠ betere terugverdientijd" insight, the "pas op met vaste beloftes" honesty.
- **Simplify:** collapse the three repeated comparisons into **one comparison table**.
- **Cut:** ~2 of the 3 duplicate comparison blocks; the laadcyclus definition; the "magische geldmachine" line; convert the first-person Groene-Vrienden plug to neutral editorial voice (or drop).
- **Rewrite:** proper multi-sentence paragraphs; a **decision block ("Kies zelfconsumptie als… / Kies handel als…")**; link the heavy maths **up to the pillar (14)** instead of half-repeating it.
- **More concrete:** one short worked contrast (a saver-profile vs a trader-profile).
- **Move up:** the "betere vraag: welke strategie past bij u?" to the very top as the answer.
- **To visuals:** a **side-by-side strategy diagram** + one comparison table.

## 4. `energieprijzen-…-2027` (2027 timing)
- **Too AI-like:** a long "Inhoud" TOC then dense calculation prose; some sections narrate the maths in words where a table/timeline would be clearer; a few hedging transitions.
- **Strong already (KEEP):** the dated 2027 facts, the practice calculations + 10 tables, the "wat is onzeker" honesty, the Bronnen section.
- **Simplify:** compress the price-context prose; label model assumptions explicitly ("aanname").
- **Cut:** redundant restatements of "saldering stopt" across sections (state once, strongly).
- **Rewrite:** open with a **"Wat verandert er in 2027 — en wat blijft onzeker"** callout (bullets: zeker / onzeker), then the analysis; keep every number and source.
- **More concrete:** keep the worked berekeningen; add a **timeline-to-2027 visual**.
- **Move up:** the "belangrijkste conclusie" + the zeker/onzeker split to the top.
- **To visuals:** a **2027 timeline** + a **"wat verandert / wat blijft onzeker"** two-column block.

---

## Priority order for the rewrite
1. **3** (biggest quality jump, shortest, safest to fully rewrite).
2. **6** (turn listy pillar into a scannable comparison pillar with a real matrix).
3. **14** (light editorial polish + summary card + labels; **preserve all data**).
4. **13** (light polish + zeker/onzeker callout + timeline; **preserve all data/sources**).

**Guardrail:** 14 and 13 are data-rich and production-stored as HTML; their rewrites are **future drafts**
(not production manifests) and must be applied later via the exact-anchor patch workflow or manual CMS
editing — never a blind full-body replace.
