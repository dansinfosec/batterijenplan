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

// Minimale kopie van optimizedImageUrl (src/images.js): het ES-module bestand
// hangt aan Vite/import.meta, dus we dupliceren alleen de Cloudinary-transform.
function cloudinaryVariant(url, width) {
  if (
    !url ||
    !url.includes("res.cloudinary.com") ||
    !url.includes("/image/upload/")
  ) {
    return url;
  }
  return url.replace(
    "/image/upload/",
    `/image/upload/f_auto,q_auto,w_${width},c_limit/`,
  );
}

const COVER_WIDTHS = [480, 768, 960, 1200];
function coverSrcset(url) {
  return COVER_WIDTHS.map((w) => `${cloudinaryVariant(url, w)} ${w}w`).join(", ");
}

function formatDateNl(iso) {
  try {
    return new Date(iso).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(iso).slice(0, 10);
  }
}

// Kritieke CSS voor de statische blogpost-shell: fixed overlay (geen document
// flow → geen CLS bij verwijderen), systeemfonts, geen afbeeldingen/animaties.
const POST_SHELL_CSS =
  '#static-post-shell{position:fixed;inset:0;z-index:9999;overflow:auto;background:#F7F6F2;color:#12130F;line-height:1.7;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}' +
  "#static-post-shell .sps-w{max-width:1080px;margin:0 auto;padding:0 24px}" +
  "#static-post-shell .sps-header{border-bottom:2px solid #12130F}" +
  "#static-post-shell .sps-brand{display:flex;align-items:center;height:64px;font-weight:900;font-size:20px;letter-spacing:-.02em}" +
  "#static-post-shell .sps-body{padding:36px 0 60px}" +
  "#static-post-shell .sps-kicker{margin:0;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8A6D00;font-family:ui-monospace,Menlo,Consolas,monospace}" +
  "#static-post-shell h1{font-weight:900;font-size:clamp(30px,5vw,52px);line-height:1.04;letter-spacing:-.02em;margin:12px 0 18px}" +
  "#static-post-shell .sps-byline{display:flex;gap:16px;flex-wrap:wrap;border-top:2px solid #12130F;border-bottom:2px solid #12130F;padding:12px 0;margin-bottom:28px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#4C4D46;font-family:ui-monospace,Menlo,Consolas,monospace}" +
  "#static-post-shell .sps-cover{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border:2px solid #12130F;border-radius:10px;margin-bottom:28px;background:#ECEAE3}" +
  "#static-post-shell .sps-excerpt{font-size:18px;color:#4C4D46;max-width:68ch;margin:0}" +
  "#static-post-shell .sps-cta{margin-top:28px;padding:16px 18px;border:2px solid #12130F;border-radius:10px;background:#fff}" +
  "#static-post-shell .sps-cta strong{font-size:15px}" +
  "#static-post-shell .sps-cta a{display:inline-block;margin-top:10px;padding:12px 22px;font-weight:900;font-size:15px;text-transform:uppercase;letter-spacing:.04em;text-decoration:none;color:#12130F;background:#FFD100;border:2px solid #12130F;border-radius:6px}" +
  "@media(max-width:640px){#static-post-shell .sps-w{padding:0 16px}#static-post-shell .sps-body{padding:28px 0 48px}#static-post-shell .sps-excerpt{font-size:16px}}";

// Bouwt de statische blogpost-shell (fixed overlay) uit dezelfde postdata die
// het script al gebruikt. Plain HTML, geen JS/CSS-bundle nodig.
function postShellBlock(post) {
  const title = escapeHtml(post.title);
  const kicker = Array.isArray(post.tags)
    ? escapeHtml(post.tags.slice(0, 5).join(" · "))
    : "";
  const excerpt = escapeHtml(post.excerpt || post.meta_description || "");

  const bylineBits = [];
  if (post.author) bylineBits.push(escapeHtml(post.author));
  if (post.published_at) bylineBits.push(escapeHtml(formatDateNl(post.published_at)));
  if (post.reading_minutes) bylineBits.push(escapeHtml(`${post.reading_minutes} min leestijd`));
  const byline = bylineBits.map((b) => `<span>${b}</span>`).join("");

  let coverHtml = "";
  if (post.cover_image_url) {
    const src = escapeHtml(cloudinaryVariant(post.cover_image_url, 1200));
    const srcset = escapeHtml(coverSrcset(post.cover_image_url));
    coverHtml =
      `<img class="sps-cover" src="${src}" srcset="${srcset}" ` +
      `sizes="(max-width: 720px) 100vw, 960px" width="1200" height="675" ` +
      `fetchpriority="high" decoding="async" alt="" />`;
  }

  return (
    `<style>${POST_SHELL_CSS}</style>\n` +
    `    <!-- post-shell:start (statische first-paint van deze blogpost; React verwijdert hem) -->\n` +
    `    <div id="static-post-shell">\n` +
    `      <div class="sps-header"><div class="sps-w"><span class="sps-brand">Batterijenplan.nl</span></div></div>\n` +
    `      <div class="sps-w sps-body">\n` +
    (kicker ? `        <p class="sps-kicker">${kicker}</p>\n` : "") +
    `        <h1>${title}</h1>\n` +
    (byline ? `        <div class="sps-byline">${byline}</div>\n` : "") +
    (coverHtml ? `        ${coverHtml}\n` : "") +
    (excerpt ? `        <p class="sps-excerpt">${excerpt}</p>\n` : "") +
    `        <div class="sps-cta"><strong>Niet zeker welke batterijcapaciteit u nodig heeft?</strong>` +
    `<div><a href="/calculator">Bereken uw thuisbatterij</a></div></div>\n` +
    `      </div>\n` +
    `    </div>\n` +
    `    <!-- post-shell:end -->`
  );
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

    let html = stripHomeShell(
      template.slice(0, startIdx) +
        postMetaBlock(post) +
        template.slice(endIdx + META_END.length),
    );

    // Statische blogpost-shell vlak vóór #root injecteren, zodat er een
    // betekenisvolle first paint is (incl. LCP-cover) voordat React/API klaar zijn.
    const rootMarker = '<div id="root">';
    if (html.includes(rootMarker)) {
      html = html.replace(rootMarker, `${postShellBlock(post)}\n    ${rootMarker}`);
    } else {
      console.warn(`Waarschuwing: #root niet gevonden; geen post-shell voor ${post.slug}.`);
    }

    const dir = path.join(distDir, "post", post.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), html, "utf8");
    generated += 1;
  }

  await writeFile(path.join(distDir, "sitemap.xml"), buildSitemap(posts), "utf8");

  console.log(`Prerender klaar: ${generated} blogpost-HTML-bestanden gegenereerd in dist/post/.`);
  console.log(`sitemap.xml gegenereerd met ${posts.length + 4} URL's.`);
}

main().catch((err) => {
  console.error("prerender-blog-meta.mjs mislukt:", err.message);
  process.exit(1);
});
