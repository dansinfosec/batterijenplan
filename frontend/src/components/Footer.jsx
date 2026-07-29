import { Link } from "react-router-dom";
import { OPEN_COOKIE_SETTINGS_EVENT } from "./CookieConsent.jsx";
import {
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_PHONE_TEL,
  BUSINESS_WHATSAPP_URL,
} from "../constants.js";

// Professionele footer met kolommen op desktop en een gestapelde layout op
// mobiel. Bevat een korte omschrijving, navigatie, contactgegevens en onderin
// een disclaimer (calculator-uitkomsten zijn indicaties), privacy en copyright.
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-about">
            <div className="footer-brand">Batterijenplan.nl</div>
            <p className="footer-desc">
              Onafhankelijk reken- en vergelijkingsplatform voor thuisbatterijen.
              Wij helpen u bepalen welke batterijcapaciteit past bij uw verbruik,
              teruglevering en energiedoel — op basis van getallen, niet van
              verkooppraat.
            </p>
          </div>

          <nav className="footer-col" aria-label="Footernavigatie">
            <h4>Navigatie</h4>
            <ul>
              <li><Link to="/calculator">Bereken uw batterij</Link></li>
              <li><Link to="/#artikelen">Artikelen</Link></li>
              <li><Link to="/#rekenmethode">Over de berekening</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </nav>

          <div className="footer-col">
            <h4>Contact</h4>
            <ul>
              <li className="footer-muted">De Waal 18D, 5684 PH Best</li>
              <li>
                <a href="mailto:info@batterijenplan.nl">info@batterijenplan.nl</a>
              </li>
              <li>
                Telefoon: <a href={BUSINESS_PHONE_TEL}>{BUSINESS_PHONE_DISPLAY}</a>
              </li>
              <li>
                WhatsApp:{" "}
                <a href={BUSINESS_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  {BUSINESS_PHONE_DISPLAY}
                </a>
              </li>
              <li className="footer-muted">Servicegebied: Nederland · op afspraak</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-disclaimer">
            Uitkomsten van de calculator zijn indicatieve schattingen, geen
            garantie op rendement of terugverdientijd. Een specialist controleert
            uw persoonlijke situatie.
          </p>
          <div className="footer-bottom-links">
            <Link to="/privacy">Privacy</Link>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
            >
              Cookie-instellingen
            </button>
            <span>© {year} Batterijenplan.nl</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
