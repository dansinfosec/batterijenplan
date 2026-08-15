// Tests voor de artikel-deellogica (src/share.js): schone canonieke URL,
// correcte encoding en het ontbreken van query-/trackingparameters. Ook een
// broncontrole op ArticleShare.jsx: geen passieve social-SDK's.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  articleShareUrl,
  whatsappShareUrl,
  facebookShareUrl,
  redditShareUrl,
  linkedinShareUrl,
  xShareUrl,
  emailShareUrl,
  nativeSharePayload,
  shareLinks,
  EMAIL_INTRO,
} from "../src/share.js";

const SLUG = "thuisbatterij-vergelijken";
const TITLE = "Thuisbatterij vergelijken: waar moet u op letten?";
const CANONICAL = "https://www.batterijenplan.nl/post/thuisbatterij-vergelijken";

// ── Canonieke URL ──────────────────────────────────────────────────────────

test("canonieke deel-URL wordt correct opgebouwd uit de slug", () => {
  assert.equal(articleShareUrl(SLUG), CANONICAL);
});

test("deel-URL gebruikt altijd het www-productiedomein, nooit localhost/preview", () => {
  const url = articleShareUrl(SLUG);
  assert.ok(url.startsWith("https://www.batterijenplan.nl/post/"));
  assert.ok(!url.includes("localhost"));
  assert.ok(!url.includes("127.0.0.1"));
  assert.ok(!url.includes("/api/"));
});

test("query-/trackingparameters lekken nooit in de gedeelde URL", () => {
  // Ook al zou een caller de slug vervuilen, de canonieke URL bevat geen
  // losse query-parameters van de huidige pagina.
  const url = articleShareUrl(SLUG);
  assert.ok(!url.includes("?utm"));
  assert.ok(!url.includes("advies=1"));
  // De canonieke artikel-URL heeft zelf geen querystring.
  assert.equal(url.split("?").length, 1);
});

// ── Per platform ───────────────────────────────────────────────────────────

test("WhatsApp bevat titel én canonieke URL, correct ge-encodeerd", () => {
  const u = whatsappShareUrl(TITLE, CANONICAL);
  assert.ok(u.startsWith("https://wa.me/?text="));
  const decoded = decodeURIComponent(u.split("text=")[1]);
  assert.ok(decoded.includes(TITLE));
  assert.ok(decoded.includes(CANONICAL));
  // Titel en URL staan op aparte regels (newline in de payload).
  assert.ok(decoded.includes("\n"));
});

test("Facebook deelt alleen de canonieke URL (leest verder Open Graph)", () => {
  const u = facebookShareUrl(CANONICAL);
  assert.ok(u.startsWith("https://www.facebook.com/sharer/sharer.php?u="));
  assert.equal(decodeURIComponent(u.split("u=")[1]), CANONICAL);
});

test("Reddit-submit bevat canonieke URL én titel, niet auto-submitted", () => {
  const u = redditShareUrl(TITLE, CANONICAL);
  assert.ok(u.startsWith("https://www.reddit.com/submit?"));
  assert.ok(u.includes(`url=${encodeURIComponent(CANONICAL)}`));
  assert.ok(u.includes(`title=${encodeURIComponent(TITLE)}`));
  // Geen subreddit vooraf gekozen.
  assert.ok(!/\/r\/[^/]+\/submit/.test(u));
});

test("LinkedIn deelt de canonieke URL via share-offsite", () => {
  const u = linkedinShareUrl(CANONICAL);
  assert.ok(u.startsWith("https://www.linkedin.com/sharing/share-offsite/?url="));
  assert.equal(decodeURIComponent(u.split("url=")[1]), CANONICAL);
});

test("X bevat titel + canonieke URL en géén hashtags", () => {
  const u = xShareUrl(TITLE, CANONICAL);
  assert.ok(u.includes("intent/tweet"));
  assert.ok(u.includes(`url=${encodeURIComponent(CANONICAL)}`));
  assert.ok(u.includes(`text=${encodeURIComponent(TITLE)}`));
  assert.ok(!u.includes("hashtags="));
  assert.ok(!u.includes("%23")); // geen '#'
});

test("e-mail: onderwerp = titel, body = introzin + canonieke URL, ge-encodeerd", () => {
  const u = emailShareUrl(TITLE, CANONICAL);
  assert.ok(u.startsWith("mailto:?"));
  assert.ok(u.includes(`subject=${encodeURIComponent(TITLE)}`));
  const body = decodeURIComponent(u.split("body=")[1]);
  assert.ok(body.startsWith(EMAIL_INTRO));
  assert.ok(body.includes(CANONICAL));
});

test("native share-payload bevat titel + canonieke URL", () => {
  const p = nativeSharePayload(TITLE, SLUG);
  assert.deepEqual(p, { title: TITLE, url: CANONICAL });
});

// ── shareLinks-lijst ───────────────────────────────────────────────────────

test("shareLinks levert alle zes link-acties met label en canonieke URL", () => {
  const links = shareLinks(TITLE, CANONICAL);
  assert.deepEqual(
    links.map((l) => l.id),
    ["whatsapp", "facebook", "reddit", "linkedin", "x", "email"],
  );
  for (const link of links) {
    assert.ok(link.label && link.label.length > 0, `${link.id} mist label`);
    // Elke link verwijst naar de canonieke URL (direct of ge-encodeerd).
    assert.ok(
      link.href.includes(CANONICAL) || link.href.includes(encodeURIComponent(CANONICAL)),
      `${link.id} bevat de canonieke URL niet`,
    );
  }
});

// ── Privacy: geen passieve social-SDK's in de component ────────────────────

test("ArticleShare laadt geen externe social-SDK's", () => {
  const src = readFileSync(
    fileURLToPath(new URL("../src/components/ArticleShare.jsx", import.meta.url)),
    "utf-8",
  );
  for (const sdk of [
    "connect.facebook.net",
    "platform.twitter.com",
    "platform.linkedin.com",
    "redditstatic.com",
    "widgets.js",
    "sdk.js",
  ]) {
    assert.ok(!src.includes(sdk), `component verwijst naar social-SDK ${sdk}`);
  }
  // Geen dangerouslySetInnerHTML in de deelcomponent.
  assert.ok(!src.includes("dangerouslySetInnerHTML"));
});

test("analytics-payload bevat uitsluitend platform + article_slug (geen PII/URL)", () => {
  const src = readFileSync(
    fileURLToPath(new URL("../src/components/ArticleShare.jsx", import.meta.url)),
    "utf-8",
  );
  // Elke trackEvent-aanroep gebruikt alleen platform + article_slug.
  const calls = [...src.matchAll(/trackEvent\(([\s\S]*?)\)\s*;/g)].map((m) => m[1]);
  assert.ok(calls.length >= 2, "verwacht minstens twee trackEvent-aanroepen");
  for (const call of calls) {
    assert.ok(call.includes("platform"), `trackEvent zonder platform: ${call}`);
    assert.ok(call.includes("article_slug"), `trackEvent zonder article_slug: ${call}`);
    // Geen PII, URL, klembord- of body-inhoud in de analytics-payload.
    for (const forbidden of ["email", "phone", "name", "postcode", "url", "title", "clipboard", "href"]) {
      assert.ok(
        !new RegExp(`\\b${forbidden}\\b`).test(call),
        `trackEvent-payload bevat verboden veld "${forbidden}": ${call}`,
      );
    }
  }
});
