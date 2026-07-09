// Werkt document.title, SEO/OG/Twitter meta tags, canonical link en JSON-LD bij
// na client-side navigatie. index.html bevat de statische fallbacks; dit
// overschrijft ze zodra de pagina/data geladen is.

const SITE_NAME = "Batterijenplan.nl";

// www is de canonieke variant (zie ook prerender-blog-meta.mjs): scrapers
// (o.a. WhatsApp) lieten eerder de non-www-variant soms terugvallen op
// verouderde metadata na een redirect. Alle canonicals/og:url site-breed
// consistent op www houden.
export const SITE_URL = "https://www.batterijenplan.nl";
export const DEFAULT_TITLE = "Thuisbatterij Vergelijken & Berekenen | Batterijenplan.nl";
export const DEFAULT_DESCRIPTION =
  "Thuisbatterij vergelijken en berekenen? Onafhankelijk advies over batterijopslag, EMS en dynamische energiecontracten. Bereken gratis uw batterijcapaciteit.";
export const DEFAULT_IMAGE = `${SITE_URL}/og-home.png`;

function setMetaTag(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMetaTag(attr, key) {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
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
  image = null,
} = {}) {
  const url = canonicalUrl(path);

  document.title = title;
  setMetaTag("name", "description", description);
  setMetaTag("property", "og:title", title);
  setMetaTag("property", "og:description", description);
  setMetaTag("property", "og:type", type);
  setMetaTag("property", "og:url", url);
  setMetaTag("property", "og:site_name", SITE_NAME);
  setMetaTag("property", "og:locale", "nl_NL");
  setMetaTag("name", "twitter:title", title);
  setMetaTag("name", "twitter:description", description);
  setCanonical(url);

  // Alleen zetten als er echt een afbeelding is; anders opruimen zodat er
  // geen verouderde og:image van een vorige pagina blijft hangen. Met
  // afbeelding: summary_large_image (grote kaart op LinkedIn/X/WhatsApp).
  // Zonder: summary (geen kaart met verouderde/lege afbeelding).
  if (image) {
    setMetaTag("property", "og:image", image);
    setMetaTag("property", "og:image:width", "1200");
    setMetaTag("property", "og:image:height", "630");
    setMetaTag("property", "og:image:type", "image/png");
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:image", image);
  } else {
    removeMetaTag("property", "og:image");
    removeMetaTag("property", "og:image:width");
    removeMetaTag("property", "og:image:height");
    removeMetaTag("property", "og:image:type");
    setMetaTag("name", "twitter:card", "summary");
    removeMetaTag("name", "twitter:image");
  }
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

// Adresgegevens komen overeen met de openbare contactpagina (/contact) —
// geen verzonnen data, alleen structurering van wat al gepubliceerd is.
export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.ico`,
  areaServed: "Nederland",
  email: "info@batterijenplan.nl",
  address: {
    "@type": "PostalAddress",
    streetAddress: "De Waal 18D",
    postalCode: "5684 PH",
    addressLocality: "Best",
    addressCountry: "NL",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "info@batterijenplan.nl",
    areaServed: "NL",
    availableLanguage: "Dutch",
  },
};

export const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  inLanguage: "nl-NL",
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

  if (post.cover_image_url) schema.image = post.cover_image_url;
  if (post.published_at) schema.datePublished = post.published_at;
  if (post.updated_at) schema.dateModified = post.updated_at;

  return schema;
}

// Korte <title>/og:title voor posts waarvan de volle titel + "— Batterijenplan"
// te lang werd (SEO-audit: "<title> tag too long"). Deze titels bevatten zélf
// al de merknaam ("| Batterijenplan"), dus géén extra brandingsuffix.
// De zichtbare H1 blijft altijd post.title. Zelfde map als in
// scripts/prerender-blog-meta.mjs (klein, bewust geen gedeeld systeem).
export const POST_SEO_TITLES = {
  "dynamisch-energiecontract-thuisbatterij": "Dynamisch contract + thuisbatterij | Batterijenplan",
  "elektrische-auto-ems-systeem": "EV slim laden met EMS | Batterijenplan",
  "ems-systeem-thuisbatterij-controle-over-stroom": "EMS voor thuisbatterijen | Batterijenplan",
  "enphase-vs-dyness": "Enphase vs Dyness | Batterijenplan",
  "groene-vrienden-vs-zonneplan-vs-tibber": "Groene Vrienden vs Zonneplan | Batterijenplan",
  "terugverdientijd-thuisbatterij-handel-of-zelfconsumptie": "Terugverdientijd thuisbatterij | Batterijenplan",
  "thuisbatterij-installatie": "Thuisbatterij installatie | Batterijenplan",
  "thuisbatterij-vergelijken": "Thuisbatterij vergelijken | Batterijenplan",
};

// SEO-titel voor een post: backend-veld (indien ooit toegevoegd) > korte map >
// standaard "{titel} — Batterijenplan".
export function postSeoTitle(post) {
  return (
    post.seo_title ||
    post.meta_title ||
    POST_SEO_TITLES[post.slug] ||
    `${post.title} — Batterijenplan`
  );
}
