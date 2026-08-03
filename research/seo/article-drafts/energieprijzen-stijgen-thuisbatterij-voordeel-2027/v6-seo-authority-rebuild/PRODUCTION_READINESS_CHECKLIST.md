# PRODUCTION READINESS CHECKLIST — V6 (2027 article)

Status legend: ✅ done in this research pass · ⏳ requires human action before publication · 🚫 explicitly out of scope (do not do)

## Content & data
- ✅ Article body written (2.349 woorden, 15 H2, 6 tabellen, 9 FAQ)
- ✅ All euro figures traced to `outputs/2027-study-v5-1/` (CLAIM_EVIDENCE_LEDGER)
- ✅ Policy vs fee separated; total vs incremental distinguished; day-ahead ≠ imbalance; imbalance = overlay
- ✅ Ranges + medians throughout; no universal reserve or break-even figure
- ✅ Methodology box + "wat deze simulatie niet voorspelt" box + representative calculation
- ✅ 6 accessible original visuals (responsive, Dutch, source + classification, data verified)
- ✅ 248/248 tests pass; V5.1 red team passed

## SEO scaffolding
- ✅ Primary/secondary keywords selected from Ubersuggest (NL, 2026-08-03)
- ✅ Title (57) + meta (147) selected; 10 titles + 5 metas with counts
- ✅ Keyword ownership / cannibalisation map
- ✅ FAQ JSON + JSON-LD (Article + FAQPage) + TOC JSON
- ✅ Public routes CONFIRMED (App.jsx/seo.js): article `/post/:slug`, calculator `/calculator`, list `/artikelen`; canonical `https://www.batterijenplan.nl/post/<slug>`. INTERNAL_LINK_MAP + body links corrected to `/post/<slug>` and `/calculator`.
- ✅ Production body converted (`article-v6-final-production-body.md`): no H1, nl2br-safe single-line paragraphs, GFM tables, reader-safe source note, lint CLEAN (body_sha 72e48f32).
- ✅ Release dry-run PASSED (seo_release_v2 full_body; precondition SHA f5eb25d8 matched; no DB changes); production Post confirmed untouched.
- ✅ Local render preview + 10 screenshots generated (4 viewports); no horizontal overflow; reading-progress + progressive loading unaffected.
- ✅ Site auto-generates BlogPosting+Breadcrumb (seo.js) → do NOT inject the schema.json Article node (duplicate). datePublished resolved (preserved 2026-08-02).
- ⏳ Human-approved `--apply` on the Render production DB (only local dry-run done here); FAQPage JSON-LD injection is an optional frontend change.
- ⏳ External Rich Results Test after a staging/live URL exists.
- ✅ ACM sourcing replaced with acm.nl primary sources (8 May 2024; 17 Dec 2025 ×2), scoped wording applied
- ✅ Median-decomposition presentation corrected (separate medians not added; representative additive scenario C3500_R2.00)
- ✅ Statistic scope unified to 12,6 kWh (A −€117, C €297, fee €202); €196 documented as all-battery pooled
- ✅ Rijksoverheid wording re-verified verbatim (incl. self-consumption tax exemption)

## Integration (human)
- ⏳ Wrap tables in `overflow-x:auto` container for mobile at render time
- ⏳ Add the 6 SVGs to the article and confirm no overflow on a real 360px viewport
- ⏳ Optional: run Google Rich Results Test + Lighthouse on a staging render

## Guardrails — NOT done (by instruction)
- 🚫 Do NOT publish / update live Django `blog_post` records
- 🚫 Do NOT touch frontend / React / Articles.jsx / progressive loading / reading-progress / live calculator
- 🚫 Do NOT change the production slug (`energieprijzen-stijgen-thuisbatterij-voordeel-2027`)
- 🚫 Do NOT access Render / Cloudinary
- 🚫 Do NOT run `seo_release_v2 --apply`
- 🚫 Do NOT commit or push
- 🚫 V4 / V5 / V5.1 left intact

## Remaining production blockers (summary)
1. JSON-LD placeholders (dates/author/URL) + Rich Results validation.
2. Confirm blog URL prefix for internal links against the live router.
3. Verify ACM primary source.
4. Mobile render check for tables + SVGs.
5. Human editorial + legal review, then a human-run publish (not this agent).
