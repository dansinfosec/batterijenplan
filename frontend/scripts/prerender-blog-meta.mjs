// Post-build script (draait na `vite build`, zie package.json).
//
// WhatsApp/Facebook/LinkedIn voeren geen JavaScript uit en lezen alleen de
// initiële HTML. Dit script genereert daarom per gepubliceerde blogpost een
// statisch dist/post/<slug>/index.html met de juiste meta tags, canonical en
// BlogPosting JSON-LD. De pagina laadt verder gewoon dezelfde React-app.
// Daarnaast genereert het dist/sitemap.xml.
//
// Vereist Node 18+ (globale fetch). Geen npm dependencies.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// www is de canonieke variant, site-breed (homepage, statische pagina's,
// sitemap én blogposts): scrapers (m.n. WhatsApp) volgen anders eerst een
// redirect en vallen soms terug op verouderde/homepage-metadata. Voorheen
// gebruikten blogposts al www (POST_URL_BASE) terwijl de sitemap en de
// overige statische pagina's nog non-www gebruikten — dat was inconsistent;
// nu overal dezelfde constante.
const SITE_URL = "https://www.batterijenplan.nl";
const SITE_NAME = "Batterijenplan.nl";
const API_URL = process.env.PRERENDER_API_URL || "https://api.batterijenplan.nl/api/posts/";
const DEFAULT_DESCRIPTION =
  "Onafhankelijk inzicht in thuisbatterijen: gratis calculator, praktijkdata en heldere vergelijkingen. Bereken welke batterijcapaciteit bij uw woning past.";

const META_START = "<!-- seo:meta:start";
const META_END = "<!-- seo:meta:end -->";

// De statische homepage-shell hoort niet in blogpost-HTML; die is alleen
// bedoeld voor de first paint van "/".
const SHELL_START = "<!-- home-shell:start";
const SHELL_END = "<!-- home-shell:end -->";

function stripHomeShell(html) {
  const start = html.indexOf(SHELL_START);
  const end = html.indexOf(SHELL_END);
  if (start === -1 || end === -1) {
    // Niet fataal: het inline guard-script verwijdert de shell anders alsnog
    // op niet-home paden, maar meld het wel.
    console.warn(
      "Waarschuwing: home-shell markers niet gevonden in dist/index.html; shell blijft in blogpost-HTML staan.",
    );
    return html;
  }
  return html.slice(0, start) + html.slice(end + SHELL_END.length);
}

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");

// ── Statische SEO-fallback voor de hoofdpagina's ─────────────────────────
// SPA-routes leverden crawlers alleen de lege Vite-shell (±33 woorden). We
// injecteren route-specifieke, Nederlandse tekst ín #root: crawlbaar in de
// ruwe HTML en door React vervangen bij het mounten (createRoot().render()
// leegt #root). Geen fixed overlay, dus geen CLS. De blogpost-shell blijft
// ongemoeid.
const SEO_STYLE =
  "max-width:820px;margin:0 auto;padding:40px 20px;" +
  "font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;" +
  "color:#12130F;line-height:1.7";

function seoWrap(inner) {
  return `<div class="seo-fallback" style="${SEO_STYLE}">\n${inner}\n      </div>`;
}

// Let op: dit blok staat in dezelfde HTML als de statische homepage-shell,
// die al een <h1> bevat. Daarom h2 als hoogste kop hier: de pagina houdt zo
// precies één H1.
const HOMEPAGE_BODY = seoWrap(`        <h2>Thuisbatterij calculator en onafhankelijk batterijadvies</h2>
        <p>Batterijenplan.nl helpt Nederlandse huiseigenaren met heldere, onafhankelijke informatie over thuisbatterijen, batterijopslag en energieopslag. Steeds meer huishoudens met zonnepanelen willen hun opgewekte stroom niet langer goedkoop terugleveren aan het net, maar zelf gebruiken op het moment dat het uitkomt. Een thuisbatterij maakt dat mogelijk.</p>
        <h3>Zonnestroom opslaan en minder terugleveren</h3>
        <p>Met een thuisbatterij slaat u overdag opgewekte zonne-energie op om die 's avonds te gebruiken. Zo verhoogt u uw eigen verbruik, levert u minder terug aan het net en bent u beter voorbereid op het einde van de salderingsregeling. Wij leggen in begrijpelijke taal uit hoe dat werkt, zonder verkooppraat en met echte getallen.</p>
        <h3>Thuisbatterij vergelijken: capaciteit, omvormer, EMS en installatie</h3>
        <p>Een goede keuze draait om meer dan alleen de prijs. Wij helpen u de batterijcapaciteit, de omvormer, het energiemanagementsysteem (EMS) en de installatie te vergelijken, zodat het systeem past bij uw verbruik, uw zonnepanelen en uw energiedoel. Lees in ons artikel <a href="/post/thuisbatterij-vergelijken">thuisbatterij vergelijken</a> waar u op moet letten.</p>
        <h3>Batterijopslag bij een dynamisch energiecontract</h3>
        <p>Heeft u een dynamisch energiecontract? Dan kan een thuisbatterij ook worden ingezet om slim te sturen op wisselende stroomprijzen: opladen wanneer stroom goedkoop is, gebruiken of terugleveren wanneer de prijs hoog staat. Zo haalt u meer waarde uit uw batterijopslag dan met alleen zelfconsumptie.</p>
        <h3>Gratis thuisbatterij calculator en adviesaanvraag</h3>
        <p>Met onze gratis thuisbatterij calculator berekent u op basis van uw jaarlijkse stroomverbruik en teruglevering welke batterijcapaciteit bij u past. Het resultaat is een eerste indicatie. Wilt u meer zekerheid? Vraag dan gratis een controle aan bij een specialist, die uw berekening en situatie persoonlijk bekijkt.</p>
        <p><a href="/calculator">Bereken uw thuisbatterij</a> of <a href="/contact">neem contact met ons op</a> voor advies.</p>`);

