import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { postCalculator } from "../api.js";
import LeadCaptureForm, { useLeadCapture } from "../components/LeadCaptureForm.jsx";
import { setPageMeta, setJsonLd, ORGANIZATION_SCHEMA } from "../seo.js";
import { friendlyValidity, withValidityClear } from "../formValidation.js";

const CUSTOMER_TYPES = [
  { value: "residential", label: "Particulier" },
  { value: "business", label: "Zakelijk" },
];

// Zelfde keuzes als calculators.services.RESIDENTIAL_/BUSINESS_SUNNY_DAY_
// EXPORT_CHOICES (backend bepaalt de bijbehorende kWh-waarde; de trigger
// wordt server-side sowieso herberekend, dit is puur om de juiste lijst te
// tonen op basis van customer_type).
const SUNNY_DAY_EXPORT_OPTIONS_RESIDENTIAL = [
  { value: "", label: "Maak een keuze" },
  { value: "under_10", label: "Minder dan 10 kWh" },
  { value: "10_20", label: "10–20 kWh" },
  { value: "20_30", label: "20–30 kWh" },
  { value: "30_40", label: "30–40 kWh" },
  { value: "40_50", label: "40–50 kWh" },
  { value: "over_50", label: "Meer dan 50 kWh" },
  { value: "unknown", label: "Ik weet het niet" },
];

const SUNNY_DAY_EXPORT_OPTIONS_BUSINESS = [
  { value: "", label: "Maak een keuze" },
  { value: "under_50", label: "Minder dan 50 kWh" },
  { value: "50_100", label: "50–100 kWh" },
  { value: "100_150", label: "100–150 kWh" },
  { value: "150_250", label: "150–250 kWh" },
  { value: "250_400", label: "250–400 kWh" },
  { value: "400_640", label: "400–640 kWh" },
  { value: "over_640", label: "Meer dan 640 kWh" },
  { value: "unknown", label: "Ik weet het niet" },
];

const MODAL_DELAY_MS = 4000;

// Statische interne links naar bestaande blogposts (slugs staan ook in de
// sitemap). Bewust niet uit de API: de calculator-landing mag hier niet
// trager van worden. Slugs geverifieerd tegen de gepubliceerde posts —
// de vergelijking Dyness/Enphase staat live op "enphase-vs-dyness".
const RELATED_ARTICLES = [
  {
    slug: "thuisbatterij-vergelijken",
    title: "Thuisbatterij vergelijken",
    text: "Waar u op let bij capaciteit, omvormer, EMS en installatie — zonder verkooppraat.",
  },
  {
    slug: "thuisbatterij-installatie",
    title: "Thuisbatterij installatie",
    text: "Wat er komt kijken bij het installeren van een thuisbatterij in uw woning.",
  },
  {
    slug: "stroom-opslaan-zonnepanelen",
    title: "Stroom opslaan met zonnepanelen",
    text: "Waarom zelf opslaan slimmer wordt nu de salderingsregeling verdwijnt.",
  },
  {
    slug: "dynamisch-energiecontract-thuisbatterij",
    title: "Dynamisch energiecontract met thuisbatterij",
    text: "Lees hoe dynamische stroomprijzen, EMS-sturing en een thuisbatterij samenwerken.",
  },
];

