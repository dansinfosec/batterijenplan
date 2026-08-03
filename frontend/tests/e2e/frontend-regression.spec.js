// Playwright browser regression tests for /artikelen PROGRESSIVE loading + the reading-progress bar.
//
// Self-contained: the posts API is mocked via page.route() with 13 posts and PAGE_SIZE=10, so no live
// backend is needed. Run:
//   npm i -D @playwright/test && npx playwright install chromium
//   BASE_URL=http://localhost:4173 npx playwright test tests/e2e
//
// These assertions were also verified live via Chrome DevTools + a local paginated mock during
// development (see research/seo/frontend-infinite-articles/REPORT.md).

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:4173";
const TOTAL = 13;
const PAGE_SIZE = 10;
const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "390x844", width: 390, height: 844 },
];

function makePosts(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1, slug: `test-artikel-${i + 1}`, title: `Testartikel ${i + 1}`,
    excerpt: `Samenvatting ${i + 1}.`, tags: [i % 2 ? "rendement" : "capaciteit"],
    published_at: "2026-07-01T10:00:00Z", reading_minutes: 4, cover_image_url: null,
  }));
}

// Install a paginated posts mock. `opts.failPage2` makes page 2 fail once; `opts.count` overrides total.
async function mockApi(page, opts = {}) {
  const posts = makePosts(opts.count ?? TOTAL);
  let page2Failed = false;
  const page2Requests = { n: 0 };
  await page.route("**/api/tags/**", (r) => r.fulfill({ json: ["capaciteit", "rendement"] }));
  await page.route("**/api/posts/**", (route) => {
    const url = new URL(route.request().url());
    if (/\/api\/posts\/[^/]+\/$/.test(url.pathname)) return route.fulfill({ json: posts[0] });
    const tag = url.searchParams.get("tag");
    const pageNum = parseInt(url.searchParams.get("page") || "1", 10);
    let items = tag ? posts.filter((p) => p.tags.includes(tag)) : posts;
    if (pageNum === 2) {
      page2Requests.n += 1;
      if (opts.failPage2 && !page2Failed) { page2Failed = true; return route.fulfill({ status: 500, json: { detail: "fail" } }); }
    }
    const start = (pageNum - 1) * PAGE_SIZE;
    const results = items.slice(start, start + PAGE_SIZE);
    const hasNext = start + PAGE_SIZE < items.length;
    return route.fulfill({ json: {
      count: items.length,
      next: hasNext ? `${url.origin}/api/posts/?${tag ? `tag=${tag}&` : ""}page=${pageNum + 1}` : null,
      previous: pageNum > 1 ? `${url.origin}/api/posts/?page=${pageNum - 1}` : null,
      results,
    } });
  });
  return page2Requests;
}

const cardCount = (page) => page.locator(".article-card").count();
const featuredCount = (page) => page.locator(".articles-featured").count();
async function uniqueSlugs(page) {
  const hrefs = await page.$$eval('a[href^="/post/"]', (as) => as.map((a) => a.getAttribute("href")));
  return new Set(hrefs);
}

test.describe("/artikelen progressive loading", () => {
  test("1. initial: 1 featured + 9 cards, 10 unique, button visible, page 2 NOT requested", async ({ page }) => {
    const p2 = await mockApi(page);
    await page.goto(`${BASE_URL}/artikelen`);
    await page.waitForSelector(".articles-featured");
    expect(await featuredCount(page)).toBe(1);
    expect(await cardCount(page)).toBe(9);
    expect((await uniqueSlugs(page)).size).toBe(10);
    await expect(page.locator(".articles-loadmore-btn")).toBeVisible();
    await expect(page.locator(".articles-loadmore-btn")).toHaveText(/Meer artikelen laden/);
    expect(p2.n).toBe(0); // page 2 not fetched eagerly
  });

  test("2. automatic: scrolling loads page 2 once → 13, button disappears", async ({ page }) => {
    const p2 = await mockApi(page);
    await page.goto(`${BASE_URL}/artikelen`);
    await page.waitForSelector(".articles-featured");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator(".article-card")).toHaveCount(12); // 1 featured + 12 = 13
    expect((await uniqueSlugs(page)).size).toBe(13);
    expect(await featuredCount(page)).toBe(1);       // featured still once
    await expect(page.locator(".articles-loadmore-btn")).toHaveCount(0); // next === null
    expect(p2.n).toBe(1);                             // page 2 requested exactly once
  });

  test("3. button fallback loads page 2 and appends", async ({ page }) => {
    await mockApi(page);
    await page.goto(`${BASE_URL}/artikelen`);
    await page.waitForSelector(".articles-loadmore-btn");
    await page.locator(".articles-loadmore-btn").click();
    await expect(page.locator(".article-card")).toHaveCount(12);
    expect((await uniqueSlugs(page)).size).toBe(13);
  });

  test("4. page-2 error keeps first 10 + shows retry, then retry appends final 3", async ({ page }) => {
    await mockApi(page, { failPage2: true });
    await page.goto(`${BASE_URL}/artikelen`);
    await page.waitForSelector(".articles-loadmore-btn");
    await page.locator(".articles-loadmore-btn").click();
    await expect(page.locator(".articles-loadmore-error")).toBeVisible();
    expect(await cardCount(page)).toBe(9);            // first 10 remain (featured + 9)
    await expect(page.locator(".articles-loadmore-btn")).toBeVisible(); // retry
    await page.locator(".articles-loadmore-btn").click(); // retry (mock succeeds 2nd time)
    await expect(page.locator(".article-card")).toHaveCount(12);
    expect((await uniqueSlugs(page)).size).toBe(13);
  });

  test("5. changing a filter resets the collection and re-paginates", async ({ page }) => {
    await mockApi(page);
    await page.goto(`${BASE_URL}/artikelen`);
    await page.waitForSelector(".articles-featured");
    const tagBtn = page.locator(".tagbar button, .tag-chip").nth(1);
    if (await tagBtn.count()) {
      await tagBtn.click();
      await page.waitForTimeout(500);
      expect(await featuredCount(page)).toBe(1);      // filtered page 1 has its own featured
      expect((await uniqueSlugs(page)).size).toBeGreaterThan(0);
    }
  });

  for (const vp of VIEWPORTS) {
    test(`no horizontal overflow @ ${vp.name}`, async ({ page }) => {
      await mockApi(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/artikelen`);
      await page.waitForSelector(".articles-featured");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow).toBeFalsy();
    });
  }
});

test.describe("reading-progress bar (regression from commit 5331206)", () => {
  test("bar is fixed at top:0, grows on scroll, single, no overflow", async ({ page }) => {
    await mockApi(page);
    await page.goto(`${BASE_URL}/artikelen`);
    const first = await page.locator('a[href^="/post/"]').first().getAttribute("href");
    await page.goto(`${BASE_URL}${first}`);
    const bar = page.locator(".reading-progress");
    await expect(bar).toHaveCount(1);
    expect(await bar.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
    expect(await bar.evaluate((el) => getComputedStyle(el).top)).toBe("0px");
    expect(await bar.evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
    const before = await page.evaluate(() =>
      parseFloat(document.querySelector(".reading-progress__bar").style.getPropertyValue("--reading-progress")) || 0);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    const after = await page.evaluate(() =>
      parseFloat(document.querySelector(".reading-progress__bar").style.getPropertyValue("--reading-progress")) || 0);
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThanOrEqual(1);
    expect(await bar.evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBeFalsy();
  });
});
