# PRODUCTION PREVIEW REPORT — V6 (2027 article)

Date 2026-08-03. Browser execution DID run (Chrome via the automation tools).

## Brand restyle preview (2026-08-03)
All six SVGs were restyled to the Batterijenplan identity (paper/ink/volt/copper — see
`VISUAL_BRAND_RESTYLE_REPORT.md` / `VISUAL_BRAND_TOKENS.json`) and the article preview was rebuilt with the
restyled charts. Browser execution ran; 13 brand screenshots captured under
`production-preview/brand-restyle/` (8 desktop + 5 true-390px mobile). Verified at desktop and 390px:
chart backgrounds match the paper page; ink card borders + hard offset shadows match site cards; self-consumption
always volt, trading/secondary always copper, totals ink, overlays dashed; no cold-white islands; no page-level
horizontal overflow; charts and the brand data tables read as one system; grayscale-safe (labels/patterns).
No numerical value changed; 0 old-palette colours remain. Wide infographics still compress on mobile (main
labels readable; small footnotes small).

## Preview method (fidelity)
A local preview **fixture** was rendered and screenshotted in Chrome. It uses:
- the **real rendered body_html** — produced by the exact API renderer `markdown.markdown(body,
  extensions=["fenced_code","tables","nl2br"])` on `article-v6-final-production-body.md`;
- the **real site CSS** — `frontend/dist/assets/index-C_JXeDL_.css` (the built SPA stylesheet), inlined;
- the **real PostDetail DOM** — `article.container.post-detail.article-detail`, the reading-progress bar,
  `header.article-header` with the single `<h1>` + `.article-meta`, the auto-generated `.article-toc`
  (via the same slugify/H2-id logic as `PostDetail.jsx`), and `.prose.article-body` with `.post-table-scroll`
  table wrapping;
- the 6 SVGs **inlined at their intended sections** (preview only; the production body is text-only and the
  visuals are added later via a `visual_patch`).
Files: `production-preview/preview.html` (desktop), `production-preview/mobile-preview.html` (390px iframe so
the article's CSS media queries evaluate against a true 390px viewport). Served over `http://127.0.0.1` for
the browser (file:// is blocked by the extension). The production Django Post was NOT used or modified.

## Screenshots actually generated (10) — in `production-preview/`
Desktop (viewport ≈1425px, window 1440×900):
- article-top-desktop.png — eyebrow, single H1, lead, meta, auto-TOC, yellow reading-progress bar at top.
- article-methodology-desktop.png — methodology callout renders as a styled blockquote; prose flows (no mid-sentence breaks).
- policy-fee-table-desktop.png — fee-structure table, right-aligned figures, bold €0 row.
- representative-waterfall-desktop.png — waterfall SVG: +€390 +€202 +€0 = €592, "representatief scenario" label.
- imbalance-section-desktop.png — break-even bars (42/21/14/10%) + "nooit rendabel" line + SCENARIO-OVERLAY note; reserve chart below.
- faq-desktop.png — FAQ (bold questions, corrected Q3 wording), calculator link styled.
Mobile (true 390×844 via iframe):
- article-top-mobile.png — H1 wraps, TOC intact, no overflow.
- table-mobile.png — wide table scrolls horizontally INSIDE `.post-table-scroll` (scrollbar visible), page does not.
- visual-mobile.png — waterfall SVG scales to 315px; main bars/values readable.
- faq-mobile.png — FAQ readable, good line length.

## Desktop / mobile checks
| item | result |
|---|---|
| Article column width | max-width-constrained + centered; comfortable measure. ✓ |
| Heading hierarchy | one `<h1>` (post.title); H2 sections only; no skipped levels. ✓ |
| Duplicate page H1 | none (body has no H1). ✓ |
| Table overflow handling | `.post-table-scroll` wraps every table; horizontal scroll inside container on mobile. ✓ |
| Page-level horizontal overflow | NONE at 390 / 768 / 1024 / ~1410 (scrollWidth < innerWidth at every width). ✓ |
| SVG text legibility (desktop) | crisp, no clipping. ✓ |
| SVG labels clipped | none. ✓ |
| Internal links clickable | rendered as styled `<a>` (e.g. thuisbatterij-calculator). ✓ |
| External citations | Rijksoverheid/ACM/Consumentenbond named in prose + source note; no raw file paths. ✓ |
| Calculator CTA visible | in-body link + (in production) the auto-injected ArticleCalculatorCta. ✓ |
| FAQ spacing | clean question/answer separation. ✓ |
| Mobile paragraph length | wraps to readable lines at 390px. ✓ |
| Giant empty side areas | none (centered column with normal margins). ✓ |
| Reading-progress fixed at top | yellow bar fixed at top:0 (unchanged component). ✓ |
| Progressive article loading | unchanged (Articles.jsx / list not touched; this is a single post render). ✓ |

## Issues found
1. **Minor — wide SVG footnotes small on mobile.** The infographics use an ~780px viewBox; scaled to ~315px
   the main bars/values stay readable but the small source/classification footnotes get tiny. Not a blocker.
   Optional mitigation at visual_patch time: larger base font in the SVGs or a simplified mobile variant.
2. **Cosmetic — CDP screenshot flakiness.** Several captures timed out on first try (heavy inlined CSS) and
   succeeded after a short wait; a preview-only artefact, irrelevant to production.
No production blockers were found in the render. No frontend change was required, so none was made.
