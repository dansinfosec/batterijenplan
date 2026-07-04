// Dunne fetch-wrapper. In dev proxied Vite /api naar Django (zie vite.config.js).
// In productie wijst VITE_API_BASE_URL naar de gedeployde backend (zonder /api en zonder trailing slash).
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const BASE = `${API_ORIGIN}/api`;

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const fetchPosts = ({ tag, search } = {}) => {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (search) params.set("search", search);
  const qs = params.toString();
  return get(`/posts/${qs ? `?${qs}` : ""}`);
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

export async function postCalculator(data) {
  const res = await fetch(`${BASE}/calculator/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.error || "Controleer de ingevulde gegevens.";
    throw new Error(message);
  }
  return json;
}
