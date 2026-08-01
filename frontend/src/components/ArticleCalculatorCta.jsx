import { Link } from "react-router-dom";
import { trackEvent } from "../analytics.js";

// Herbruikbare, ethische calculator-CTA voor artikeldetailpagina's. Eén link
// (géén formulier) naar /calculator. Bewuste keuzes:
//  - configureerbare kop en tekst (heading/body) met veilige, feitelijke
//    standaardteksten in het Nederlands (formeel "u", conform de site);
//  - GEEN onbewezen besparings-/terugverdienbeloftes en GEEN valse urgentie
//    (geen "nog X plekken", geen afteltimers);
//  - toetsenbordtoegankelijk (een echte <a> via <Link>) en met aria-label;
//  - trackbaar via het bestaande dataLayer-patroon (trackEvent), zodat GTM na
//    toestemming het event kan verwerken; laadt zelf GEEN tags;
//  - raakt de body_html van de API NIET aan — dit is een React-broer van de
//    body, geen injectie in de artikeltekst.
//
// Plaatsing en aantal bepaalt de aanroeper (PostDetail); dit component rendert
// zichzelf precies één keer en voegt zichzelf niet meerdere keren toe.
export default function ArticleCalculatorCta({
  heading = "Benieuwd welke thuisbatterij bij uw woning past?",
  body = "Gebruik de gratis calculator en bereken op basis van uw eigen verbruik, zonnepanelen en teruglevering welke batterijcapaciteit en opzet bij uw situatie passen.",
  buttonLabel = "Start de calculator",
  source = "article_cta",
  className = "",
}) {
  return (
    <aside
      className={`article-inline-cta${className ? ` ${className}` : ""}`}
      aria-label="Naar de thuisbatterij-calculator"
    >
      <div className="article-inline-cta-copy">
        {heading && <p className="article-inline-cta-title">{heading}</p>}
        {body && <p>{body}</p>}
      </div>
      <Link
        to="/calculator"
        className="hp-btn article-inline-cta-btn"
        onClick={() => trackEvent("lead_cta_click", { lead_source: source })}
      >
        {buttonLabel}
        <span aria-hidden="true" className="hp-btn-arrow">→</span>
      </Link>
    </aside>
  );
}
