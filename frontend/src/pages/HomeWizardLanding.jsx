import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  setPageMeta,
  setJsonLd,
  canonicalUrl,
  SITE_URL,
  DEFAULT_IMAGE,
} from "../seo.js";
import { SMARTMETER_PRIVACY_NOTICE } from "../smartmeter/analysisClient.js";

// ── SEO-landingspagina voor de HomeWizard/slimme-meteranalyse ──────────────
// Doel: organisch verkeer rond "homewizard thuisbatterij" / "homewizard
// batterij" opvangen en doorsturen naar de bestaande calculator, waar de
// echte analyse draait. Dit is GEEN tweede calculator en GEEN blogartikel.
// De pagina legt uit wat HomeWizard-data oplevert, hoe de analyse werkt en
// wat er met het CSV-bestand gebeurt, en linkt naar /calculator.
//
// Intentie-afbakening (geen kannibalisatie van /calculator): deze pagina
// mikt op "homewizard thuisbatterij / homewizard batterij"; /calculator
// houdt "thuisbatterij calculator / thuisbatterij berekenen". Daarom een
// eigen H1 en unieke copy, niet de calculator-titel.

const PAGE_PATH = "/homewizard-thuisbatterij";
const PAGE_TITLE = "HomeWizard thuisbatterij | Bereken met uw slimme-meterdata";
const PAGE_DESCRIPTION =
  "Gebruik uw HomeWizard-data om te zien welke thuisbatterij bij uw verbruik " +
  "en teruglevering past. Analyseer uw kwartierwaarden gratis met Batterijenplan.";

// Voorbeeldkaart in de hero. GEEN verzonnen cijfers en GEEN gebruikersresultaat:
// alle waarden komen uit de bestaande deterministische synthetische
// jaar-fixture (tests/fixtures/smartmeter-analysis-physical.json), de
// vastgelegde fysieke analyse-output van de echte rekenmodule voor het
// synthetische HomeWizard-jaarbestand. De kaart is overal als "voorbeeld"
// gelabeld.
//
// Bronvelden per waarde:
//   Netafname       -> profile.raw_grid_import_kwh (3008.305 -> 3.008 kWh)
//   Teruglevering   -> profile.raw_grid_export_kwh (4008.305 -> 4.008 kWh)
//   Periode         -> profile.observed_days (365)
//   Meetpunten      -> profile.interval_count (35.040)
const DEMO_PROFILE = [
  { label: "Netafname", value: "3.008 kWh" },
  { label: "Teruglevering", value: "4.008 kWh" },
  { label: "Periode", value: "365 dagen" },
];
// Balkwaarde = physical.export_capture_pct per kandidaat uit dezelfde fixture:
// het percentage van de gemeten teruglevering dat de batterij fysiek benut.
// De waarden liggen bewust dicht bij elkaar (export capture vlakt af met de
// grootte); dat is de echte uitkomst, niet gladgestreken voor de visual.
const DEMO_BARS = [
  { id: "T7", pct: 38.1 },
  { id: "T10", pct: 40.8 },
  { id: "T14", pct: 41.3 },
  { id: "T21", pct: 41.6 },
  { id: "T28", pct: 41.8 },
];

