// Dunne fetch-wrapper. In dev proxied Vite /api naar Django (zie vite.config.js).
// In productie wijst VITE_API_BASE_URL naar de gedeployde backend (zonder /api
// en zonder trailing slash); zonder die variabele valt een productie-build
// terug op de canonieke API-URL.
import { fetchAllPages, fetchPostsPage as fetchOnePostsPage } from "./pagination.js";

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
function sameOriginFetch(url, opts = {}) {
  let target = url;
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(url, base);
    target = `${API_ORIGIN}${parsed.pathname}${parsed.search}`;
  } catch {
    /* leave target as-is if URL parsing fails */
  }
  return fetch(target, opts);
}

// Build the posts-list page-1 URL for the given filters.
function postsListUrl({ tag, search } = {}) {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (search) params.set("search", search);
  const qs = params.toString();
  return `${BASE}/posts/${qs ? `?${qs}` : ""}`;
}

// Fetch EXACTLY ONE posts page → { count, next, previous, results }.
// Pass {tag,search} for page 1, or a DRF `next` URL string for later pages (its ?tag/&search and
// &page are preserved). Optional AbortSignal so callers can cancel a stale request. This is what the
// /artikelen progressive UI and the homepage use — neither fetches the whole archive.
export function fetchPostsPage(arg, { signal } = {}) {
  const url = typeof arg === "string" ? arg : postsListUrl(arg);
  return fetchOnePostsPage(url, (u) => sameOriginFetch(u, signal ? { signal } : {}));
}

// Fetch EVERY page (all published posts, deduped, ordered). Only for build/prerender/sitemap-style
// needs that genuinely require the whole archive — NOT the runtime archive UI.
export function fetchPostsAllPages({ tag, search } = {}) {
  return fetchAllPages(postsListUrl({ tag, search }), sameOriginFetch);
}

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

// Slimme-meteranalyse: stateloze POST van de uitgelezen kwartierwaarden.
// Fysiek-only is de default (geen financial_scenario); het zelfconsumptie-
// model is een expliciete tweede aanvraag. Time-out + foutvertaling zitten
// in analysisClient (node-testbaar).
import {
  ANALYSIS_TIMEOUT_MS,
  requestAnalysis,
} from "./smartmeter/analysisClient.js";

export async function postSmartMeterAnalysis(intervals, { intervalMinutes, financialScenario } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);
  try {
    return await requestAnalysis((url, opts) => fetch(url, opts), BASE, intervals, {
      intervalMinutes,
      financialScenario,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
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
