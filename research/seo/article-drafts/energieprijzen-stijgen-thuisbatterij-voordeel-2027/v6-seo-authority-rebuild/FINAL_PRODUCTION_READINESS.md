# FINAL PRODUCTION READINESS — V6 (2027 article)

Date: 2026-08-03.

> ## ⚠️ BASELINE CORRECTION (V6.1) — supersedes stale values below
> The Render production preflight confirmed the live post is a **substantive older article**, not the local
> placeholder. The statements further down that reference the placeholder baseline, the old proposed SHA, a
> passed *local* dry-run, or Cloudinary/`visual_patch` hosting are **superseded** by the following authoritative facts:
>
> - **Confirmed production baseline (precondition):** id 13, title "Energieprijzen stijgen: waarom een
>   thuisbatterij vanaf 2027 meer kan opleveren", body **23265 chars**, SHA-256
>   **`03c6c3ab6785df87cda2d5d98dfbd2fbc662efac8c56ff8db91521359efd7659`**, **19 H2 / 13 H3 / 10 tables**,
>   status=published, published_at=**2026-07-15T20:53:41+00:00**, author=**dschu**,
>   cover=`media/batterijenplan/blog/thuisbatterij-2027-cover-v4_bh5rfd`.
> - **Proposed body (with 6 inline branded visuals):** **25940 chars**, SHA-256
>   **`b0db152a8c90d6ecbf246922f4722bbcc85ba4dcd7691845302bc373351d298d`**, **16 H2 / 2 H3 / 6 tables**, no H1,
>   6 `<img>`. Title/excerpt/seo unchanged from V6.
> - **Visuals are EMBEDDED INLINE** via public URLs `/blog-assets/energieprijzen-stijgen-thuisbatterij-voordeel-2027/…`
>   (static Vite assets, copied unchanged into dist at build). No Cloudinary and no `visual_patch` step.
> - **FAQ↔schema parity = 10/10.**
> - **No local dry-run was run against production values:** the local `db.sqlite3` holds only the 62-char
>   placeholder (id 3), so it does NOT match the confirmed production baseline; per instruction the local DB was
>   NOT altered to force a pass. The real guarded dry-run must run in the Render shell. Manifest self-consistency
>   (proposed SHA/structure, required_visuals existence) was validated offline and passes.
> - Rollback target is the `03c6…` production article — see the corrected `ROLLBACK_PLAN_V6.md`.
> - No `--apply`, no production write occurred.

## STATUS: READY WITH HUMAN INPUT REQUIRED

The guarded `full_body` release is **technically validated and safe to apply** (dry-run passed, precondition
SHA matched, body validated & lint-clean, rollback prepared). It is classified **READY WITH HUMAN INPUT
REQUIRED** — not "ready to apply" outright — because several non-code human decisions/actions remain, and the
apply must be run by a human against the real production (Render) database.

## Gate conditions (task §15) — none triggers "NOT READY"
| condition that would block "ready" | state |
|---|---|
| routes unverified | ROUTES VERIFIED (/post/:slug, /calculator, /artikelen from App.jsx/seo.js) ✓ |
| schema placeholders remain (injected) | none injected; site auto-generates BlogPosting+Breadcrumb; datePublished resolved ✓ |
| screenshots not generated | 10 screenshots generated in production-preview/ ✓ |
| SVGs overflow | no overflow at any viewport ✓ |
| dry-run fails | dry-run PASSED (exit 0) ✓ |
| SHA differs | expected==actual current SHA f5eb25d8… ✓ |
| internal links broken | all 6 destinations verified ✓ |
| claim freeze fails | PRODUCTION_CLAIM_FREEZE.csv complete; every headline mapped ✓ |

## Reframe (2026-08-03)
The article was reframed to two value streams: self-consumption = quantified (A); energy trading = potential
ADDITIONAL net value (B) on top. New H1/title "Thuisbatterij na 2027: zelfconsumptie én handel combineren";
new sections (Twee waardestromen, Hoe kan handel extra waarde toevoegen, Waarom … dezelfde batterijcapaciteit,
Betekenen meer thuisbatterijen automatisch minder handelsopbrengst?, Hoe een EMS per kwartier de beste keuze
maakt, Wat weten we nog niet over handelsopbrengsten?). Structure 16 H2 / 2 H3 / 6 tbl / 10 FAQ / ~3,121 words.
Dry-run re-passed; 248 engine tests still pass; no self-consumption numbers changed.

