# Production Readiness Checklist — thuisbatterij-vergelijken

**Status:** READY FOR HUMAN REVIEW (rewrite complete + validated). NOT committed, pushed, deployed, or applied.

## Ready
- ✅ `article-final-production-body.md` — no H1, single-line paragraphs (nl2br-safe), 1 GFM master table + neutral A/B/C architecture section, 4 branded SVGs, 9-item FAQ, contextual internal links incl. both children, exactly 3 inline `/calculator` links + one shared bottom CTA (no duplicate card). **chars 22,063 · SHA `da3b5d89…` · 20 H2 / 1 H3 / 1 table / 4 images / 9 FAQ**. Neutrality/factual + final editorial corrections applied (AC/DC/hybride not binary; EMS labels neutral; trading not guaranteed additive; recurring EMS/aggregator costs framed as "eventuele"; unsupported yield comparison removed) — see SEO_VALIDATION_REPORT.md.
- ✅ Metadata resolved: title, seo_title (59), seo_description (155), excerpt (227); canonical `…/post/thuisbatterij-vergelijken`.
- ✅ FAQ↔schema parity 9/9; JSON valid; FAQPage schema is a **reference** artifact (site auto-emits BlogPosting+Breadcrumb — do NOT duplicate; emitting FAQPage needs a small frontend change).
- ✅ 4 SVGs in `frontend/public/blog-assets/thuisbatterij-vergelijken/`; build copies them unchanged to `dist` (checksums MATCH); XML valid; no scripts/external refs.
- ✅ Ledgers: CLAIM_EVIDENCE_LEDGER.csv, OFFICIAL_SOURCE_LEDGER.csv; KEYWORD_RESEARCH_LOG.md; INTERNAL_LINK_MAP.csv; CONTENT_GAP_RESOLUTION.md; SEO_VALIDATION_REPORT.md; ROLLBACK_PLAN.md.
- ✅ `vite build` OK; `node --test` 22/22; 390px render verified (no overflow).

## Human action required before release
1. **Capture the real production baseline** — run the `seo_release_v2` (full_body) **dry-run** in the Render shell to read the current markdown SHA/structure of the live post. Only then write `production-release.json` with that precondition. Do NOT fabricate it from the local placeholder DB.
2. **Confirm cover** — reuse the existing production cover (`…/thuisbatterij-vergelijken-v2_b4wfa1`); no cover change proposed.
3. **Optional reciprocal child links** — add up-links in `enphase-vs-dyness` and `groene-vrienden-vs-zonneplan-vs-tibber` to this pillar (separate approved tasks — not edited here).
4. **Optional** — old production PNG diagrams at `/article-visuals/thuisbatterij-vergelijken/` become unused once this body ships (the rebuild uses the new `/blog-assets/…` SVGs). Leave in place or clean up separately.

## Preserve on apply
slug · status=published · published_at=2026-07-06T00:03:50+00:00 · author=dschu · cover_image · cover_alt.

## Guardrails honored
🚫 no publish · 🚫 no production write · 🚫 no `--apply` · 🚫 no commit/push/deploy · 🚫 no other article edited · 🚫 no local-DB-derived precondition · 🚫 no brand rankings/unsourced specs.
