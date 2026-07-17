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

// ── Wizard-keuzelijsten ────────────────────────────────────────────────────
const CONTRACT_TYPES = [
  { value: "fixed", label: "Vast" },
  { value: "variable", label: "Variabel" },
  { value: "dynamic", label: "Dynamisch" },
  { value: "unknown", label: "Weet ik niet" },
];

// Zon-pad: derde optie "Beide" bestaat alleen in de UI. Richting de bestaande
// API wordt hij op "trading" gemapt (de ruimere maat, basis × 1,3 dekt beide
// doelen) — de backend-formule blijft daarmee exact ongewijzigd.
const SOLAR_GOALS = [
  {
    value: "self_consumption",
    title: "Meer eigen zonnestroom gebruiken",
    text: "Verminder teruglevering en voorkom onnodige terugleverkosten.",
  },
  {
    value: "trading",
    title: "Dynamische handel / EMS",
    text: "Slim laden en ontladen bij wisselende stroomprijzen.",
  },
  {
    value: "both",
    title: "Beide",
    text: "Eigen zonnestroom benutten én meedoen met dynamische handel.",
  },
];

const NO_SOLAR_GOALS = [
  { value: "lower_bill", title: "Lagere energierekening" },
  { value: "trading", title: "Dynamische handel" },
  { value: "future_proof", title: "Toekomstbestendig richting 2027" },
  { value: "advice", title: "Ik wil advies" },
];

const HOUSE_TYPES = [
  { value: "", label: "Maak een keuze" },
  { value: "apartment", label: "Appartement" },
  { value: "terraced", label: "Tussenwoning" },
  { value: "corner", label: "Hoekwoning" },
  { value: "semi_detached", label: "2-onder-1-kap" },
  { value: "detached", label: "Vrijstaand" },
];

const TRI_OPTIONS = [
  { value: "yes", label: "Ja" },
  { value: "no", label: "Nee" },
  { value: "planned", label: "Gepland" },
];

const EMPTY_INTAKE = {
  gas_usage: "",
  heat_pump: "",
  ev: "",
  charger: "",
  house_type: "",
  monthly_bill: "",
  contract_type: "",
};

// Padspecifieke lead-copy: het formulier moet voelen als een waardevolle
// advies-check, niet als een generiek contactformulier.
const LEAD_COPY = {
  solar_advice: {
    title: "Laat uw batterijadvies gratis controleren",
    text:
      "Wij controleren gratis of dit advies past bij uw zonnepanelen, " +
      "teruglevering, meterkast, omvormer, netaansluiting en energiecontract.",
    button: "Gratis advies aanvragen",
  },
  nosolar_advice: {
    title: "Laat uw handelscase gratis controleren",
    text:
      "Zonder zonnepanelen draait de waarde vooral om dynamische handel, " +
      "EMS-sturing en marktverschillen. Wij controleren of een batterij in " +
      "uw situatie logisch is.",
    button: "Gratis advies aanvragen",
  },
  payback: {
    title: "Laat uw terugverdientijd gratis berekenen",
    text:
      "Wij rekenen uw situatie door op basis van verbruik, gas, woningtype, " +
      "warmtepomp, elektrische auto, batterijadvies en het Groene Vrienden " +
      "model.",
    button: "Laat mijn terugverdientijd gratis berekenen",
  },
};

