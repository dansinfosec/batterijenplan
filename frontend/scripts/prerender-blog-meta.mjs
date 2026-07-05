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

  await writeFile(path.join(distDir, "sitemap.xml"), buildSitemap(posts), "utf8");

  console.log(`Prerender klaar: ${generated} blogpost-HTML-bestanden gegenereerd in dist/post/.`);
  console.log(`sitemap.xml gegenereerd met ${posts.length + 4} URL's.`);
}

main().catch((err) => {
  console.error("prerender-blog-meta.mjs mislukt:", err.message);
  process.exit(1);
});
