# Keyword strategy — pillar `wat-levert-een-thuisbatterij-op`

*Local SEO working document. Built from the two competitor-gap CSVs only; no invented volumes/difficulty/intent. Not for production apply.*

## Data sources used

| CSV | Path | Rows | Columns |
|---|---|---:|---|
| TBN | `research/seo/competitor-gaps/keywords gap for thuisbatterijnederland.nl.csv` | 1,422 | No, Keyword, Volume, Position, Estimated Visits, CPC, Paid Difficulty, SEO Difficulty, Ranking URL |
| ZP | `research/seo/competitor-gaps/keywords gap for zonneplan.nl.csv` | 2,000 | (same) |

- **Present:** search Volume, CPC, Paid Difficulty, SEO Difficulty, competitor Position/Ranking URL.
- **Absent:** no intent column, no SERP-features column, no trend/seasonality column. → **Intent below is classified from query wording and labelled `intent (inferred)`; it is never a value read from the file.**
- Normalization applied: lower-cased; `thuisaccu`/`thuis accu` folded to `thuisbatterij` as a spelling variant (49 `thuisaccu*` rows exist); `thuis batterij` → `thuisbatterij`; whitespace collapsed; cross-CSV duplicates merged (max volume kept, both sources recorded).
- Battery-related unique keywords after normalization: **841**. Yield/revenue/ROI-intent subset relevant to this pillar: **23 measured terms** (plus semantic variants not present in the CSVs, flagged below).

## Primary keyword

**Recommended primary (topical head): `wat levert een thuisbatterij op` (synoniem: `opbrengst thuisbatterij`).**

- **Volume:** *not present in either CSV* — **unknown from this dataset; not invented.** These competitor-gap exports are subsets, not a full keyword database.
- **Difficulty:** unknown from this dataset.
- **Intent (inferred):** informational / commercial-investigation — "how much does it yield / is it worth it".
- **Why this article should own it:** it is the exact question an evidence-led yield pillar answers (135-simulation model + 25-profile matrix + 300+ practice validation), it matches the existing slug and H1, and the surrounding CSV cluster (`rendabel`, `rendement`, `hoeveel kWh`, `20 kwh`) shows clear measured demand for yield/return information. **Unresolved input:** confirm the head-term volume in a full keyword tool (Semrush/GKP) before treating any volume as fact.

**Highest-value CSV-measured terms this pillar can realistically capture** (the data-anchored core, excluding payback terms owned by article 3):

| Keyword | Source | Volume | SEO Diff | Intent (inferred) | Placement |
|---|---|---:|---:|---|---|
| is een thuisbatterij rendabel | ZP | 880 | 25 | commercial-investigation | H2 "Is een thuisbatterij rendabel?" (shared; pillar answers via yield, links to payback) |
| thuisbatterij rendabel | TBN,ZP | 390 | 13 | commercial-investigation | body + rendabel H2 |
| rendement thuisbatterij | TBN | 110 | 26 | informational | §"capaciteit vs vermogen" / rendement paragraph |
| zijn thuisbatterijen rendabel | TBN | 70 | 23 | commercial-investigation | FAQ |

## Secondary keyword groups (by inferred intent)

Legend: **P** = belongs in this pillar · **→N** = primarily another article (link only) · *semantic* = not in CSV, supported variant.

### 1. Average yield & annual revenue
| Keyword | Src | Vol | Diff | Own? |
|---|---|---:|---:|---|
| wat levert een thuisbatterij op | — | *semantic* | — | P (primary) |
| opbrengst thuisbatterij | — | *semantic* | — | P |
| hoeveel levert een thuisbatterij op | — | *semantic* | — | P (H2) |
| is een thuisbatterij rendabel | ZP | 880 | 25 | P (shared w/ 3) |
| thuisbatterij rendabel | TBN,ZP | 390 | 13 | P |
| rendement thuisbatterij | TBN | 110 | 26 | P |

