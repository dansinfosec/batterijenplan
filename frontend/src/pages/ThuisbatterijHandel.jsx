import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  setPageMeta,
  setJsonLd,
  canonicalUrl,
  SITE_URL,
  DEFAULT_IMAGE,
} from "../seo.js";

// ── Dedicated SEO/conversion landing page voor "thuisbatterij handel" ──────
// Doel: organisch verkeer op batterijhandel/EMS/dynamisch-contract-intentie
// opvangen en doorsturen naar /calculator. Dit is GEEN blogpost (geen
// auteur/datum/tags/CMS-body) en GEEN tweede calculator — de berekening zelf
// blijft in /calculator. Volgt hetzelfde patroon als HomeWizardLanding.jsx:
// eigen H1/copy, eigen route, eigen meta, link naar de bestaande calculator.
//
// Intentie-afbakening: deze pagina mikt op "thuisbatterij handel / EMS /
// dynamisch contract"; /calculator blijft "thuisbatterij calculator /
// berekenen"; de artikelen waarnaar wordt gelinkt behandelen de losse
// deelonderwerpen in de diepte. Geen cijfers die niet al elders op de site
// staan (het indicatieve "tot ongeveer €150 per maand in gunstige situaties"
// komt uit het gepubliceerde Radar-artikel en wordt hier bewust met dezelfde
// bewoording herhaald, niet als nieuw resultaat gepresenteerd).

const PAGE_PATH = "/thuisbatterij-handel";
const PAGE_TITLE = "Thuisbatterij handel | Verdienen met EMS en dynamisch contract";
const PAGE_DESCRIPTION =
  "Lees hoe thuisbatterij handel werkt met EMS-sturing en een dynamisch " +
  "energiecontract. Ontdek wanneer batterijhandel interessant kan zijn en " +
  "bereken uw capaciteit.";

const WHEN_INTERESTING = [
  "u heeft zonnepanelen",
  "u levert jaarlijks veel stroom terug",
  "u heeft, of overweegt, een dynamisch energiecontract",
  "uw batterijcapaciteit past bij uw teruglevering",
  "uw systeem beschikt over EMS-sturing",
  "uw meterkast, omvormer en netaansluiting zijn geschikt",
  "de verwachte opbrengst wordt realistisch doorgerekend",
];

const WHEN_LESS_INTERESTING = [
  "u levert weinig stroom terug aan het net",
  "uw batterij is te klein of juist te groot voor uw profiel",
  "er is geen EMS-sturing aanwezig",
  "u heeft geen dynamisch energiecontract",
  "uw technische aansluiting is beperkt",
  "uw verwachtingen zijn gebaseerd op algemene verkooppraatjes",
];

// FAQ-inhoud staat één keer hier en voedt zowel de zichtbare weergave als de
// FAQPage-structured data.
const FAQ = [
  {
    q: "Is thuisbatterij handel rendabel?",
    a: "Dat kan, afhankelijk van uw situatie. Bij veel teruglevering, een dynamisch energiecontract en goede EMS-sturing kan batterijhandel in gunstige situaties een aantrekkelijk maandvoordeel opleveren. Er is geen garantie op een vast rendement: het resultaat hangt altijd af van uw eigen woning en energieprofiel.",
  },
  {
    q: "Heb ik een dynamisch energiecontract nodig?",
    a: "Voor batterijhandel is een dynamisch energiecontract vrijwel altijd nodig, omdat alleen dan de prijsverschillen gedurende de dag ontstaan waarop een EMS-systeem kan sturen. Zonder dynamisch contract blijft uw batterij vooral een opslagmiddel.",
  },
  {
    q: "Wat doet een EMS-systeem?",
    a: "Een EMS-systeem (energiemanagementsysteem) bepaalt automatisch wanneer uw batterij het beste kan laden of ontladen, op basis van uw verbruik, uw zonneopwek, de actuele stroomprijs en de laadtoestand van de batterij.",
  },
  {
    q: "Kan iedere thuisbatterij handelen?",
    a: "Nee. Een eenvoudige plug-in batterij is vooral gericht op basisopslag en heeft meestal geen volwaardige EMS-sturing. Een professioneel geïnstalleerd systeem met EMS en een passende omvormer is beter geschikt voor batterijhandel.",
  },
  {
    q: "Waarom is teruglevering belangrijk?",
    a: "Uw teruglevering laat zien hoeveel overtollige zonnestroom er beschikbaar is om op te slaan of slim in te zetten. Alleen naar uw jaarverbruik kijken geeft geen volledig beeld van wat een thuisbatterij voor u kan betekenen.",
  },
  {
    q: "Hoe weet ik welke batterijcapaciteit ik nodig heb?",
    a: "Bereken dit gratis met de calculator van Batterijenplan. Wij kijken naar uw jaarverbruik, uw jaarlijkse teruglevering en de teruglevering per zonnige dag, en geven een eerste indicatie van de batterijcapaciteit die bij uw situatie past.",
  },
];

