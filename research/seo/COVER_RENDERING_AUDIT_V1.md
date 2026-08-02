# Cover rendering audit V1

Two parts: (1) the real frontend cover-rendering geometry, and (2) a per-article audit of every published
cover with its final status. **Final: 12 READY (new cover for review) + 1 PASS (kept). No article remains
REVIEW REQUIRED.**

---

## Part 1 — Frontend rendering geometry

Single cover field: **`post.cover_image_url`** (also reused as the OG/meta image). There is **no** card-specific
or OG-specific image field in the codebase. `object-position` is **never set** → every `object-fit: cover` uses
the default **center**. Cloudinary width is requested per context via `optimizedImageUrl(url, w)`.

| Context | CSS selector | aspect-ratio | object-fit | object-position | radius | req. width | crop? |
|---|---|---|---|---|---|---|---|
| Homepage featured | `.hp2-feature-media` | 16:9 | cover | center | 6px | 800 | 16:9 → none |
| Homepage supporting cards | `.article-card-media` | 16:9 | cover | center | 6px | 640 | 16:9 → none |
| /artikelen featured | `.articles-featured-media` | **16:10** | cover | center | 6px | 960 | **sides −5.55% each** |
| /artikelen normal card | `.article-card-media` | 16:9 | cover | center | 6px | 640 | 16:9 → none |
| Mobile article card | `.article-card-media` (1-col) | 16:9 | cover | center | 6px | 640 | 16:9 → none (legibility only) |
| Article detail hero | `img.cover` | intrinsic 1200×675 | **contain** | center | 6px | 1200 + srcset | never |
| Related-article cards | `.related-post-card` | — | — | — | 10px | — | **no image (text only)** |
| Open Graph | `og:image` = `cover_image_url` | consumer ~1.91:1 | (external) | — | — | — | platform-dependent |

**Rule for a single universal cover.** A **16:9** production cover is uncropped everywhere except the 16:10
`/artikelen` featured card (trims ~**5.55% per side**). → keep logo + full title within **8% side margins**. The
detail hero uses **contain** (whole cover always visible). Non-16:9 covers crop top+bottom in 16:9 cards.

---

## Part 2 — Per-article cover audit (final)

Status: **PASS** (readable, brand-consistent, crop-safe — kept) · **READY** (new local editorial cover produced,
approved for review). Every new cover: real logo upper-left, brand fonts (Archivo/IBM Plex Mono), paper/ink/volt/
copper palette, ≤2 headline lines, title in the safe zone, no euro figures, no rankings, no fake logos, no
photographic drift. All produced locally (editable SVG + local composition; **no image-generation service**).

### Family A · Research & data
**1. `wat-levert-een-thuisbatterij-op` — READY.** New safe-zone cover: logo top-left, "Onderzoek & data",
two-line title *Wat levert een thuisbatterij op?* upper-left, isometric house/battery/grid illustration.
Replaces the old bottom-band cover that clipped the title on the 16:10 crop.

### Family B · Policy, timing & market change
**2. `energieprijzen-stijgen-thuisbatterij-voordeel-2027` — READY.** Dark-scrim policy cover, title *Thuisbatterij
vanaf 2027* moved up/inward into the safe zone; battery + house + transition arrow; "Beleid & 2027".
**3. `warmtefonds-thuisbatterij-lening` — READY.** New dark-scrim cover *Warmtefonds en thuisbatterij* with a
home + battery + financing-document flow; "Beleid & subsidie". **No €620, no monthly amount, no approval
guarantee, no government logos** (replaces the old photographic €620 cover).

### Family C · Comparison
**4. `thuisbatterij-vergelijken` — PASS.** Flat editorial, balanced, crop-safe; kept unchanged.
**5. `enphase-vs-dyness` — READY.** New comparison cover *Enphase vs Dyness*: two equal-weight architectures
(MODULAIR stack vs TOWER + OMVORMER) with a neutral VS; no fake product photos, no winner declared.
**6. `groene-vrienden-vs-zonneplan-vs-tibber` — READY.** New cover *Energieplatformen vergeleken*: three equal
columns labelled GROENE VRIENDEN · ZONNEPLAN · TIBBER (text only, no logos, no ranking, no euro).

### Family D · Strategy & energy control
**7. `terugverdientijd-thuisbatterij-handel-of-zelfconsumptie` — READY.** New title *Handel of zelfconsumptie?*
added to the previously title-free cover; two-cluster illustration; no payback figure.
**8. `dynamisch-energiecontract-thuisbatterij` — READY.** New cover *Dynamisch contract + thuisbatterij*: house +
battery + a generic low→high price step (LAAG/HOOG markers, **no numeric/fake financial chart**).
**9. `elektrische-auto-ems-systeem` — READY.** New cover *Elektrische auto slim laden*: solar + house + battery +
generic (unbranded) EV coordinated by an EMS hub.
**10. `ems-systeem-thuisbatterij-controle-over-stroom` — READY.** New cover *Wat regelt een EMS?*: EMS hub with
spokes to solar, house, battery, meter box and car (hub-and-spoke, not a software dashboard).

### Family E · Practical guides & installation
**11. `thuisbatterij-installatie` — READY.** New cover *Thuisbatterij installeren*: numbered 4-step flow
meterkast → omvormer → batterij → inbedrijfstelling (professional, no unsafe DIY implication).
**12. `stroom-opslaan-zonnepanelen` — READY.** New cover *Zonnestroom opslaan*: daytime solar surplus → battery →
evening use (sun/moon day-vs-evening).
**13. `batterijopslag-woonstichtingen-vve` — READY.** New cover *Batterijopslag voor VvE's*: apartment building +
rooftop solar + central shared battery ("gedeelde opslag"); does not imply one design fits every building.

---

## Summary

| Status | Count | Articles |
|---|---|---|
| PASS (kept) | 1 | thuisbatterij-vergelijken |
| READY (new cover for review) | 12 | wat-levert, 2027, warmtefonds, enphase-vs-dyness, groene-vrienden-vs-zonneplan-vs-tibber, terugverdientijd, dynamisch-energiecontract, elektrische-auto-ems-systeem, ems-systeem-thuisbatterij, thuisbatterij-installatie, stroom-opslaan-zonnepanelen, batterijopslag-woonstichtingen-vve |

The nine former REVIEW-REQUIRED photographic covers were replaced with fresh local editorial illustrations in
the Batterijenplan system — no old photographic artwork was cropped or retitled, and no image-generation credits
were spent. Validation (153 checks) passed for all produced covers; see `COVER_CONTACT_SHEET_V1.png` and the
per-article `crop-preview.png` / `safe-zone-preview.png`.
