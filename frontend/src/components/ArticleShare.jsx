import { useEffect, useState } from "react";
import { trackEvent } from "../analytics.js";
import { articleShareUrl, shareLinks, nativeSharePayload } from "../share.js";

// ── Herbruikbare artikel-deelknoppen ───────────────────────────────────────
// Eén component voor elke /post/{slug}-pagina (via PostDetail); geen
// gedupliceerde deelmarkup per artikel en geen hardcoded slug-lijst, dus ook
// nieuwe artikelen krijgen automatisch deelknoppen.
//
// Privacy: puur platte links + eigen klik-handlers. Er wordt GEEN externe
// social-SDK geladen (Facebook/X/LinkedIn/Reddit) — derden worden alleen
// benaderd wanneer de lezer zelf op een deelactie klikt. De URL-opbouw staat
// in ../share.js (pure, node-testbaar) en gebruikt altijd de schone canonieke
// productie-URL, nooit window.location of query-/trackingparameters.
//
// Toegankelijkheid: elke knop/link heeft een tekstueel label (aria-label);
// de SVG-iconen zijn decoratief (aria-hidden). Werkt volledig met toetsenbord.

// Monochrome inline-iconen (currentColor), zodat ze in de bestaande
// Batterijenplan-stijl passen i.p.v. een bonte merk-kleurenbalk.
const ICONS = {
  whatsapp: (
    <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.3 0-.4.1-.5l.4-.5.2-.4v-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.2-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.2.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z" />
  ),
  facebook: (
    <path d="M14 8.5V7c0-.7.5-.9 .8-.9H16V3.6h-2.2C11.3 3.6 11 5.5 11 6.7v1.8H9.3V11H11v9h3v-9h2.1l.3-2.5H14Z" />
  ),
  reddit: (
    <path d="M22 12a2.1 2.1 0 0 0-3.6-1.5 10.3 10.3 0 0 0-5-1.4l.9-4 2.8.6a1.5 1.5 0 1 0 .2-1.4l-3.4-.7-1.2 5.5a10.3 10.3 0 0 0-5.1 1.4A2.1 2.1 0 1 0 3.3 14a4 4 0 0 0 0 .6c0 3.1 3.9 5.6 8.7 5.6s8.7-2.5 8.7-5.6a4 4 0 0 0 0-.6A2.1 2.1 0 0 0 22 12ZM8 13.5a1.3 1.3 0 1 1 1.3 1.3A1.3 1.3 0 0 1 8 13.5Zm7.3 3.6a4.9 4.9 0 0 1-3.3 1 4.9 4.9 0 0 1-3.3-1 .4.4 0 0 1 .6-.6 4.1 4.1 0 0 0 2.7.8 4.1 4.1 0 0 0 2.7-.8 .4.4 0 1 1 .6.6Zm-.6-2.3a1.3 1.3 0 1 1 1.3-1.3 1.3 1.3 0 0 1-1.3 1.3Z" />
  ),
  linkedin: (
    <path d="M6.9 8.8H4.2V20h2.7V8.8ZM5.5 4a1.6 1.6 0 1 0 0 3.1 1.6 1.6 0 0 0 0-3.1ZM20 20v-6.1c0-3-1.6-4.4-3.8-4.4a3.3 3.3 0 0 0-3 1.6V8.8H10.6c0 .8 0 11.2 0 11.2h2.7v-6.2c0-.3 0-.7.1-.9a1.8 1.8 0 0 1 1.7-1.2c1.2 0 1.7.9 1.7 2.3V20H20Z" />
  ),
  x: (
    <path d="M17.5 3h2.6l-5.7 6.5L21 21h-5.2l-4.1-5.4L6.9 21H4.3l6.1-7L3.5 3h5.3l3.7 4.9L17.5 3Zm-.9 16.4h1.4L7.9 4.5H6.4l10.2 14.9Z" />
  ),
  email: (
    <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 2v.4l8 4.6 8-4.6V7H4Zm16 2.7-8 4.6-8-4.6V17h16V9.7Z" />
  ),
  copy: (
    <path d="M9 3h9a2 2 0 0 1 2 2v11h-2V5H9V3Zm-3 4h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm0 2v10h9V9H6Z" />
  ),
  native: (
    <path d="M18 8a3 3 0 1 0-2.8-4.1L8.9 7.2a3 3 0 1 0 0 4.6l6.3 3.3A3 3 0 1 0 16 13l-6.3-3.3a3 3 0 0 0 0-.9L16 5.6A3 3 0 0 0 18 8Z" />
  ),
};

function ShareIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}

export default function ArticleShare({ title, slug, variant = "row", heading }) {
  const url = articleShareUrl(slug);
  const links = shareLinks(title, url);
  const [copied, setCopied] = useState(false);
  // navigator.share is niet overal beschikbaar (vooral desktop); alleen tonen
  // als het echt kan. In een effect zodat er geen mismatch met de eerste render
  // ontstaat.
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  const logShare = (platform) =>
    trackEvent("article_share", { platform, article_slug: slug });

  // Kopieert de URL; probeert eerst de Clipboard API en valt bij een afwijzing
  // (bv. geen permissie) terug op het onzichtbare-tekstveld + execCommand.
  // Geeft true terug bij succes, zodat de UI/analytics alleen dan reageren.
  const writeClipboard = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        return true;
      } catch {
        // door naar de fallback
      }
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopy = async () => {
    const ok = await writeClipboard();
    if (!ok) return; // stil falen (geen alert-popup); knop blijft bruikbaar
    setCopied(true);
    logShare("copy");
    trackEvent("article_share_copy_success", { platform: "copy", article_slug: slug });
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleNative = async () => {
    try {
      await navigator.share(nativeSharePayload(title, slug));
      logShare("native");
    } catch {
      // Door de gebruiker geannuleerd of niet ondersteund: niets doen.
    }
  };

  return (
    <section className={`article-share article-share--${variant}`} aria-label="Dit artikel delen">
      <p className="article-share-title">
        {heading || (variant === "block" ? "Vond u dit artikel nuttig? Deel het." : "Deel dit artikel")}
      </p>

      <div className="article-share-actions">
        {links.map((link) => (
          <a
            key={link.id}
            className={`article-share-btn article-share-btn--${link.id}`}
            href={link.href}
            // mailto opent de mailclient in dezelfde context; de http(s)-acties
            // in een nieuw tabblad zonder opener-toegang.
            {...(link.id === "email"
              ? {}
              : { target: "_blank", rel: "noopener noreferrer" })}
            aria-label={link.label}
            onClick={() => logShare(link.id)}
          >
            <ShareIcon name={link.id} />
            <span className="article-share-label">{link.label.replace(/^Deel (via|op) /, "")}</span>
          </a>
        ))}

        <button
          type="button"
          className="article-share-btn article-share-btn--copy"
          onClick={handleCopy}
          aria-label={copied ? "Link gekopieerd" : "Kopieer link"}
        >
          <ShareIcon name="copy" />
          <span className="article-share-label">{copied ? "Link gekopieerd" : "Link kopiëren"}</span>
        </button>

        {canNativeShare && (
          <button
            type="button"
            className="article-share-btn article-share-btn--native"
            onClick={handleNative}
            aria-label="Delen"
          >
            <ShareIcon name="native" />
            <span className="article-share-label">Delen</span>
          </button>
        )}
      </div>

      {/* Screenreader-bevestiging bij kopiëren (beleefd, onderbreekt niet). */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Link naar dit artikel is gekopieerd." : ""}
      </span>
    </section>
  );
}