// Hulpkaart "Zo werkt de berekening". Twee keer gerenderd: op mobiel als
// compacte kaart bóven het formulier, op desktop als sticky kaart rechts.
// CSS (calc-help-mobile/-desktop) toont er altijd precies één. De CTA start
// de berekening (scrollt naar het formulier), niet het leadformulier — dat
// is bewust de rol van de afsluitende CTA onderaan.
function CalcHelpCard({ onStart, className, variant }) {
  const isMobile = variant === "mobile";
  return (
    <aside className={`calc-help ${className}`}>
      <h2>Zo werkt de berekening</h2>

      <ol className="calc-help-steps">
        <li>Vul uw stroomverbruik in</li>
        <li>Vul uw teruglevering in</li>
        <li>Kies zelfconsumptie of handel</li>
        <li>Ontvang direct uw batterijadvies</li>
      </ol>

      {isMobile ? (
        // Mobiel: het formulier staat er direct onder, dus geen grote primaire
        // CTA-knop maar een bescheiden richtingaanwijzer (scrollt wel).
        <button type="button" className="calc-help-cue" onClick={onStart}>
          <span className="calc-help-cue-title">
            Vul uw gegevens hieronder in
            <span aria-hidden="true" className="calc-help-cue-arrow">↓</span>
          </span>
          <span className="calc-help-cue-sub">
            U krijgt direct een eerste batterijadvies.
          </span>
        </button>
      ) : (
        <>
          <p className="calc-help-note">
            Binnen één minuut ziet u welke batterijcapaciteit waarschijnlijk
            past bij uw situatie.
          </p>
          <button
            type="button"
            className="cta-button cta-button-sm calc-help-cta"
            onClick={onStart}
          >
            Ga naar de calculator
            <span aria-hidden="true" className="calc-help-cta-arrow">→</span>
          </button>
        </>
      )}
    </aside>
  );
}

function LeadModal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="lead-modal-backdrop" onClick={onClose}>
      <div
        className="lead-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Gratis batterijadvies aanvragen"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="lead-modal-close" onClick={onClose} aria-label="Sluiten">
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

