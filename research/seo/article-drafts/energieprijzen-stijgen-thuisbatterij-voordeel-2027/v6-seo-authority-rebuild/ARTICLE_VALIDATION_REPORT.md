# V6 ARTICLE VALIDATION REPORT

**Date:** 2026-08-03. **Result:** PASS (research draft; human review required before publication).

## 0a. Reframe pass — two value streams (2026-08-03)

The article was reframed: **self-consumption = a quantified value stream (A)**; **energy trading = a potential
ADDITIONAL net value stream (B)** on top — never a downside, replacement, or "unreliable bonus". New value
framework: TOTAL = A + INCREMENTAL_NET_TRADING; optional dispatch = A + max(0, B). New/renamed sections:
"Twee waardestromen…", "Hoe kan handel extra waarde toevoegen?" (replaces the old downside-first section, with
a single "### Wat als de handelsopbrengst lager uitvalt?" subsection), "Waarom zelfconsumptie en handel
dezelfde batterijcapaciteit gebruiken", "Betekenen meer thuisbatterijen automatisch minder handelsopbrengst?"
(answer: No), "Hoe een EMS per kwartier de beste keuze maakt", "Wat weten we nog niet over handelsopbrengsten?".
Structure: 16 H2 / 2 H3 / 6 tables / 10 FAQ / ~3,121 words. Body sha `7e4fb1b4…`.

**§14 validation (reframe):**
- Hard-prohibited phrases ABSENT: "bonus, geen basis", "handel minder oplevert", "onbalans daalt",
  "sowieso niet meer optellen", "onzekere bonus" — verified 0 occurrences. ✓
- €592 is never described as total battery revenue (only as the self-consumption change; explicitly denied in
  intro + FAQ "Zijn de €592 de volledige opbrengst… Nee"). ✓
- Trading never described as guaranteed; battery growth never presented as proof of lower revenue
  (demand-vs-supply framing; "verzadiging" only used to deny inevitability). ✓
- Self-consumption and trading are NOT treated as independent full-capacity maxima (shared-SoC section +
  incremental-net-trading definition). ✓
- FAQ parity body==faq.json==schema: 10/10 exact. ✓  JSON valid. ✓  Release body == the body embedded in
  production-release-v6.json (same sha 7e4fb1b4). ✓  Preview built from the same body. ✓
- Engine outputs NOT modified; all validated self-consumption tables/figures/visuals preserved; limitations kept.
- Dry-run re-run: PASSED (precondition f5eb25d8 unchanged; proposed 7e4fb1b4; no DB changes).
- All existing model-v1 tests still pass (see §5 / test run).

## 0. Correction pass (2026-08-03) — applied and verified

1. **Median-decomposition presentation fixed.** The article no longer implies the separate medians add:
   median(total €592) ≠ median(policy €405) + median(fee €202) (the separate medians sum to €607.18).
   Intro, feed-in section, conclusion, index, FAQ and schema now state these are *separate distribution
   medians* that must not be added; the additive example uses one representative scenario.
2. **Additive representative scenario = C3500_R2.00** (3.500 kWh, PV 2,0; 12,6 kWh; per-kWh €0,10), the
   scenario whose total change is nearest the median total: A=−€92,93, B=€109,13, C=€296,86, D=€498,92;
   policy €389,79 + fee €202,06 + interactie €0,00 = **€591,85** total change (additive within €0,01).
   Labelled "representatief scenario — geen landelijk gemiddelde en geen decompositie van de medianen".
3. **€196 vs €202 resolved.** €202 = 12,6 kWh median (n=25); €196 = all-4-batteries pooled median (n=100,
   `fee_structure_summary.csv`). Article now uses 12,6 kWh (€202) throughout; €196 documented as a separate
   scope in the ledgers/metadata only. A and C also corrected to 12,6 kWh scope: A=−€117, C=€297.
4. **ACM sourcing replaced with official acm.nl primary sources** (8 May 2024; 17 Dec 2025 ×2), with scoped
   wording (investigated tariffs not prohibited/not unreasonable; different methods; per-kWh modelcontract
   from 1-1-2026; not a blanket approval).
