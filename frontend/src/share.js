// ── Artikel-deellogica: pure functies (node-testbaar) ──────────────────────
// Bouwt de deel-URL's voor de sociale acties op de artikelpagina. Bewust
// zonder browser-API's op moduleniveau, zodat alles onder `node --test`
// draait. De React-laag (ArticleShare.jsx) levert klik-, klembord- en
// navigator.share-gedrag; alle URL-opbouw staat hier.
//
// HARDE REGELS:
// - Er wordt ALTIJD de schone canonieke productie-URL gedeeld
//   (https://www.batterijenplan.nl/post/{slug}); nooit de huidige
//   window.location, query-/trackingparameters, preview- of localhost-URL.
// - Geen UTM-parameters in deze eerste versie: schone links.
// - title en url worden als data behandeld en correct ge-encodeerd.

import { SITE_URL } from "./seo.js";

// Canonieke artikel-URL uit de slug. Onafhankelijk van window.location, dus
// nooit vervuild met query-/trackingparameters of een localhost-origin. De
// Django-slug bevat alleen [\w-], dus padvriendelijk; encodeURIComponent
// beschermt defensief tegen onverwachte tekens zonder geldige slugs te breken.
export function articleShareUrl(slug) {
  return `${SITE_URL}/post/${encodeURIComponent(String(slug))}`;
}

// wa.me met "titel<newline>URL" als één tekst; geen marketingtekst.
export function whatsappShareUrl(title, url) {
  return `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
}

// Facebook leest de Open Graph-tags van de pagina; alleen de URL meesturen.
export function facebookShareUrl(url) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

// Reddit-submitformulier vooringevuld met URL + titel. Niet auto-submitten,
// geen subreddit kiezen: de lezer bepaalt waar het heen gaat.
export function redditShareUrl(title, url) {
  return `https://www.reddit.com/submit?url=${encodeURIComponent(
    url,
  )}&title=${encodeURIComponent(title)}`;
}

// LinkedIn share-offsite leest de Open Graph-tags; alleen de URL meesturen.
export function linkedinShareUrl(url) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

// X/Twitter intent met titel + URL. Geen hashtags (het merk hanteert er geen).
export function xShareUrl(title, url) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    title,
  )}&url=${encodeURIComponent(url)}`;
}

// mailto met de titel als onderwerp en een korte, neutrale introzin + URL.
export const EMAIL_INTRO = "Ik dacht dat dit artikel interessant voor u kon zijn:";
export function emailShareUrl(title, url) {
  const body = `${EMAIL_INTRO}\n\n${url}`;
  return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

// Payload voor de Web Share API (navigator.share). Titel + schone canonieke
// URL; geen text-veld nodig (de meeste share-sheets tonen titel + URL prima).
export function nativeSharePayload(title, slug) {
  return { title, url: articleShareUrl(slug) };
}

// Eén plek die alle link-gebaseerde acties (alles behalve copy/native)
// beschrijft: id = analytics-platformwaarde + accessible label. De volgorde
// hier is de weergavevolgorde in de UI.
export function shareLinks(title, url) {
  return [
    { id: "whatsapp", label: "Deel via WhatsApp", href: whatsappShareUrl(title, url) },
    { id: "facebook", label: "Deel via Facebook", href: facebookShareUrl(url) },
    { id: "reddit", label: "Deel op Reddit", href: redditShareUrl(title, url) },
    { id: "linkedin", label: "Deel op LinkedIn", href: linkedinShareUrl(url) },
    { id: "x", label: "Deel op X", href: xShareUrl(title, url) },
    { id: "email", label: "Deel via e-mail", href: emailShareUrl(title, url) },
  ];
}
