# Changelog — `thuisbatterij-vergelijken` draft package

**Status:** PROPOSED / not published. Production article unchanged (verified read-only).

## What changes vs the current live article
| Aspect | Current (live) | Proposed |
|--|--|--|
| Length / reading time | ~600 wds · 2 min | ~1,400–1,900 wds · ~7–9 min |
| Structure | 10 H2 | 16 H2 (answer-first + checklist + FAQ) |
| Answer-first summary | no | **yes** (§1 direct answer + priority order) |
| Usable vs nominal capacity | no | **added** (§4) |
| Capacity vs power | implicit | **explicit** (§3) |
| AC vs DC coupling | no | **added** (§5, table) |
| Inverter/meterkast compatibility | 1 line | **expanded** (§6) |
| Warranty/cycles/residual | short | **expanded** (§8) |
| Backup power | no | **added** (§10) |
| Installation & safety | no | **added** (§11, links to art. 7) |
| Quote-comparison checklist | no | **added** (§12) |
| Common mistakes | no | **added** (§13) |
| When suitable / not | brief | **expanded** (§14) |
| Contextual internal links | 0 | **5–6 planned** (INTERNAL_LINKS.md) |
| Tables | 0 | 4 (checklist, AC/DC, capacity/power framing, quote checklist) |
| Source discipline | none | 8 `[SOURCE REQUIRED]` markers + full classification |

## Kept from current (do not lose)
Capacity 10–20 kWh guidance framing, EMS section, FAQ, calculator CTA framing, formal "u" tone, slug.

## Preconditions before publishing (Phase 2B)
1. Resolve all 8 `[SOURCE REQUIRED]` markers with dated sources (or reword to general).
2. Set backend `seo_title` + `seo_description` per SEO_METADATA.md.
3. Insert the 5–6 contextual links.
4. Decide cover/diagram images (IMAGE_SPEC — see report) — optional but recommended.
5. Human editorial review + fact-check.
6. Publish via CMS/admin (a write action — explicitly out of scope for this phase).

## Traceability
Keyword evidence + CSV sources: `CONTENT_BRIEF.md`. Current baseline: `CURRENT_ARTICLE_SNAPSHOT.md`.
Nothing in this package was pushed to production; no POST/PATCH/PUT/DELETE was made.

## Post-publication correction (2026-08-01)
- The first production update of `thuisbatterij-vergelijken` was applied successfully (slug, `published_at`, and published status preserved; new body, metadata, tags and V2 cover live).
- **Manual correction via Django Admin after publication:** the checklist wording `Snelheid bij zonovershot` → `Snelheid bij zonne-overschot` (`zonovershot` was a non-word typo).
- Local source-of-truth files synced to match production: `production-manifest.json`, `PROPOSED_ARTICLE.md`. Historical `CURRENT_ARTICLE_SNAPSHOT.md` left unchanged (pre-update record).
- Regression guard added: `seo_update_posts` now rejects the banned term `zonovershot` in any text field (`BANNED_TERMS`), with test `test_rejects_known_typo_zonovershot`.
- No further production update was run for this correction.
