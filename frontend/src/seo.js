// Werkt document.title, SEO/OG/Twitter meta tags, canonical link en JSON-LD bij
// na client-side navigatie. index.html bevat de statische fallbacks; dit
// overschrijft ze zodra de pagina/data geladen is.

const SITE_NAME = "Batterijenplan.nl";

export const SITE_URL = "https://batterijenplan.nl";
export const DEFAULT_TITLE = "Batterijenplan.nl — Thuisbatterij Calculator & Advies";
export const DEFAULT_DESCRIPTION =
  "Bereken welke thuisbatterij past bij uw verbruik, zonnepanelen en energiedoel. Ontvang direct een eerste indicatie en laat uw berekening gratis controleren.";

function setMetaTag(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

export function canonicalUrl(path) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean}`;
}

export function setPageMeta({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = window.location.pathname,
  type = "website",
} = {}) {
  const url = canonicalUrl(path);

  document.title = title;
  setMetaTag("name", "description", description);
  setMetaTag("property", "og:title", title);
  setMetaTag("property", "og:description", description);
  setMetaTag("property", "og:type", type);
  setMetaTag("property", "og:url", url);
  setMetaTag("property", "og:site_name", SITE_NAME);
  setMetaTag("name", "twitter:card", "summary");
  setMetaTag("name", "twitter:title", title);
  setMetaTag("name", "twitter:description", description);
  setCanonical(url);
}

// Vervangt alle eerder door ons geplaatste JSON-LD scripts door de meegegeven set,
// zodat er geen verouderde structured data achterblijft na navigatie.
export function setJsonLd(schemas = []) {
  document.head
    .querySelectorAll("script[data-seo-jsonld]")
    .forEach((el) => el.remove());

  for (const schema of schemas) {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo-jsonld", "true");
    el.textContent = JSON.stringify(schema);
    document.head.appendChild(el);
  }
}

export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.ico`,
  areaServed: "Nederland",
};

export const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
};

export function blogPostingSchema(post) {
  const url = canonicalUrl(`/post/${post.slug}`);
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description || post.excerpt || DEFAULT_DESCRIPTION,
    url,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  if (post.published_at) schema.datePublished = post.published_at;
  if (post.updated_at) schema.dateModified = post.updated_at;

  return schema;
}
