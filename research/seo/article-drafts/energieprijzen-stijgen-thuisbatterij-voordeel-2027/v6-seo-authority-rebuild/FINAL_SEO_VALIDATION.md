# FINAL SEO VALIDATION — V6 (2027 article) — REFRAMED (two value streams)

Date 2026-08-03. Against the reframed production body (`article-v6-final-production-body.md`, sha 7e4fb1b4) and real routes.

**Reframe note:** the article now frames self-consumption as a quantified value stream and energy trading as a
potential *additional* net value stream on top (not a downside/replacement). Trading terms are added as
**supporting** keywords only; the dedicated onbalans/EMS/dynamic-contract articles keep their head terms.

| check | result |
|---|---|
| Title | "Thuisbatterij na 2027: zelfconsumptie én handel combineren" (58 chars ≤60). Set as post.title + seo_title. |
| Meta description | "Na 2027 wordt zelfconsumptie een beter berekenbare batterijwaarde (mediaan ~€592/jaar); handel op day-ahead en onbalans kan daar netto bovenop komen." (149 chars). Set as seo_description → meta/og. |
| Primary keyword placement | "thuisbatterij na 2027" in title, H1 (post.title), and intro; body opens with the answer. ✓ |
| Secondary keywords | "saldering 2027", "terugleverkosten"/"terugleverkosten voorkomen", "is een thuisbatterij rendabel"; NEW supporting trading terms "geld verdienen met thuisbatterij" (70/SD12), "thuisbatterij onbalans" (20/SD49), "thuisbatterij energiehandel" (0/SD17) — used naturally in the trading sections. ✓ |
| Trading-term ownership | onbalans/EMS/dynamic-contract HEAD terms stay with their dedicated articles (linked, not targeted); this article only supports the trading angle around the 2027 question. ✓ |
| Keyword stuffing | None — density natural; no repeated exact-match stuffing. ✓ |
| Single keyword owner | 2027/saldering/terugleverkosten cluster owned here; calculator/comparison/payback/opbrengst/dynamic-contract keywords linked, not targeted (KEYWORD_OWNERSHIP_MAP). ✓ |
| Cannibalisation | No head-to-head overlap: calculator (/calculator), comparison, payback, opbrengst pages are LINKED as supporting, not competed for. ✓ |
| Internal-link anchors | 6 in-body links, all SPA-correct: /calculator (2×), /post/wat-levert-een-thuisbatterij-op, /post/terugverdientijd-thuisbatterij-handel-of-zelfconsumptie, /post/stroom-opslaan-zonnepanelen, /post/ems-systeem-thuisbatterij-controle-over-stroom, /post/dynamisch-energiecontract-thuisbatterij. Destinations verified in blog_post + App.jsx. ✓ |
| Canonical | https://www.batterijenplan.nl/post/energieprijzen-stijgen-thuisbatterij-voordeel-2027 (seo.js, www). ✓ |
| Open Graph title/description | og:title=seo_title, og:description=seo_description (seo.js). ✓ |
| Social image | og:image absent (no cover). RECOMMEND cover 1200×630; candidate brand-assets/higgsfield-blog/energieprijzen-stijgen-thuisbatterij-voordeel-2027/source/thuisbatterij-2027-bg-1600x900.png. HUMAN INPUT (Cloudinary upload). ⚠ |
| Slug retained | energieprijzen-stijgen-thuisbatterij-voordeel-2027 unchanged (release preserves slug). ✓ |
| Title/body agreement | H1 (post.title) matches title; body answers the title question in the first paragraph; FAQ mirrors intent. ✓ |
| Reading time | model recomputes reading_minutes on save from the 2,498-word body (~10 min). ✓ |
| H1 uniqueness | body has NO H1; the site renders post.title as the single H1 → exactly one H1. ✓ |

## Verdict
SEO scaffolding is complete and consistent with the live routing/SEO code. Only open SEO item: a cover
image for a large social card (HUMAN INPUT — Cloudinary upload). Slug unchanged as required.
