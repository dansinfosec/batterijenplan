# STRUCTURED DATA VALIDATION — V6 (2027 article)

Date: 2026-08-03. Validated locally (JSON parse + field checks + FAQ-vs-visible-text parity). External
Rich Results testing: **EXTERNAL VALIDATION REQUIRED AFTER PREVIEW URL EXISTS** (cannot run the Google
Rich Results Test against a not-yet-published URL from here).

## 1. Who emits what (critical — avoid duplicate schema)

| schema | emitted by | action |
|---|---|---|
| BlogPosting | **the site**, per article, via `frontend/src/seo.js` `blogPostingSchema(post)` | do NOT inject a second Article/BlogPosting (would duplicate) |
| BreadcrumbList | **the site**, via `breadcrumbSchema(post)` (Home › Kennisbank › titel) | already correct; nothing to do |
| Organization / WebSite | site-wide (seo.js) | nothing to do |
| **FAQPage** | **NOT emitted by the site** | optional; requires a frontend change to inject per-article FAQ JSON-LD — **HUMAN INPUT REQUIRED** |

`article-v6-schema.json` is therefore **REFERENCE ONLY** (marked as such in its `note`). Its Article node
duplicates the site's BlogPosting and must not be injected.

## 2. Site-generated BlogPosting — field check (from seo.js + the release fields)

| field | value after release | ok |
|---|---|---|
| @type | BlogPosting | ✓ |
| headline | post.title = "Thuisbatterij na 2027: wat levert zelfconsumptie echt op?" | ✓ |
| description | seo_description (set by release) | ✓ |
| url / mainEntityOfPage | https://www.batterijenplan.nl/post/energieprijzen-stijgen-thuisbatterij-voordeel-2027 | ✓ |
| inLanguage | nl-NL | ✓ |
| author | Organization "Batterijenplan.nl" (deliberate; not the seed username) | ✓ (see note) |
| publisher | Organization "Batterijenplan.nl" + logo ImageObject (favicon.ico) | ✓ |
| image | post.cover_image_url | ⚠ NONE currently (no cover) — add cover for image-rich result |
| datePublished | 2026-08-02T10:30:19.261283+00:00 (preserved published_at) | ✓ |
| dateModified | updated_at at apply time (auto) | ✓ |

Notes: (a) `logo` is the site favicon.ico — Google prefers a proper ImageObject logo ≥112×112 px; acceptable
but a dedicated logo is better (site-wide item, not article-specific). (b) `image` is absent until a cover
is uploaded (HUMAN INPUT).

## 3. Canonical & Open Graph (seo.js setPageMeta)
- canonical = og:url = https://www.batterijenplan.nl/post/energieprijzen-stijgen-thuisbatterij-voordeel-2027 ✓
- og:title/twitter:title = seo_title; og:description/twitter:description = seo_description ✓
- og:image = cover_image_url → **absent** (no cover) → twitter card falls back to `summary` (no large image). ⚠

## 4. FAQ answers == visible text
The FAQ JSON-LD (`article-v6-schema.json` FAQPage) answers are **character-identical** to the visible FAQ in
`article-v6-final-production-body.md` and `article-v6-faq.json` (verified programmatically, 9/9 exact parity).
So IF a FAQPage is later injected, its answers already match the on-page text (a Rich Results requirement).

## 5. Local JSON validity
`article-v6-schema.json`, `article-v6-faq.json`, `article-v6-metadata.json`, `article-v6-toc.json`,
`production-release-v6.json`, `PRODUCTION_VISUAL_MANIFEST.json` all parse as valid JSON. ✓

## 6. Not claimed
Google rich-result *eligibility* is NOT guaranteed. **EXTERNAL VALIDATION REQUIRED AFTER PREVIEW URL EXISTS**
(run the Google Rich Results Test and Schema.org validator against the live/staging URL before relying on any
rich result).
