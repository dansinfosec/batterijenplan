# Progressive article loading on /artikelen

Date: 2026-08-03. Frontend-only. Builds on commit 5331206. No Django pagination settings, Post records,
article content, titles/excerpts/SEO/covers, sitemap/prerender behaviour (beyond keeping it correct),
calculator, research/model-v1, Render or Cloudinary changes. No manual Render access.

## Summary of the change
`/artikelen` no longer eagerly follows every `next` URL. It now loads **page 1 only**, shows the first
result as the featured article and the rest as cards, and **appends later pages progressively** via an
`IntersectionObserver` sentinel (early trigger) with a visible **"Meer artikelen laden"** button
fallback — both calling one guarded `loadMore()`.

## Findings / evidence

- **API page size:** DRF `PAGE_SIZE = 10` (unchanged).
- **Initial requests:** on first visit the runtime makes **one** posts-list request (page 1). Measured
  via `performance.getEntriesByType('resource')`: `page2Requested: false`. (In dev React StrictMode the
  page-1 request fires twice — both page 1, the first aborted; production = 1.)
- **Initial layout:** `1 featured + 9 cards = 10`, 10 unique slugs, count line **"10 van 13 artikelen
  geladen"**, "Meer artikelen laden" visible. No horizontal overflow.
- **Automatic observer:** `rootMargin: "600px 0px"`, observes only while `next` is non-null and not
  loading, single observer, disconnected on cleanup/complete/unmount, paused after an error. On scroll
  it requested page 2 **exactly once** (`page2RequestCount: 1`) and appended 3 cards → **13 total**,
  button disappeared (`next === null`), "13 van 13 artikelen geladen", "Alle artikelen zijn geladen."
- **Button fallback:** same `loadMore()`; while loading it is disabled, `aria-busy=true`, label
  "Meer artikelen laden…", and an `aria-live="polite"` region announces "Meer artikelen laden…".
- **Total after all pages:** 13 (1 featured + 12 cards), **0 duplicate slugs**.
- **Deduplication:** appended posts are filtered against a `seen` slug set (featured + all cards); a
  unit test injects a page-2 item that duplicates a page-1 slug and asserts it is dropped.
- **Filter reset:** changing the tag bumps a generation token, aborts the in-flight request
  (`AbortController`), clears featured/cards/visited/seen, and fetches the filtered page 1; later pages
  follow that filtered response's `next` (the `?tag=` query is preserved by DRF's `next`). Clearing the
  tag restores the unfiltered page-1 state and re-enables progressive loading. Filtering is **server-side**.
- **Duplicate-request protection:** `inFlightRef` guard (rapid clicks / observer double-fire),
  `visitedRef` set (never fetch the same page URL twice; entry removed on error to allow retry),
  generation token + `AbortController` (ignore/cancel stale responses after filter change or unmount),
  observer paused on error (no auto-retry storm — manual retry only). Verified: page 2 requested once
  under automatic loading, and once per retry.
- **SEO/prerender:** the build still fetches **all** pages via its own `fetchAllPosts`
  (`scripts/prerender-blog-meta.mjs`) — unchanged. Build output: **13 prerendered post pages**, **5
  static pages**, **sitemap with 18 URLs**. Every published article URL remains discoverable by search
  engines; the runtime archive is what loads progressively. Canonicals/slugs untouched.
- **Homepage:** `Home.jsx` now uses `fetchPostsPage` (one page) instead of the eager helper, so the
  homepage no longer fetches the whole archive to show ~5 posts (fixes a regression from 5331206).

## Runtime loading architecture
`pagination.js` exposes `fetchPostsPage` (one normalised page) and `fetchAllPages` (all pages, for
build). `api.js` `fetchPostsPage(arg,{signal})` fetches page 1 (from `{tag,search}`) or a `next` URL,
via a `sameOriginFetch` that re-points DRF's absolute `next` to the configured API origin, with an
`AbortSignal`. `Articles.jsx` holds `{featured, cards, count, next, initial/moreLoading, initial/moreError}`
plus refs `{gen, inFlight, visited, seen, abort, sentinel, next}` and one `runLoad(gen,{initial,url})`
driving both the observer and the button.

## Tests
- **Unit (`node --test`, runnable):** `tests/pagination.test.mjs` — **22 passed**. Adds `fetchPostsPage`
  (one request only, no `next` follow; page-1 = 10 + next; last page next null; unpaginated array;
  malformed; failed), `normalizePageResponse` (envelope/array/missing-count/malformed), and a
  progressive-shape test (page1 featured + 9, page2 appends, dedup a repeated slug, total 13, featured
  never in cards). Keeps the all-pages + dedupe tests.
- **Browser (`tests/e2e/frontend-regression.spec.js`, Playwright):** self-contained via `page.route()`
  mocking 13 posts / PAGE_SIZE 10 — initial (1+9, 10 slugs, button, page2 not requested); automatic
  (page2 once → 13, button gone); button fallback; page-2 error keeps first 10 + retry appends final 3;
  filter reset; no horizontal overflow at 1920×1080 / 1440×900 / 1024×768 / 390×844; plus the
  reading-progress regression. Playwright is not in repo deps (no install path here); every assertion was
  verified live via Chrome DevTools + a local paginated mock (numbers above).

## Build
`npm run build` → vite OK; prerender **13** post pages; **5** static pages; **sitemap 18 URLs**.

## Screenshots (this folder)
Captured live via Chrome automation against a local paginated mock (13 posts, PAGE_SIZE 10). JPEG bytes
under `.png` names.
- `initial-desktop-1-featured-9-cards.png` — 1 featured + 9 cards, "10 van 13", button visible.
- `loading-more-desktop.png` — button "Meer artikelen laden…", aria-live status, page-2 pending.
- `all-13-desktop.png` — 13 loaded, no button, "Alle artikelen zijn geladen.".
- `load-more-error-desktop.png` — page-2 failed: first 10 retained, error message, retry button.
- **Not captured:** `initial-mobile.png`, `all-13-mobile.png` — the automation environment pinned the CSS
  viewport at ~750px (`window.innerWidth` stayed 750 regardless of window size), so the <720px mobile
  1-column layout could not be rendered. Responsive safety (no horizontal overflow) was verified, and the
  Playwright spec exercises 390×844 via `setViewportSize`.

## Files changed
- `frontend/src/pagination.js` — add `normalizePageResponse`, `fetchPostsPage`; `fetchAllPages` reuses them.
- `frontend/src/api.js` — `fetchPostsPage(arg,{signal})` (one page, abortable) + `fetchPostsAllPages`; `sameOriginFetch` accepts opts. Removed eager `fetchPosts`.
- `frontend/src/pages/Articles.jsx` — progressive loading (observer + button + guards + filter reset).
- `frontend/src/pages/Home.jsx` — use `fetchPostsPage` (one page).
- `frontend/src/styles/global.css` — styles for count line, sentinel, load-more button, error, all-loaded.
- `frontend/tests/pagination.test.mjs` — one-page + progressive tests (22 total).
- `frontend/tests/e2e/frontend-regression.spec.js` — progressive Playwright spec.