const CALCULATOR_BODY = seoWrap(`        <h1>Thuisbatterij Calculator</h1>
        <p>Met de gratis thuisbatterij calculator van Batterijenplan.nl berekent u welke batterijcapaciteit past bij uw woning en energieverbruik. U kunt snel rekenen met uw jaarcijfers, of nauwkeuriger met uw echte HomeWizard slimme-meterdata. U ziet het resultaat direct, zonder e-mailadres.</p>
        <h2>Welke thuisbatterij heb ik nodig?</h2>
        <p>De passende capaciteit hangt af van uw netafname, uw teruglevering, het moment waarop u stroom gebruikt en uw doel: eigen zonnestroom benutten of sturen op dynamische prijzen. Ook het beschikbare laad- en ontlaadvermogen speelt mee. De calculator vertaalt deze factoren naar een capaciteitsrange die bij uw situatie past.</p>
        <h2>Thuisbatterij capaciteit berekenen</h2>
        <p>U kunt op twee manieren rekenen. De snelle berekening gebruikt uw jaarlijkse stroomverbruik en teruglevering en geeft binnen een minuut een eerste indicatie. De slimme-meterroute analyseert uw werkelijke kwartierdata en vergelijkt meerdere batterijgroottes op basis van uw eigen profiel.</p>
        <h2>Berekenen met HomeWizard slimme-meterdata</h2>
        <p>Exporteert u uw meetdata uit de HomeWizard Energy-app, dan leest uw browser het CSV-bestand lokaal. Voor de berekening gaan alleen de uitgelezen kwartierwaarden tijdelijk naar onze rekenmodule. U ziet uw afname- en terugleverprofiel, een vergelijking van meerdere batterijgroottes en een aparte indicatie op basis van gerapporteerde praktijkresultaten. Uw CSV-bestand wordt niet opgeslagen.</p>
        <h2>Thuisbatterij berekenen zonder zonnepanelen</h2>
        <p>Ook zonder zonnepanelen kunt u rekenen. De calculator vraagt dan naar uw verbruik, uw energiecontract en uw doel, en geeft een eerste indicatie voor situaties zoals dynamische sturing of zakelijk energiebeheer.</p>
        <h2>Een indicatie, geen definitief ontwerp</h2>
        <p>De uitkomst van de calculator is nadrukkelijk een indicatie en geen definitief ontwerp. Voor een nauwkeurig advies spelen ook uw zonnepanelen, netaansluiting, omvormervermogen, energiecontract en toekomstig verbruik een rol. Een specialist kan uw uitkomst gratis controleren.</p>
        <p><a href="/contact">Vraag gratis advies aan</a> als u uw berekening wilt laten controleren.</p>`);

// Statische crawlbare tekst voor de HomeWizard-landingspagina (React vervangt
// dit bij mount). Spiegelt de kerncopy van src/pages/HomeWizardLanding.jsx;
// exact één H1, uniek van /calculator. Geen em-dash-stijl.
const HOMEWIZARD_BODY = seoWrap(`        <h1>HomeWizard thuisbatterij berekenen met uw meterdata</h1>
        <p>Heeft u een HomeWizard Energy Meter? Gebruik uw eigen meetdata om verschillende thuisbatterijgroottes te vergelijken op basis van uw werkelijke netafname en teruglevering. De analyse zelf draait in de gratis <a href="/calculator">thuisbatterij calculator</a>.</p>
        <h2>Wat kunt u met HomeWizard-data berekenen?</h2>
        <p>Een HomeWizard-export bevat metingen per kwartier. Daarmee kunnen we zien hoe uw netafname en teruglevering over de dag en het jaar variëren, in plaats van alleen met een jaartotaal te rekenen. De snelle berekening gebruikt jaarcijfers voor een eerste indicatie; de HomeWizard-route gebruikt uw werkelijke kwartierprofiel en vergelijkt meerdere batterijgroottes tegen uw gemeten netprofiel.</p>
        <h2>Welke thuisbatterij past bij uw HomeWizard-profiel?</h2>
        <p>De analyse vergelijkt de huidige batterijklassen van de calculator: vijf groottes van circa 7 tot 28 kWh. Per grootte rekenen we door hoeveel van uw teruglevering een batterij fysiek zou opslaan en later gebruiken, hoeveel netafname daardoor daalt, hoe goed de capaciteit wordt benut en het aantal equivalente cycli op uw eigen profiel. De indicatieve praktijkband voor actieve handel komt uit gerapporteerde praktijkresultaten en is geen resultaat uit uw eigen meetdata en geen garantie.</p>
        <h2>Wat uw meterdata wel en niet laat zien</h2>
        <p>Uw meterdata laat zien wanneer u netto stroom afneemt of teruglevert. Daarmee berekenen we hoeveel van die netto teruglevering een batterij fysiek zou kunnen opslaan en later gebruiken om netto afname te verminderen. Het P1-signaal toont alleen dit netto verkeer op de aansluiting: het bewijst niet hoeveel uw huishouden bruto verbruikt of hoeveel uw zonnepanelen bruto opwekken.</p>
        <h2>Wat gebeurt er met mijn HomeWizard CSV?</h2>
        <p>Uw CSV-bestand wordt lokaal in uw browser gelezen. Voor de berekening sturen we alleen de uitgelezen kwartierwaarden tijdelijk naar onze rekenmodule. De meetdata wordt niet opgeslagen en het bestand wordt niet als bestand geüpload. De losse kwartierwaarden gaan niet mee met een adviesaanvraag; alleen een compacte samenvatting kan meegaan nadat u daar zelf voor kiest.</p>
        <h2>HomeWizard thuisbatterij berekenen in 3 stappen</h2>
        <p>1. Exporteer uw HomeWizard-data als CSV. 2. Open de Batterijenplan calculator en kies de route met slimme-meterdata. 3. Kies HomeWizard, upload uw bestand en vergelijk de batterijgroottes op uw eigen profiel.</p>
        <p><a href="/calculator">Start de gratis analyse</a> of lees meer over <a href="/post/wat-levert-een-thuisbatterij-op">wat een thuisbatterij oplevert</a>.</p>
        <p>HomeWizard is een handelsmerk van de betreffende rechthebbende. Batterijenplan is niet gelieerd aan HomeWizard.</p>`);

