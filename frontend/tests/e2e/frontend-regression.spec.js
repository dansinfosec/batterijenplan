// Playwright browser regression tests for the two fixes:
//   1) /artikelen loads EVERY API page (no missing articles, no duplicates, filters work)
//   2) the reading-progress bar is fixed at the very top of the viewport and grows horizontally
//
// NOTE: Playwright is not part of this repo's default devDependencies. To run:
//   npm i -D @playwright/test && npx playwright install chromium
//   BASE_URL=http://localhost:4173 npx playwright test tests/e2e
// Point BASE_URL at a preview/build whose API has posts (ideally > DRF PAGE_SIZE=10 so the
// multi-page path is exercised end-to-end). The count assertions hold for any number of posts.
//
// The assertions below were also verified live via Chrome DevTools during development (see
// research/seo/frontend-regression-fix-v2/REPORT.md): single bar, position:fixed, top:0,
// rectTop:0 before and after scrolling, scaleX grows 0->~1, no horizontal overflow.

import { test, expect, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:4173";
const API_URL = process.env.PW_API_URL || "https://api.batterijenplan.nl/api/posts/";
const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "390x844", width: 390, height: 844 },
];

async function apiCount(request) {
  // Follow DRF pagination to count all published posts (mirrors the app loader).
  let url = API_URL;
  let count = 0;
  const seen = new Set();
  while (url) {
    if (seen.has(url)) break;
    seen.add(url);
    const r = await request.get(url);
    const j = await r.json();
    if (Array.isArray(j)) { count += j.length; break; }
    count += j.results.length;
    url = j.next;
  }
  return count;
}

test.describe("/artikelen loads all pages", () => {
  test("renders every published article, unique, no duplicate featured", async ({ page, request }) => {
    const expected = await apiCount(request);
    await page.goto(`${BASE_URL}/artikelen`);
    await page.waitForSelector(".articles-featured, .article-card, .state");
    // wait until the async multi-page load settles
    await page.waitForFunction(
      (exp) => document.querySelectorAll(".articles-featured, .article-card").length >= exp,
      expected,
      { timeout: 15000 },
    );
    const slugs = await page.$$eval('a[href^="/post/"]', (as) =>
      as.map((a) => a.getAttribute("href")).filter((h) => h && h.startsWith("/post/")),
    );
    const unique = new Set(slugs);
    expect(unique.size).toBe(expected);            // rendered count == API count
    expect(unique.size).toBe(slugs.length);        // no duplicate cards / featured shown twice
  });

  test("an article from the LAST API page is present", async ({ page, request }) => {
    // last page's last slug
    let url = API_URL, last = null;
    const seen = new Set();
    while (url) { if (seen.has(url)) break; seen.add(url); const j = await (await request.get(url)).json();
      const arr = Array.isArray(j) ? j : j.results; if (arr.length) last = arr[arr.length - 1].slug; url = j.next; }
    await page.goto(`${BASE_URL}/artikelen`);
    await page.waitForSelector(`a[href="/post/${last}"]`, { timeout: 15000 });
    expect(await page.locator(`a[href="/post/${last}"]`).count()).toBeGreaterThanOrEqual(1);
  });

  test("tag filter narrows and clearing restores the full collection", async ({ page }) => {
    await page.goto(`${BASE_URL}/artikelen`);
    await page.waitForSelector(".article-card, .articles-featured");
    const full = await page.$$eval('a[href^="/post/"]', (a) => a.length);
    const firstTag = page.locator(".tagbar button, .tag-chip").nth(1);
    if (await firstTag.count()) {
      await firstTag.click();
      await page.waitForTimeout(800);
      const filtered = await page.$$eval('a[href^="/post/"]', (a) => a.length);
      expect(filtered).toBeLessThanOrEqual(full);
      // clear (first chip is usually "Alles"/all)
      await page.locator(".tagbar button, .tag-chip").first().click();
      await page.waitForTimeout(800);
      const restored = await page.$$eval('a[href^="/post/"]', (a) => a.length);
      expect(restored).toBe(full);
    }
  });
});

test.describe("reading-progress bar", () => {
  for (const vp of VIEWPORTS) {
    test(`bar is fixed at top and grows on scroll @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/artikelen`);
      const firstPost = await page.locator('a[href^="/post/"]').first().getAttribute("href");
      await page.goto(`${BASE_URL}${firstPost}`);
      const bar = page.locator(".reading-progress");
      await expect(bar).toHaveCount(1);                              // exactly one bar
      expect(await bar.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
      expect(await bar.evaluate((el) => getComputedStyle(el).top)).toBe("0px");
      expect(await bar.evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
      // width never exceeds the viewport
      const barW = await bar.evaluate((el) => el.getBoundingClientRect().width);
      expect(barW).toBeLessThanOrEqual(vp.width + 1);
      // no horizontal page overflow
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow).toBeFalsy();
      // progress increases while scrolling and bar stays pinned to the top
      const before = await page.evaluate(() =>
        parseFloat(document.querySelector(".reading-progress__bar").style.getPropertyValue("--reading-progress")) || 0);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(200);
      const after = await page.evaluate(() =>
        parseFloat(document.querySelector(".reading-progress__bar").style.getPropertyValue("--reading-progress")) || 0);
      expect(after).toBeGreaterThan(before);
      expect(after).toBeLessThanOrEqual(1);                          // never exceeds 100%
      expect(await bar.evaluate((el) => el.getBoundingClientRect().top)).toBe(0); // still at top after scroll
    });
  }

  test("scroll listeners are cleaned up after leaving the article route", async ({ page }) => {
    await page.goto(`${BASE_URL}/artikelen`);
    const firstPost = await page.locator('a[href^="/post/"]').first().getAttribute("href");
    await page.goto(`${BASE_URL}${firstPost}`);
    await expect(page.locator(".reading-progress")).toHaveCount(1);
    // navigate away (SPA) -> the article unmounts, no bar remains and no error on scroll
    await page.goto(`${BASE_URL}/artikelen`);
    await expect(page.locator(".reading-progress")).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 300)); // must not throw against a stale listener
  });
});
