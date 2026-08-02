# Batterijenplan cover design system V1

One coherent editorial cover system for every published blog article. Covers do **not** need identical
illustrations — they must read as deliberate members of the same system through shared logo, type, palette,
safe zones and label treatment.

---

## 1. Shared visual rules (all families)

| Token | Value | Use |
|---|---|---|
| Paper | `#F7F6F2` | background of light covers |
| Ink | `#12130F` | title on light covers, line work |
| Ink-60 | `#4C4D46` | secondary text |
| Volt yellow | `#FFD100` | accent underline, label on dark covers |
| Volt-dk | `#8A6D00` | category label on light covers (readable yellow-on-light) |
| Copper | `#B4592E` | secondary illustration accent |
| Corner radius | `6px` (`--radius`) | matches frontend card radius |

- **Logo:** real `frontend/public/brand/logo-horizontaal.svg`, upper-left, inside the safe zone.
  - Light covers: logo placed directly on paper.
  - Dark covers: logo inside a paper chip (rounded 8px) for contrast.
- **Fonts:** brand fonts only — **Archivo** (display, weight 800) for the title; **IBM Plex Mono**
  (600, uppercase, letter-spacing 0.14em) for the category label. No other fonts, no generated/misspelled text.
- **Category label:** one short mono uppercase line per family (see below), volt-dk on light / volt on dark.
- **Accent:** a single volt-yellow underline rule under the title.
- **Title:** maximum two lines where practical; exact Dutch title or an approved shorter cover headline
  (see `COVER_HEADLINE_MAP_V1.md`). Never copy a long article H1 verbatim into the image.
- **No unsupported financial claims:** no euro figures, no guaranteed payback/return, no fake commercial logos.

### Safe-zone rules (derived from the real frontend crop geometry — see `COVER_RENDERING_AUDIT_V1.md`)

- Minimum **left/right margin: 8%** of width.
- Minimum **top margin: 8%**, minimum **bottom margin: 12%**.
- **No essential title text in the bottom 12%.**
- No essential content outside the **central 80% width**.
- Logo entirely inside the safe zone.
- Title readable at **360px** device width.
- Must pass **centre-cropped 16:9 and 16:10** card contexts (object-position is always `center`; do not
  rely on a custom object-position to rescue an unsafe composition).

**Why these numbers work.** The production cover is a single **16:9** image. In the 16:9 contexts (home
feature, /artikelen card, mobile card) it is not cropped; the article-detail hero uses `object-fit: contain`
(never cropped). The only cropping context is the **16:10** `/artikelen` featured card, which trims ~**5.55%
off each side**. An 8% side margin therefore keeps the logo and full title safe in every current context.

---

## 2. Families

### A · Research & data
Calculations, datasets, simulations, measurements, evidence-based yield articles.
- Light paper background; technical editorial illustration; label **"Onderzoek & data"**;
  restrained data references; strong safe-zone title.
- Members: `wat-levert-een-thuisbatterij-op`.

### B · Policy, timing & market change
2027, government rules, subsidies, Warmtefonds, energy-market change, deadlines.
- Stronger contrast (dark scrim over the illustration); timeline / transition symbolism; year or policy
  subject clearly visible; protected headline area; label **"Beleid & 2027"** / **"Beleid & subsidie"**.
- Members: `energieprijzen-stijgen-thuisbatterij-voordeel-2027`, `warmtefonds-thuisbatterij-lening`.

### C · Comparison
Product / supplier / brand / technology comparisons.
- Balanced split composition, equal visual weight, neutral comparison language, **no unsupported winner
  claims**, differences clearly encoded; label **"Vergelijking"**.
- Members: `thuisbatterij-vergelijken`, `enphase-vs-dyness`, `groene-vrienden-vs-zonneplan-vs-tibber`.

### D · Strategy & energy control
Dynamic contracts, EMS, trading vs self-consumption, EV smart charging.
- Energy-flow arrows; a clear strategic choice; price/timing/control symbolism; simple readable headline;
  label **"Strategie & keuze"**.
- Members: `terugverdientijd-thuisbatterij-handel-of-zelfconsumptie`, `dynamisch-energiecontract-thuisbatterij`,
  `elektrische-auto-ems-systeem`, `ems-systeem-thuisbatterij-controle-over-stroom`.

### E · Practical guides & installation
Installation, system setup, storing solar energy, technical/segment guidance.
- Process/step composition; house, meter box, inverter and battery relationships; instructional rather than
  promotional; label **"Praktijkgids"**.
- Members: `thuisbatterij-installatie`, `stroom-opslaan-zonnepanelen`, `batterijopslag-woonstichtingen-vve`.

---

## 3. Layout patterns

Two reusable patterns cover all families while respecting the safe zones:

**Pattern 1 — light, title upper-left (families A, C, D, E).**
Logo top-left → mono category label → two-line Archivo title on open paper → volt underline. The illustration
is scaled and anchored bottom-right so the upper-left title area stays clear (used for `wat-levert` and
`terugverdientijd`). Ink title on paper needs no scrim.

**Pattern 2 — dark, title mid-left (family B).**
Full-bleed illustration + left-to-clear dark scrim for contrast → paper logo chip top-left → volt label →
white two-line title in the vertical middle (never the bottom 12%) → volt underline (used for `2027`).

Both patterns keep the logo + full title within 8% side margins and out of the bottom 12%, so a single 16:9
production cover survives every current frontend context.

---

## 4. Production & derivatives

For each changed article (see `COVER_RENDERING_AUDIT_V1.md`):
- **Universal production cover: 1600×900** — the file that goes to `Post.cover_image` (Cloudinary). It must
  itself pass every frontend context.
- **Card review derivative: 1200×800** — 3:2, for future card-specific use; not used in production because the
  backend currently exposes only one cover field (do not assume otherwise).
- **Open Graph derivative: 1200×630**.
- **Mobile preview** — the 1600×900 cover centre-cropped into a 16:9 card at a 360px device width.

Review assets live under `research/seo/cover-review-v1/<slug>/` (non-production). Historical source covers are
never overwritten.