// Statische crawlbare tekst voor de dedicated SEO-landingspagina
// "thuisbatterij handel" (React vervangt dit bij mount). Spiegelt de kerncopy
// van src/pages/ThuisbatterijHandel.jsx; exact één H1, uniek van /calculator.
const THUISBATTERIJ_HANDEL_BODY = seoWrap(`        <h1>Thuisbatterij handel: slim laden en ontladen met EMS</h1>
        <p>Handelen met een thuisbatterij draait niet alleen om stroom opslaan. Het gaat om slim laden wanneer stroom goedkoop is en gebruiken of ontladen wanneer stroom duur is. Met een dynamisch energiecontract en EMS-sturing kan een thuisbatterij meer doen dan alleen eigen zonnestroom bewaren. <a href="/calculator">Bereken mijn batterijcapaciteit</a> of lees hoe <a href="/post/dynamisch-energiecontract-thuisbatterij">dynamische sturing werkt</a>.</p>
        <h2>Wat is thuisbatterij handel?</h2>
        <p>Bij batterijhandel laadt uw batterij op momenten dat stroom goedkoop is, en ontlaadt of gebruikt hij die stroom op momenten dat stroom duur is. Omdat dynamische energieprijzen per uur verschillen, is de timing van laden en ontladen bepalend voor het resultaat. Een EMS-systeem automatiseert die timing. Dat maakt batterijhandel iets anders dan eenvoudige opslag, waarbij een batterij vooral overtollige zonnestroom bewaart voor later gebruik zonder actief op prijsverschillen te sturen.</p>
        <h2>Waarom EMS-sturing het verschil maakt</h2>
        <p>Zonder EMS is een batterij vooral een opslagmiddel. Met EMS wordt de batterij onderdeel van een slim energiesysteem. Het EMS gebruikt uw zonneproductie, uw verbruik, actuele prijsdata en de laadtoestand van de batterij om automatisch te bepalen wanneer laden of ontladen het meeste oplevert, en voorkomt zo verkeerde timing.</p>
        <h2>Dynamisch energiecontract en thuisbatterij</h2>
        <p>Bij een dynamisch energiecontract verandert de stroomprijs per uur. Een slim aangestuurde batterij kan op die prijsverschillen reageren: laden wanneer de prijs laag is, ontladen of gebruiken wanneer de prijs hoog is. Lees meer over <a href="/post/dynamisch-energiecontract-thuisbatterij">dynamische energiecontracten en thuisbatterijen</a>.</p>
        <h2>Wanneer is batterijhandel interessant?</h2>
        <p>Batterijhandel kan interessant zijn wanneer u zonnepanelen heeft, jaarlijks veel stroom teruglevert, een dynamisch energiecontract heeft of overweegt, uw batterijcapaciteit bij uw teruglevering past, uw systeem EMS-sturing heeft, uw meterkast, omvormer en netaansluiting geschikt zijn, en de verwachte opbrengst realistisch is doorgerekend.</p>
        <h2>Wanneer is batterijhandel minder interessant?</h2>
        <p>Batterijhandel is minder interessant wanneer u weinig stroom teruglevert, uw batterij te klein of te groot is voor uw profiel, er geen EMS-sturing aanwezig is, u geen dynamisch energiecontract heeft, uw technische aansluiting beperkt is, of uw verwachtingen zijn gebaseerd op algemene verkooppraatjes.</p>
        <h2>Plug-in batterij versus slim EMS-systeem</h2>
        <p>Een plug-in batterij kan nuttig zijn voor eenvoudige opslag, maar dat is niet automatisch hetzelfde als een handelssysteem. Een professioneel geïnstalleerd EMS-systeem met een passende omvormer heeft een duidelijker handelsmodel, omdat het actief kan sturen op dynamische prijzen. Lees het volledige verschil in <a href="/post/thuisbatterij-handel-radar-slimme-sturing">plug-in batterij versus slim EMS</a>.</p>
        <h2>Hoe berekent Batterijenplan batterijhandel?</h2>
        <p>Wij kijken niet alleen naar uw jaarverbruik, maar ook naar uw jaarlijkse teruglevering en uw teruglevering per zonnige dag, en bepalen op basis daarvan of het doel vooral zelfconsumptie is of dat dynamische handel kansrijk kan zijn. Een specialist kan uw uitkomst daarna gratis controleren.</p>
        <p><a href="/calculator">Bereken gratis uw thuisbatterijcapaciteit</a></p>
        <h2>Veelgestelde vragen over thuisbatterij handel</h2>
        <h3>Is thuisbatterij handel rendabel?</h3>
        <p>Dat kan, afhankelijk van uw situatie. Bij veel teruglevering, een dynamisch energiecontract en goede EMS-sturing kan batterijhandel in gunstige situaties een aantrekkelijk maandvoordeel opleveren. Er is geen garantie op een vast rendement.</p>
        <h3>Heb ik een dynamisch energiecontract nodig?</h3>
        <p>Voor batterijhandel is een dynamisch energiecontract vrijwel altijd nodig, omdat alleen dan de prijsverschillen gedurende de dag ontstaan waarop een EMS-systeem kan sturen.</p>
        <h3>Wat doet een EMS-systeem?</h3>
        <p>Een EMS-systeem bepaalt automatisch wanneer uw batterij het beste kan laden of ontladen, op basis van uw verbruik, uw zonneopwek, de actuele stroomprijs en de laadtoestand van de batterij.</p>
        <h3>Kan iedere thuisbatterij handelen?</h3>
        <p>Nee. Een eenvoudige plug-in batterij is vooral gericht op basisopslag. Een professioneel geïnstalleerd systeem met EMS en een passende omvormer is beter geschikt voor batterijhandel.</p>
        <h3>Waarom is teruglevering belangrijk?</h3>
        <p>Uw teruglevering laat zien hoeveel overtollige zonnestroom er beschikbaar is om op te slaan of slim in te zetten.</p>
        <h3>Hoe weet ik welke batterijcapaciteit ik nodig heb?</h3>
        <p>Bereken dit gratis met de calculator van Batterijenplan, op basis van uw jaarverbruik en teruglevering.</p>
        <h2>Meer over thuisbatterij handel</h2>
        <p><a href="/post/dynamisch-energiecontract-thuisbatterij">Dynamisch contract en thuisbatterij</a> · <a href="/post/ems-systeem-thuisbatterij-controle-over-stroom">EMS-systeem: wie heeft controle</a> · <a href="/post/thuisbatterij-vergelijken">Thuisbatterij vergelijken</a> · <a href="/post/warmtefonds-thuisbatterij-lening">Warmtefonds thuisbatterij lening</a></p>`);

