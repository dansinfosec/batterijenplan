// Post-build script (draait na `vite build`, zie package.json).
//
// WhatsApp/Facebook/LinkedIn voeren geen JavaScript uit en lezen alleen de
// initiële HTML. Dit script genereert daarom per gepubliceerde blogpost een
// statisch dist/post/<slug>/index.html met de juiste meta tags, canonical en
// BlogPosting JSON-LD. De pagina laadt verder gewoon dezelfde React-app.
// Daarnaast genereert het dist/sitemap.xml.
//
// Vereist Node 18+ (globale fetch). Geen npm dependencies.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://batterijenplan.nl";
const SITE_NAME = "Batterijenplan.nl";
const API_URL = process.env.PRERENDER_API_URL || "https://api.batterijenplan.nl/api/posts/";
const DEFAULT_DESCRIPTION =
  "Bereken welke thuisbatterij past bij uw verbruik, zonnepanelen en energiedoel. Ontvang direct een eerste indicatie en laat uw berekening gratis controleren.";

const META_START = "<!-- seo:meta:start";
const META_END = "<!-- seo:meta:end -->";

// De statische homepage-shell hoort niet in blogpost-HTML; die is alleen
// bedoeld voor de first paint van "/".
const SHELL_START = "<!-- home-shell:start";
const SHELL_END = "<!-- home-shell:end -->";

function stripHomeShell(html) {
  const start = html.indexOf(SHELL_START);
  const end = html.indexOf(SHELL_END);
  if (start === -1 || end === -1) {
    // Niet fataal: het inline guard-script verwijdert de shell anders alsnog
    // op niet-home paden, maar meld het wel.
    console.warn(
      "Waarschuwing: home-shell markers niet gevonden in dist/index.html; shell blijft in blogpost-HTML staan.",
    );
    return html;
  }
  return html.slice(0, start) + html.slice(end + SHELL_END.length);
}

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");

// ── Statische SEO-fallback voor de hoofdpagina's ─────────────────────────
// SPA-routes leverden crawlers alleen de lege Vite-shell (±33 woorden). We
// injecteren route-specifieke, Nederlandse tekst ín #root: crawlbaar in de
// ruwe HTML en door React vervangen bij het mounten (createRoot().render()
// leegt #root). Geen fixed overlay, dus geen CLS. De blogpost-shell blijft
// ongemoeid.
const SEO_STYLE =
  "max-width:820px;margin:0 auto;padding:40px 20px;" +
  "font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;" +
  "color:#12130F;line-height:1.7";

function seoWrap(inner) {
  return `<div class="seo-fallback" style="${SEO_STYLE}">\n${inner}\n      </div>`;
}

const HOMEPAGE_BODY = seoWrap(`        <h1>Thuisbatterij calculator en onafhankelijk batterijadvies</h1>
        <p>Batterijenplan.nl helpt Nederlandse huiseigenaren met heldere, onafhankelijke informatie over thuisbatterijen en het slim opslaan van zonnestroom. Steeds meer huishoudens met zonnepanelen willen hun opgewekte stroom niet langer goedkoop terugleveren aan het net, maar zelf gebruiken op het moment dat het uitkomt. Een thuisbatterij maakt dat mogelijk.</p>
        <h2>Zonnestroom opslaan en minder terugleveren</h2>
        <p>Met een thuisbatterij slaat u overdag opgewekte zonne-energie op om die 's avonds te gebruiken. Zo verhoogt u uw eigen verbruik, levert u minder terug aan het net en bent u beter voorbereid op het einde van de salderingsregeling. Wij leggen in begrijpelijke taal uit hoe dat werkt, zonder verkooppraat en met echte getallen.</p>
        <h2>Capaciteit, omvormer, EMS en installatie vergelijken</h2>
        <p>Een goede keuze draait om meer dan alleen de prijs. Wij helpen u de batterijcapaciteit, de omvormer, het energiemanagementsysteem (EMS) en de installatie te vergelijken, zodat het systeem past bij uw verbruik, uw zonnepanelen en uw energiedoel. Zo voorkomt u een batterij die te groot, te klein of niet geschikt is voor uw situatie.</p>
        <h2>Gratis thuisbatterij calculator en adviesaanvraag</h2>
        <p>Met onze gratis thuisbatterij calculator berekent u op basis van uw jaarlijkse stroomverbruik en teruglevering welke batterijcapaciteit bij u past. Het resultaat is een eerste indicatie. Wilt u meer zekerheid? Vraag dan gratis een controle aan bij een specialist, die uw berekening en situatie persoonlijk bekijkt.</p>
        <p><a href="/calculator">Bereken uw thuisbatterij</a> of <a href="/contact">neem contact met ons op</a> voor advies.</p>`);

