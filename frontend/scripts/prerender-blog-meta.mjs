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

// www is de canonieke variant, site-breed (homepage, statische pagina's,
// sitemap én blogposts): scrapers (m.n. WhatsApp) volgen anders eerst een
// redirect en vallen soms terug op verouderde/homepage-metadata. Voorheen
// gebruikten blogposts al www (POST_URL_BASE) terwijl de sitemap en de
// overige statische pagina's nog non-www gebruikten — dat was inconsistent;
// nu overal dezelfde constante.
const SITE_URL = "https://www.batterijenplan.nl";
const SITE_NAME = "Batterijenplan.nl";
const API_URL = process.env.PRERENDER_API_URL || "https://api.batterijenplan.nl/api/posts/";
const DEFAULT_DESCRIPTION =
  "Thuisbatterij vergelijken en berekenen? Onafhankelijk advies over batterijopslag, EMS en dynamische energiecontracten. Bereken gratis uw batterijcapaciteit.";

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
        <p>Batterijenplan.nl helpt Nederlandse huiseigenaren met heldere, onafhankelijke informatie over thuisbatterijen, batterijopslag en energieopslag. Steeds meer huishoudens met zonnepanelen willen hun opgewekte stroom niet langer goedkoop terugleveren aan het net, maar zelf gebruiken op het moment dat het uitkomt. Een thuisbatterij maakt dat mogelijk.</p>
        <h2>Zonnestroom opslaan en minder terugleveren</h2>
        <p>Met een thuisbatterij slaat u overdag opgewekte zonne-energie op om die 's avonds te gebruiken. Zo verhoogt u uw eigen verbruik, levert u minder terug aan het net en bent u beter voorbereid op het einde van de salderingsregeling. Wij leggen in begrijpelijke taal uit hoe dat werkt, zonder verkooppraat en met echte getallen.</p>
        <h2>Thuisbatterij vergelijken: capaciteit, omvormer, EMS en installatie</h2>
        <p>Een goede keuze draait om meer dan alleen de prijs. Wij helpen u de batterijcapaciteit, de omvormer, het energiemanagementsysteem (EMS) en de installatie te vergelijken, zodat het systeem past bij uw verbruik, uw zonnepanelen en uw energiedoel. Zo voorkomt u een batterij die te groot, te klein of niet geschikt is voor uw situatie.</p>
        <h2>Batterijopslag bij een dynamisch energiecontract</h2>
        <p>Heeft u een dynamisch energiecontract? Dan kan een thuisbatterij ook worden ingezet om slim te sturen op wisselende stroomprijzen: opladen wanneer stroom goedkoop is, gebruiken of terugleveren wanneer de prijs hoog staat. Zo haalt u meer waarde uit uw batterijopslag dan met alleen zelfconsumptie.</p>
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
        <p>Heeft u een vraag over thuisbatterijen, batterijopslag of de thuisbatterij calculator? Neem gerust contact op met Batterijenplan.nl. Wij helpen Nederlandse huiseigenaren met onafhankelijke informatie en advies over het opslaan van zonnestroom, zonder verkooppraat en met echte getallen.</p>
        <h2>Waarmee helpt Batterijenplan?</h2>
        <p>Wij leggen in begrijpelijke taal uit hoe een thuisbatterij werkt, welke capaciteit bij uw situatie past en wat opslag u kan opleveren. Of u nu vooral meer eigen zonnestroom wilt gebruiken of uw batterij wilt inzetten bij een dynamisch energiecontract: wij denken met u mee over de keuze die past bij uw woning en verbruik.</p>
        <h2>Gratis en vrijblijvend batterijadvies</h2>
        <p>Uw adviesaanvraag is gratis en vrijblijvend. Een specialist kijkt naar uw persoonlijke situatie en helpt u de uitkomst van de calculator te vertalen naar een concreet, passend advies. U zit nergens aan vast en beslist zelf of en wanneer u een vervolgstap zet.</p>
        <h2>Ondersteuning bij de calculator</h2>
        <p>Komt u er met de gratis thuisbatterij calculator niet helemaal uit, of twijfelt u over de gegevens die u invult? Wij helpen u graag op weg. Vertel ons uw jaarlijkse stroomverbruik en teruglevering, dan lichten wij de uitkomst toe en leggen we uit waarop de geadviseerde batterijcapaciteit is gebaseerd.</p>
        <h2>Wat wij voor u controleren</h2>
        <p>Voor een definitief advies kijken wij verder dan alleen de calculator. Wij beoordelen uw zonnepanelen, uw teruglevering aan het net, uw netaansluiting, het omvormervermogen, de mogelijkheden voor slimme EMS-sturing en uw energiecontract. Zo weet u zeker welke thuisbatterij technisch én financieel het beste bij uw woning past.</p>
        <h2>Contactgegevens</h2>
        <p>
          Batterijenplan.nl<br />
          De Waal 18D<br />
          5684 PH Best<br />
          Nederland
        </p>
        <p>
          E-mail: <a href="mailto:info@batterijenplan.nl">info@batterijenplan.nl</a><br />
          Telefoon: <a href="tel:+31850605738">085 060 5738</a><br />
          WhatsApp: <a href="https://wa.me/31850605738">085 060 5738</a>
        </p>
        <p>Ons servicegebied is heel Nederland. Bezoek aan ons kantoor is uitsluitend op afspraak mogelijk. Stuur ons een bericht of app ons, dan nemen wij zo snel mogelijk contact met u op — meestal binnen één werkdag.</p>`);

const PRIVACY_BODY = seoWrap(`        <h1>Privacyverklaring Batterijenplan.nl</h1>
        <p>Batterijenplan.nl gaat zorgvuldig om met uw persoonsgegevens. Hieronder leest u welke gegevens wij verzamelen, waarvoor wij ze gebruiken en hoe u ze kunt laten aanpassen of verwijderen.</p>
        <h2>Welke gegevens verzamelen wij?</h2>
        <p>Wij verwerken de gegevens die u zelf invult in het contactformulier en de adviesaanvraag, zoals uw naam, telefoonnummer, e-mailadres en optioneel uw postcode en bericht. Wij gebruiken deze gegevens uitsluitend om uw vraag of aanvraag te beantwoorden.</p>
        <h2>Gegevens uit de calculator</h2>
        <p>Als u de thuisbatterij calculator gebruikt, bewaren wij de gegevens die u invult, zoals uw jaarlijkse stroomverbruik, uw teruglevering en uw gekozen doel. Zo kan een specialist uw berekening controleren en u een passend advies geven. Zolang u geen contactgegevens achterlaat, zijn deze gegevens niet tot u herleidbaar.</p>
        <h2>Contactaanvragen</h2>
        <p>Wanneer u een adviesaanvraag of contactverzoek indient, bewaren wij uw bericht en contactgegevens zodat wij u kunnen helpen en, indien nodig, kunnen terugkoppelen. Wij bewaren deze gegevens niet langer dan nodig is voor het doel waarvoor u ze heeft achtergelaten.</p>
        <h2>Analytics en conversiemeting</h2>
        <p>Wij gebruiken analyse- en conversiemeting om onze website te verbeteren en te zien hoe bezoekers de calculator en de adviesaanvraag gebruiken. Deze gegevens verwerken wij zo veel mogelijk geanonimiseerd en gebruiken wij alleen op geaggregeerd niveau.</p>
        <h2>Delen met derden</h2>
        <p>Wij verkopen uw persoonsgegevens niet aan derden. Gegevens worden uitsluitend gedeeld met een specialist wanneer dat nodig is om uw adviesaanvraag af te handelen, en alleen met uw medeweten.</p>
        <h2>Uw gegevens inzien of verwijderen</h2>
        <p>U heeft het recht om uw gegevens in te zien, te laten corrigeren of te laten verwijderen. Stuur hiervoor een e-mail naar <a href="mailto:info@batterijenplan.nl">info@batterijenplan.nl</a>, dan verwerken wij uw verzoek zo snel mogelijk.</p>`);

// Dynamische SEO-fallback voor /artikelen: een crawlbaar overzicht opgebouwd
// uit de echte posts (dezelfde volgorde als de API-respons). Alle API-tekst
// wordt ge-escaped. Geen afbeeldingen in de fallback. React vervangt dit blok
// bij mount (createRoot().render() leegt #root), dus geen dubbele content.
function articlesFallbackBody(posts) {
  const articles = (posts || [])
    // Alleen posts met zowel een niet-lege slug als titel; volgorde blijft gelijk.
    .filter((post) => {
      const slug = post.slug ? String(post.slug).trim() : "";
      const title = post.title ? String(post.title).trim() : "";
      return slug && title;
    })
    .map((post) => {
      // URL veilig opbouwen (encodeURIComponent) en de uiteindelijke href
      // escapen vóór insertie in het href-attribuut.
      const href = escapeHtml(`/post/${encodeURIComponent(String(post.slug))}`);
      const title = escapeHtml(String(post.title));
      const excerpt = post.excerpt
        ? `\n          <p>${escapeHtml(String(post.excerpt))}</p>`
        : "";
      const iso = post.published_at || post.updated_at || "";
      const dateLabel = formatDateNl(iso);
      const date = dateLabel
        ? `\n          <p><time datetime="${escapeHtml(String(iso))}">${escapeHtml(dateLabel)}</time></p>`
        : "";
      return `        <article>
          <h2><a href="${href}">${title}</a></h2>${excerpt}${date}
        </article>`;
    })
    .join("\n");

  return seoWrap(`        <h1>Alles over thuisbatterijen en energieopslag</h1>
        <p>In onze kennisbank leest u artikelen over thuisbatterijen, batterijopslag en het opslaan van zonnestroom. Van capaciteit en installatie tot energieprijzen, rendement en slimme aansturing.</p>
