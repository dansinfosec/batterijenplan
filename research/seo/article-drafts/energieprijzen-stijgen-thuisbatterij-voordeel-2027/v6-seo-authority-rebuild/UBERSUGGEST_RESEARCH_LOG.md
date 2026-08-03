# UBERSUGGEST RESEARCH LOG — V6 (2027 article)

**Tool:** Ubersuggest MCP (connected). **Account:** ecomdaniel266@gmail.com · tier1.
**Retrieval date:** 2026-08-03. **Locale:** Netherlands (locId **2528**), language **nl** (Dutch).
**Auth check:** `auth_status` → `{"authenticated":true,"email":"ecomdaniel266@gmail.com","tier":"tier1"}`.
**Metric-update budget observed in SERP responses:** 250/month, 5 used at time of research.

All numbers below are **as returned by the Ubersuggest MCP**. Where a field was not returned it is marked
`NOT RETURNED BY UBERSUGGEST MCP`. Nothing here is estimated or invented.

## Ubersuggest MCP capabilities discovered (and which were used)

| capability | tool | used |
|---|---|---|
| keyword overview (volume, CPC, SEO difficulty, paid difficulty, competition, intent, trend) | `keyword_overview` | YES (24 keywords) |
| keyword suggestions (related/questions/prepositions/comparisons) | `keyword_suggestions` | YES (returned only searched-keyword echoes for our seeds) |
| Google autocomplete | `google_suggestions` | ATTEMPTED — HTTP 429 rate-limited; not used |
| SERP analysis (top URLs + DA + clicks + result types) | `serp_analysis` | YES (thuisbatterij na 2027; terugleverkosten) |
| content ideas (top pages by shares/visits/backlinks) | `content_ideas` | YES (thuisbatterij saldering / terugleverkosten) |
| estimate SERP clicks | `estimate_serp_clicks` | available, not needed |
| location lookup | `location_suggest` | YES (confirmed NL locId 2528) |
| domain/backlink/site-audit/project tools | `domain_overview`, `backlinks`, `serp_*`, `site_audit*`, project tools | available, out of scope for keyword research |

Tool limitation noted: `serp_analysis` for "is een thuisbatterij rendabel" returned an MCP output-validation
error (null title fields) and could not be retrieved; two other SERPs were retrieved successfully.

## Keyword overview results (verbatim metrics)

See `UBERSUGGEST_KEYWORD_EXPORT.csv` for the full table. Highlights (volume / SEO difficulty / intent):

- **thuisbatterij** — 60.500 / 41 / Commercial (brand/calculator head; not this article's target)
- **salderingsregeling** — 18.100 / 50 / (intent not returned)
- **terugleverkosten** — 6.600 / 37 / Informational (spike 202508: 33.100)
- **is een thuisbatterij rendabel** — 880 / 25 / Informational (rising; 202603 peak 1.900)
- **thuisbatterij na 2027** — 140 / 15 / Informational (rising sharply spring 2026: 480→590); `keyword_suggestions` echoed vol 210 / SD 44
- **saldering 2027** — 110 / 42 / Informational (rising; 202604: 260)
- **thuisbatterij dynamisch contract** — 110 / 14 / Commercial
- **thuisbatterij onbalansmarkt** — 70 / 10 / Commercial
- **terugleverkosten voorkomen** — 70 / 21 / Informational (rising)
- **thuisbatterij rendement** — 50 / 31 / (intent not returned)
- **hoeveel bespaar je met een thuisbatterij** — 30 / 31 / (intent not returned; rising)
- **thuisbatterij 2027** — 20 / 43 · **thuisbatterij rendabel 2027** — 20 / 36 · **opbrengst thuisbatterij** — 20 / 46
- **salderingsregeling stopt 2027** — 10 / 29 · **terugleverkosten thuisbatterij** — 10 / 35
- **0-volume topical long-tails** (SD in brackets): thuisbatterij zonder saldering (12), einde salderingsregeling thuisbatterij (12), thuisbatterij voordeel 2027 (12), thuisbatterij terugverdientijd 2027 (12), zelfconsumptie thuisbatterij (17), thuisbatterij eigen verbruik (12), thuisbatterij kosten en opbrengst (4), thuisbatterij verplicht 2027 (12)

## SERP analysis (retrieved)

**thuisbatterij na 2027** (updated 2026-07-01): AI overview + People-Also-Ask + video present. Organic mix:
zonneplan.nl (DA38, 67 clicks), eigenhuis.nl (DA53), solarmagazine.nl (DA44, news), blenditpower.com
(DA12), jeroen.nl (DA32), rijksoverheid.nl (DA81, law), youtube (DA100), independer (DA56), solarwatt.nl
(DA35), ankersolix.com (DA51). No result shows an original quarter-hour simulation or a policy-vs-fee
decomposition. Full rows in `SERP_COMPETITOR_AUDIT.csv`.

**terugleverkosten** (updated 2026-07-15): dominated by Consumentenbond (DA66, 2.594 clicks) + energy
suppliers (Essent, Vandebron, Greenchoice, Energiedirect) + comparison sites. Supplier-tariff focus; none
quantify battery-driven fee avoidance.

## Content ideas (thuisbatterij saldering / terugleverkosten)

Notable themes surfaced: legal/consumer-protection angle is active — Consumentenbond "berekening
terugleverkosten moet transparanter" (9 backlinks, 7 refdomains), Geschillencommissie ruling on
non-agreed fixed fees, rechtbank Amsterdam Vattenfall ruling (Reddit thread), ACM "niet onredelijk"
(Solar Magazine), and "terugleverkosten blijven mogelijk zelfs na afschaffen salderingsregeling"
(energievergelijk). Avoidance angle: sunneroo "hoe kun je terugleverkosten vermijden", Sessy battery
subsidy. None provide a transparent simulation of how much a battery avoids vs. the policy effect.

## Interpretation

The exact-2027 long-tails are low-volume but low-difficulty and rising; the volume sits in broad heads
(thuisbatterij, salderingsregeling, terugleverkosten) that are owned by suppliers/consumer orgs or by the
calculator/other Batterijenplan pages. The winnable, on-intent, rising target for THIS article is
**thuisbatterij na 2027** (SD 15, Informational), supported by saldering 2027, is een thuisbatterij
rendabel (post-2027 lens), terugleverkosten (avoid-with-battery angle) and terugleverkosten voorkomen.