### 2. Savings & self-consumption
| thuisbatterij besparing | — | *semantic* | — | P (light) |
| zelfconsumptie / eigen verbruik opslaan | — | *semantic* | — | →5 `stroom-opslaan-zonnepanelen` & →3 (pillar explains + links) |

### 3. Dynamic trading & EMS
| terugverdientijd thuisbatterij dynamisch energiecontract | TBN | 70 | 9 | →11 / →3 |
| (EMS control terms) | — | *semantic* | — | →4 `ems-systeem-...` |
| thuisbatterij dynamisch contract opbrengst | — | *semantic* | — | P touches (trading yield), →11 owns contract mechanics |

### 4. Payback period — **assigned to article 3, not this pillar**
| terugverdientijd thuisbatterij | TBN,ZP | 880 | 16 | →3 |
| thuisbatterij terugverdientijd | TBN,ZP | 480 | 20 | →3 |
| terugverdientijd thuisbatterij berekenen | TBN,ZP | 260 | 12 | →3 / calculator |
| homewizard thuisbatterij terugverdientijd | TBN | 170 | 24 | →3 |
| wat is de terugverdientijd van een thuisbatterij | TBN | 70 | 29 | →3 |
| terugverdientijd thuisbatterij berekenen excel | TBN | 70 | 11 | →3 / calculator |
| wanneer is een thuisbatterij rendabel | TBN,ZP | 210 | 14 | shared →3 (pillar links) |
| thuisbatterij rendabel of niet | TBN | 170 | 16 | shared →3 |

### 5. Battery size & inverter power
| thuisbatterij hoeveel kwh nodig | TBN,ZP | 210 | 12 | P (size↔yield) / →6 |
| hoeveel kwh thuisbatterij heb ik nodig | TBN | 110 | 14 | P / →6 |
| thuisbatterij hoeveel kwh | TBN | 110 | 17 | P / →6 |
| thuisbatterij 20 kwh | TBN,ZP | 6,600 | 11 | →6 (size/product); pillar captures "20 kWh opbrengst" angle |
| thuisbatterij 10 kwh | TBN,ZP | 4,400 | 10 | →6 |
| thuisbatterij 20 kwh kosten | TBN,ZP | 260 | 12 | →6 / cost |

### 6. Solar-panel relationship
| thuisbatterij met zonnepanelen opbrengst | — | *semantic* | — | P (H2 "met zonnepanelen") |
| thuisbatterij zonnepanelen | TBN,ZP | 2,900 | 19 | →5 (pillar captures opbrengst angle) |
| accu zonnepanelen | TBN,ZP | 6,600 | 28 | →5 |
| zonnepanelen met accu | ZP | 6,600 | 12 | →5 |

### 7. 2027 context
| salderen regels | ZP | 12,100 | 20 | →13 `energieprijzen-...2027` (pillar mentions + links) |
| (einde saldering / 2027 opbrengst) | — | *semantic* | — | →13 |

### 8. Questions & long-tail (featured-snippet candidates)
| kan een thuisbatterij meer dan €1.000 opleveren | — | *semantic* | — | P FAQ |
| wat levert een thuisbatterij zonder zonnepanelen op | — | *semantic* | — | P FAQ/H2 |
| is een grotere thuisbatterij rendabeler | — | *semantic* | — | P (practice section) |
| wat is belangrijker: capaciteit of vermogen | — | *semantic* | — | P FAQ |
| zijn thuisbatterijen rendabel | TBN | 70 | 23 | P FAQ |

## Excluded / cannibalizing terms (keep OUT of the pillar as primary targets)

