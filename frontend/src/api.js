// Dunne fetch-wrapper. In dev proxied Vite /api naar Django (zie vite.config.js).
// In productie wijst VITE_API_BASE_URL naar de gedeployde backend (zonder /api
// en zonder trailing slash); zonder die variabele valt een productie-build
// terug op de canonieke API-URL.
import { fetchAllPages } from "./pagination.js";

const PROD_API_ORIGIN = "https://api.batterijenplan.nl";
const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? PROD_API_ORIGIN : "")
).replace(/\/+$/, "");
const BASE = `${API_ORIGIN}/api`;

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// DRF builds `next` as an absolute URL from the request host, which in dev (Vite proxy) or behind a
// proxy can differ from our configured API origin. Re-point every page request to API_ORIGIN so all
// pages are fetched same-origin/proxied regardless of the host embedded in `next`.
function sameOriginFetch(url) {
  let target = url;
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(url, base);
    target = `${API_ORIGIN}${parsed.pathname}${parsed.search}`;
  } catch {
    /* leave target as-is if URL parsing fails */
  }
  return fetch(target);
}

// Returns EVERY published post across all API pages (ordering preserved, deduped by slug), not just
// the first page. Server-side tag/search filters are applied to the query and paginated the same way.
export const fetchPosts = ({ tag, search } = {}) => {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (search) params.set("search", search);
  const qs = params.toString();
  return fetchAllPages(`${BASE}/posts/${qs ? `?${qs}` : ""}`, sameOriginFetch);
};

export const fetchPost = (slug) => get(`/posts/${slug}/`);
export const fetchTags = () => get(`/tags/`);
export const fetchComments = (slug) => get(`/posts/${slug}/comments/`);

export async function postComment(slug, data) {
  const res = await fetch(`${BASE}/posts/${slug}/comments/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function postLead(data) {
  const res = await fetch(`${BASE}/leads/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    // DRF geeft veldfouten als {veld: ["bericht"]}; pak de eerste.
    const first = json && Object.values(json)[0];
    const message = Array.isArray(first) ? first[0] : "Versturen mislukt. Controleer de ingevulde gegevens.";
    throw new Error(message);
  }
  return json;
}

// Stage 2: extra analysevragen ná het leadformulier. Het token komt uit de
// postLead-response en bewijst dat deze browser de lead zelf aanmaakte.
export async function postLeadStage2(leadId, data) {
  const res = await fetch(`${BASE}/leads/${leadId}/stage2/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const first = json && Object.values(json)[0];
    const message = Array.isArray(first)
      ? first[0]
      : json?.error || "Versturen mislukt. Probeer het opnieuw.";
    throw new Error(message);
  }
  return json;
}

export async function postCalculator(data) {
  const res = await fetch(`${BASE}/calculator/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    // De API kent twee foutvormen: {error: "..."} (BatteryAdviceError) en het
    // DRF-velddict {veld: ["bericht"]} bij serializer-validatie. Toon in beide
    // gevallen het eerste concrete bericht i.p.v. de generieke fallback.
    let message = json?.error;
    if (!message && json && typeof json === "object") {
      const first = Object.values(json)[0];
      if (Array.isArray(first) && first.length) message = first[0];
    }
    throw new Error(message || "Controleer de ingevulde gegevens.");
  }
  return json;
}
