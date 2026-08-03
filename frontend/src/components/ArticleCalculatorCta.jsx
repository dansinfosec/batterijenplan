import { useId } from "react";
import { Link } from "react-router-dom";
import { trackEvent } from "../analytics.js";

// Gebrande, herbruikbare calculator-CTA voor onderaan élke artikeldetailpagina.
// Eén kaart (géén formulier) met een echte <Link> naar de SPA-route /calculator.
// Bewuste keuzes, afgestemd op de Batterijenplan-huisstijl en de opdracht:
//  - semantische <section> met eigen toegankelijke kop (aria-labelledby → h2),
//    zodat de kaart in de leesvolgorde als eigen sectie leest;
//  - warme papierkaart, dikke inkt-rand en een harde offset-schaduw (geen
//    blurred SaaS-schaduw), gele accentbalk en koper als klein accent — via de
//    bestaande merk-tokens in global.css, geen losse hex-kleuren;
//  - GEEN onbewezen besparings-/terugverdienbeloftes en GEEN valse urgentie;
//  - toetsenbordtoegankelijk (echte <a> via <Link>, zichtbare focus-state in
//    CSS) en zonder geneste interactieve elementen;
//  - trackbaar via het bestaande dataLayer-patroon (trackEvent) — dit blokkeert
//    de navigatie niet en is puur een analytics-neveneffect, net als bij de
//    andere CTA's (MobileStickyCta, LeadCaptureForm);
//  - raakt de body_html van de API NIET aan — dit is een React-broer van de
//    body, geen injectie in de artikeltekst.
//
// PostDetail rendert dit component precies één keer, ná de body + FAQ en vóór
// gerelateerde artikelen; het voegt zichzelf niet meerdere keren toe.
export default function ArticleCalculatorCta({
  eyebrow = "Bereken uw situatie",
  heading = "Welke thuisbatterij past bij uw woning?",
  body = "Vul uw verbruik, zonnepanelen en teruglevering in en bekijk welke batterijcapaciteit bij uw situatie past.",
  buttonLabel = "Bereken mijn batterij",
  note = "Vrijblijvende berekening op basis van uw eigen energiegegevens.",
  source = "article_end",
  className = "",
}) {
  const headingId = useId();

  return (
    <section
      className={`article-cta${className ? ` ${className}` : ""}`}
      aria-labelledby={headingId}
    >
      <div className="article-cta-copy">
        {eyebrow && <p className="article-cta-eyebrow">{eyebrow}</p>}
        <h2 id={headingId} className="article-cta-title">
          {heading}
        </h2>
        {body && <p className="article-cta-body">{body}</p>}
      </div>

      <Link
        to="/calculator"
        className="article-cta-btn"
        onClick={() => trackEvent("lead_cta_click", { lead_source: source })}
      >
        {buttonLabel}
        <span aria-hidden="true" className="article-cta-arrow">→</span>
      </Link>

      {note && <p className="article-cta-note">{note}</p>}
    </section>
  );
}