| Cluster | Belongs to | Rule for pillar |
|---|---|---|
| `terugverdientijd*`, `...berekenen`, `...excel`, `homewizard terugverdientijd` | **3 · terugverdientijd-thuisbatterij-handel-of-zelfconsumptie** | Pillar may reference "terugverdientijd" as an ROI input and link; never as an exact-match H2/title target. |
| `salderen*`, einde saldering, 2027 opbrengst mechanics | **13 · energieprijzen-...2027** | Pillar has one 2027 subsection + link only. |
| `thuisbatterij vergelijken`, merken (marstek, enphase, sessy, aeg, solaredge…), `20 kwh`/`10 kwh` product/size, `kopen` | **6 · thuisbatterij-vergelijken**, 9/10 product duels | Pillar discusses size↔yield qualitatively, links out for product choice. |
| `dynamisch energiecontract` mechanics, contract keuze | **11 · dynamisch-energiecontract-thuisbatterij** | Pillar shows trading as a yield source, links for contract detail. |
| EMS control, aansturing detail, `ems systeem` | **4 · ems-systeem-...** | Pillar names EMS as a driver, links out. |
| `installatie`, montage, 3-fase | **7 · thuisbatterij-installatie** | Not a pillar target. |
| zelfconsumptie mechanics, `stroom opslaan` | **5 · stroom-opslaan-zonnepanelen** & 3 | Pillar covers the yield split, links for the how-to. |
| subsidie, warmtefonds, lening, kosten/prijs | 12 / cost pages | Not a pillar target. |

## SEO metadata options (Phase 9)

Scoring 1–5 (5 = best). "Claim risk" is reverse-scored (5 = lowest risk).

### H1
| # | Option | Kw-rel | Clarity | Credibility | Click | Claim-safety | Len |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|
| H1-a | Wat levert een thuisbatterij op? Onderzoek op basis van 135 simulaties en 300+ echte installaties | 5 | 4 | 5 | 4 | 5 | long |
| H1-b | Wat levert een thuisbatterij op? Opbrengst per jaar, onderbouwd met data | 5 | 5 | 4 | 4 | 5 | med |
| H1-c | Wat levert een thuisbatterij op — en wat bepaalt de opbrengst? | 5 | 5 | 4 | 5 | 5 | med |

### SEO title (target ≤ 60 chars)
| # | Option | Chars | Kw-rel | Click | Claim-safety |
|---|---|:--:|:--:|:--:|:--:|
| T-a | Wat levert een thuisbatterij op? Opbrengst per jaar (2025) | 57 | 5 | 4 | 5 |
| T-b | Wat levert een thuisbatterij op? Opbrengst & rendement | 54 | 5 | 4 | 5 |
| T-c | Opbrengst thuisbatterij: wat levert het echt op? | 48 | 5 | 5 | 4 |

### Meta description (target ≤ 155 chars) — no unsupported euro ranges for clicks
| # | Option | Notes |
|---|---|---|
| M-a | Wat levert een thuisbatterij op? Ons onderzoek (135 simulaties, 300+ installaties) toont de opbrengst per jaar — met en zonder zonnepanelen — en wat die bepaalt. | credibility-led, no € |
| M-b | Hoeveel levert een thuisbatterij op? Een genormaliseerd 2025-model naast echte praktijkresultaten, plus de variabelen die de opbrengst bepalen. | model+practice framing |
| M-c | De opbrengst van een thuisbatterij hangt af van uw situatie. 25 profielen, praktijkdata en de factoren die de opbrengst maken. Reken uw eigen geval door. | intent + CTA |

### OG / social headline
| # | Option |
|---|---|
| OG-a | Wat levert een thuisbatterij écht op? |
| OG-b | De opbrengst van een thuisbatterij, onderbouwd met data |
| OG-c | Thuisbatterij: dit levert het per jaar op |

**Recommended set:** **H1-b** (clear, keyword-first, credible without an over-long tail; keep the "135 simulaties/300+" as the sub-deck line, not the H1) · **T-a** (exact primary + year, safe, 57 chars) · **M-a** (credibility-led, zero claim risk, covers with/without solar) · **OG-a** (highest click potential, no claim risk). None places a euro figure in the title.