const CONTACT_BODY = seoWrap(`        <h1>Contact met Batterijenplan.nl</h1>
        <p>Heeft u een vraag over thuisbatterijen, batterijopslag of de thuisbatterij calculator? Neem gerust contact op met Batterijenplan.nl. Wij helpen Nederlandse huiseigenaren met onafhankelijke informatie en advies over het opslaan van zonnestroom, zonder verkooppraat en met echte getallen.</p>
        <h2>Waarmee helpt Batterijenplan?</h2>
        <p>Wij leggen in begrijpelijke taal uit hoe een thuisbatterij werkt, welke capaciteit bij uw situatie past en wat opslag u kan opleveren. Of u nu vooral meer eigen zonnestroom wilt gebruiken of uw batterij wilt inzetten bij een dynamisch energiecontract: wij denken met u mee over de keuze die past bij uw woning en verbruik.</p>
        <h2>Gratis en vrijblijvend batterijadvies</h2>
        <p>Uw adviesaanvraag is gratis en vrijblijvend. Een specialist kijkt naar uw persoonlijke situatie en helpt u de uitkomst van de calculator te vertalen naar een concreet, passend advies. U zit nergens aan vast en beslist zelf of en wanneer u een vervolgstap zet.</p>
        <h2>Ondersteuning bij de calculator</h2>
        <p>Komt u er met de gratis thuisbatterij calculator niet helemaal uit, of twijfelt u over de gegevens die u invult? Wij helpen u graag op weg. Vertel ons uw jaarlijkse stroomverbruik en teruglevering, dan lichten wij de uitkomst toe en leggen we uit waarop de geadviseerde batterijcapaciteit is gebaseerd.</p>
        <h2>Wat wij voor u controleren</h2>
        <p>Voor een definitief advies kijken wij verder dan alleen de calculator. Wij beoordelen uw zonnepanelen, uw teruglevering aan het net, uw netaansluiting, het omvormervermogen, de mogelijkheden voor slimme EMS-sturing en uw energiecontract. Zo weet u zeker welke thuisbatterij technisch én financieel het beste bij uw woning past.</p>
        <h2>Contactgegevens</h2>
        <p>
          Batterijenplan.nl<br />
          De Waal 18D<br />
          5684 PH Best<br />
          Nederland
        </p>
        <p>
          E-mail: <a href="mailto:info@batterijenplan.nl">info@batterijenplan.nl</a><br />
          Telefoon: <a href="tel:+31850605738">085 060 5738</a><br />
          WhatsApp: <a href="https://wa.me/31850605738">085 060 5738</a>
        </p>
        <p>Ons servicegebied is heel Nederland. Bezoek aan ons kantoor is uitsluitend op afspraak mogelijk. Stuur ons een bericht of app ons, dan nemen wij meestal binnen één werkdag contact met u op.</p>`);

