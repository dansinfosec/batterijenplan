import { useEffect } from "react";
import { Link } from "react-router-dom";
import { setPageMeta, setJsonLd, ORGANIZATION_SCHEMA } from "../seo.js";
import {
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_PHONE_TEL,
  BUSINESS_WHATSAPP_URL,
} from "../constants.js";

export default function Contact() {
  useEffect(() => {
    setPageMeta({
      title: "Contact — Batterijenplan",
      description:
        "Neem contact op met Batterijenplan.nl voor vragen over thuisbatterijen, batterijopslag en de gratis thuisbatterij calculator.",
      path: "/contact",
    });
    setJsonLd([ORGANIZATION_SCHEMA]);
    window.scrollTo(0, 0);
  }, []);

  return (
    <article className="container post-detail">
      <p className="mono kicker">Contact · Batterijenplan.nl</p>
      <h1>Contact</h1>

      <div className="prose">
        <p>
          Heeft u een vraag over thuisbatterijen, batterijopslag of de
          calculator? Neem gerust contact op.
        </p>

        <h2>Gegevens</h2>
        <p>
          Batterijenplan.nl
          <br />
          De Waal 18D
          <br />
          5684 PH Best
          <br />
          Nederland
        </p>
        <p>
          E-mail:{" "}
          <a href="mailto:info@batterijenplan.nl">info@batterijenplan.nl</a>
          <br />
          Telefoon:{" "}
          <a href={BUSINESS_PHONE_TEL}>{BUSINESS_PHONE_DISPLAY}</a>
          <br />
          WhatsApp:{" "}
          <a
            href={BUSINESS_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {BUSINESS_PHONE_DISPLAY}
          </a>
        </p>
        <p>
          Servicegebied: Nederland
          <br />
          Bezoek alleen op afspraak
        </p>
      </div>

      <aside className="cta-block">
        <h2>Direct contact</h2>
        <p>
          Mail of app ons, of start direct met de gratis thuisbatterij
          calculator.
        </p>

        <div className="cta-block-actions">
          <a
            href="mailto:info@batterijenplan.nl"
            className="cta-button cta-button-sm"
          >
            Mail ons
          </a>

          <a
            href={BUSINESS_WHATSAPP_URL}
            className="cta-button cta-button-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            Stuur een WhatsApp
          </a>

          <Link to="/calculator" className="cta-text-link">
            Bereken uw thuisbatterij
          </Link>
        </div>
      </aside>
    </article>
  );
}
