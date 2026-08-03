// Pagination helpers for Django REST Framework list endpoints.
//
// DRF's PageNumberPagination returns { count, next, previous, results:[...] } and, with PAGE_SIZE=10,
// only the first 10 items live in `results`. Two distinct use cases:
//   - fetchPostsPage : fetch EXACTLY ONE page (used by the /artikelen progressive UI and the homepage,
//                      which only need a bounded number of posts);
//   - fetchAllPages  : follow `next` until null (used only when the whole archive is genuinely needed).
//
// Pure and dependency-free: `fetchImpl` is injected so it can be unit-tested with a mock fetch and so
// api.js can supply a same-origin-rewriting fetch. Nothing hardcodes a page count.

// Normalise any posts-list payload to a consistent { count, next, previous, results } shape.
// Accepts the DRF envelope and a bare (unpaginated) array. Throws on anything else.
export function normalizePageResponse(payload) {
  if (Array.isArray(payload)) {
    return { count: payload.length, next: null, previous: null, results: payload };
  }
  if (!payload || !Array.isArray(payload.results)) {
    throw new Error("Unexpected posts API response (no results array)");
  }
  return {
    count: typeof payload.count === "number" ? payload.count : payload.results.length,
    next: payload.next || null,
    previous: payload.previous || null,
    results: payload.results,
  };
}

// Fetch exactly ONE page and return its normalised shape. Never follows `next`.
export async function fetchPostsPage(url, fetchImpl = fetch) {
  if (!url) throw new Error("fetchPostsPage: url is required");
  const response = await fetchImpl(url);
  if (!response || !response.ok) {
    const status = response ? response.status : "no response";
    throw new Error(`Posts request failed: ${status} ${url}`);
  }
  return normalizePageResponse(await response.json());
}

// Follow every `next` and return the full, deduped, ordered array. For build/prerender/sitemap-style
// tasks that genuinely need all published posts — NOT the runtime archive UI.
export async function fetchAllPages(initialUrl, fetchImpl = fetch) {
  if (!initialUrl) throw new Error("fetchAllPages: initialUrl is required");

  const collected = [];
  const visited = new Set();
  let url = initialUrl;

  while (url) {
    if (visited.has(url)) {
      // A well-formed API never points `next` back at a page we already fetched; if it does we stop
      // rather than loop forever, and we never request the same URL twice.
      throw new Error(`Pagination loop detected: ${url}`);
    }
    visited.add(url);
    const page = await fetchPostsPage(url, fetchImpl);
    collected.push(...page.results);
    url = page.next;
  }

  return dedupeBySlug(collected);
}

// Deduplicate while preserving the first-seen order (which is the API ordering). Items without a slug
// (or id) are kept as-is so nothing is silently dropped.
export function dedupeBySlug(posts) {
  const seen = new Set();
  const out = [];
  for (const post of posts) {
    const key = post && (post.slug ?? post.id);
    if (key == null) {
      out.push(post);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(post);
  }
  return out;
}