const PRIVACY_BODY = seoWrap(`        <h1>Privacyverklaring Batterijenplan.nl</h1>
        <p>Batterijenplan.nl gaat zorgvuldig om met uw persoonsgegevens. Hieronder leest u welke gegevens wij verzamelen, waarvoor wij ze gebruiken en hoe u ze kunt laten aanpassen of verwijderen.</p>
        <h2>Welke gegevens verzamelen wij?</h2>
        <p>Wij verwerken de gegevens die u zelf invult in het contactformulier en de adviesaanvraag, zoals uw naam, telefoonnummer, e-mailadres en optioneel uw postcode en bericht. Wij gebruiken deze gegevens uitsluitend om uw vraag of aanvraag te beantwoorden.</p>
        <h2>Gegevens uit de calculator</h2>
        <p>Als u de thuisbatterij calculator gebruikt, bewaren wij de gegevens die u invult, zoals uw jaarlijkse stroomverbruik, uw teruglevering en uw gekozen doel. Zo kan een specialist uw berekening controleren en u een passend advies geven. Zolang u geen contactgegevens achterlaat, zijn deze gegevens niet tot u herleidbaar.</p>
        <h2>Contactaanvragen</h2>
        <p>Wanneer u een adviesaanvraag of contactverzoek indient, bewaren wij uw bericht en contactgegevens zodat wij u kunnen helpen en, indien nodig, kunnen terugkoppelen. Wij bewaren deze gegevens niet langer dan nodig is voor het doel waarvoor u ze heeft achtergelaten.</p>
        <h2>Analytics en conversiemeting</h2>
        <p>Wij gebruiken analyse- en conversiemeting om onze website te verbeteren en te zien hoe bezoekers de calculator en de adviesaanvraag gebruiken. Deze gegevens verwerken wij zo veel mogelijk geanonimiseerd en gebruiken wij alleen op geaggregeerd niveau.</p>
        <h2>Delen met derden</h2>
        <p>Wij verkopen uw persoonsgegevens niet aan derden. Gegevens worden uitsluitend gedeeld met een specialist wanneer dat nodig is om uw adviesaanvraag af te handelen, en alleen met uw medeweten.</p>
        <h2>Uw gegevens inzien of verwijderen</h2>
        <p>U heeft het recht om uw gegevens in te zien, te laten corrigeren of te laten verwijderen. Stuur hiervoor een e-mail naar <a href="mailto:info@batterijenplan.nl">info@batterijenplan.nl</a>, dan verwerken wij uw verzoek zo snel mogelijk.</p>`);

// Dynamische SEO-fallback voor /artikelen: een crawlbaar overzicht opgebouwd
// uit de echte posts (dezelfde volgorde als de API-respons). Alle API-tekst
// wordt ge-escaped. Geen afbeeldingen in de fallback. React vervangt dit blok
// bij mount (createRoot().render() leegt #root), dus geen dubbele content.
function articlesFallbackBody(posts) {
  const articles = (posts || [])
    // Alleen posts met zowel een niet-lege slug als titel; volgorde blijft gelijk.
    .filter((post) => {
      const slug = post.slug ? String(post.slug).trim() : "";
      const title = post.title ? String(post.title).trim() : "";
      return slug && title;
    })
    .map((post) => {
      // URL veilig opbouwen (encodeURIComponent) en de uiteindelijke href
      // escapen vóór insertie in het href-attribuut.
      const href = escapeHtml(`/post/${encodeURIComponent(String(post.slug))}`);
      const title = escapeHtml(String(post.title));
      const excerpt = post.excerpt
        ? `\n          <p>${escapeHtml(String(post.excerpt))}</p>`
        : "";
      const iso = post.published_at || post.updated_at || "";
      const dateLabel = formatDateNl(iso);
      const date = dateLabel
        ? `\n          <p><time datetime="${escapeHtml(String(iso))}">${escapeHtml(dateLabel)}</time></p>`
        : "";
      return `        <article>
          <h2><a href="${href}">${title}</a></h2>${excerpt}${date}
        </article>`;
    })
    .join("\n");

  return seoWrap(`        <h1>Alles over thuisbatterijen en energieopslag</h1>
        <p>In onze kennisbank leest u artikelen over thuisbatterijen, batterijopslag en het opslaan van zonnestroom. Van capaciteit en installatie tot energieprijzen, rendement en slimme aansturing.</p>
${articles}
        <p><a href="/calculator">Bereken uw thuisbatterij</a></p>`);
}

// Route-specifieke SEO-pagina's. slug "" = dist/index.html (homepage houdt
// zijn bestaande meta + performance-shell; alleen body wordt geïnjecteerd).
const STATIC_PAGES = [
  { slug: "", keepMeta: true, keepHomeShell: true, body: HOMEPAGE_BODY },
  {
    slug: "calculator",
    title: "Thuisbatterij Calculator | Bereken met uw slimme-meterdata",
    description:
      "Gratis thuisbatterij calculator: bereken welke capaciteit past. Snel met jaarverbruik of nauwkeuriger met uw HomeWizard slimme-meterdata. Geen e-mail nodig.",
    body: CALCULATOR_BODY,
  },
  {
    slug: "homewizard-thuisbatterij",
    title: "HomeWizard thuisbatterij | Bereken met uw slimme-meterdata",
    description:
      "Gebruik uw HomeWizard-data om te zien welke thuisbatterij bij uw verbruik en teruglevering past. Analyseer uw kwartierwaarden gratis met Batterijenplan.",
    // Neutrale merk-social-image (dezelfde als de homepage). Een dedicated
    // HomeWizard-visual zou sterker zijn; zie rapport.
    image: `${SITE_URL}/og-home.png`,
    body: HOMEWIZARD_BODY,
  },
  {
    slug: "thuisbatterij-handel",
    title: "Thuisbatterij handel | Verdienen met EMS en dynamisch contract",
    description:
      "Lees hoe thuisbatterij handel werkt met EMS-sturing en een dynamisch energiecontract. Ontdek wanneer batterijhandel interessant kan zijn en bereken uw capaciteit.",
    image: `${SITE_URL}/og-home.png`,
    body: THUISBATTERIJ_HANDEL_BODY,
  },
  {
    slug: "contact",
    title: "Contact | Batterijenplan.nl",
    description:
      "Neem contact op met Batterijenplan.nl voor vragen over thuisbatterijen, batterijopslag en de gratis thuisbatterij calculator.",
    body: CONTACT_BODY,
  },
  {
    slug: "privacy",
    title: "Privacyverklaring | Batterijenplan.nl",
    description:
      "Lees hoe Batterijenplan.nl omgaat met persoonsgegevens, contactaanvragen en calculatorgegevens.",
    body: PRIVACY_BODY,
  },
  {
    // body wordt dynamisch opgebouwd uit de echte posts (articlesFallbackBody);
    // zie generateStaticPages. Meta/canonical/sitemap blijven ongewijzigd.
    slug: "artikelen",
    title: "Kennisbank thuisbatterijen en energieopslag | Batterijenplan",
    description:
      "Lees praktische artikelen over thuisbatterijen, capaciteit, installatie, energieprijzen, rendement, EMS en het opslaan van zonnestroom.",
    dynamicBody: articlesFallbackBody,
  },
];