export default function ThuisbatterijHandel() {
  useEffect(() => {
    setPageMeta({
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      path: PAGE_PATH,
      image: DEFAULT_IMAGE,
    });

    const url = canonicalUrl(PAGE_PATH);
    setJsonLd([
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: PAGE_TITLE,
        description: PAGE_DESCRIPTION,
        url,
        inLanguage: "nl-NL",
        isPartOf: { "@type": "WebSite", name: "Batterijenplan.nl", url: SITE_URL },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Thuisbatterij handel", item: url },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ]);

    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="thb-page">
      {/* ── Hero: tekst links, compacte uitlegkaart rechts ── */}
      <header className="hw-hero">
        <div className="container hw-hero-grid">
          <div className="hw-hero-text">
            <p className="mono hw-eyebrow">Batterijhandel</p>
            <h1>Thuisbatterij handel: slim laden en ontladen met EMS</h1>
            <p className="hw-hero-sub">
              Handelen met een thuisbatterij draait niet alleen om stroom
              opslaan. Het gaat om slim laden wanneer stroom goedkoop is en
              gebruiken of ontladen wanneer stroom duur is. Met een dynamisch
              energiecontract en EMS-sturing kan een thuisbatterij meer doen
              dan alleen eigen zonnestroom bewaren.
            </p>
            <div className="hw-hero-actions">
              <Link to="/calculator" className="hw-btn hw-btn--primary">
                Bereken mijn batterijcapaciteit
                <span aria-hidden="true" className="hw-btn-arrow">→</span>
              </Link>
            </div>
            <p className="hw-trust mono">
              <Link to="/post/dynamisch-energiecontract-thuisbatterij">
                Lees hoe dynamische sturing werkt →
              </Link>
            </p>
          </div>

          <aside className="hw-preview" aria-label="Hoe batterijhandel werkt">
            <div className="hw-preview-head">
              <span className="hw-preview-title">Zo werkt batterijhandel</span>
              <span className="hw-preview-tag mono">in het kort</span>
            </div>

            <ol className="thb-preview-steps">
              <li>
                <span className="thb-preview-n mono">01</span>
                Batterij laadt wanneer stroom goedkoop is
              </li>
              <li>
                <span className="thb-preview-n mono">02</span>
                Batterij ontlaadt of levert stroom wanneer het duur is
              </li>
              <li>
                <span className="thb-preview-n mono">03</span>
                EMS bepaalt dit automatisch op basis van prijs, verbruik en opwek
              </li>
            </ol>
            <p className="hw-preview-foot mono">
              Zonder EMS-sturing en dynamisch contract is een batterij vooral
              opslag, geen handelssysteem.
            </p>
          </aside>
        </div>
      </header>

      <div className="container hw-body">
        {/* ── Sectie 1 ── */}
        <section className="hw-section">
          <p className="hw-section-eyebrow mono">Basis</p>
          <h2>Wat is thuisbatterij handel?</h2>
          <p className="hw-lead">
            Bij batterijhandel laadt uw batterij op momenten dat stroom
            goedkoop is, en ontlaadt of gebruikt hij die stroom op momenten
            dat stroom duur is. Omdat dynamische energieprijzen per uur
            verschillen, is de timing van laden en ontladen bepalend voor het
            resultaat. Een EMS-systeem automatiseert die timing. Dat maakt
            batterijhandel iets anders dan eenvoudige opslag, waarbij een
            batterij vooral overtollige zonnestroom bewaart voor later
            gebruik zonder actief op prijsverschillen te sturen.
          </p>
        </section>

        {/* ── Sectie 2 ── */}
        <section className="hw-section">
          <p className="hw-section-eyebrow mono">Sturing</p>
          <h2>Waarom EMS-sturing het verschil maakt</h2>
          <p className="hw-lead">
            Zonder EMS is een batterij vooral een opslagmiddel. Met EMS wordt
            de batterij onderdeel van een slim energiesysteem. Het EMS
            gebruikt uw zonneproductie, uw verbruik, actuele prijsdata en de
            laadtoestand van de batterij om automatisch te bepalen wanneer
            laden of ontladen het meeste oplevert. Zo voorkomt u verkeerde
            timing en wordt het laden en ontladen van uw batterij continu
            geoptimaliseerd, in plaats van handmatig of op een vast schema.
          </p>
        </section>

        {/* ── Sectie 3 ── */}
        <section className="hw-section">
          <p className="hw-section-eyebrow mono">Contract</p>
          <h2>Dynamisch energiecontract en thuisbatterij</h2>
          <p className="hw-lead">
            Bij een dynamisch energiecontract verandert de stroomprijs per
            uur. Een slim aangestuurde batterij kan op die prijsverschillen
            reageren: laden wanneer de prijs laag is, ontladen of gebruiken
            wanneer de prijs hoog is. Zonder dynamisch contract ontstaan deze
            prijsverschillen niet, en heeft EMS-sturing dus ook minder om op
            te sturen.
          </p>
          <p className="hw-lead">
            <Link to="/post/dynamisch-energiecontract-thuisbatterij">
              Lees meer over dynamische energiecontracten en thuisbatterijen →
            </Link>
          </p>
        </section>

        {/* ── Sectie 4 + 5: wanneer wel/minder interessant, als paar ── */}
        <section className="hw-section thb-when">
          <p className="hw-section-eyebrow mono">Afweging</p>
          <div className="thb-when-grid">
            <div className="thb-when-card thb-when-card--good">
              <h2>Wanneer is batterijhandel interessant?</h2>
              <ul className="hw-check hw-check--accent">
                {WHEN_INTERESTING.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="thb-when-card thb-when-card--muted">
              <h2>Wanneer is batterijhandel minder interessant?</h2>
              <ul className="hw-check">
                {WHEN_LESS_INTERESTING.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Sectie 6 ── */}
        <section className="hw-section">
          <p className="hw-section-eyebrow mono">Vergelijking</p>
          <h2>Plug-in batterij versus slim EMS-systeem</h2>
          <p className="hw-lead">
            Een plug-in batterij kan nuttig zijn voor eenvoudige opslag: u
            sluit hem aan en hij helpt een deel van uw eigen zonnestroom te
            gebruiken. Dat is niet automatisch hetzelfde als een
            handelssysteem. Een professioneel geïnstalleerd EMS-systeem met
            een passende omvormer heeft een duidelijker handelsmodel, omdat
            het actief kan sturen op dynamische prijzen.
          </p>
          <div className="post-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Onderdeel</th>
                  <th>Plug-in batterij</th>
                  <th>Slim EMS-systeem</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Doel</td>
                  <td>Eenvoudige opslag</td>
                  <td>Opslag én slimme sturing</td>
                </tr>
                <tr>
                  <td>Aansturing</td>
                  <td>Beperkt of basis</td>
                  <td>EMS-sturing op prijzen en verbruik</td>
                </tr>
                <tr>
                  <td>Vermogen</td>
                  <td>Beperkt door stopcontact en systeem</td>
                  <td>Afgestemd op omvormer, meterkast en aansluiting</td>
                </tr>
                <tr>
                  <td>Dynamisch contract</td>
                  <td>Vaak beperkt benut</td>
                  <td>Actief laden en ontladen op prijsmomenten</td>
                </tr>
                <tr>
                  <td>Verdienmodel</td>
                  <td>Vooral meer eigen verbruik</td>
                  <td>Eigen verbruik plus dynamische handel</td>
                </tr>
                <tr>
                  <td>Geschikt voor handel?</td>
                  <td>Meestal beperkt</td>
                  <td>Ja, mits goed berekend en aangestuurd</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="hw-lead">
            <Link to="/post/thuisbatterij-handel-radar-slimme-sturing">
              Lees het volledige verschil tussen plug-in batterijen en slimme sturing →
            </Link>
          </p>
        </section>

        {/* ── Sectie 7 ── */}
        <section className="hw-section">
          <p className="hw-section-eyebrow mono">Methode</p>
          <h2>Hoe berekent Batterijenplan batterijhandel?</h2>
          <p className="hw-lead">
            Wij kijken niet alleen naar uw jaarverbruik. Wij kijken ook naar
            uw jaarlijkse teruglevering en naar uw teruglevering per zonnige
            dag, en bepalen op basis daarvan of het doel vooral
            zelfconsumptie is of dat dynamische handel kansrijk kan zijn. Op
            basis daarvan berekenen wij een passende batterijcapaciteit. Een
            specialist kan uw uitkomst daarna gratis controleren.
          </p>
        </section>

        {/* ── CTA-blok ── */}
        <aside className="cta-block">
          <h2>Bereken gratis uw thuisbatterijcapaciteit</h2>
          <p>
            Vul uw verbruik en teruglevering in en ontvang direct een eerste
            indicatie van de batterijcapaciteit die past bij uw situatie.
          </p>
          <div className="cta-block-actions">
            <Link className="cta-button cta-button-sm" to="/calculator">
              Start de calculator
            </Link>
          </div>
        </aside>

        {/* ── Sectie 8: FAQ ── */}
        <section className="hw-section hw-faq">
          <p className="hw-section-eyebrow mono">Veelgestelde vragen</p>
          <h2>Veelgestelde vragen over thuisbatterij handel</h2>
          <div className="calc-faq-list">
            {FAQ.map((item) => (
              <details className="calc-faq-item" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Sectie 9: gerelateerde artikelen ── */}
        <section className="hw-section">
          <p className="hw-section-eyebrow mono">Meer lezen</p>
          <h2>Meer over thuisbatterij handel</h2>
          <div className="related-posts-grid">
            <Link to="/post/dynamisch-energiecontract-thuisbatterij" className="related-post-card">
              <h3>Dynamisch contract en thuisbatterij</h3>
              <p>Hoe dynamische prijzen, sturing en opslag samenwerken.</p>
              <span className="related-post-link">Lees meer →</span>
            </Link>
            <Link to="/post/ems-systeem-thuisbatterij-controle-over-stroom" className="related-post-card">
              <h3>EMS-systeem: wie heeft controle</h3>
              <p>Wat een energiemanagementsysteem doet en waarom dat uitmaakt.</p>
              <span className="related-post-link">Lees meer →</span>
            </Link>
            <Link to="/post/thuisbatterij-vergelijken" className="related-post-card">
              <h3>Thuisbatterij vergelijken</h3>
              <p>Waar u op let bij capaciteit, vermogen, EMS en installatie.</p>
              <span className="related-post-link">Lees meer →</span>
            </Link>
            <Link to="/post/warmtefonds-thuisbatterij-lening" className="related-post-card">
              <h3>Warmtefonds thuisbatterij lening</h3>
              <p>Financieringsmogelijkheden voor een thuisbatterij.</p>
              <span className="related-post-link">Lees meer →</span>
            </Link>
          </div>
        </section>
      </div>

      {/* ── Slot-CTA: volle-breedte contrastband ── */}
      <section className="hw-final">
        <div className="container hw-final-inner">
          <div className="hw-final-text">
            <h2>Klaar om te berekenen wat bij u past?</h2>
            <p>
              Bereken gratis welke batterijcapaciteit bij uw teruglevering en
              energiecontract past.
            </p>
          </div>
          <Link to="/calculator" className="hw-btn hw-btn--primary hw-btn--onDark">
            Bereken mijn batterijcapaciteit
            <span aria-hidden="true" className="hw-btn-arrow">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