## Brand restyle (2026-08-03)
The six article SVGs are now in the Batterijenplan visual identity (paper/ink/volt-yellow/copper; hard offset
shadows; ink outlines; mono ENGINE RESULT / dashed SCENARIO-OVERLAY badges; volt=self-consumption,
copper=trading/secondary, ink=total). Tokens verified against `frontend/src/styles/global.css`. No data,
labels, ordering or scales changed; 0 old blue/green/red palette remains; both `visuals/` and
`production-visuals/` are byte-identical. See `VISUAL_BRAND_TOKENS.json`, `VISUAL_BRAND_RESTYLE_REPORT.md`,
and `production-preview/brand-restyle/` (13 screenshots). Engine tests still 248/248.

## What is READY now
- `article-v6-final-production-body.md` — no H1, single-line paragraphs (nl2br-safe), 6 GFM tables, callouts,
  SPA-correct internal links, reader-safe source note, lint CLEAN. body_sha `7e4fb1b4…`, 16 H2 / 2 H3 / 6 tbl.
- `production-release-v6.json` — full_body manifest; precondition matches the live stub exactly; dry-run OK.
- Metadata/canonical/OG/title/meta resolved to real values; FAQ↔schema parity 9/9.
- Rollback prepared (`ROLLBACK_PLAN_V6.md`); restore-target SHA recorded.
- Local render verified across 4 viewports; reading-progress + progressive loading unaffected.

## HUMAN INPUT REQUIRED (before / around apply)
1. **Human-approved apply on production.** Run `seo_release_v2 … --apply` in the Render production
   environment (this task ran only the local dry-run; do not apply from here).
2. **Author byline.** Post.author = `seed_local` (site-wide for all 8 posts). The release preserves author;
   set a real display author separately if a proper byline is wanted. (Schema author is already the
   Organization, so schema is unaffected.)
3. **Cover image.** No cover → no large social card. Upload a 1200×630 cover (Cloudinary) and set cover_alt
   for og:image (candidate: brand-assets/…/thuisbatterij-2027-bg-1600x900.png). Cloudinary is out of scope here.
4. **Visuals.** 6 SVGs prepared in `production-visuals/` (validated). Host them (Cloudinary) and insert with a
   separate guarded `visual_patch` run at the section anchors in `PRODUCTION_VISUAL_MANIFEST.json`.
5. **FAQPage JSON-LD (optional).** The site does not emit FAQPage; injecting it needs a small frontend change.
6. **External validation.** Run Google Rich Results Test + mobile check against the staging/live URL once it exists.

## Explicit confirmations
- €592 = median TOTAL CHANGE (D−A), not the post-2027 value. ✓
- €499 = median post-2027 battery VALUE (D). ✓
- €405 = median pure policy component; €202 = median feed-in-cost component (12.6 kWh). ✓
- Separate medians are NOT added (stated in body/FAQ/conclusion). ✓
- Representative scenario adds exactly: €389,79 + €202,06 + €0 = €591,85. ✓
- Imbalance figures remain SCENARIO OVERLAYS. ✓
- No universal return claim; no Dutch population-average claim. ✓
- (Reframe) €592 = self-consumption change only, NOT total battery revenue (explicitly denied in body + FAQ). ✓
- (Reframe) Trading = optional ADDITIONAL net value stream (A + max(0, incremental net trading)); never "unreliable bonus". ✓
- (Reframe) Battery adoption alone does NOT prove falling trading returns (demand-vs-supply framing). ✓
- (Reframe) No hard-prohibited phrases ("bonus, geen basis", "handel minder oplevert", "onbalans daalt", "sowieso niet meer optellen"). ✓

## No release actions taken
No `--apply`; production Post unchanged (sha still f5eb25d8…); no publish; no Render; no Cloudinary; no commit;
no push; frontend unchanged.