const CALCULATOR_BODY = seoWrap(`        <h1>Gratis thuisbatterij calculator</h1>
        <p>Met de gratis thuisbatterij calculator van Batterijenplan.nl berekent u eenvoudig welke batterijcapaciteit past bij uw woning en energieverbruik. U vult een paar gegevens in en ontvangt direct een eerste indicatie van een passende thuisbatterij.</p>
        <h2>Welke gegevens vult u in?</h2>
        <p>De calculator vraagt om uw jaarlijkse stroomverbruik in kilowattuur en om de hoeveelheid zonnestroom die u jaarlijks teruglevert aan het net. Op basis van deze twee getallen schatten wij uw gemiddelde dagelijkse verbruik en teruglevering in en bepalen we een passende capaciteitsrange voor uw thuisbatterij.</p>
        <h2>Eigen verbruik of dynamisch contract</h2>
        <p>U kiest zelf uw doel. Wilt u vooral uw eigen zonnestroom opslaan en later gebruiken, dan rekenen we op zelfconsumptie. Heeft u een dynamisch energiecontract en wilt u de batterij ook inzetten om slim te sturen op wisselende stroomprijzen, dan houden we daar rekening mee. Beide doelen leiden tot een andere passende capaciteit.</p>
        <h2>Waarom een thuisbatterij berekenen?</h2>
        <p>Omdat de salderingsregeling per 1 januari 2027 stopt, wordt het minder aantrekkelijk om zonnestroom terug te leveren aan het net. Door uw stroom op te slaan in een thuisbatterij gebruikt u meer van uw eigen opgewekte energie en bent u minder afhankelijk van de terugleververgoeding. De calculator geeft u snel inzicht in de capaciteit die bij die situatie past.</p>
        <h2>Een indicatie, geen definitief ontwerp</h2>
        <p>De uitkomst van de calculator is nadrukkelijk een indicatie en geen definitief ontwerp. Voor een nauwkeurig advies spelen ook uw zonnepanelen, netaansluiting, omvormervermogen, energiecontract en toekomstig verbruik een rol. Een specialist kan uw uitkomst gratis controleren en met u meekijken naar wat technisch en financieel het beste past.</p>
        <p><a href="/contact">Vraag gratis advies aan</a> als u uw berekening wilt laten controleren.</p>`);

const CONTACT_BODY = seoWrap(`        <h1>Contact met Batterijenplan.nl</h1>
        <p>Heeft u een vraag over thuisbatterijen, batterijopslag of de thuisbatterij calculator? Neem gerust contact op met Batterijenplan.nl. Wij helpen Nederlandse huiseigenaren met onafhankelijke informatie en advies over het opslaan van zonnestroom.</p>
        <h2>Contactgegevens</h2>
        <p>
          Batterijenplan.nl<br />
          De Waal 18D<br />
          5684 PH Best<br />
          Nederland
        </p>
        <p>
          E-mail: <a href="mailto:info@batterijenplan.nl">info@batterijenplan.nl</a><br />
          WhatsApp: <a href="https://wa.me/31641880307">+31 6 41 88 03 07</a>
        </p>
        <p>Wij beantwoorden vragen over onder andere de keuze van een thuisbatterij, de benodigde capaciteit, de omvormer, batterijsturing en de installatie. Ook als u alleen wilt sparren over uw situatie of over de uitkomst van de calculator, denken wij graag met u mee.</p>
        <p>Ons servicegebied is heel Nederland. Bezoek aan ons kantoor is uitsluitend op afspraak mogelijk. Stuur ons een bericht of app ons, dan nemen wij zo snel mogelijk contact met u op.</p>`);

const PRIVACY_BODY = seoWrap(`        <h1>Privacyverklaring Batterijenplan.nl</h1>
        <p>Batterijenplan.nl gaat zorgvuldig om met uw persoonsgegevens. Hieronder leest u kort welke gegevens wij verzamelen en waarvoor wij ze gebruiken.</p>
        <h2>Welke gegevens verzamelen wij?</h2>
        <p>Wij verwerken de gegevens die u zelf invult in het contactformulier en de adviesaanvraag, zoals uw naam, telefoonnummer, e-mailadres en optioneel uw postcode en bericht. Daarnaast bewaren wij de gegevens die u in de thuisbatterij calculator invult, zoals uw verbruik en teruglevering, zodat een specialist uw situatie kan beoordelen.</p>
        <h2>Analytics en conversiemeting</h2>
        <p>Wij gebruiken analyse- en conversiemeting om onze website te verbeteren en te zien hoe bezoekers de calculator en de adviesaanvraag gebruiken. Deze gegevens verwerken wij zo veel mogelijk geanonimiseerd.</p>
        <h2>Uw gegevens blijven van u</h2>
        <p>Wij verkopen uw persoonsgegevens niet aan derden en gebruiken ze uitsluitend om uw aanvraag af te handelen. Heeft u vragen over uw gegevens of wilt u ze laten inzien of verwijderen? Neem dan contact met ons op via info@batterijenplan.nl.</p>`);