function pageMetaBlock({ title, description, slug, image }) {
  const url = `${SITE_URL}/${slug}`;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);
  // og:image alleen als de pagina er expliciet één opgeeft (additief: pagina's
  // zonder image-veld houden exact hun bestaande meta, incl. twitter card
  // "summary"). Met image: grote kaart voor social scrapers zonder JS.
  const tags = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${u}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
  ];
  if (image) {
    const i = escapeHtml(image);
    tags.push(
      `<meta property="og:image" content="${i}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta name="twitter:image" content="${i}" />`,
    );
  }
  tags.push(`<link rel="canonical" href="${u}" />`);
  return tags.join("\n    ");
}

function replaceMetaBlock(html, metaHtml) {
  const s = html.indexOf(META_START);
  const e = html.indexOf(META_END);
  if (s === -1 || e === -1) {
    throw new Error("SEO-markers niet gevonden in dist/index.html voor statische pagina.");
  }
  return html.slice(0, s) + metaHtml + html.slice(e + META_END.length);
}

// ALLEEN voor de homepage: de Vite CSS-bundle niet-render-blocking maken,
// zodat de statische shell direct kan schilderen (FCP/LCP) zonder te wachten
// op /assets/index-*.css. Veilig omdat de shell een dekkende fixed overlay is
// én omdat de shell pas ná window load + 300ms wordt verwijderd — een
// pending CSS-preload stelt het load-event uit, dus React is altijd gestyled
// vóórdat de overlay verdwijnt. Andere routes houden gewoon render-blocking
// CSS (daar is geen overlay die FOUC afdekt).
function asyncifyMainCss(html) {
  const re = /<link rel="stylesheet"([^>]*)href="(\/assets\/[^"]+\.css)"([^>]*)>/;
  const m = html.match(re);
  if (!m) {
    console.warn(
      "Waarschuwing: Vite CSS-link niet gevonden in homepage-HTML; CSS blijft render-blocking.",
    );
    return html;
  }
  const href = m[2];
  // crossorigin behouden zodat de preload dezelfde request-mode gebruikt
  // (anders wordt de CSS dubbel gedownload).
  const co = /\bcrossorigin\b/.test(m[0]) ? " crossorigin" : "";
  const replacement =
    `<link rel="preload" as="style"${co} href="${href}" ` +
    `onload="this.onload=null;this.rel='stylesheet'">` +
    `<noscript><link rel="stylesheet"${co} href="${href}"></noscript>`;
  return html.replace(re, replacement);
}

// Injecteert de SEO-tekst ín het lege #root, zodat React hem bij mount vervangt.
// Vervangingsfunctie (i.p.v. string) zodat "$"-reeksen in dynamische body-HTML
// (bijv. $ in codeblokken/tekst) niet als replace-patronen worden opgevat.
function injectSeoBody(html, bodyHtml) {
  const marker = '<div id="root"></div>';
  if (!html.includes(marker)) {
    console.warn("Waarschuwing: leeg #root niet gevonden; SEO-body niet geïnjecteerd.");
    return html;
  }
  return html.replace(marker, () => `<div id="root">\n${bodyHtml}\n    </div>`);
}

async function generateStaticPages(template, posts) {
  let count = 0;
  for (const page of STATIC_PAGES) {
    let html = page.keepMeta
      ? template
      : replaceMetaBlock(template, pageMetaBlock({ ...page, slug: page.slug }));

    // Alleen de homepage houdt de performance-shell; overige routes niet.
    if (!page.keepHomeShell) html = stripHomeShell(html);

    // Pagina's met een dynamicBody (bijv. /artikelen) bouwen hun body uit de
    // echte posts; de rest gebruikt hun statische body.
    const body = page.dynamicBody ? page.dynamicBody(posts) : page.body;
    html = injectSeoBody(html, body);

    if (page.slug === "") {
      // Alleen de homepage krijgt async CSS; zie asyncifyMainCss.
      html = asyncifyMainCss(html);
      await writeFile(path.join(distDir, "index.html"), html, "utf8");
    } else {
      const dir = path.join(distDir, page.slug);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "index.html"), html, "utf8");
    }
    count += 1;
  }
  return count;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const escapeXml = escapeHtml;

// Voorkomt dat "</script>" in post-data het JSON-LD script vroegtijdig sluit.
function jsonLdHtml(schema) {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}