// FAQ-inhoud staat één keer hier en voedt zowel de zichtbare weergave als de
// FAQPage-structured data, zodat schema en pagina niet uit elkaar lopen.
const FAQ = [
  {
    q: "Kan ik met HomeWizard berekenen welke thuisbatterij ik nodig heb?",
    a: "Ja. U uploadt uw HomeWizard-export in de calculator. Wij vergelijken meerdere batterijgroottes op basis van uw gemeten netafname en teruglevering en tonen per grootte hoe uw netprofiel zou veranderen. De uitkomst is een onderbouwde indicatie, geen definitief ontwerp.",
  },
  {
    q: "Welke HomeWizard-data gebruikt Batterijenplan?",
    a: "De kwartierwaarden uit uw HomeWizard Energy-export: per interval hoeveel u netto van het net afnam of terugleverde. Op basis daarvan berekenen we hoeveel een batterij fysiek zou kunnen opslaan en later gebruiken.",
  },
  {
    q: "Wordt mijn HomeWizard CSV opgeslagen?",
    a: "Nee. Uw CSV-bestand wordt lokaal in uw browser gelezen. Voor de berekening sturen we alleen de uitgelezen kwartierwaarden tijdelijk naar onze rekenmodule. De meetdata wordt niet opgeslagen en het bestand wordt niet als bestand geüpload.",
  },
  {
    q: "Kan ik dit gebruiken zonder zonnepanelen?",
    a: "Ja. De analyse werkt op uw gemeten netprofiel, ook als u weinig of niet teruglevert. Zonder teruglevering is er alleen minder om op te slaan, dus de uitkomst valt vaak lager uit.",
  },
  {
    q: "Kan HomeWizard mijn thuisbatterij automatisch aansturen?",
    a: "Dat doet Batterijenplan niet. Deze pagina en de calculator gaan over rekenen en vergelijken op basis van uw meetdata, niet over het aansturen van hardware.",
  },
  {
    q: "Berekenen jullie ook handelsopbrengsten?",
    a: "Bij een batterijgrootte tonen we een indicatieve praktijkband voor actieve handel. Die band komt uit gerapporteerde praktijkresultaten per contracttype en is geen garantie en geen resultaat uit uw eigen meetdata. Uw HomeWizard-profiel bepaalt wel de fysieke benutting per batterij.",
  },
  {
    q: "Welke batterijgroottes worden vergeleken?",
    a: "De calculator vergelijkt vijf batterijgroottes van circa 7 tot 28 kWh (Dyness S3 Tower-klassen). Per grootte ziet u de fysieke benutting, het benodigde laad- en ontlaadvermogen en het aantal equivalente cycli op uw eigen profiel.",
  },
];

// Kleine, decoratieve inline-iconen (currentColor, aria-hidden).
const Icon = {
  shield: (
    <path d="M12 2 4 5v6c0 5 3.4 8.3 8 11 4.6-2.7 8-6 8-11V5l-8-3Zm-1.2 13.2-3-3 1.4-1.4 1.6 1.6 4-4 1.4 1.4-5.4 5.4Z" />
  ),
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  chart: (
    <path d="M4 20V4h2v14h14v2H4Zm4-3v-6h2v6H8Zm4 0V7h2v10h-2Zm4 0v-4h2v4h-2Z" />
  ),
};
function Glyph({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false">
      {Icon[name]}
    </svg>
  );
}