${articles}
        <p><a href="/calculator">Bereken uw thuisbatterij</a></p>`);
}

// Route-specifieke SEO-pagina's. slug "" = dist/index.html (homepage houdt
// zijn bestaande meta + performance-shell; alleen body wordt geïnjecteerd).
const STATIC_PAGES = [
  { slug: "", keepMeta: true, keepHomeShell: true, body: HOMEPAGE_BODY },
  {
    slug: "calculator",
    title: "Thuisbatterij Calculator | Bereken gratis uw batterijcapaciteit",
    description:
      "Gebruik de gratis thuisbatterij calculator en bereken welke batterijcapaciteit past bij uw stroomverbruik, zonnepanelen en teruglevering. Ontvang direct een eerste advies.",
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
  {
    // body wordt dynamisch opgebouwd uit de echte posts (articlesFallbackBody);
    // zie generateStaticPages. Meta/canonical/sitemap blijven ongewijzigd.
    slug: "artikelen",
    title: "Kennisbank thuisbatterijen en energieopslag | Batterijenplan",
    description:
      "Lees praktische artikelen over thuisbatterijen, capaciteit, installatie, energieprijzen, rendement, EMS en het opslaan van zonnestroom.",
    dynamicBody: articlesFallbackBody,
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
// Vervangingsfunctie (i.p.v. string) zodat "$"-reeksen in dynamische body-HTML
// (bijv. $ in codeblokken/tekst) niet als replace-patronen worden opgevat.
function injectSeoBody(html, bodyHtml) {
  const marker = '<div id="root"></div>';
  if (!html.includes(marker)) {
    console.warn("Waarschuwing: leeg #root niet gevonden; SEO-body niet geïnjecteerd.");
    return html;
  }
  return html.replace(marker, () => `<div id="root">\n${bodyHtml}\n    </div>`);
}

async function generateStaticPages(template, posts) {
  let count = 0;
  for (const page of STATIC_PAGES) {
    let html = page.keepMeta
      ? template
      : replaceMetaBlock(template, pageMetaBlock({ ...page, slug: page.slug }));

    // Alleen de homepage houdt de performance-shell; overige routes niet.
    if (!page.keepHomeShell) html = stripHomeShell(html);

    // Pagina's met een dynamicBody (bijv. /artikelen) bouwen hun body uit de
    // echte posts; de rest gebruikt hun statische body.
    const body = page.dynamicBody ? page.dynamicBody(posts) : page.body;
    html = injectSeoBody(html, body);

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

// WhatsApp-vriendelijke social image: expliciet JPG (géén f_auto — WhatsApp
// gaat vaak mis op content-negotiation/WebP), vast 1200x630, gepad in plaats
// van gecropt zodat tekst op de cover niet wegvalt, met de site-achtergrond
// als padding-kleur.
function socialImageUrl(url) {
  if (
    !url ||
    !url.includes("res.cloudinary.com") ||
    !url.includes("/image/upload/")
  ) {
    return url || null;
  }
  let out = url.replace(
    "/image/upload/",
    "/image/upload/f_jpg,q_auto,w_1200,h_630,c_pad,b_rgb:F7F6F2/",
  );
  // Cloudinary public ids zonder extensie: .jpg toevoegen zodat scrapers
  // het bestandstype ook aan de URL kunnen zien.
  if (!/\.(jpe?g|png|webp|gif)$/i.test(out)) out += ".jpg";
  return out;
}

// ── Statische artikel-fallback in #root ──────────────────────────────────
// Crawlers en no-JS-tools zien de volledige artikeltekst vóór hydratie; React
// vervangt dit blok bij mount (createRoot().render() leegt #root), dus geen
// dubbele zichtbare content. Normale document-flow, geen overlay/shell.

const NL_MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

// Vaste Nederlandse datum, zonder afhankelijkheid van ICU/locale in Node.
function formatDateNl(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Zelfde tabel-wrap als PostDetail.jsx: brede tabellen scrollen zijwaarts i.p.v.
// de pagina te verbreden — voorkomt horizontale overflow in de fallback.
function wrapTables(html) {
  if (!html) return html;
  return html
    .replaceAll("<table>", '<div class="post-table-scroll"><table>')
    .replaceAll("</table>", "</table></div>");
}

// Zelfde Cloudinary-transform als images.js optimizedImageUrl(1200): de React-
// cover gebruikt exact deze URL als src, dus de browser hergebruikt de cache.
function coverImageUrl(url, width = 1200) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) {
    return url;
  }
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
}

// CTA-blok naar de calculator (zelfde klassen als CalculatorCta in PostDetail.jsx).
const POST_CTA_BLOCK = `<aside class="cta-block">
          <h2>Bereken welke thuisbatterij bij uw woning past</h2>
          <p>Gebruik de gratis thuisbatterij calculator en ontvang direct een eerste indicatie op basis van uw verbruik en teruglevering.</p>
          <div class="cta-block-actions">
            <a class="cta-button cta-button-sm" href="/calculator">Start de calculator</a>
            <a class="cta-text-link" href="/calculator?advies=1#advies">Of vraag gratis advies aan</a>
          </div>
        </aside>`;

// Bouwt de statische artikel-HTML voor in #root. Tekstvelden worden ge-escaped;
// body_html is vertrouwde, server-side (markdown→HTML) CMS-content en wordt —
// net als in PostDetail.jsx (dangerouslySetInnerHTML) — als HTML ingevoegd.
function postBodyFallback(post) {
  const kicker = Array.isArray(post.tags) ? post.tags.join(" · ") : "";
  const bylineParts = [
    post.author,
    formatDateNl(post.published_at),
    post.reading_minutes ? `${post.reading_minutes} min leestijd` : "",
  ].filter(Boolean);
  const byline = bylineParts
    .map((s) => `<span>${escapeHtml(String(s))}</span>`)
    .join("\n            ");

  const coverAlt = post.cover_alt || post.title || "";
  const cover = post.cover_image_url
    ? `<img class="cover" src="${escapeHtml(coverImageUrl(post.cover_image_url, 1200))}" width="1200" height="675" alt="${escapeHtml(coverAlt)}" />`
    : "";
  const excerpt = post.excerpt
    ? `<p>${escapeHtml(post.excerpt)}</p>`
    : "";
  const body = wrapTables(post.body_html || "");

  return `<article class="container post-detail">
        <p class="mono kicker">${escapeHtml(kicker)}</p>
        <h1>${escapeHtml(post.title)}</h1>
        <div class="byline mono">
            ${byline}
        </div>
        <p class="cta-inline mono">Niet zeker welke batterijcapaciteit u nodig heeft? <a href="/calculator">Bereken het gratis.</a></p>
        ${excerpt}
        ${cover}
        ${POST_CTA_BLOCK}
        <div class="prose">${body}</div>
        ${POST_CTA_BLOCK}
      </article>`;
}

// Detail-endpoint bevat body_html (de lijst niet); per post apart ophalen.
async function fetchPostDetail(slug) {
  const base = API_URL.endsWith("/") ? API_URL : `${API_URL}/`;
  const res = await fetch(`${base}${slug}/`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Korte <title>/og:title voor posts waarvan de volle titel + "— Batterijenplan"
// te lang werd (SEO-audit: "<title> tag too long"). Bevatten zélf al de
// merknaam ("| Batterijenplan"), dus géén extra brandingsuffix. De zichtbare
// H1 (postBodyFallback) blijft post.title. Spiegelt POST_SEO_TITLES in
// src/seo.js (klein, bewust geen gedeeld systeem).
const POST_SEO_TITLES = {
  "dynamisch-energiecontract-thuisbatterij": "Dynamisch contract + thuisbatterij | Batterijenplan",
  "elektrische-auto-ems-systeem": "EV slim laden met EMS | Batterijenplan",
  "ems-systeem-thuisbatterij-controle-over-stroom": "EMS voor thuisbatterijen | Batterijenplan",
  "enphase-vs-dyness": "Enphase vs Dyness | Batterijenplan",
  "groene-vrienden-vs-zonneplan-vs-tibber": "Groene Vrienden vs Zonneplan | Batterijenplan",
  "terugverdientijd-thuisbatterij-handel-of-zelfconsumptie": "Terugverdientijd thuisbatterij | Batterijenplan",
  "thuisbatterij-installatie": "Thuisbatterij installatie | Batterijenplan",
  "thuisbatterij-vergelijken": "Thuisbatterij vergelijken | Batterijenplan",
};

// SEO-titel: backend-veld (indien ooit toegevoegd) > korte map > standaard.
function seoTitle(post) {
  return (
    post.seo_title ||
    post.meta_title ||
    POST_SEO_TITLES[post.slug] ||
    `${post.title} — Batterijenplan`
  );
}

function postMetaBlock(post) {
  const url = `${SITE_URL}/post/${post.slug}`;
  const title = seoTitle(post);
  // Altijd post-specifiek (nooit terugvallen op de homepage-beschrijving).
  // Voorkeur: expliciete backend seo_description > (uit de body afgeleide)
  // meta_description > excerpt > titel.
  const description =
    post.seo_description || post.meta_description || post.excerpt || post.title;

  const image = post.cover_image_url || null;
  const socialImage = socialImageUrl(image);

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
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
  ];

  if (socialImage) {
    const i = escapeHtml(socialImage);
    tags.push(
      `<meta property="og:image" content="${i}" />`,
      `<meta property="og:image:secure_url" content="${i}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:type" content="image/jpeg" />`,
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
    { loc: `${SITE_URL}/artikelen` },
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

    // Detail ophalen voor body_html (zit niet in de lijst-serializer). Faalt de
    // call, dan valt deze post terug op meta-only HTML (oud gedrag) i.p.v. de
    // hele build te breken.
    let detail = post;
    try {
      detail = await fetchPostDetail(post.slug);
    } catch (err) {
      console.warn(`Body niet opgehaald voor "${post.slug}" (${err.message}); alleen meta.`);
    }

    let html = stripHomeShell(
      template.slice(0, startIdx) +
        postMetaBlock(detail) +
        template.slice(endIdx + META_END.length),
    );

    // Volledige artikeltekst statisch ín #root, zodat crawlers/no-JS-tools de
    // body zien vóór JS. React vervangt dit bij mount (geen dubbele content).
    if (detail.body_html) {
      html = injectSeoBody(html, postBodyFallback(detail));
    }

    const dir = path.join(distDir, "post", post.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), html, "utf8");
    generated += 1;
  }

  // Statische SEO-fallback voor de hoofdpagina's (leest dezelfde in-memory
  // template; wijzigt dist/index.html en schrijft dist/<route>/index.html).
  const staticCount = await generateStaticPages(template, posts);

  await writeFile(path.join(distDir, "sitemap.xml"), buildSitemap(posts), "utf8");

  console.log(`Prerender klaar: ${generated} blogpost-HTML-bestanden gegenereerd in dist/post/.`);
  console.log(`Statische SEO-pagina's gegenereerd: ${staticCount} (/, /calculator, /artikelen, /contact, /privacy).`);
  console.log(`sitemap.xml gegenereerd met ${posts.length + 5} URL's.`);
}

main().catch((err) => {
  console.error("prerender-blog-meta.mjs mislukt:", err.message);
  process.exit(1);
});