// Route-specifieke SEO-pagina's. slug "" = dist/index.html (homepage houdt
// zijn bestaande meta + performance-shell; alleen body wordt geïnjecteerd).
const STATIC_PAGES = [
  { slug: "", keepMeta: true, keepHomeShell: true, body: HOMEPAGE_BODY },
  {
    slug: "calculator",
    title: "Thuisbatterij Calculator — Batterijenplan.nl",
    description:
      "Gratis thuisbatterij calculator: bereken op basis van uw stroomverbruik en teruglevering welke batterijcapaciteit bij u past. Laat de uitkomst gratis controleren.",
    body: CALCULATOR_BODY,
  },
  {
    slug: "contact",
    title: "Contact — Batterijenplan.nl",
    description:
      "Neem contact op met Batterijenplan.nl voor vragen over thuisbatterijen, batterijopslag en de gratis thuisbatterij calculator.",
    body: CONTACT_BODY,
  },
  {
    slug: "privacy",
    title: "Privacyverklaring — Batterijenplan.nl",
    description:
      "Lees hoe Batterijenplan.nl omgaat met persoonsgegevens, contactaanvragen en calculatorgegevens.",
    body: PRIVACY_BODY,
  },
];

function pageMetaBlock({ title, description, slug }) {
  const url = `${SITE_URL}/${slug}`;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${u}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<link rel="canonical" href="${u}" />`,
  ].join("\n    ");
}

function replaceMetaBlock(html, metaHtml) {
  const s = html.indexOf(META_START);
  const e = html.indexOf(META_END);
  if (s === -1 || e === -1) {
    throw new Error("SEO-markers niet gevonden in dist/index.html voor statische pagina.");
  }
  return html.slice(0, s) + metaHtml + html.slice(e + META_END.length);
}

// ALLEEN voor de homepage: de Vite CSS-bundle niet-render-blocking maken,
// zodat de statische shell direct kan schilderen (FCP/LCP) zonder te wachten
// op /assets/index-*.css. Veilig omdat de shell een dekkende fixed overlay is
// én omdat de shell pas ná window load + 300ms wordt verwijderd — een
// pending CSS-preload stelt het load-event uit, dus React is altijd gestyled
// vóórdat de overlay verdwijnt. Andere routes houden gewoon render-blocking
// CSS (daar is geen overlay die FOUC afdekt).
function asyncifyMainCss(html) {
  const re = /<link rel="stylesheet"([^>]*)href="(\/assets\/[^"]+\.css)"([^>]*)>/;
  const m = html.match(re);
  if (!m) {
    console.warn(
      "Waarschuwing: Vite CSS-link niet gevonden in homepage-HTML; CSS blijft render-blocking.",
    );
    return html;
  }
  const href = m[2];
  // crossorigin behouden zodat de preload dezelfde request-mode gebruikt
  // (anders wordt de CSS dubbel gedownload).
  const co = /\bcrossorigin\b/.test(m[0]) ? " crossorigin" : "";
  const replacement =
    `<link rel="preload" as="style"${co} href="${href}" ` +
    `onload="this.onload=null;this.rel='stylesheet'">` +
    `<noscript><link rel="stylesheet"${co} href="${href}"></noscript>`;
  return html.replace(re, replacement);
}

// Injecteert de SEO-tekst ín het lege #root, zodat React hem bij mount vervangt.
function injectSeoBody(html, bodyHtml) {
  const marker = '<div id="root"></div>';
  if (!html.includes(marker)) {
    console.warn("Waarschuwing: leeg #root niet gevonden; SEO-body niet geïnjecteerd.");
    return html;
  }
  return html.replace(marker, `<div id="root">\n${bodyHtml}\n    </div>`);
}

async function generateStaticPages(template) {
  let count = 0;
  for (const page of STATIC_PAGES) {
    let html = page.keepMeta
      ? template
      : replaceMetaBlock(template, pageMetaBlock({ ...page, slug: page.slug }));

    // Alleen de homepage houdt de performance-shell; overige routes niet.
    if (!page.keepHomeShell) html = stripHomeShell(html);

    html = injectSeoBody(html, page.body);

    if (page.slug === "") {
      // Alleen de homepage krijgt async CSS; zie asyncifyMainCss.
      html = asyncifyMainCss(html);
      await writeFile(path.join(distDir, "index.html"), html, "utf8");
    } else {
      const dir = path.join(distDir, page.slug);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "index.html"), html, "utf8");
    }
    count += 1;
  }
  return count;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const escapeXml = escapeHtml;

// Voorkomt dat "</script>" in post-data het JSON-LD script vroegtijdig sluit.
function jsonLdHtml(schema) {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}

// Haalt alle pagina's van het (gepagineerde) posts-endpoint op.
async function fetchAllPosts() {
  const posts = [];
  let url = API_URL;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`API-fetch mislukt: ${res.status} ${res.statusText} voor ${url}`);
    }
    const data = await res.json();
    posts.push(...(data.results ?? data));
    url = data.next ?? null;
  }

  return posts;
}

function postMetaBlock(post) {
  const url = `${SITE_URL}/post/${post.slug}`;
  const title = `${post.title} — Batterijenplan`;
  const description = post.meta_description || post.excerpt || DEFAULT_DESCRIPTION;

  const image = post.cover_image_url || null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    url,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };
  if (image) schema.image = image;
  if (post.published_at) schema.datePublished = post.published_at;
  if (post.updated_at) schema.dateModified = post.updated_at;

  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);

  const tags = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:url" content="${u}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
  ];

  if (image) {
    const i = escapeHtml(image);
    tags.push(
      `<meta property="og:image" content="${i}" />`,
      `<meta name="twitter:image" content="${i}" />`,
    );
  }

  tags.push(
    `<link rel="canonical" href="${u}" />`,
    `<script type="application/ld+json">${jsonLdHtml(schema)}</script>`,
  );

  return tags.join("\n    ");
}

function buildSitemap(posts) {
  const entries = [
    { loc: `${SITE_URL}/` },
    { loc: `${SITE_URL}/calculator` },
    { loc: `${SITE_URL}/privacy` },
    { loc: `${SITE_URL}/contact` },
    ...posts.map((post) => {
      const lastmod = post.updated_at || post.published_at;
      return {
        loc: `${SITE_URL}/post/${post.slug}`,
        // Geen datum verzinnen als de API er geen geeft.
        ...(lastmod ? { lastmod: String(lastmod).slice(0, 10) } : {}),
      };
    }),
  ];

  const urls = entries
    .map((e) => {
      const lastmod = e.lastmod ? `\n    <lastmod>${escapeXml(e.lastmod)}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(e.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  const template = await readFile(path.join(distDir, "index.html"), "utf8");

  const startIdx = template.indexOf(META_START);
  const endIdx = template.indexOf(META_END);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      "SEO-markers niet gevonden in dist/index.html. " +
        "Controleer of <!-- seo:meta:start --> en <!-- seo:meta:end --> nog in frontend/index.html staan.",
    );
  }

  const posts = await fetchAllPosts();

  let generated = 0;
  for (const post of posts) {
    // Django-slugs bevatten alleen letters, cijfers, - en _; alles anders overslaan.
    if (!post.slug || !/^[\w-]+$/.test(post.slug)) {
      console.warn(`Overgeslagen (ongeldige slug): ${JSON.stringify(post.slug)}`);
      continue;
    }

    const html = stripHomeShell(
      template.slice(0, startIdx) +
        postMetaBlock(post) +
        template.slice(endIdx + META_END.length),
    );

    const dir = path.join(distDir, "post", post.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), html, "utf8");
    generated += 1;
  }

  // Statische SEO-fallback voor de hoofdpagina's (leest dezelfde in-memory
  // template; wijzigt dist/index.html en schrijft dist/<route>/index.html).
  const staticCount = await generateStaticPages(template);

  await writeFile(path.join(distDir, "sitemap.xml"), buildSitemap(posts), "utf8");

  console.log(`Prerender klaar: ${generated} blogpost-HTML-bestanden gegenereerd in dist/post/.`);
  console.log(`Statische SEO-pagina's gegenereerd: ${staticCount} (/, /calculator, /contact, /privacy).`);
  console.log(`sitemap.xml gegenereerd met ${posts.length + 4} URL's.`);
}

main().catch((err) => {
  console.error("prerender-blog-meta.mjs mislukt:", err.message);
  process.exit(1);
});
