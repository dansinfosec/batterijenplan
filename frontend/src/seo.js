// Werkt document.title en de SEO/OG/Twitter meta tags bij na client-side navigatie.
// index.html bevat de statische fallbacks; dit overschrijft ze zodra data geladen is.

const SITE_NAME = "Batterijenplan.nl";

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

export function setPageMeta({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  url = window.location.href,
  type = "website",
} = {}) {
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
}
