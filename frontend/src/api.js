// Dunne fetch-wrapper. In dev proxied Vite /api naar Django (zie vite.config.js).
const BASE = "/api";

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