// Haalt alle pagina's van het (gepagineerde) posts-endpoint op.
async function fetchAllPosts() {
  const posts = [];
  let url = API_URL;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`API-fetch mislukt: ${res.status} ${res.statusText} voor ${url}`);
    }
    const data = await res.json();
    posts.push(...(data.results ?? data));
    url = data.next ?? null;
  }

  return posts;
}

// WhatsApp-vriendelijke social image: expliciet JPG (géén f_auto — WhatsApp
// gaat vaak mis op content-negotiation/WebP), vast 1200x630, gepad in plaats
// van gecropt zodat tekst op de cover niet wegvalt, met de site-achtergrond
// als padding-kleur.
function socialImageUrl(url) {
  if (
    !url ||
    !url.includes("res.cloudinary.com") ||
    !url.includes("/image/upload/")
  ) {
    return url || null;
  }
  let out = url.replace(
    "/image/upload/",
    "/image/upload/f_jpg,q_auto,w_1200,h_630,c_pad,b_rgb:F7F6F2/",
  );
  // Cloudinary public ids zonder extensie: .jpg toevoegen zodat scrapers
  // het bestandstype ook aan de URL kunnen zien.
  if (!/\.(jpe?g|png|webp|gif)$/i.test(out)) out += ".jpg";
  return out;
}

// ── Statische artikel-fallback in #root ──────────────────────────────────
// Crawlers en no-JS-tools zien de volledige artikeltekst vóór hydratie; React
// vervangt dit blok bij mount (createRoot().render() leegt #root), dus geen
// dubbele zichtbare content. Normale document-flow, geen overlay/shell.

const NL_MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

// Vaste Nederlandse datum, zonder afhankelijkheid van ICU/locale in Node.
function formatDateNl(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Zelfde tabel-wrap als PostDetail.jsx: brede tabellen scrollen zijwaarts i.p.v.
// de pagina te verbreden — voorkomt horizontale overflow in de fallback.
function wrapTables(html) {
  if (!html) return html;
  return html
    .replaceAll("<table>", '<div class="post-table-scroll"><table>')
    .replaceAll("</table>", "</table></div>");
}

// Zelfde Cloudinary-transform als images.js optimizedImageUrl(1200): de React-
// cover gebruikt exact deze URL als src, dus de browser hergebruikt de cache.
function coverImageUrl(url, width = 1200) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) {
    return url;
  }
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
}

// CTA-blok naar de calculator (zelfde klassen als CalculatorCta in PostDetail.jsx).
const POST_CTA_BLOCK = `<aside class="cta-block">
          <h2>Bereken welke thuisbatterij bij uw woning past</h2>
          <p>Gebruik de gratis thuisbatterij calculator en ontvang direct een eerste indicatie op basis van uw verbruik en teruglevering.</p>
          <div class="cta-block-actions">
            <a class="cta-button cta-button-sm" href="/calculator">Start de calculator</a>
            <a class="cta-text-link" href="/calculator?advies=1#advies">Of vraag gratis advies aan</a>
          </div>
        </aside>`;

// Bouwt de statische artikel-HTML voor in #root. Tekstvelden worden ge-escaped;
// body_html is vertrouwde, server-side (markdown→HTML) CMS-content en wordt —
// net als in PostDetail.jsx (dangerouslySetInnerHTML) — als HTML ingevoegd.
function postBodyFallback(post) {
  const kicker = Array.isArray(post.tags) ? post.tags.join(" · ") : "";
  const bylineParts = [
    post.author,
    formatDateNl(post.published_at),
    post.reading_minutes ? `${post.reading_minutes} min leestijd` : "",
  ].filter(Boolean);
  const byline = bylineParts
    .map((s) => `<span>${escapeHtml(String(s))}</span>`)
    .join("\n            ");

  const coverAlt = post.cover_alt || post.title || "";
  const cover = post.cover_image_url
    ? `<img class="cover" src="${escapeHtml(coverImageUrl(post.cover_image_url, 1200))}" width="1200" height="675" alt="${escapeHtml(coverAlt)}" />`
    : "";
  const excerpt = post.excerpt
    ? `<p>${escapeHtml(post.excerpt)}</p>`
    : "";
  const body = wrapTables(post.body_html || "");

  return `<article class="container post-detail">
        <p class="mono kicker">${escapeHtml(kicker)}</p>
        <h1>${escapeHtml(post.title)}</h1>
        <div class="byline mono">
            ${byline}
        </div>
        <p class="cta-inline mono">Niet zeker welke batterijcapaciteit u nodig heeft? <a href="/calculator">Bereken het gratis.</a></p>
        ${excerpt}
        ${cover}
        ${POST_CTA_BLOCK}
        <div class="prose">${body}</div>
        ${POST_CTA_BLOCK}
      </article>`;
}

