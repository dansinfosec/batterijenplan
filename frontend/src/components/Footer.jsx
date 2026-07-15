import { Link } from "react-router-dom";
import { OPEN_COOKIE_SETTINGS_EVENT } from "./CookieConsent.jsx";
import {
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_PHONE_TEL,
  BUSINESS_WHATSAPP_URL,
} from "../constants.js";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <span className="mono">Batterijenplan.nl — kennis over energieopslag</span>
        <span className="mono">
          <Link to="/">batterijenplan.nl</Link>
        </span>
      </div>

      <div className="container footer-contact mono">
        <span>De Waal 18D, 5684 PH Best</span>
        <span>
          <a href="mailto:info@batterijenplan.nl">info@batterijenplan.nl</a>
        </span>
        <span>
          Telefoon: <a href={BUSINESS_PHONE_TEL}>{BUSINESS_PHONE_DISPLAY}</a>
        </span>
        <span>
          WhatsApp:{" "}
          <a href={BUSINESS_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            {BUSINESS_PHONE_DISPLAY}
          </a>
        </span>
        <span>Servicegebied: Nederland</span>
        <span>Bezoek alleen op afspraak</span>
        <span>
          <Link to="/contact">Contact</Link>
        </span>
        <span>
          <button
            type="button"
            className="footer-link-btn"
            onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
          >
            Cookie-instellingen
          </button>
        </span>
      </div>
    </footer>
  );
}
