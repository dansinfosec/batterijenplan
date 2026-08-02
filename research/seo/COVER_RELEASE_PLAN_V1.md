# Cover release plan V1

How the reviewed covers reach production. **Nothing here is applied.** No manifests are created yet — this stops for complete visual approval first.

## Delivery mechanism

Blog covers use the existing **Cloudinary-backed `Post.cover_image`** workflow (the guarded `seo_release_v2 --mode cover_only` command already in the repo). It uploads the approved local **1600×900** file as the source, assigns the returned Cloudinary URL to `Post.cover_image`, sets `cover_alt`, and **preserves `Post.body` byte-for-byte** (body SHA-256 captured before the write and re-verified after; rollback on mismatch), preserving `slug`, `status`, `published_at`, with a JSON backup.

- Production hero covers go to Cloudinary via `Post.cover_image` — **not** into `frontend/public/`.
- **Inline article visuals** (e.g. day-ahead chart under `frontend/public/article-visuals/…`) remain Vercel-served and are **outside** this cover batch.
- The **1600×900** universal cover is the production upload source. The 1200×800 card and 1200×630 OG files are review/future derivatives (the backend exposes a single cover field; no card/OG field was added).

### Body SHA-256 precondition

Raw `Post.body` is not exposed by the public read-only API (only `body_html`), so a body SHA cannot be computed offline. The cover-only release enforces the invariant at **runtime**: capture live body SHA-256 immediately before the cover write, require the post-write body SHA to be **identical**. For every changed post: **body must remain byte-for-byte unchanged (yes).**

## Per-changed-post release entries (proposed — not executed)

All 12 changed posts have approved local 1600×900 sources under `research/seo/cover-review-v1/<slug>/hero-1600x900.png`.

| # | slug | family | current Cloudinary cover | proposed upload filename | proposed cover_alt |
|---|------|--------|--------------------------|--------------------------|--------------------|
| 1 | `wat-levert-een-thuisbatterij-op` | A | `v1/media/batterijenplan/blog/wat-levert-cover-v3_mbq0vk` | `wat-levert-cover-v4.png` | Wat levert een thuisbatterij op? — Batterijenplan onderzoekscover met titel en logo |
| 2 | `energieprijzen-stijgen-thuisbatterij-voordeel-2027` | B | `v1/media/batterijenplan/blog/thuisbatterij-2027-cover-v3_wchzba` | `thuisbatterij-2027-cover-v4.png` | Thuisbatterij vanaf 2027 — Batterijenplan beleidscover met titel en logo |
| 3 | `warmtefonds-thuisbatterij-lening` | B | `v1/media/batterijenplan/blog/warmtefonds-thuisbatterij-lening-zonnepanelen.png_prdpp7` | `warmtefonds-thuisbatterij-cover-v1.png` | Warmtefonds en thuisbatterij — Batterijenplan beleidscover met titel en logo |
| 4 | `enphase-vs-dyness` | C | `v1/media/batterijenplan/blog/enphase-vs-dyness-thuisbatterij-vergelijken.png_aawyh1` | `enphase-vs-dyness-cover-v1.png` | Enphase vs Dyness — Batterijenplan vergelijkingscover met titel en logo |
| 5 | `groene-vrienden-vs-zonneplan-vs-tibber` | C | `v1/media/batterijenplan/blog/groene-vrienden-vs-zonneplan-vs-tibber-thuisbatterij_dlig2c` | `energieplatformen-vergeleken-cover-v1.png` | Energieplatformen vergeleken — Batterijenplan vergelijkingscover met titel en logo |
| 6 | `terugverdientijd-thuisbatterij-handel-of-zelfconsumptie` | D | `v1/media/batterijenplan/blog/handel-vs-zelfconsumptie_qjvkjp` | `handel-of-zelfconsumptie-cover-v2.png` | Handel of zelfconsumptie? — Batterijenplan strategiecover met titel en logo |
| 7 | `dynamisch-energiecontract-thuisbatterij` | D | `v1/media/batterijenplan/blog/dynamisch-energiecontract-thuisbatterij-slim-laden-ontladen.png_x7ebaf` | `dynamisch-contract-thuisbatterij-cover-v1.png` | Dynamisch contract + thuisbatterij — Batterijenplan strategiecover met titel en logo |
| 8 | `elektrische-auto-ems-systeem` | D | `v1/media/batterijenplan/blog/elektrische-auto-ems-systeem-thuisbatterij_c5r7yz` | `elektrische-auto-slim-laden-cover-v1.png` | Elektrische auto slim laden — Batterijenplan strategiecover met titel en logo |
| 9 | `ems-systeem-thuisbatterij-controle-over-stroom` | D | `v1/media/batterijenplan/blog/ems-systeem-thuisbatterij-controle-over-stroom_s8bujw` | `wat-regelt-een-ems-cover-v1.png` | Wat regelt een EMS? — Batterijenplan strategiecover met titel en logo |
| 10 | `thuisbatterij-installatie` | E | `v1/media/batterijenplan/blog/thuisaccu-installatie-installeren_sj8gen` | `thuisbatterij-installeren-cover-v1.png` | Thuisbatterij installeren — Batterijenplan praktijkgidscover met titel en logo |
| 11 | `stroom-opslaan-zonnepanelen` | E | `v1/media/batterijenplan/blog/stroom-opslaan-zonnepanelen_ytxt9p` | `zonnestroom-opslaan-cover-v1.png` | Zonnestroom opslaan — Batterijenplan praktijkgidscover met titel en logo |
| 12 | `batterijopslag-woonstichtingen-vve` | E | `v1/media/batterijenplan/blog/batterijopslag-woonstichtingen-vve-cover_knhsgn` | `batterijopslag-vve-cover-v1.png` | Batterijopslag voor VvE's — Batterijenplan praktijkgidscover met titel en logo |

`thuisbatterij-vergelijken` (C) is **PASS** — current cover retained, no release needed.

**No article remains REVIEW REQUIRED.** All euro figures / rankings / photographic covers are replaced by claim-free editorial covers.

## Next steps (after visual approval only)

1. Approve the 12 covers visually (this doc + `COVER_CONTACT_SHEET_V1.png` + family sheets).
2. Generate guarded `cover_only` manifests for the 12 approved posts.
3. Operator runs cover-only dry-run → apply → post-apply verify on Render (not performed here).

**Not done in this phase:** no manifests, no Cloudinary upload, no Render access, no commit/push.