// Detail-endpoint bevat body_html (de lijst niet); per post apart ophalen.
async function fetchPostDetail(slug) {
  const base = API_URL.endsWith("/") ? API_URL : `${API_URL}/`;
  const res = await fetch(`${base}${slug}/`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Korte <title>/og:title voor posts waarvan de volle titel + "— Batterijenplan"
// Bron van waarheid is het backend-veld `seo_title` (bevestigd via de live API
// voor alle gepubliceerde posts). De vroegere hardgecodeerde map is daarom leeg
// en dient enkel nog als noodfallback; spiegelt src/seo.js. Beheer titels in de
// backend, niet hier — zo blijft prerender en client-side identiek zonder drift.
const POST_SEO_TITLES = {};

// SEO-titel: backend `seo_title` > (legacy) meta_title > noodfallback-map > standaard.
function seoTitle(post) {
  return (
    post.seo_title ||
    post.meta_title ||
    POST_SEO_TITLES[post.slug] ||
    `${post.title} — Batterijenplan`
  );
}

function postMetaBlock(post) {
  const url = `${SITE_URL}/post/${post.slug}`;
  const title = seoTitle(post);
  // Altijd post-specifiek (nooit terugvallen op de homepage-beschrijving).
  // Voorkeur: expliciete backend seo_description > (uit de body afgeleide)
  // meta_description > excerpt > titel.
  const description =
    post.seo_description || post.meta_description || post.excerpt || post.title;

  const image = post.cover_image_url || null;
  const socialImage = socialImageUrl(image);

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    url,
    mainEntityOfPage: url,
    inLanguage: "nl-NL",
    // Auteur bewust als Organization (spiegelt src/seo.js): de API levert een
    // gebruikersnaam, geen publieke weergavenaam. Publisher = organisatie met
    // logo als ImageObject.
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.ico` },
    },
  };
  if (image) schema.image = image;
  if (post.published_at) schema.datePublished = post.published_at;
  if (post.updated_at) schema.dateModified = post.updated_at;

  // BreadcrumbList: Home › Kennisbank › {titel} (spiegelt breadcrumbSchema in
  // src/seo.js). Statisch meegeleverd zodat crawlers de breadcrumb pre-JS zien.
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Kennisbank", item: `${SITE_URL}/artikelen` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);

  const tags = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:url" content="${u}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
  ];

  if (socialImage) {
    const i = escapeHtml(socialImage);
    tags.push(
      `<meta property="og:image" content="${i}" />`,
      `<meta property="og:image:secure_url" content="${i}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:type" content="image/jpeg" />`,
      `<meta name="twitter:image" content="${i}" />`,
    );
  }

  tags.push(
    `<link rel="canonical" href="${u}" />`,
    `<script type="application/ld+json">${jsonLdHtml(schema)}</script>`,
    `<script type="application/ld+json">${jsonLdHtml(breadcrumb)}</script>`,
  );

  return tags.join("\n    ");
}

function buildSitemap(posts) {
  const entries = [
    { loc: `${SITE_URL}/` },
    { loc: `${SITE_URL}/calculator` },
    { loc: `${SITE_URL}/homewizard-thuisbatterij` },
    { loc: `${SITE_URL}/thuisbatterij-handel` },
    { loc: `${SITE_URL}/artikelen` },
    { loc: `${SITE_URL}/privacy` },
    { loc: `${SITE_URL}/contact` },
    ...posts.map((post) => {
      const lastmod = post.updated_at || post.published_at;
      return {
        loc: `${SITE_URL}/post/${post.slug}`,
        // Geen datum verzinnen als de API er geen geeft.
        ...(lastmod ? { lastmod: String(lastmod).slice(0, 10) } : {}),
      };
    }),
  ];

  const urls = entries
    .map((e) => {
      const lastmod = e.lastmod ? `\n    <lastmod>${escapeXml(e.lastmod)}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(e.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  const template = await readFile(path.join(distDir, "index.html"), "utf8");

  const startIdx = template.indexOf(META_START);
  const endIdx = template.indexOf(META_END);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      "SEO-markers niet gevonden in dist/index.html. " +
        "Controleer of <!-- seo:meta:start --> en <!-- seo:meta:end --> nog in frontend/index.html staan.",
    );
  }

  const posts = await fetchAllPosts();

  let generated = 0;
  for (const post of posts) {
    // Django-slugs bevatten alleen letters, cijfers, - en _; alles anders overslaan.
    if (!post.slug || !/^[\w-]+$/.test(post.slug)) {
      console.warn(`Overgeslagen (ongeldige slug): ${JSON.stringify(post.slug)}`);
      continue;
    }

    // Detail ophalen voor body_html (zit niet in de lijst-serializer). Faalt de
    // call, dan valt deze post terug op meta-only HTML (oud gedrag) i.p.v. de
    // hele build te breken.
    let detail = post;
    try {
      detail = await fetchPostDetail(post.slug);
    } catch (err) {
      console.warn(`Body niet opgehaald voor "${post.slug}" (${err.message}); alleen meta.`);
    }

    let html = stripHomeShell(
      template.slice(0, startIdx) +
        postMetaBlock(detail) +
        template.slice(endIdx + META_END.length),
    );

    // Volledige artikeltekst statisch ín #root, zodat crawlers/no-JS-tools de
    // body zien vóór JS. React vervangt dit bij mount (geen dubbele content).
    if (detail.body_html) {
      html = injectSeoBody(html, postBodyFallback(detail));
    }

    const dir = path.join(distDir, "post", post.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), html, "utf8");
    generated += 1;
  }

  // Statische SEO-fallback voor de hoofdpagina's (leest dezelfde in-memory
  // template; wijzigt dist/index.html en schrijft dist/<route>/index.html).
  const staticCount = await generateStaticPages(template, posts);

  await writeFile(path.join(distDir, "sitemap.xml"), buildSitemap(posts), "utf8");

  console.log(`Prerender klaar: ${generated} blogpost-HTML-bestanden gegenereerd in dist/post/.`);
  console.log(`Statische SEO-pagina's gegenereerd: ${staticCount} (/, /calculator, /homewizard-thuisbatterij, /thuisbatterij-handel, /artikelen, /contact, /privacy).`);
  console.log(`sitemap.xml gegenereerd met ${posts.length + 7} URL's.`);
}

main().catch((err) => {
  console.error("prerender-blog-meta.mjs mislukt:", err.message);
  process.exit(1);
});