// ── Geen-zonnepanelen-indicatie (client-side, fase 1/2) ────────────────────
// Zonder zonnepanelen is er geen teruglevering om op te dimensioneren; de
// indicatie volgt uit verbruiksklassen. Hoog verbruik alléén maakt nooit een
// enorm systeem: de banden zijn bewust begrensd op 21 kWh.
function noSolarIndication(usage, contractType, goal) {
  const wantsTrading = goal === "trading" || goal === "future_proof";

  let range;
  let productHint;
  if (usage < 2500) {
    range = "7 – 10 kWh";
    productHint = "Dyness S3 Tower T7 of T10";
  } else if (usage <= 5000) {
    range = wantsTrading ? "10 – 14 kWh" : "10 – 12 kWh";
    productHint = "Dyness S3 Tower T10 of T14";
  } else {
    range = wantsTrading ? "14 – 21 kWh" : "14 – 17 kWh";
    productHint = "Dyness S3 Tower T14, T17 of T21";
  }

  const notes = [];
  if (usage < 2500) {
    notes.push(
      "Bij een laag verbruik zonder zonnepanelen is de businesscase gevoeliger " +
      "voor marktomstandigheden. Een klein instapsysteem kan passen, maar laat " +
      "uw situatie eerst vrijblijvend controleren."
    );
  }
  if (wantsTrading && (contractType === "fixed" || contractType === "variable")) {
    notes.push(
      "Voor dynamische handel is een dynamisch energiecontract nodig: bij een " +
      "vaste stroomprijs valt er niets te sturen. Overstappen kan meestal " +
      "eenvoudig."
    );
  }
  if (goal === "lower_bill" && contractType === "fixed") {
    notes.push(
      "Zonder zonnepanelen en met een vast contract is de directe besparing " +
      "van een batterij zeer beperkt. Vraag advies aan voordat u investeert."
    );
  }

  return { range, productHint, notes };
}

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
// compacte kaart bóven de wizard, op desktop als sticky kaart rechts.
// CSS (calc-help-mobile/-desktop) toont er altijd precies één.
function CalcHelpCard({ onStart, className, variant }) {
  const isMobile = variant === "mobile";
  return (
    <aside className={`calc-help ${className}`}>
      <h2>Zo werkt de berekening</h2>

      <ol className="calc-help-steps">
        <li>Beantwoord enkele korte vragen</li>
        <li>Vul uw verbruik en teruglevering in</li>
        <li>Kies uw doel</li>
        <li>Ontvang direct uw batterijadvies</li>
      </ol>

      {isMobile ? (
        <button type="button" className="calc-help-cue" onClick={onStart}>
          <span className="calc-help-cue-title">
            Start hieronder met stap 1
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

  // ── Wizard-state ──
  // hasSolar: null = stap 1 (keuze) · "yes"/"no" = pad gekozen.
  // stage: actieve vraag binnen het pad. Bij ?advies=1 (deep-link vanuit
  // blogposts) default "yes" + eerste vraag, zodat het bestaande gedrag
  // (direct naar het leadformulier scrollen) blijft werken.
  const [hasSolar, setHasSolar] = useState(directAdvice ? "yes" : null);
  const [stage, setStage] = useState("usage");

  // Zon-pad: identieke veldnamen als vóór de wizard — de API-payload en de
  // backend-formule blijven exact ongewijzigd.
  const [form, setForm] = useState({
    customer_type: "residential",
    yearly_usage: "",
    goal: "",
    exported_energy: "",
    sunny_day_export: "",
  });

  const [noSolarForm, setNoSolarForm] = useState({
    yearly_usage: "",
    contract_type: "",
    goal: "",
  });

  const [result, setResult] = useState(null);
  const [lastInputs, setLastInputs] = useState(null);
  const [noSolarResult, setNoSolarResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Ná het resultaat: "Wilt u ook uw terugverdientijd berekenen?"
  // null = vraag staat open · "advice" = advies-check · "payback" = intake.
  const [postChoice, setPostChoice] = useState(null);
  const [intake, setIntake] = useState(EMPTY_INTAKE);
  const [intakeDone, setIntakeDone] = useState(false);

  const resultRef = useRef(null);
  const leadRef = useRef(null);
  const wizardRef = useRef(null);

  const leadState = useLeadCapture();

  // Bij jaarverbruik >= 2x de jaarlijkse teruglevering: jaargemiddelden
  // kunnen een veel hogere piek-teruglevering op zonnige dagen verhullen.
  // Spiegelt calculators.services.sunny_day_question_required(); de server
  // herberekent deze conditie zelf en negeert het antwoord anders.
  const yearlyUsageNum = parseFloat(form.yearly_usage);
  const exportedEnergyNum = parseFloat(form.exported_energy);
  const needsSunnyDayQuestion =
    !Number.isNaN(yearlyUsageNum) &&
    !Number.isNaN(exportedEnergyNum) &&
    yearlyUsageNum >= 2 * exportedEnergyNum;

  const activeResult = hasSolar === "no" ? noSolarResult : result;

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

  // Na een geslaagde berekening naar het resultaat scrollen — vooral op
  // mobiel blijft de gebruiker anders bij de knop hangen.
  useEffect(() => {
    if (activeResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeResult]);

  // Popup ná het resultaat, maar alleen zolang de terugverdientijd-vraag nog
  // open staat: zodra de gebruiker een vervolgkeuze maakte, is het inline
  // leadformulier leidend en zou de popup alleen maar storen.
  useEffect(() => {
    if (!activeResult || postChoice !== null || leadState.sent) return;

    const timer = setTimeout(() => {
      setModalOpen(true);
    }, MODAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [activeResult, postChoice, leadState.sent]);

  // Na een vervolgkeuze naar het leadblok of de intake scrollen.
  useEffect(() => {
    if (postChoice && leadRef.current) {
      leadRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [postChoice, intakeDone]);

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

  const updateNoSolar = (field, value) =>
    setNoSolarForm((prev) => ({ ...prev, [field]: value }));

  const updateIntake = (field, value) =>
    setIntake((prev) => ({ ...prev, [field]: value }));

  const sunnyDayExportOptions =
    form.customer_type === "business"
      ? SUNNY_DAY_EXPORT_OPTIONS_BUSINESS
      : SUNNY_DAY_EXPORT_OPTIONS_RESIDENTIAL;

  // ── Navigatie ──
  const clearResults = () => {
    setResult(null);
    setLastInputs(null);
    setNoSolarResult(null);
    setPostChoice(null);
    setIntakeDone(false);
    setError(null);
    setModalOpen(false);
  };

  const choosePath = (value) => {
    clearResults();
    setHasSolar(value);
    setStage("usage");
  };

  const resetSolarChoice = () => {
    clearResults();
    setHasSolar(null);
    setStage("usage");
  };

  const scrollToWizard = () => {
    wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goTo = (nextStage) => {
    setError(null);
    setStage(nextStage);
    scrollToWizard();
  };

  // Stappenlijst per pad (voor "Stap X van Y" en de terugknop). De zonnige-
  // dag-stap telt alleen mee wanneer de trigger daadwerkelijk geraakt is.
  const steps =
    hasSolar === "yes"
      ? ["choice", "usage", "export", ...(needsSunnyDayQuestion ? ["sunny"] : []), "goal"]
      : hasSolar === "no"
        ? ["choice", "usage", "contract", "goal"]
        : ["choice"];
  const stepIndex = hasSolar === null ? 1 : steps.indexOf(stage) + 1;

  const goBack = () => {
    if (activeResult) {
      clearResults();
      setStage("goal");
      scrollToWizard();
      return;
    }
    const i = steps.indexOf(stage);
    if (i <= 1) {
      resetSolarChoice();
    } else {
      goTo(steps[i - 1]);
    }
  };

  // ── Stapvalidatie + submits ──
  const nextFromUsage = () => {
    const usage =
      hasSolar === "yes" ? yearlyUsageNum : parseFloat(noSolarForm.yearly_usage);
    if (Number.isNaN(usage) || usage <= 0) {
      setError("Vul eerst uw jaarlijkse stroomverbruik in.");
      return;
    }
    goTo(hasSolar === "yes" ? "export" : "contract");
  };

  const nextFromExport = () => {
    if (Number.isNaN(exportedEnergyNum) || exportedEnergyNum < 0) {
      setError("Vul eerst uw jaarlijkse teruglevering in.");
      return;
    }
    goTo(needsSunnyDayQuestion ? "sunny" : "goal");
  };

  const nextFromSunny = () => {
    if (!form.sunny_day_export) {
      setError("Selecteer een optie — 'Ik weet het niet' is ook een geldig antwoord.");
      return;
    }
    goTo("goal");
  };

  const chooseContract = (value) => {
    updateNoSolar("contract_type", value);
    goTo("goal");
  };

  const submitSolar = async () => {
    if (!form.goal) {
      setError("Kies eerst uw doel.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setModalOpen(false);

    // "Beide" bestaat alleen in de UI; de API kent self_consumption/trading.
    // Mapping op trading (basis × 1,3) dekt beide doelen — formule ongewijzigd.
    const payload = {
      customer_type: form.customer_type,
      yearly_usage: yearlyUsageNum,
      goal: form.goal === "both" ? "trading" : form.goal,
      exported_energy: exportedEnergyNum,
    };
    if (needsSunnyDayQuestion && form.sunny_day_export) {
      payload.sunny_day_export = form.sunny_day_export;
    }

    try {
      const data = await postCalculator(payload);
      setLastInputs({ ...payload, ui_goal: form.goal });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitNoSolar = () => {
    if (!noSolarForm.goal) {
      setError("Kies eerst wat u wilt bereiken.");
      return;
    }
    const usage = parseFloat(noSolarForm.yearly_usage);
    setModalOpen(false);
    setError(null);
    setNoSolarResult({
      inputs: { has_solar: "no", ...noSolarForm, yearly_usage: usage },
      ...noSolarIndication(usage, noSolarForm.contract_type, noSolarForm.goal),
    });
  };

  const submitIntake = (e) => {
    e.preventDefault();
    setIntakeDone(true);
  };

  const closeModal = () => setModalOpen(false);

  // ── Leaddata: volgt het gekozen pad en de vervolgkeuze ──
  const leadCopy =
    postChoice === "payback"
      ? LEAD_COPY.payback
      : hasSolar === "no"
        ? LEAD_COPY.nosolar_advice
        : LEAD_COPY.solar_advice;

  const leadInputs = activeResult
    ? {
        path: postChoice === "payback" ? "terugverdientijd_check" : "advies_check",
        has_solar: hasSolar,
        ...(hasSolar === "no"
          ? noSolarResult.inputs
          : lastInputs),
        ...(postChoice === "payback" ? { payback_intake: intake } : {}),
      }
    : null;

  const leadResult =
    hasSolar === "no"
      ? (noSolarResult
          ? {
              type: "no_solar_first_indication",
              range: noSolarResult.range,
              product_hint: noSolarResult.productHint,
            }
          : null)
      : result;

  const showInlineLead =
    (postChoice === "advice") ||
    (postChoice === "payback" && intakeDone) ||
    (directAdvice && !activeResult);

  const openAdvice = () => {
    setPostChoice("advice");
  };

  const progressLabel = `Stap ${stepIndex} van ${steps.length}`;

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

      {hasSolar === "yes" && !activeResult && (
        <CalcHelpCard onStart={scrollToWizard} variant="mobile" className="calc-help-mobile" />
      )}

      <div ref={wizardRef}>

      {/* Voortgang + terugknop (niet op stap 1 en niet op het resultaat) */}
      {hasSolar !== null && !activeResult && (
        <div className="calc-wizard-bar">
          <button type="button" className="calc-back-btn" onClick={goBack}>
            ← Terug
          </button>
          <span className="mono calc-progress">{progressLabel}</span>
        </div>
      )}

      {/* ── Stap 1: heeft u zonnepanelen? ── */}
      {hasSolar === null && (
        <div className="calc-solar-choice calc-step-panel">
          <span className="mono calc-progress">Stap 1 van 4</span>
          <p className="calc-form-start">Heeft u zonnepanelen?</p>
          <p className="calc-solar-choice-sub">
            Met die ene vraag stellen we direct de juiste vervolgvragen — u
            hoeft nooit gegevens in te vullen die niet op uw situatie slaan.
          </p>
          <div className="calc-solar-choice-buttons">
            <button
              type="button"
              className="calc-solar-btn"
              onClick={() => choosePath("yes")}
            >
              <b>Ja, ik heb zonnepanelen</b>
              <span>Advies op basis van uw teruglevering</span>
            </button>
            <button
              type="button"
              className="calc-solar-btn"
              onClick={() => choosePath("no")}
            >
              <b>Nee, ik heb geen zonnepanelen</b>
              <span>Advies op basis van dynamische handel</span>
            </button>
          </div>
        </div>
      )}

      {hasSolar !== null && !activeResult && stage === "usage" && (
        <div className="calc-step-panel">
          <p className="calc-form-start">Wat is uw jaarlijkse stroomverbruik?</p>

          {hasSolar === "yes" && (
            <label>
              <span className="field-label">Type klant</span>
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
          )}

          <label>
            <span className="field-label">Jaarlijks stroomverbruik (kWh) <span className="field-required">*</span></span>
            <input
              className="field-input"
              type="number"
              step="0.1"
              min="0.1"
              placeholder={hasSolar === "yes" ? "4500" : "3500"}
              value={hasSolar === "yes" ? form.yearly_usage : noSolarForm.yearly_usage}
              onChange={
                hasSolar === "yes"
                  ? withValidityClear(update("yearly_usage"))
                  : (e) => updateNoSolar("yearly_usage", e.target.value)
              }
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); nextFromUsage(); } }}
            />
            <span className="field-help">Gemiddeld huishouden: ±4500 kWh per jaar.</span>
            <span className="field-help">Weet u het niet precies? Een schatting is voldoende.</span>
          </label>

          <div className="calc-step-nav">
            <button type="button" className="field-submit-button" onClick={nextFromUsage}>
              Volgende
            </button>
          </div>
        </div>
      )}

      {hasSolar === "yes" && !activeResult && stage === "export" && (
        <div className="calc-step-panel">
          <p className="calc-form-start">Hoeveel levert u jaarlijks terug aan het net?</p>

          <label>
            <span className="field-label">Jaarlijkse teruglevering (kWh) <span className="field-required">*</span></span>
            <input
              className="field-input"
              type="number"
              step="0.1"
              min="0"
              placeholder="2500"
              value={form.exported_energy}
              onChange={withValidityClear(update("exported_energy"))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); nextFromExport(); } }}
            />
            <span className="field-help">
              U vindt dit meestal in de app of jaarafrekening van uw
              energieleverancier.
            </span>
            <span className="field-help">Veel zonnepanelen: ±2500–5000 kWh per jaar.</span>
          </label>

          <div className="calc-step-nav">
            <button type="button" className="field-submit-button" onClick={nextFromExport}>
              Volgende
            </button>
          </div>
        </div>
      )}

      {hasSolar === "yes" && !activeResult && stage === "sunny" && (
        <div className="calc-step-panel">
          <div className="calc-sunny-warning">
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
              <span className="field-label">
                Hoeveel kWh levert u op een goede zonnige dag maximaal terug aan
                het net? <span className="field-required">*</span>
              </span>
              <select
                className="field-input"
                value={form.sunny_day_export}
                onChange={withValidityClear(update("sunny_day_export"))}
              >
                {sunnyDayExportOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="calc-step-nav">
            <button type="button" className="field-submit-button" onClick={nextFromSunny}>
              Volgende
            </button>
          </div>
        </div>
      )}

      {hasSolar === "no" && !activeResult && stage === "contract" && (
        <div className="calc-step-panel">
          <p className="calc-form-start">Wat voor energiecontract heeft u?</p>
          <div className="calc-choice-grid">
            {CONTRACT_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`calc-solar-btn ${noSolarForm.contract_type === option.value ? "active" : ""}`}
                onClick={() => chooseContract(option.value)}
              >
                <b>{option.label}</b>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasSolar !== null && !activeResult && stage === "goal" && (
        <div className="calc-step-panel">
          <p className="calc-form-start">
            {hasSolar === "yes" ? "Wat is uw doel?" : "Wat wilt u bereiken?"}
          </p>

          <div className="goal-choice goal-choice-wizard">
            {(hasSolar === "yes" ? SOLAR_GOALS : NO_SOLAR_GOALS).map((option) => {
              const selected =
                (hasSolar === "yes" ? form.goal : noSolarForm.goal) === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`goal-card goal-card-btn ${selected ? "active" : ""}`}
                  onClick={() =>
                    hasSolar === "yes"
                      ? setForm({ ...form, goal: option.value })
                      : updateNoSolar("goal", option.value)
                  }
                >
                  <span className="goal-title">{option.title}</span>
                  {option.text && <span className="goal-text">{option.text}</span>}
                  <span className="goal-check" aria-hidden="true">✓</span>
                </button>
              );
            })}
          </div>

          <div className="calc-step-nav">
            <button
              type="button"
              className="field-submit-button"
              onClick={hasSolar === "yes" ? submitSolar : submitNoSolar}
              disabled={loading}
            >
              {loading
                ? "Bezig…"
                : hasSolar === "yes"
                  ? "Bereken mijn batterijadvies"
                  : "Bereken mijn eerste indicatie"}
            </button>
            <p className="calc-submit-note">
              ✓ Gratis advies • ✓ Direct resultaat • ✓ Geen e-mailadres nodig
            </p>
          </div>
        </div>
      )}

      {error && <div className="calc-error mono">{error}</div>}

      </div>

      {/* ── Resultaat: zon-pad (bestaande API-respons, ongewijzigd) ── */}
      {hasSolar === "yes" && result && (
        <div className="calc-result" ref={resultRef}>
          <span className="mono calc-result-label">Uw batterijadvies</span>

          <p className="calc-result-goal">
            Advies voor <strong>{lastInputs?.ui_goal === "both" ? "zelfconsumptie én dynamische handel" : result.goal_label}</strong>
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
        </div>
      )}

      {/* ── Resultaat: geen-zon-pad (eerste indicatie) ── */}
      {hasSolar === "no" && noSolarResult && (
        <div className="calc-result" ref={resultRef}>
          <span className="mono calc-result-label">Eerste indicatie — zonder zonnepanelen</span>

          <div className="calc-result-grid">
            <div className="calc-card calc-card-primary">
              <span className="calc-card-label">Indicatieve capaciteit</span>
              <b className="calc-card-value">{noSolarResult.range}</b>
              <span className="calc-card-help">Eerste indicatie op basis van uw verbruik en doel</span>
              <span className="calc-card-rangenote">
                Dit is een eerste indicatie. Bij een adviesgesprek rekenen wij uw
                situatie exact door, inclusief netaansluiting en energiecontract.
              </span>
            </div>

            <div className="calc-card calc-card-product">
              <span className="calc-card-label">Denk aan</span>
              <b className="calc-card-product-name">{noSolarResult.productHint}</b>
            </div>
          </div>

          <div className="calc-card calc-card-explain">
            Zonder zonnepanelen slaat de batterij geen eigen zonnestroom op: de
            zelfconsumptiewaarde is € 0. De waarde komt vooral uit dynamische
            handel en slimme EMS-sturing — goedkoop laden bij lage of negatieve
            stroomprijzen en ontladen tijdens dure momenten. Die opbrengst is
            marktafhankelijk en verschilt per jaar; wij geven daarom bewust geen
            gegarandeerde bedragen.
          </div>

          {noSolarResult.notes.map((noteText) => (
            <div className="calc-note" key={noteText}>{noteText}</div>
          ))}
        </div>
      )}

      {/* ── Vervolgstap na elk resultaat: terugverdientijd? ── */}
      {activeResult && postChoice === null && (
        <div className="calc-step-panel calc-payback-q">
          <p className="calc-form-start">Wilt u ook uw terugverdientijd berekenen?</p>
          <div className="calc-solar-choice-buttons">
            <button
              type="button"
              className="calc-solar-btn"
              onClick={() => setPostChoice("payback")}
            >
              <b>Ja, bereken mijn terugverdientijd</b>
              <span>Enkele extra vragen over uw woning en verbruik</span>
            </button>
            <button
              type="button"
              className="calc-solar-btn"
              onClick={() => setPostChoice("advice")}
            >
              <b>Nee, laat mijn advies gratis controleren</b>
              <span>Een specialist kijkt vrijblijvend mee</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Terugverdientijd-intake (fase 2: datacapture; engine volgt in fase 3) ── */}
      {postChoice === "payback" && !intakeDone && (
        <form className="calc-step-panel" onSubmit={submitIntake} ref={leadRef}>
          <p className="calc-form-start">Uw situatie voor de terugverdientijd</p>

          <label>
            <span className="field-label">Jaarlijks gasverbruik (m³)</span>
            <input
              className="field-input"
              type="number"
              min="0"
              placeholder="1000"
              value={intake.gas_usage}
              onChange={(e) => updateIntake("gas_usage", e.target.value)}
            />
            <span className="field-help">Geen gasaansluiting? Laat leeg of vul 0 in.</span>
          </label>

          {[
            ["heat_pump", "Heeft u een warmtepomp?"],
            ["ev", "Heeft u een elektrische auto?"],
            ["charger", "Heeft u een laadpaal?"],
          ].map(([field, label]) => (
            <div className="calc-tri" key={field}>
              <span className="field-label">{label}</span>
              <div className="calc-tri-row">
                {TRI_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`calc-opt-btn ${intake[field] === option.value ? "active" : ""}`}
                    onClick={() => updateIntake(field, option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <label>
            <span className="field-label">Woningtype</span>
            <select
              className="field-input"
              value={intake.house_type}
              onChange={(e) => updateIntake("house_type", e.target.value)}
            >
              {HOUSE_TYPES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="field-label">Huidige maandlast energie (€)</span>
            <input
              className="field-input"
              type="number"
              min="0"
              placeholder="250"
              value={intake.monthly_bill}
              onChange={(e) => updateIntake("monthly_bill", e.target.value)}
            />
          </label>

          {(hasSolar === "yes" ||
            !noSolarForm.contract_type ||
            noSolarForm.contract_type === "unknown") && (
            <label>
              <span className="field-label">Type energiecontract</span>
              <select
                className="field-input"
                value={intake.contract_type}
                onChange={(e) => updateIntake("contract_type", e.target.value)}
              >
                <option value="">Maak een keuze</option>
                {CONTRACT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          )}

          <div className="calc-step-nav">
            <button type="submit" className="field-submit-button">
              Volgende
            </button>
          </div>
        </form>
      )}

      {postChoice === "payback" && intakeDone && (
        <div className="calc-note calc-payback-note" ref={leadRef}>
          <strong>Bijna klaar:</strong> uw terugverdientijd-berekening wordt in
          de volgende stap uitgebreid met het Groene Vrienden model voor 2024,
          2025 en 2027. Laat uw gegevens achter en u ontvangt de volledige
          doorrekening gratis.
        </div>
      )}

      {(showInlineLead || postChoice === "advice") && (
        <div id="advies" ref={postChoice === "advice" ? leadRef : undefined}>
          <LeadCaptureForm
            state={leadState}
            calculatorInputs={leadInputs}
            calculatorResult={leadResult}
            variant="inline"
            copy={activeResult ? leadCopy : undefined}
          />
        </div>
      )}

      </div>

      {hasSolar === "yes" && !activeResult && (
        <CalcHelpCard onStart={scrollToWizard} variant="desktop" className="calc-help-desktop" />
      )}
      </div>

      {/* Lead-CTA — resultgedreven: verschijnt alleen ná een resultaat en
          zolang er nog geen vervolgkeuze is gemaakt. */}
      {activeResult && postChoice === null && (
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

      {/* Conversie-strip die terugleidt naar de wizard (scrollt, geen
          lead-modal). Bewust ná de info, vóór de FAQ/artikelen. */}
      <section className="calc-recalc">
        <div className="calc-recalc-inner">
          <div className="calc-recalc-text">
            <h2>Bereken direct welke batterij past</h2>
            <p>
              Beantwoord enkele korte vragen en ontvang direct een eerste
              indicatie van de juiste batterijcapaciteit.
            </p>
          </div>
          <button
            type="button"
            className="cta-button cta-button-sm calc-recalc-btn"
            onClick={scrollToWizard}
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
            <summary>Werkt de calculator ook zonder zonnepanelen?</summary>
            <p>
              Ja. Zonder zonnepanelen kijkt de calculator naar dynamische handel
              en slimme EMS-sturing in plaats van naar teruglevering.
            </p>
          </details>
          <details className="calc-faq-item">
            <summary>Kan ik ook dynamische handel berekenen?</summary>
            <p>
              Ja. Kies bij het doel voor “dynamische handel”, dan rekent de
              calculator met sturen op dynamische stroomprijzen.
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
          calculatorInputs={leadInputs}
          calculatorResult={leadResult}
          variant="modal"
          copy={activeResult ? leadCopy : undefined}
          onDismiss={closeModal}
        />
      </LeadModal>
    </article>
  );
}