5. **Rijksoverheid wording re-verified** (verbatim) incl. the self-consumption tax exemption.
6. **Per-profile share statistic added:** median policy share 66,3%, fee share 33,7% (denominators >0, n=25).
7. **Value-vs-change pairing fixed (semantic pass).** The FAQ "Is een thuisbatterij interessant in 2027?"
   no longer compares the *pre-2027 battery value* (−€117) directly to the *total change* (€592). It now
   states the post-2027 battery **value** ≈ €499/year and the **change** vs. before 2027 ≈ €592/year as two
   separate distribution medians. Corrected identically in the body, `article-v6-faq.json` and the JSON-LD
   `article-v6-schema.json`. Confirmed no remaining phrase of the form "van −€117 naar €592".

## 1. Ubersuggest metrics vs MCP output
Every keyword metric in the strategy/export/intent files is traceable to a `keyword_overview`,
`keyword_suggestions`, `serp_analysis` or `content_ideas` MCP response captured 2026-08-03 (NL, locId 2528,
nl). Unavailable fields are marked `NOT RETURNED BY UBERSUGGEST MCP`. Nothing estimated or invented. ✓

## 2. Legal facts vs official sources
Saldering stop date, ≥50% floor to 2030 (Rijksoverheid), ACM 2024-05-08 ruling, and terugleverkosten
mechanics (Consumentenbond) are recorded with source + URL + confidence in `LEGAL_SOURCE_LEDGER.csv`.
ACM ruling flagged `medium` (secondary source) — verify acm.nl primary before publication. ✓ (with note)

## 3. Engine numbers vs output files
All euro figures reconcile to `outputs/2027-study-v5-1/` per `CLAIM_EVIDENCE_LEDGER.csv`. Spot checks:
policy €405 (corrected_headline), fee €202 (corrected_headline), total €592 (reproduces V5), fixed fee €0
(fee_structure_summary), reserve 10% median €0,6 (reserve_summary), break-even 42→10% (imbalance_break_even). ✓

## 4. Derived percentages
Break-even factors (42/21/14/10%) = costs €107,03 / (gross × 0,85), verified in code and CSV. ✓

## 5. Internal links
7 article slugs confirmed present in `blog_post` table (ids 1,2,4,5,6,7,8) + calculator route confirmed in
`calculators/urls.py`. URL prefix for blog posts (`/<slug>/`) is an assumption — see readiness checklist. ✓ (with note)

## 6. Title / meta lengths
Selected title 57 chars (≤60); selected meta 147 chars (≤160). All 10 titles ≤60, all 5 metas 147–160.
Measured with Python `len`. ✓

## 7. Heading hierarchy
Exactly one H1; 15 H2 sections; no skipped levels. ✓

## 8. FAQ duplicates & schema
9 FAQ questions, all unique; JSON-LD FAQPage mirrors the body 1:1 (9 == 9). ✓

## 9. Schema validity
Article + FAQPage JSON-LD parse as valid JSON. `datePublished` is a labelled PLACEHOLDER. Validate in
Google Rich Results Test before use. ✓ (with note)

## 10. Mobile table safety
6 tables, each ≤4 columns with short cells → safe for narrow viewports. Recommend wrapping in a horizontal
`overflow-x:auto` container at integration time. ✓

## 11. SVG overflow
All 6 SVGs well-formed XML, responsive (`width="100%" height="auto"`, viewBox 760–820 wide), with
`<title>`/`<desc>`/`aria-labelledby`, source + classification lines; data values spot-checked against
outputs (heatmap corners, fee values, break-even %). No text overflow observed in structure. ✓

## 12. Keyword cannibalisation
`KEYWORD_OWNERSHIP_MAP.csv`: calculator/comparison/payback/opbrengst/dynamic-contract keywords excluded as
targets (linked only). This article owns the 2027/na-2027/zelfconsumptie-post-2027/terugleverkosten-avoid
cluster. ✓

## 13. Unsupported claims
Prohibited-phrase scan: no positive "gegarandeerd", no "iedere batterij verdient €X", no universal "25%
break-even", no "landelijk gemiddelde" as a claim (only as disclaimers). Every headline euro maps to an
output row. ✓

## 14. Test suite
248/248 pass (`py -m pytest`). Did NOT run `seo_release_v2 --apply`. ✓

## Verdict
V6 is internally consistent, fully sourced, and free of the conflations/generalisations the task forbids.
Cleared for human review. Production-integration items remain (see PRODUCTION_READINESS_CHECKLIST.md).
