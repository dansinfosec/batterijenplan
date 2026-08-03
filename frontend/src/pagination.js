// Pagination-aware loader for Django REST Framework list endpoints.
//
// DRF's PageNumberPagination returns { count, next, previous, results:[...] } and, with PAGE_SIZE=10,
// only the first 10 items live in `results`. Reading `results` alone silently drops every later page
// (that is the /artikelen "only shows the first page" bug). This helper follows `next` until it is
// null, also accepts a plain (unpaginated) array, deduplicates by slug, and preserves API ordering.
//
// Pure and dependency-free: `fetchImpl` is injected so it can be unit-tested with a mock fetch and so
// api.js can supply a same-origin-rewriting fetch. It never hardcodes a page count.

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

    const response = await fetchImpl(url);
    if (!response || !response.ok) {
      const status = response ? response.status : "no response";
      throw new Error(`Posts request failed: ${status} ${url}`);
    }

    const payload = await response.json();

    // Unpaginated array response: take it and stop.
    if (Array.isArray(payload)) {
      collected.push(...payload);
      break;
    }

    // Paginated envelope: results must be an array; anything else is malformed.
    if (!payload || !Array.isArray(payload.results)) {
      throw new Error(`Unexpected posts API response (no results array): ${url}`);
    }

    collected.push(...payload.results);
    url = payload.next || null;
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
