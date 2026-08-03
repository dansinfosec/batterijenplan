// Unit tests for the pagination-aware posts loader. Runnable with `node --test` (Node 18+),
// no test-runner dependency. Uses an injected mock fetch.
import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchAllPages,
  dedupeBySlug,
  fetchPostsPage,
  normalizePageResponse,
} from "../src/pagination.js";

function res(payload, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => payload };
}

function mockFetch(routes) {
  const calls = [];
  async function fn(url) {
    calls.push(url);
    if (!(url in routes)) throw new Error(`mockFetch: no route for ${url}`);
    const r = routes[url];
    return typeof r === "function" ? r() : r;
  }
  fn.calls = calls;
  return fn;
}

const post = (slug, id) => ({ slug, id: id ?? slug, title: `T-${slug}` });

test("unpaginated array response is returned as-is", async () => {
  const f = mockFetch({ "/api/posts/": res([post("a"), post("b"), post("c")]) });
  const out = await fetchAllPages("/api/posts/", f);
  assert.deepEqual(out.map((p) => p.slug), ["a", "b", "c"]);
  assert.equal(f.calls.length, 1);
});

test("single paginated response with next:null", async () => {
  const f = mockFetch({ "/api/posts/": res({ count: 2, next: null, previous: null, results: [post("a"), post("b")] }) });
  const out = await fetchAllPages("/api/posts/", f);
  assert.deepEqual(out.map((p) => p.slug), ["a", "b"]);
  assert.equal(f.calls.length, 1);
});

test("multiple API pages are all collected in order", async () => {
  const f = mockFetch({
    "/api/posts/": res({ count: 5, next: "/api/posts/?page=2", results: [post("a"), post("b")] }),
    "/api/posts/?page=2": res({ count: 5, next: "/api/posts/?page=3", results: [post("c"), post("d")] }),
    "/api/posts/?page=3": res({ count: 5, next: null, results: [post("e")] }),
  });
  const out = await fetchAllPages("/api/posts/", f);
  assert.deepEqual(out.map((p) => p.slug), ["a", "b", "c", "d", "e"]);
  assert.equal(out.length, 5);
  assert.equal(f.calls.length, 3);
});

test("does not hardcode a page count (works for 13 across 2 pages)", async () => {
  const p1 = Array.from({ length: 10 }, (_, i) => post(`s${i}`));
  const p2 = Array.from({ length: 3 }, (_, i) => post(`s${10 + i}`));
  const f = mockFetch({
    "/api/posts/": res({ count: 13, next: "/api/posts/?page=2", results: p1 }),
    "/api/posts/?page=2": res({ count: 13, next: null, results: p2 }),
  });
  const out = await fetchAllPages("/api/posts/", f);
  assert.equal(out.length, 13);
});

test("duplicate slugs across pages are deduplicated (first occurrence kept)", async () => {
  const f = mockFetch({
    "/api/posts/": res({ next: "/api/posts/?page=2", results: [post("a"), post("b")] }),
    "/api/posts/?page=2": res({ next: null, results: [post("b"), post("c")] }),
  });
  const out = await fetchAllPages("/api/posts/", f);
  assert.deepEqual(out.map((p) => p.slug), ["a", "b", "c"]);
});

test("preserves API ordering", async () => {
  const f = mockFetch({
    "/api/posts/": res({ next: "/api/posts/?page=2", results: [post("z"), post("m")] }),
    "/api/posts/?page=2": res({ next: null, results: [post("a")] }),
  });
  const out = await fetchAllPages("/api/posts/", f);
  assert.deepEqual(out.map((p) => p.slug), ["z", "m", "a"]);
});

test("malformed response (no results array) throws", async () => {
  const f = mockFetch({ "/api/posts/": res({ count: 1, foo: "bar" }) });
  await assert.rejects(() => fetchAllPages("/api/posts/", f), /Unexpected posts API response/);
});

test("failed request throws with status", async () => {
  const f = mockFetch({ "/api/posts/": res(null, { ok: false, status: 502 }) });
  await assert.rejects(() => fetchAllPages("/api/posts/", f), /Posts request failed: 502/);
});

test("pagination loop (repeated next) is detected and throws", async () => {
  const f = mockFetch({
    "/api/posts/": res({ next: "/api/posts/?page=2", results: [post("a")] }),
    "/api/posts/?page=2": res({ next: "/api/posts/", results: [post("b")] }), // points back
  });
  await assert.rejects(() => fetchAllPages("/api/posts/", f), /Pagination loop detected/);
});

test("never requests the same URL twice on a well-formed multi-page response", async () => {
  const f = mockFetch({
    "/api/posts/": res({ next: "/api/posts/?page=2", results: [post("a")] }),
    "/api/posts/?page=2": res({ next: null, results: [post("b")] }),
  });
  await fetchAllPages("/api/posts/", f);
  assert.equal(new Set(f.calls).size, f.calls.length);
});

