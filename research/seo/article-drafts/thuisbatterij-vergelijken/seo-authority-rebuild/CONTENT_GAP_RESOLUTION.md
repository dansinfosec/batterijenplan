# Content Gap Resolution — thuisbatterij-vergelijken

Maps each gap from the audit (`research/seo/article-audits/thuisbatterij-vergelijken/CONTENT_GAP_REPORT.md`) to how the rebuild resolves it. Baseline = **live production** article (fetched 2026-08-03; updated_at 2026-08-02): ~15 H2, direct-answer intro, 2 tables, 4-item FAQ, 6 PNG diagrams, 5 in-body `/post/` links + `/calculator`, but **no links to its two comparison children**.

| # | Gap (audit) | Type | Resolution in rebuild |
|---|---|---|---|
| 1 | **Does not link to its two children** (names Enphase/Dyness/Groene Vrienden/Zonneplan/Tibber but no down-links) | content / indexing | Added contextual links to `/post/enphase-vs-dyness` and `/post/groene-vrienden-vs-zonneplan-vs-tibber` in the intro, the EMS section and the "hoe kiest u de beste" section. Pillar now sends equity down and stops competing on brand terms. |
| 2 | **Thin for a pillar** (~2-min/3.7k live) | technical/content | Rebuilt to 19,843 chars, 19 H2 / 2 H3 covering every §4 dimension (usable capacity, power, phases, AC/DC, chemistry+round-trip, warranty/cycles/throughput, open/closed EMS + recurring costs + aggregator share + data ownership + lock-in, self-consumption vs trading, backup, expansion, install + installer quality, total-cost). Depth added only where it adds comparison value — no filler. |
| 3 | **"beste thuisbatterij" (2400) facet under-served** | content | New H2 "Hoe kiest u de beste thuisbatterij (zonder blind op het merk te varen)?" — captures the term via a criteria framing (no brand ranking) and FAQ "Wat is de beste thuisbatterij?". |
| 4 | **Capacity sizing (10/20 kWh) only lightly addressed** | content | New H3 "Hoeveel kWh heb ik nodig — 10 of 20 kWh?" answers the intent and routes to `/calculator` (no separate page, no fabricated number). |
| 5 | **Shallow tables; competitor tables weak** | technical | Added a richer 4-column **raamwerk** master table (Laag × vergelijkingspunt × wat u opvraagt × waarom); kept the AC/DC table. |
| 6 | **No in-body diagrams (branded)** | technical | Added 4 brand-token SVGs (framework matrix, één/drie fasen, open-vs-gesloten EMS, totale-kosten-stack) — servable static assets, Dutch alt + captions, grayscale-safe, no marketing ranking. |
| 7 | **AC/DC loss stated as absolute** (CLAIM #3) | evidence | Explicitly nuanced: "het rendementsverschil is niet universeel … vraag de round-trip-cijfers voor uw situatie." Labelled FACT-general/ASSUMPTION in the claim ledger. |
| 8 | **No sources/methodology + no "laatst bijgewerkt"** | evidence / E-E-A-T | Added "Bronnen en methode" section: specs → manufacturer datasheet/installer; policy → Rijksoverheid/ACM (via the validated 2027 owner, linked); value → own simulation (linked). "Laatst bijgewerkt: augustus 2026." |
| 9 | **Thin FAQ (4) vs available questions** | content / indexing | Expanded to 9 genuine question-keyword FAQs with exact body↔`article-faq.json`↔`article-schema.json` (FAQPage) parity. |
| 10 | **Conversion: CTA placement** | conversion | One calm inline `/calculator` link after the checklist/decision points (×3 inline total, all contextual). No second CTA card — the shared `ArticleCalculatorCta` component is auto-rendered by PostDetail after body+FAQ. |
| 11 | **Recurring EMS/platform cost, aggregator share, data ownership, TCO** (missing §4 dimensions) | content | New sections: "Open versus gesloten EMS — en wat het u kost" (recurring costs, aggregatoraandeel, lock-in, data-eigendom) and "Totale kosten: aanschaf én terugkerende kosten" (TCO stack). |

**Cannibalization:** pillar stays criteria-based; brand specs/prices deliberately **not** added (owned by children). Policy numbers not restated (owned by the protected 2027 article). Yield/payback numbers not restated (owned by wat-levert / terugverdientijd). All handled via links + intent differentiation — no merges/redirects proposed.

## Neutrality & factual corrections (round 2, applied on review)
| area | before | after |
|---|---|---|
| AC/DC | binary "AC vs DC" table + "DC doorgaans minder verlies" generalization | Neutral three-way **A. AC / B. DC / C. Hybride** *architecture* section; explicit "geen kwaliteitsoordeel"; per-energy-route comparison questions; binary table removed; no brand used as universal technical proof |
| EMS | open = keuzevrijheid/data-eigendom/geen platformkosten/geen lock-in vs closed = abonnement/aggregatoraandeel/lock-in (universal good/bad) | "labels, geen eindoordeel"; compares **verifiable properties** (compatibility, data/API, switching+function loss, recurring fees, aggregator share, contract, cloud dependency); SVG title/desc/labels/caption redesigned to neutral |
| Trading | "handel kan daar netto bovenop komen" (implied stacking) | "kan in sommige strategieën extra netto waarde opleveren; **niet gegarandeerd** en **concurreert om capaciteit/SoC**"; total vs incremental kept separate |
| Calculator links | 5 inline | **3** inline (direct answer, capacity/sizing, final decision); shared CTA card unchanged |
