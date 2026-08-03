# SEO Validation Report — thuisbatterij-vergelijken (seo-authority-rebuild)

**Date:** 2026-08-03 · **Phase:** pre-release validation (no commit/push/deploy/apply).

## Body (after neutrality/factual + final editorial corrections)
- **chars:** 22,063 · **SHA-256:** `da3b5d8987cde4254c4e4cb7e1131a4e64cadee764f76ea741a11bed6d039dcf`
- **structure:** 0 H1 · 20 H2 · 1 H3 · 1 table · 4 images · **3 `/calculator` links** (intro, capacity/sizing, final decision)
- **Final editorial corrections:** (1) intro + FAQ "Waar moet ik op letten…" now say "de totale kosten inclusief **eventuele** EMS- of platformkosten en een **eventueel** aggregatoraandeel op de handelsopbrengst" (no longer implies every system has these). (2) FAQ "Is een duurdere thuisbatterij altijd beter?" — removed the unsupported yield comparison; now "Een goed passende batterij is niet automatisch de duurste. Bruikbare capaciteit, vermogen, compatibiliteit, een passend EMS, garantie en de totale terugkerende kosten zijn belangrijker dan de aanschafprijs alleen."
- **lint:** no fenced code, no `<pre>/<code>`, no 4-space indents → renders as prose ✓
- Table count dropped 2→1: the AC/DC binary table was removed in favour of a neutral three-way (A/B/C) architecture section. H3 dropped 2→1 (AC/DC promoted to its own H2).

## Neutrality & factual corrections (applied, verified)
- **AC/DC/hybride not binary** ✓ — neutral three-way (A. AC-gekoppeld / B. DC-gekoppeld / C. Hybride) describing the *system architecture*; explicit "geen kwaliteitsoordeel; AC of DC altijd beter is niet juist"; comparison questions per energy route; no brand (e.g. Dyness) used as universal technical proof.
- **EMS labels neutral** ✓ — removed all universal claims (open = geen platformkosten / volledige data-eigendom / volledige vrijheid / geen lock-in; closed = altijd abonnement/aggregatoraandeel/slecht overstappen). Now compares verifiable properties (compatibility, data/API, switching + function loss, recurring fees, aggregator share, contract, cloud dependency) with "labels, geen eindoordeel" framing. Applied to body, framework table, FAQ, and the SVG (title/desc/labels/caption redesigned).
- **Trading not guaranteed additive** ✓ — "kan in sommige strategieën extra netto waarde opleveren; niet gegarandeerd en concurreert om batterijcapaciteit en State of Charge"; total vs incremental kept conceptually separate. Cost-stack SVG value note softened accordingly.
- Automated scan for residual non-neutral phrases ("netto bovenop komen", "uw data blijft van u", "geen platformkosten", "geen lock-in", "EMS-vrijheid", "slim en open EMS") → **NONE**.

## Checklist (§9)
| check | result |
|---|---|
| No Markdown H1 | ✅ 0 (`# `/`<h1>`) — title is the frontend H1 |
| Title length | ✅ visible 61 chars; SEO title 59 (≤70) |
| Meta description | ✅ 155 chars (150–160 target); useful, not stuffed |
| FAQ parity | ✅ 9 body ↔ 9 `article-faq.json` ↔ 9 `article-schema.json` (FAQPage), parsed from the body |
| JSON validity | ✅ article-metadata.json, article-faq.json, article-schema.json all parse |
| Internal links | ✅ 9 `/post/` targets incl. both children + `/calculator`; all resolve to live slugs |
| External official-source support | ✅ policy → Rijksoverheid/ACM (via validated 2027 ledger, linked); specs → datasheet/installer; value → own simulation (linked). See OFFICIAL_SOURCE_LEDGER.csv |
| Image paths | ✅ 4 SVGs under `/blog-assets/thuisbatterij-vergelijken/`; copied unchanged into `dist` (checksums MATCH); XML valid; no `<script>`/external refs |
| Mobile rendering (390px) | ✅ verified via `vite preview`: framework SVG + tables render, scale to column, no horizontal overflow (global `img{max-width:100%}` + SVG viewBox + table wrapper). Chrome clamps window at ~500px so a pixel-exact 390 shot isn't possible; mechanism is structural |
| Tables | ✅ 2 GFM tables render (mono headers, ink borders) |
| Frontend build | ✅ `vite build` OK (605 ms) |
| Tests | ✅ `node --test tests/*.test.mjs` → 22 pass / 0 fail |
| No duplicate CTA | ✅ body has inline `/calculator` links only (**exactly 3**: near direct answer, capacity/sizing, final decision); shared `ArticleCalculatorCta` card auto-rendered once by PostDetail (not in body) |
| No unsupported superlatives | ✅ no "beste/goedkoopste" as a claim; "beste" only as "beste keuze voor uw situatie"; no brand ranking |
| No keyword stuffing | ✅ primary in title/intro/one H2/FAQ; secondaries natural |
| No cannibalization with child pages | ✅ criteria-based; brand specs/prices left to children; links down to both |
| Sitemap/prerender | ✅ unaffected — sitemap + prerender are generated from the API (`fetchAllPosts`), slug preserved; no route/config change |
| Progressive loading regression | ✅ none — no frontend code touched (only static SVG assets added under public/) |

## Preserved on release
slug `thuisbatterij-vergelijken` · status `published` · published_at `2026-07-06T00:03:50+00:00` · author `dschu` · cover `media/batterijenplan/blog/thuisbatterij-vergelijken-v2_b4wfa1` · cover_alt unchanged.

## Not done (by instruction / correctly deferred)
- **`production-release.json` created** — precondition captured read-only from the Render production DB (`blog.Post` id 6): chars 10427, SHA `7df12c30…4991a32`, 15 H2 / 0 H3 / 2 tables, status published, published_at 2026-07-06T00:03:50+00:00 (no `updated_at` — seo_release_v2 does not use it). Proposed = the approved body (chars 22,063, SHA `da3b5d89…`, 20 H2 / 1 H3 / 1 table, embedded). Not from the local placeholder DB. **Not applied** — the guarded dry-run then `--apply` run on Render after deploying commit `ce096a7`.
- No commit, push, deploy, apply. No other article edited (child up-links are recommendations only).
