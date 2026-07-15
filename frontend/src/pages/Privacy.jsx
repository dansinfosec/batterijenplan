import { useEffect } from "react";
import { Link } from "react-router-dom";
import { setPageMeta, setJsonLd, ORGANIZATION_SCHEMA } from "../seo.js";
import {
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_PHONE_TEL,
  BUSINESS_WHATSAPP_URL,
} from "../constants.js";

export default function Privacy() {
  useEffect(() => {
    setPageMeta({
      title: "Privacyverklaring — Batterijenplan",
      description:
        "Lees hoe Batterijenplan.nl omgaat met persoonsgegevens, contactaanvragen en calculatorgegevens.",
      path: "/privacy",
    });
    setJsonLd([ORGANIZATION_SCHEMA]);
    window.scrollTo(0, 0);
  }, []);

  return (
    <article className="container post-detail">
      <p className="mono kicker">Privacy · AVG</p>
      <h1>
        Privacy<span className="accent">verklaring</span>
      </h1>

      <div className="prose">
        <p>
          Batterijenplan verwerkt persoonsgegevens die u zelf invult in de
          thuisbatterij-calculator en het adviesformulier: naam,
          telefoonnummer, e-mailadres, en optioneel postcode en bericht.
          Daarnaast bewaren wij de door u ingevulde berekening (verbruik,
          teruglevering en het berekende advies), zodat een specialist uw
          situatie kan beoordelen.
        </p>

        <h2>Waarvoor gebruiken wij uw gegevens?</h2>
        <p>
          Uitsluitend om contact met u op te nemen over uw
          thuisbatterij-berekening, door Batterijenplan en/of Groene Vrienden.
          Wij versturen geen nieuwsbrieven en verkopen uw gegevens niet aan
          derden. U geeft hiervoor expliciet toestemming via het
          aanvinkvakje bij het formulier.
        </p>

        <h2>Bewaartermijn</h2>
        <p>
          Wij bewaren uw aanvraag zolang dat nodig is om uw adviesaanvraag af
          te handelen. Daarna worden uw gegevens verwijderd.
        </p>

        <h2>Uw rechten</h2>
        <p>
          U heeft het recht om uw gegevens in te zien, te laten corrigeren of
          te laten verwijderen, en om uw toestemming in te trekken. Neem
          hiervoor contact met ons op.
        </p>

        <h2>Contact &amp; verwerkingsverantwoordelijke</h2>
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
          <Link to="/calculator">Terug naar de calculator</Link>
        </p>
      </div>
    </article>
  );
}