export default function Calculator() {
  const [searchParams] = useSearchParams();
  const directAdvice = searchParams.get("advies") === "1";

  const [form, setForm] = useState({
    customer_type: "residential",
    yearly_usage: "",
    goal: "trading",
    exported_energy: "",
    sunny_day_export: "",
  });

  const [result, setResult] = useState(null);
  const [lastInputs, setLastInputs] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // De zonnige-dag-vraag verschijnt pas na een klik op "Bereken" (niet live
  // tijdens het typen — half ingetypte getallen triggerden hem voorheen).
  const [sunnyDayPrompted, setSunnyDayPrompted] = useState(false);
  // Puur voor de weergave van foutstatussen: pas rode randen/tekst tonen
  // zodra een verzendpoging is gedaan, niet meteen bij het openen van de
  // pagina. Verandert niets aan de native validatie zelf.
  const [validated, setValidated] = useState(false);
  const resultRef = useRef(null);
  const sunnyDayRef = useRef(null);
  const formRef = useRef(null);

  const leadState = useLeadCapture();

  // Bij jaarverbruik >= 2x de jaarlijkse teruglevering (ongeacht doel):
  // jaargemiddelden kunnen dan een veel hogere piek-teruglevering op
  // zonnige dagen verhullen. Spiegelt
  // calculators.services.sunny_day_question_required(); de server
  // herberekent deze conditie zelf en negeert het antwoord anders.
  const yearlyUsageNum = parseFloat(form.yearly_usage);
  const exportedEnergyNum = parseFloat(form.exported_energy);
  const needsSunnyDayQuestion =
    !Number.isNaN(yearlyUsageNum) &&
    !Number.isNaN(exportedEnergyNum) &&
    yearlyUsageNum >= 2 * exportedEnergyNum;

  // Zichtbaar pas nadat een Bereken-klik de vraag "ontdekt" heeft; verdwijnt
  // vanzelf weer als de invoer de conditie niet meer raakt.
  const showSunnyDayQuestion = sunnyDayPrompted && needsSunnyDayQuestion;

  // "Voltooid" is méér dan "we hebben een result": als de zonnige-dag-vraag
  // nu vereist is, telt een eerder resultaat alleen als voltooid wanneer het
  // berekend is mét het antwoord dat op dit moment geselecteerd staat. Zo
  // niet (vraag net verschenen, of antwoord gewijzigd zonder opnieuw te
  // rekenen), dan is het resultaat verouderd: geen scroll, geen popup, geen
  // leadformulier op basis van een niet-passende berekening.
  // Voor alle scenario's zonder de vraag is dit exact gelijk aan
  // Boolean(result) — bestaand gedrag blijft dus ongewijzigd.
  const lastSunnyDayAnswer = lastInputs?.sunny_day_export || "";
  const isCalculationComplete =
    Boolean(result) &&
    (!needsSunnyDayQuestion ||
      (Boolean(form.sunny_day_export) && form.sunny_day_export === lastSunnyDayAnswer));

  useEffect(() => {
    setPageMeta({
      title: "Thuisbatterij Calculator | Bereken gratis uw batterijcapaciteit",
      description:
        "Gebruik de gratis thuisbatterij calculator en bereken welke batterijcapaciteit past bij uw stroomverbruik, zonnepanelen en teruglevering. Ontvang direct een eerste advies.",
      path: "/calculator",
    });
    setJsonLd([ORGANIZATION_SCHEMA]);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!directAdvice) return;

    const timer = setTimeout(() => {
      document.getElementById("advies")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [directAdvice]);

  // Na een geslaagde, volledige berekening naar het resultaat scrollen —
  // vooral op mobiel blijft de gebruiker anders bij de knop hangen. Bewust
  // pas bij isCalculationComplete (niet alleen "result bestaat"): zo lang de
  // zonnige-dag-vraag zichtbaar is maar nog niet (opnieuw) beantwoord en
  // verstuurd, mag er niet naar een verouderd resultaat gesprongen worden.
  // Bij page-load is result null, dus dit springt nooit bij het openen.
  useEffect(() => {
    if (isCalculationComplete && resultRef.current) {
      resultRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [result, isCalculationComplete]);

  // Na elke volledige berekening: popup na 4 seconden.
  // Niet tonen als er al een aanvraag is verstuurd, en niet zolang het
  // resultaat verouderd is (zie isCalculationComplete) — anders kan de popup
  // alsnog opengaan terwijl de gebruiker de zonnige-dag-vraag aan het
  // beantwoorden is voor een nieuwe berekening.
  useEffect(() => {
    if (!isCalculationComplete || leadState.sent) return;

    const timer = setTimeout(() => {
      setModalOpen(true);
    }, MODAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [result, isCalculationComplete, leadState.sent]);

  const update = (field) => (e) => {
    const value = e.target.value;
    if (field === "customer_type") {
      // Particulier en zakelijk hebben elk hun eigen bandbreedtes voor de
      // zonnige-dag-vraag; een eerder gekozen waarde uit de andere lijst is
      // dan niet meer geldig, dus die resetten we mee.
      setForm({ ...form, customer_type: value, sunny_day_export: "" });
    } else {
      setForm({ ...form, [field]: value });
    }
  };

  const sunnyDayExportOptions =
    form.customer_type === "business"
      ? SUNNY_DAY_EXPORT_OPTIONS_BUSINESS
      : SUNNY_DAY_EXPORT_OPTIONS_RESIDENTIAL;

  const submit = async (e) => {
    e.preventDefault();

    if (!form.goal) {
      setError("Kies eerst uw doel: zelfconsumptie of handel met een dynamisch contract.");
      return;
    }

    // De zonnige-dag-vraag wordt pas bij de Bereken-klik "ontdekt": is de
    // conditie geraakt en is er nog geen antwoord, dan (nog) niet rekenen —
    // eerst het vraagblok tonen en er rustig naartoe scrollen. Bij de
    // volgende klik blokkeert de native `required` op het select-veld een
    // leeg antwoord vanzelf; "Ik weet het niet" is een geldig antwoord.
    if (needsSunnyDayQuestion && !form.sunny_day_export) {
      setError(null);
      setSunnyDayPrompted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          sunnyDayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setModalOpen(false);

    const payload = {
      customer_type: form.customer_type,
      yearly_usage: parseFloat(form.yearly_usage),
      goal: form.goal,
      exported_energy: parseFloat(form.exported_energy),
    };

    // Alleen meesturen als de vraag daadwerkelijk zichtbaar was en
    // beantwoord; anders blijft de bestaande berekening ongewijzigd.
    if (needsSunnyDayQuestion && form.sunny_day_export) {
      payload.sunny_day_export = form.sunny_day_export;
    }

    try {
      const data = await postCalculator(payload);
      setLastInputs(payload);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => setModalOpen(false);

  const showLeadForm = Boolean(isCalculationComplete || directAdvice);

  // Hulpkaart-CTA: de berekening starten door naar het formulier te scrollen
  // (geen leadformulier — dat is de rol van de afsluitende CTA onderaan).
  const startCalculation = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Afsluitende/resultaat-CTA: naar het bestaande leadformulier scrollen als
  // dat al zichtbaar is, anders de bestaande modal tonen.
  const openAdvice = () => {
    const el = document.getElementById("advies");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      setModalOpen(true);
    }
  };

  return (
    <article className="container post-detail calc-page">
      <p className="mono kicker">Calculator · batterijcapaciteit · advies</p>

      <h1>
        Thuisbatterij <span className="accent">Calculator</span>
      </h1>

      <p className="sub calc-intro">
        Bereken gratis welke batterijcapaciteit past bij uw stroomverbruik,
        teruglevering en energiedoel.
      </p>

      <div className="calc-layout">
      <div className="calc-main">

      {/* Educatieve indicatoren — geen harde beloftes */}
      <div className="calc-mini-strip">
        <div><b>10–20 kWh</b><span>Vaak geschikt voor woningen</span></div>
        <div><b>250 dagen</b><span>Zonopwek als rekenbasis</span></div>
        <div><b>Gratis check</b><span>Laat uw uitkomst controleren</span></div>
      </div>

      {/* Mobiel: hulpkaart bóven het formulier (desktop-variant staat rechts) */}
      <CalcHelpCard onStart={startCalculation} variant="mobile" className="calc-help-mobile" />

      {/* "Wat heeft u nodig?" — vertelt de gebruiker precies wat het formulier
          hieronder vraagt; verbindt visueel met het formulier. */}
      <div className="calc-needs">
        <p className="calc-needs-title">Wat heeft u nodig?</p>
        <ul className="calc-needs-list">
          <li>Jaarlijks stroomverbruik</li>
          <li>Jaarlijkse teruglevering</li>
          <li>Uw doel: eigen verbruik of dynamische handel</li>
        </ul>
        <p className="calc-needs-help">
          Deze gegevens vindt u meestal terug in uw energieleverancier-app of
          jaarafrekening.
        </p>
      </div>

      <form
        ref={formRef}
        className={`calc-form${validated ? " form-validated" : ""}`}
        onSubmit={submit}
        onInvalidCapture={() => setValidated(true)}
      >
        <label>
          Type klant <span className="field-required">*</span>
          <select
            className="field-input"
            value={form.customer_type}
            onChange={update("customer_type")}
          >
            {CUSTOMER_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Jaarlijks stroomverbruik (kWh) <span className="field-required">*</span>
          <input
            className="field-input"
            type="number"
            step="0.1"
            min="0.1"
            placeholder="Bijvoorbeeld: 4500"
            value={form.yearly_usage}
            onChange={withValidityClear(update("yearly_usage"))}
            onInvalid={friendlyValidity("Vul uw jaarverbruik in.")}
            required
          />
          <span className="field-error-text">Vul uw jaarverbruik in.</span>
          <span className="field-help">
            Bijvoorbeeld: 4500 kWh voor een gemiddeld huishouden.
          </span>
        </label>

        <fieldset className="goal-choice">
          <legend>Doel van de batterij <span className="field-required">*</span></legend>

          <label className={`goal-card ${form.goal === "self_consumption" ? "active" : ""}`}>
            <input
              type="radio"
              name="goal"
              value="self_consumption"
              checked={form.goal === "self_consumption"}
              onChange={update("goal")}
              required
            />

            <span className="goal-title">Zelfconsumptie</span>

            <span className="goal-text">
              Gebruik meer van uw eigen zonnestroom en lever minder terug aan het net.
            </span>

            <span className="goal-check" aria-hidden="true">✓</span>
          </label>

          <label className={`goal-card ${form.goal === "trading" ? "active" : ""}`}>
            <input
              type="radio"
              name="goal"
              value="trading"
              checked={form.goal === "trading"}
              onChange={update("goal")}
              required
            />

            <span className="goal-title">Handel / dynamisch contract</span>

            <span className="goal-text">
              Gebruik batterijopslag voor slimme sturing op dynamische
              energieprijzen.
            </span>

            <span className="goal-check" aria-hidden="true">✓</span>
          </label>
        </fieldset>

        <label>
          Jaarlijkse teruglevering (kWh) <span className="field-required">*</span>
          <input
            className="field-input"
            type="number"
            step="0.1"
            min="0"
            placeholder="Bijvoorbeeld: 2500"
            value={form.exported_energy}
            onChange={withValidityClear(update("exported_energy"))}
            onInvalid={friendlyValidity("Vul uw jaarlijkse teruglevering in.")}
            required
          />
          <span className="field-error-text">Vul uw jaarlijkse teruglevering in.</span>
          <span className="field-help">
            Bijvoorbeeld: 2500–5000 kWh bij veel zonnepanelen.
          </span>
        </label>

        {showSunnyDayQuestion && (
          <div className="calc-sunny-warning" ref={sunnyDayRef}>
            <span className="calc-sunny-chip">Belangrijk voor een nauwkeurig advies</span>
            <strong className="calc-sunny-title">
              Controleer uw teruglevering op een goede zonnige dag
            </strong>
            <p>
              Uw jaarlijkse stroomverbruik is veel hoger dan uw jaarlijkse
              teruglevering. Daardoor kan een berekening op basis van
              jaargemiddelden uw batterijadvies onderschatten. Kijk daarom in
              de app van uw energieleverancier, slimme meter of omvormer
              hoeveel kWh u op een goede zonnige dag daadwerkelijk teruglevert
              aan het elektriciteitsnet. Vul niet uw totale zonne-opwek in,
              maar alleen de stroom die u teruglevert aan het net.
            </p>

            <label className="calc-sunny-question">
              Hoeveel kWh levert u op een goede zonnige dag maximaal terug aan
              het net? <span className="field-required">*</span>
              <select
                className="field-input"
                value={form.sunny_day_export}
                onChange={withValidityClear(update("sunny_day_export"))}
                onInvalid={friendlyValidity("Selecteer een optie.")}
                required
              >
                {sunnyDayExportOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="field-error-text">Selecteer een optie.</span>
            </label>
          </div>
        )}

        <button type="submit" className="field-submit-button" disabled={loading}>
          {loading ? "Bezig…" : "Bereken batterijcapaciteit"}
        </button>
      </form>

      {error && <div className="calc-error mono">{error}</div>}

      {isCalculationComplete && (
        <div className="calc-result" ref={resultRef}>
          <span className="mono calc-result-label">Uw batterijadvies</span>

          <p className="calc-result-goal">
            Advies voor <strong>{result.goal_label}</strong>
          </p>

          <div className="calc-result-grid">
            <div className="calc-card calc-card-primary">
              <span className="calc-card-label">Geadviseerde capaciteit</span>
              <b className="calc-card-value">
                {result.lower_range} – {result.upper_range} kWh
              </b>
              <span className="calc-card-help">
                Indicatieve range op basis van uw invoer
              </span>
              <span className="calc-card-rangenote">
                Deze range is gebaseerd op uw verbruik, teruglevering en
                gekozen doel — een eerste indicatie, geen definitief ontwerp.
              </span>
            </div>

            <div className="calc-card calc-card-product">
              <span className="calc-card-label">Passend systeem</span>
              <b className="calc-card-product-name">
                {result.product_name || result.product_advice}
              </b>
              {result.product_capacity && (
                <span className="calc-card-product-cap mono">
                  {result.product_capacity}
                </span>
              )}
              {result.product_price && (
                <span className="calc-card-product-price">
                  {result.product_price}
                </span>
              )}
            </div>
          </div>

          <div className="calc-metrics">
            <div className="calc-card calc-card-metric">
              <span className="calc-card-label">Teruglevering per zonnige dag</span>
              <b>{result.daily_export} kWh</b>
            </div>
            <div className="calc-card calc-card-metric">
              <span className="calc-card-label">Gem. verbruik per dag</span>
              <b>{result.daily_usage} kWh</b>
            </div>
          </div>

          {result.note && (
            <div className="calc-note">
              <strong>Beperkt overschot:</strong> {result.note}
            </div>
          )}

          {result.explanation && (
            <div className="calc-card calc-card-explain">{result.explanation}</div>
          )}

          {result.extra_notes?.map((noteText) => (
            <div className="calc-note" key={noteText}>{noteText}</div>
          ))}

          <div className="calc-note">
            <strong>Let op:</strong> deze berekening is indicatief. Voor een
            nauwkeurig advies kijken we ook naar zonnepanelen, netaansluiting,
            omvormervermogen, energiecontract en toekomstig verbruik.
          </div>

          <button type="button" className="cta-button cta-button-sm calc-result-cta" onClick={openAdvice}>
            Laat mijn berekening controleren
          </button>
        </div>
      )}

      {showLeadForm && (
        <div id="advies">
          <LeadCaptureForm
            state={leadState}
            calculatorInputs={isCalculationComplete ? lastInputs : null}
            calculatorResult={isCalculationComplete ? result : null}
            source={directAdvice && !isCalculationComplete ? "blog_cta_direct_advice" : "react_calculator"}
            variant="inline"
          />
        </div>
      )}

      </div>

      <CalcHelpCard onStart={startCalculation} variant="desktop" className="calc-help-desktop" />
      </div>

      {/* Lead-CTA — resultgedreven: verschijnt alleen ná een voltooide
          berekening (nooit onder een lege calculator). Bestaand leadgedrag via
          openAdvice: scrollt naar het inline leadformulier of opent de modal. */}
      {isCalculationComplete && (
        <section className="cta-block calc-final-cta">
          <h2>Laat uw batterijadvies gratis controleren</h2>
          <p>
            Na uw berekening controleren wij gratis of de gekozen capaciteit past
            bij uw zonnepanelen, teruglevering, netaansluiting, omvormervermogen,
            EMS-sturing en energiecontract.
          </p>
          <ul className="calc-final-cta-trust">
            <li>Gratis controle</li>
            <li>Geen verplichting</li>
            <li>Advies op basis van uw woning</li>
          </ul>
          <div className="cta-block-actions">
            <button type="button" className="cta-button cta-button-sm" onClick={openAdvice}>
              Plan gratis batterijadvies
            </button>
          </div>
        </section>
      )}

      {/* Ondersteunende info — scanbare kaarten i.p.v. een tekstblok, zodat
          de pagina als conversie-calculator voelt (niet als SEO-artikel). */}
      <section className="calc-info">
        <h2>Hoe berekenen wij uw thuisbatterij?</h2>
        <p className="calc-info-intro">
          De calculator geeft een eerste indicatie op basis van uw verbruik,
          teruglevering en energiedoel. Daarna kan een specialist de uitkomst
          controleren.
        </p>
        <div className="calc-info-grid">
          <div className="calc-info-card">
            <h3>Teruglevering per zonnige dag</h3>
            <p>
              Wij kijken niet alleen naar uw jaarverbruik, maar vooral naar
              hoeveel stroom u jaarlijks teruglevert. Dat delen wij over ongeveer
              250 zonnige dagen.
            </p>
          </div>
          <div className="calc-info-card">
            <h3>Zelfconsumptie of dynamische handel</h3>
            <p>
              Bij zelfconsumptie ligt de focus op meer eigen zonnestroom
              gebruiken. Bij dynamische handel rekenen wij extra opslagruimte
              voor slimme laad- en ontlaadmomenten.
            </p>
          </div>
          <div className="calc-info-card">
            <h3>Controle door een specialist</h3>
            <p>
              Voor een definitief advies controleren wij ook uw zonnepanelen,
              netaansluiting, omvormervermogen, EMS-sturing en energiecontract.
            </p>
          </div>
          <div className="calc-info-card">
            <h3>Passend systeem</h3>
            <p>
              De uitkomst wordt gekoppeld aan een passende batterijcapaciteit,
              zodat u geen onnodig te klein of te groot systeem kiest.
            </p>
          </div>
        </div>
      </section>

      {/* Conversie-strip die terugleidt naar het formulier (scrollt, geen
          lead-modal). Bewust ná de info, vóór de FAQ/artikelen. */}
      <section className="calc-recalc">
        <div className="calc-recalc-inner">
          <div className="calc-recalc-text">
            <h2>Bereken direct welke batterij past</h2>
            <p>
              Vul uw verbruik en teruglevering in en ontvang direct een eerste
              indicatie van de juiste batterijcapaciteit.
            </p>
          </div>
          <button
            type="button"
            className="cta-button cta-button-sm calc-recalc-btn"
            onClick={startCalculation}
          >
            Bereken mijn batterijcapaciteit
          </button>
        </div>
      </section>

      {/* FAQ — compact via native <details>/<summary>, geen accordion-JS. */}
      <section className="calc-faq">
        <h2>Veelgestelde vragen over de thuisbatterij calculator</h2>
        <div className="calc-faq-list">
          <details className="calc-faq-item">
            <summary>Hoe bereken ik welke thuisbatterij ik nodig heb?</summary>
            <p>
              Vul uw jaarlijkse stroomverbruik en teruglevering in. De calculator
              berekent dan een passende capaciteitsrange in kWh voor uw situatie.
            </p>
          </details>
          <details className="calc-faq-item">
            <summary>Hoeveel kWh thuisbatterij heb ik nodig?</summary>
            <p>
              Voor veel huishoudens ligt dat tussen de 10 en 20 kWh, afhankelijk
              van uw verbruik, teruglevering en doel.
            </p>
          </details>
          <details className="calc-faq-item">
            <summary>Is deze thuisbatterij calculator gratis?</summary>
            <p>
              Ja, volledig gratis en vrijblijvend. U ontvangt direct een eerste
              indicatie, zonder verplichting.
            </p>
          </details>
          <details className="calc-faq-item">
            <summary>Werkt de calculator ook met zonnepanelen?</summary>
            <p>
              Ja. Juist met zonnepanelen is de calculator nuttig: uw teruglevering
              bepaalt hoeveel zonnestroom u kunt opslaan.
            </p>
          </details>
          <details className="calc-faq-item">
            <summary>Kan ik ook dynamische handel berekenen?</summary>
            <p>
              Ja. Kies bij het doel voor “handel / dynamisch contract”, dan rekent
              de calculator met sturen op dynamische stroomprijzen.
            </p>
          </details>
        </div>
      </section>

      {/* Statische interne links naar verdiepende artikelen (secundaire
          navigatie, ónder de conversie-CTA en SEO-content) — géén API-fetch,
          dus geen invloed op de laadtijd. */}
      <section className="related-posts calc-related">
        <h2>Meer weten over thuisbatterijen?</h2>
        <p className="calc-related-intro">
          Lees verder over batterijmerken, slimme sturing en het verschil
          tussen aanbieders.
        </p>
        <div className="related-posts-grid">
          {RELATED_ARTICLES.map((article) => (
            <Link
              key={article.slug}
              to={`/post/${article.slug}`}
              className="related-post-card"
            >
              <h3>{article.title}</h3>
              <p>{article.text}</p>
              <span className="related-post-link">Lees meer →</span>
            </Link>
          ))}
        </div>
      </section>

      <LeadModal open={modalOpen} onClose={closeModal}>
        <LeadCaptureForm
          state={leadState}
          calculatorInputs={isCalculationComplete ? lastInputs : null}
          calculatorResult={isCalculationComplete ? result : null}
          source="react_calculator_modal"
          variant="modal"
          onDismiss={closeModal}
        />
      </LeadModal>
    </article>
  );
}