test("dedupeBySlug keeps items without slug/id", () => {
  const out = dedupeBySlug([{ slug: "a" }, { title: "no-key" }, { slug: "a" }, { id: 7 }]);
  assert.equal(out.length, 3); // a, the keyless item, and id:7 (second a dropped)
});

test("empty results across pages yields empty array", async () => {
  const f = mockFetch({ "/api/posts/": res({ count: 0, next: null, results: [] }) });
  assert.deepEqual(await fetchAllPages("/api/posts/", f), []);
});

// ---------------- single-page loader (progressive UI) ----------------

test("normalizePageResponse: DRF envelope -> normalised shape", () => {
  const n = normalizePageResponse({ count: 13, next: "u2", previous: null, results: [post("a")] });
  assert.deepEqual(n, { count: 13, next: "u2", previous: null, results: [post("a")] });
});

test("normalizePageResponse: bare array -> {count,next:null,results}", () => {
  const n = normalizePageResponse([post("a"), post("b")]);
  assert.equal(n.count, 2); assert.equal(n.next, null); assert.equal(n.results.length, 2);
});

test("normalizePageResponse: missing count falls back to results.length", () => {
  assert.equal(normalizePageResponse({ results: [post("a"), post("b")] }).count, 2);
});

test("normalizePageResponse: malformed throws", () => {
  assert.throws(() => normalizePageResponse({ foo: 1 }), /Unexpected posts API response/);
});

test("fetchPostsPage: page 1 returns 10 results + a next URL, ONE request only", async () => {
  const p1 = Array.from({ length: 10 }, (_, i) => post(`s${i}`));
  const f = mockFetch({
    "/api/posts/": res({ count: 13, next: "/api/posts/?page=2", previous: null, results: p1 }),
    "/api/posts/?page=2": res({ count: 13, next: null, results: [post("s10")] }),
  });
  const page = await fetchPostsPage("/api/posts/", f);
  assert.equal(page.results.length, 10);
  assert.equal(page.count, 13);
  assert.equal(page.next, "/api/posts/?page=2");
  assert.equal(f.calls.length, 1); // does NOT follow next
});

test("fetchPostsPage: last page has next null", async () => {
  const f = mockFetch({ "/api/posts/?page=2": res({ count: 13, next: null, results: [post("s10"), post("s11"), post("s12")] }) });
  const page = await fetchPostsPage("/api/posts/?page=2", f);
  assert.equal(page.next, null);
  assert.equal(page.results.length, 3);
});

test("fetchPostsPage: unpaginated array supported", async () => {
  const f = mockFetch({ "/api/posts/": res([post("a"), post("b")]) });
  const page = await fetchPostsPage("/api/posts/", f);
  assert.equal(page.count, 2); assert.equal(page.next, null);
});

test("fetchPostsPage: malformed response throws", async () => {
  const f = mockFetch({ "/api/posts/": res({ foo: "bar" }) });
  await assert.rejects(() => fetchPostsPage("/api/posts/", f), /Unexpected posts API response/);
});

test("fetchPostsPage: failed request throws with status", async () => {
  const f = mockFetch({ "/api/posts/": res(null, { ok: false, status: 500 }) });
  await assert.rejects(() => fetchPostsPage("/api/posts/", f), /Posts request failed: 500/);
});

test("progressive shape: page1 featured + rest, page2 appends, no dup, total 13", async () => {
  // simulate the component's use of fetchPostsPage across two pages
  const p1 = Array.from({ length: 10 }, (_, i) => post(`s${i}`));
  const p2 = [post("s8"), post("s10"), post("s11")]; // note s8 duplicates page1 -> must be dropped
  const f = mockFetch({
    "/api/posts/": res({ count: 12, next: "/api/posts/?page=2", results: p1 }),
    "/api/posts/?page=2": res({ count: 12, next: null, results: p2 }),
  });
  const page1 = await fetchPostsPage("/api/posts/", f);
  const featured = page1.results[0];
  let cards = page1.results.slice(1);
  const seen = new Set(page1.results.map((p) => p.slug));
  assert.equal(featured.slug, "s0");
  assert.equal(cards.length, 9);
  const page2 = await fetchPostsPage(page1.next, f);
  const fresh = page2.results.filter((p) => !seen.has(p.slug));
  fresh.forEach((p) => seen.add(p.slug));
  cards = [...cards, ...fresh];
  assert.equal(fresh.length, 2);                 // s8 deduped, s10 + s11 appended
  assert.equal(1 + cards.length, 12);            // featured + cards == count
  assert.ok(!cards.some((p) => p.slug === "s0")); // featured never in cards
});
