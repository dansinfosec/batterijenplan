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
    telephone: "+31850605738",
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

// Publisher-blok is site-breed gelijk (Organization met logo als ImageObject —
// door Google aanbevolen boven een kale URL).
const PUBLISHER_SCHEMA = {
  "@type": "Organization",
  name: SITE_NAME,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/favicon.ico`,
  },
};

export function blogPostingSchema(post) {
  const url = canonicalUrl(`/post/${post.slug}`);
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    // Zelfde voorkeursvolgorde als de <meta description>: backend seo_description
    // > (uit body afgeleide) meta_description > excerpt > site-default.
    description:
      post.seo_description || post.meta_description || post.excerpt || DEFAULT_DESCRIPTION,
    url,
    mainEntityOfPage: url,
    inLanguage: "nl-NL",
    // Auteur bewust als Organization: de API geeft momenteel een gebruikersnaam
    // (bijv. "dschu") terug, geen publieke weergavenaam — die als Person-naam
    // tonen zou een dev-handle publiceren. Zet dit om naar Person zodra de
    // backend een echte auteursnaam levert. Publisher = organisatie met logo.
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: PUBLISHER_SCHEMA,
  };

  if (post.cover_image_url) schema.image = post.cover_image_url;
  if (post.published_at) schema.datePublished = post.published_at;
  if (post.updated_at) schema.dateModified = post.updated_at;

  return schema;
}

// BreadcrumbList voor een artikel: Home › Kennisbank › {titel}. Weerspiegelt de
// werkelijke navigatiepaden (/ → /artikelen → /post/<slug>) — geen verzonnen
// niveaus. Verbetert de breadcrumb-weergave in de zoekresultaten.
export function breadcrumbSchema(post) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: canonicalUrl("/") },
      { "@type": "ListItem", position: 2, name: "Kennisbank", item: canonicalUrl("/artikelen") },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: canonicalUrl(`/post/${post.slug}`),
      },
    ],
  };
}

// Bron van waarheid voor de SEO-titel is het backend-veld `seo_title` (per post
// beheerd in de CMS/admin). De live API bevestigde dat alle gepubliceerde posts
// een `seo_title` teruggeven, dus de vroegere hardgecodeerde per-slug map is
// overbodig geworden en verwijderd (voorkomt drift tussen dit bestand en
// scripts/prerender-blog-meta.mjs en verouderde titels bij nieuwe artikelen).
//
// De map blijft als LEGE escape-hatch bestaan: zet hier alléén een entry als een
// post ooit géén backend `seo_title` heeft en de generieke fallback
// ("{titel} — Batterijenplan") te lang zou worden. Beheer de titel bij voorkeur
// in de backend, niet hier.
export const POST_SEO_TITLES = {};

// SEO-titel voor een post: backend `seo_title` > (legacy) `meta_title` >
// noodfallback-map > standaard "{titel} — Batterijenplan". De zichtbare H1
// blijft altijd post.title.
export function postSeoTitle(post) {
  return (
    post.seo_title ||
    post.meta_title ||
    POST_SEO_TITLES[post.slug] ||
    `${post.title} — Batterijenplan`
  );
}
