# Post-Publish Verification — `thuisbatterij-vergelijken`

**Date:** 2026-08-01 · **Read-only.** Live API (`GET /api/posts/thuisbatterij-vergelijken/`) + locally
prerendered static HTML (`dist/post/thuisbatterij-vergelijken/index.html`, built from the live API).
No production modification during verification.

| Check | Result | Evidence |
|---|---|---|
| HTTP status | ✅ 200 | API returned the post |
| Canonical URL | ✅ | `https://www.batterijenplan.nl/post/thuisbatterij-vergelijken` |
| SEO title | ✅ | `Thuisbatterij vergelijken: waar op letten? \| Batterijenplan` (59 chars) |
| SEO description | ✅ | "Thuisbatterij vergelijken? Let op bruikbare capaciteit, vermogen, AC/DC, EMS, garantie en noodstroom…" (157) |
| OG title | ✅ | matches seo_title |
| OG description | ✅ | matches seo_description |
| OG image | ✅ | Cloudinary V2 cover, transformed 1200×630: `…/thuisbatterij-vergelijken-v2_b4wfa1.jpg` |
| BlogPosting JSON-LD | ✅ | present (1) |
| BreadcrumbList JSON-LD | ✅ | present (1) — Home › Kennisbank › title |
| Title & heading hierarchy | ✅ | exactly 1 `<h1>`; 15 `<h2>`, 0 `<h3>` (flat, logical) |
| Cover rendering | ✅ | `cover_image_url` present; renders (Cloudinary) |
| Cover alt text | ✅ | "Thuisbatterij vergelijken op capaciteit, vermogen, EMS en garantie" |
| Internal links | ✅ | 5 `/post/…` (ems, dynamisch, stroom-opslaan, installatie, wat-levert) — all resolve to live posts |
| Calculator links (contextual) | ✅ | 2 in body copy |
| Related posts | ✅ | 3 (groene-vrienden, dynamisch, enphase) via tag weighting |
| Mobile table usability | ✅ | 2 tables; `PostDetail.wrapTables` wraps each in `.post-table-scroll` (overflow-x scroll) |
| Exactly one React calculator CTA | ✅ | `PostDetail` renders one `ArticleCalculatorCta` — mid-article for this 6-min post (the end-placement branch is mutually exclusive) |
| No broken links | ✅ | all internal targets exist |
| No duplicate CTA | ✅ | single `ArticleCalculatorCta`; `MobileStickyCta` (mobile) and `AdviceForm` (lead) are distinct components, not calculator-CTA duplicates |
| No source markers | ✅ | 0 `[SOURCE REQUIRED]` in API body and static HTML |
| No typo regression | ✅ | `zonovershot` = 0; `zonne-overschot` = present (API + static HTML) |

## Notes
- The Cloudinary `_b4wfa1` suffix on the cover filename is exactly the storage-generated suffix the
  headroom guard reserves for — with the short `thuisbatterij-vergelijken-v2.png` (32-char basename)
  the stored path stays well under the 100-char `cover_image` limit.
- `published_at` preserved (2026-07-06); `updated_at` = 2026-08-01 (the apply + manual typo fix).
- Verification used the prerendered static HTML (the crawlable pre-JS view); the live SPA hydrates the
  same data client-side.