export default function HomeWizardLanding() {
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
          {
            "@type": "ListItem",
            position: 2,
            name: "HomeWizard thuisbatterij",
            item: url,
          },
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
    <div className="hw-page">
      {/* ── Hero: tekst links, voorbeeld-datakaart rechts ── */}
      <header className="hw-hero">
        <div className="container hw-hero-grid">
          <div className="hw-hero-text">
            <p className="mono hw-eyebrow">HomeWizard analyse</p>
            <h1>HomeWizard thuisbatterij berekenen met uw meterdata</h1>
            <p className="hw-hero-sub">
              Heeft u een HomeWizard Energy Meter? Gebruik uw eigen meetdata om
              meerdere thuisbatterijgroottes te vergelijken op basis van uw
              werkelijke netafname en teruglevering.
            </p>
            <div className="hw-hero-actions">
              <Link to="/calculator" className="hw-btn hw-btn--primary">
                Analyseer mijn HomeWizard-data
                <span aria-hidden="true" className="hw-btn-arrow">→</span>
              </Link>
            </div>
            <p className="hw-trust mono">
              Gratis · direct resultaat · geen e-mailadres nodig
            </p>
          </div>

          {/* Voorbeeld-datakaart: laat zien wat de analyse oplevert. Alle
              waarden zijn representatief en overal als voorbeeld gelabeld;
              nooit een gebruikersresultaat. */}
          <aside className="hw-preview" aria-label="Voorbeeldweergave van een analyse">
            <div className="hw-preview-head">
              <span className="hw-preview-title">Voorbeeldanalyse</span>
              <span className="hw-preview-tag mono">voorbeeld</span>
            </div>

            <p className="hw-preview-label mono">Uw profiel</p>
            <dl className="hw-preview-profile">
              {DEMO_PROFILE.map((row) => (
                <div key={row.label} className="hw-preview-row">
                  <dt>{row.label}</dt>
                  <dd className="mono">{row.value}</dd>
                </div>
              ))}
              <div className="hw-preview-row hw-preview-row--sub">
                <dt>Meetpunten</dt>
                <dd className="mono">35.040 kwartierwaarden</dd>
              </div>
            </dl>

            <p className="hw-preview-label mono">Teruglevering fysiek benut</p>
            <div className="hw-preview-bars">
              {DEMO_BARS.map((b) => (
                <div key={b.id} className="hw-bar-row">
                  <span className="hw-bar-name mono">{b.id}</span>
                  <span className="hw-bar-track">
                    <span className="hw-bar-fill" style={{ width: `${b.pct}%` }} />
                  </span>
                  <span className="hw-bar-val mono">{String(b.pct).replace(".", ",")}%</span>
                </div>
              ))}
            </div>
            <p className="hw-preview-foot mono">
              Voorbeeldweergave · aandeel van de teruglevering dat de batterij
              fysiek benut, per batterijgrootte
            </p>
          </aside>
        </div>
      </header>

      <div className="container hw-body">
        {/* ── Wat levert HomeWizard-data op? ── */}
        <section className="hw-section">
          <p className="hw-section-eyebrow mono">Wat het toevoegt</p>
          <h2>Wat kunt u met HomeWizard-data berekenen?</h2>
          <p className="hw-lead">
            Een HomeWizard-export bevat metingen per kwartier. Daarmee kunnen we
            zien hoe uw netafname en teruglevering over de dag en het jaar
            variëren, in plaats van alleen met een jaartotaal te rekenen. Dat
            maakt de vergelijking tussen batterijgroottes concreter voor uw
            situatie.
          </p>

          {/* Vergelijkingsmodule: snelle berekening vs HomeWizard-analyse.
              HomeWizard is de uitgelichte route, zonder de snelle berekening
              af te doen als slecht. */}
          <div className="hw-versus">
            <div className="hw-versus-card">
              <p className="hw-versus-eyebrow mono">Snelle berekening</p>
              <p className="hw-versus-lead">Jaarcijfers</p>
              <ul className="hw-check">
                <li>Jaarlijks verbruik en teruglevering</li>
                <li>Eerste indicatie van een passende capaciteit</li>
                <li>Binnen een minuut een richting</li>
              </ul>
            </div>
            <div className="hw-versus-vs mono" aria-hidden="true">vs</div>
            <div className="hw-versus-card hw-versus-card--accent">
              <p className="hw-versus-eyebrow mono">
                <span className="hw-versus-badge">Aanbevolen</span> HomeWizard-analyse
              </p>
              <p className="hw-versus-lead">Uw kwartierprofiel</p>
              <ul className="hw-check hw-check--accent">
                <li>Uw werkelijke intervalwaarden</li>
                <li>Fysieke vergelijking van meerdere batterijgroottes</li>
                <li>Inzicht in benutting en cycli</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Wat doet de batterijanalyse? ── */}
        <section className="hw-section">
          <p className="hw-section-eyebrow mono">Batterijprofiel</p>
          <h2>Welke thuisbatterij past bij uw HomeWizard-profiel?</h2>
          <p className="hw-lead">
            De analyse vergelijkt de huidige batterijklassen van de calculator:
            vijf groottes van circa 7 tot 28 kWh. Per grootte rekenen we op uw
            eigen profiel door hoe de batterij zich fysiek zou gedragen.
          </p>
          <div className="hw-feature-grid">
            <div className="hw-feature">
              <span className="hw-feature-ic"><Glyph name="bolt" /></span>
              <p>Hoeveel van uw teruglevering een batterij fysiek zou opslaan en later gebruiken.</p>
            </div>
            <div className="hw-feature">
              <span className="hw-feature-ic"><Glyph name="chart" /></span>
              <p>Hoeveel netafname daardoor zou dalen.</p>
            </div>
            <div className="hw-feature">
              <span className="hw-feature-ic"><Glyph name="bolt" /></span>
              <p>Hoe goed de capaciteit wordt benut, met het benodigde laad- en ontlaadvermogen.</p>
            </div>
            <div className="hw-feature">
              <span className="hw-feature-ic"><Glyph name="chart" /></span>
              <p>Het aantal equivalente volledige cycli over uw meetperiode.</p>
            </div>
          </div>
          <p className="hw-note">
            De indicatieve praktijkband voor actieve handel die u per grootte
            ziet, komt uit gerapporteerde praktijkresultaten. Die band is geen
            resultaat uit uw eigen meetdata en geen garantie.
          </p>
        </section>

        {/* ── Methodologie / grenzen ── */}
        <section className="hw-section">
          <p className="hw-section-eyebrow mono">Methodologie</p>
          <h2>Wat uw meterdata wel en niet laat zien</h2>
          <p className="hw-lead">
            Uw meterdata laat zien wanneer u netto stroom afneemt of
            teruglevert. Daarmee kunnen we berekenen hoeveel van die netto
            teruglevering een batterij fysiek zou kunnen opslaan en later
            gebruiken om netto afname te verminderen. Het P1-signaal toont
            alleen dit netto verkeer op de aansluiting: het bewijst niet hoeveel
            uw huishouden bruto verbruikt of hoeveel uw zonnepanelen bruto
            opwekken.
          </p>
          <div className="hw-methodology">
            <div className="hw-method-card">
              <p className="hw-method-tag mono">Gemeten / profielgebaseerd</p>
              <p>
                Uw geüploade netafname en teruglevering per interval, de fysieke
                batterijsimulatie en de vergelijking tussen de batterijgroottes.
              </p>
            </div>
            <div className="hw-method-card">
              <p className="hw-method-tag mono">Gerapporteerde praktijk</p>
              <p>
                Handelsbanden uit gerapporteerde externe praktijkgevallen. Niet
                berekend uit uw profiel, geen betrouwbaarheidsinterval en geen
                gegarandeerde opbrengst.
              </p>
            </div>
            <div className="hw-method-card">
              <p className="hw-method-tag mono">Optioneel model</p>
              <p>
                Een optionele zelfconsumptie- of 2027-berekening. Dit is een
                modelresultaat en wordt apart als model getoond, niet
                samengevoegd met de rest.
              </p>
            </div>
          </div>
          <p className="hw-note">
            Deze drie soorten uitkomsten blijven bewust gescheiden. Ze worden
            niet tot één europroef samengevoegd.
          </p>
          <div className="hw-inline-cta">
            <Link to="/calculator" className="hw-btn hw-btn--ghost">
              Bereken met mijn meterdata
              <span aria-hidden="true" className="hw-btn-arrow">→</span>
            </Link>
          </div>
        </section>

        {/* ── Privacy ── */}
        <section className="hw-section">
          <p className="hw-section-eyebrow mono">Privacy</p>
          <div className="hw-privacy">
            <span className="hw-privacy-ic"><Glyph name="shield" /></span>
            <div className="hw-privacy-body">
              <h2>Wat gebeurt er met mijn HomeWizard CSV?</h2>
              <p>{SMARTMETER_PRIVACY_NOTICE}</p>
              <ul className="hw-check">
                <li>Het originele CSV-bestand wordt niet als bestand geüpload of opgeslagen.</li>
                <li>De losse kwartierwaarden worden niet aan een adviesaanvraag gehangen.</li>
                <li>
                  Alleen een compacte samenvatting kan meegaan met een
                  adviesaanvraag, en uitsluitend nadat u daar zelf voor kiest.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── In 3 stappen ── */}
        <section className="hw-section">
          <p className="hw-section-eyebrow mono">Zo werkt het</p>
          <h2>HomeWizard thuisbatterij berekenen in 3 stappen</h2>
          <ol className="hw-steps">
            <li className="hw-step">
              <span className="hw-step-n mono">01</span>
              <p className="hw-step-title">Exporteer uw CSV</p>
              <p className="hw-step-text">Haal uw historische meetgegevens uit de HomeWizard Energy-app als CSV-bestand.</p>
            </li>
            <li className="hw-step">
              <span className="hw-step-n mono">02</span>
              <p className="hw-step-title">Upload in Batterijenplan</p>
              <p className="hw-step-text">Open de calculator, kies de route met slimme-meterdata en selecteer HomeWizard.</p>
            </li>
            <li className="hw-step">
              <span className="hw-step-n mono">03</span>
              <p className="hw-step-title">Vergelijk batterijgroottes</p>
              <p className="hw-step-text">Bekijk per grootte de fysieke benutting en cycli op uw eigen profiel.</p>
            </li>
          </ol>
        </section>

        {/* ── FAQ ── */}
        <section className="hw-section hw-faq">
          <p className="hw-section-eyebrow mono">Veelgestelde vragen</p>
          <h2>HomeWizard en thuisbatterijen</h2>
          <div className="calc-faq-list">
            {FAQ.map((item) => (
              <details className="calc-faq-item" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Meer lezen (interne links) ── */}
        <section className="hw-section">
          <p className="hw-section-eyebrow mono">Meer lezen</p>
          <h2>Meer over thuisbatterijen</h2>
          <div className="related-posts-grid">
            <Link to="/post/wat-levert-een-thuisbatterij-op" className="related-post-card">
              <h3>Wat levert een thuisbatterij op?</h3>
              <p>De variabelen achter opbrengst en terugverdientijd, met praktijkdata.</p>
              <span className="related-post-link">Lees meer →</span>
            </Link>
            <Link to="/post/thuisbatterij-vergelijken" className="related-post-card">
              <h3>Thuisbatterij vergelijken</h3>
              <p>Waar u op let bij capaciteit, vermogen, EMS en installatie.</p>
              <span className="related-post-link">Lees meer →</span>
            </Link>
            <Link to="/post/dynamisch-energiecontract-thuisbatterij" className="related-post-card">
              <h3>Dynamisch contract en thuisbatterij</h3>
              <p>Hoe dynamische prijzen, sturing en opslag samenwerken.</p>
              <span className="related-post-link">Lees meer →</span>
            </Link>
          </div>
        </section>
      </div>

      {/* ── Slot-CTA: volle-breedte contrastband ── */}
      <section className="hw-final">
        <div className="container hw-final-inner">
          <div className="hw-final-text">
            <h2>Klaar om uw eigen profiel te analyseren?</h2>
            <p>
              Gebruik uw HomeWizard-export en vergelijk meerdere
              batterijgroottes op uw eigen meetprofiel.
            </p>
          </div>
          <Link to="/calculator" className="hw-btn hw-btn--primary hw-btn--onDark">
            Start de gratis analyse
            <span aria-hidden="true" className="hw-btn-arrow">→</span>
          </Link>
        </div>
      </section>

      <div className="container">
        <p className="hw-trademark">
          HomeWizard is een handelsmerk van de betreffende rechthebbende.
          Batterijenplan is niet gelieerd aan HomeWizard.
        </p>
      </div>
    </div>
  );
}
