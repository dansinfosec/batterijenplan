import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { postCalculator } from "../api.js";
import LeadCaptureForm, { useLeadCapture } from "../components/LeadCaptureForm.jsx";
import { setPageMeta, setJsonLd, ORGANIZATION_SCHEMA } from "../seo.js";
import { friendlyValidity, withValidityClear } from "../formValidation.js";

// ── Centrale step-scroll ──────────────────────────────────────────────────
// Eén betrouwbare functie voor alle stapovergangen: scrollt naar de bovenkant
// van de actieve vraagkaart, met ruimte voor de sticky header. Respecteert
// prefers-reduced-motion. De eindpositie wordt berekend uit de werkelijke
// layout (getBoundingClientRect), zodat een onboardingblok dat net verdween
// de landing niet meer verschuift.
function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Sticky-headerhoogte dynamisch meten (verschilt desktop/mobiel) + visuele marge.
function calcHeaderOffset() {
  const header = document.querySelector(".site-header");
  const h = header ? header.getBoundingClientRect().height : 64;
  return h + 20;
}

function scrollToCalculatorTarget(el) {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - calcHeaderOffset();
  window.scrollTo({
    top: Math.max(0, top),
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

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


// Lead-magnet: het detailrapport (terugverdientijd, maandvoordeel, product,
// prijs, financiering) wordt telefonisch besproken en zit achter het
// leadformulier. De copy hieronder staat bóven dat formulier.
const LEAD_COPY = {
  solar: {
    title: "Ontvang uw persoonlijke terugverdientijd",
    text:
      "Laat uw gegevens achter, dan bespreken wij uw persoonlijke berekening " +
      "telefonisch.",
    button: "Ontvang mijn terugverdientijd",
  },
  nosolar: {
    title: "Laat uw batterijcase controleren",
    text:
      "Laat uw gegevens achter, dan bespreken wij uw persoonlijke berekening " +
      "telefonisch.",
    button: "Laat mijn batterijcase controleren",
  },
};

// De vergrendelde rapportkaarten onder het teaser-resultaat. Bewust géén
// (nep)cijfers: alleen de titel en wat na de gratis controle volgt.
const LOCKED_CARDS = [
  { title: "Terugverdientijd", text: "Beschikbaar na gratis controle" },
  { title: "Maandvoordeel", text: "Wordt berekend op basis van uw contract en teruglevering" },
  { title: "Beste batterijconfiguratie", text: "Wij controleren capaciteit, omvormer en netaansluiting" },
  { title: "Warmtefonds-check", text: "Wij kijken of financiering via het Warmtefonds logisch is" },
];

const GOAL_LABELS = {
  self_consumption: "Zelfconsumptie",
  trading: "Dynamische handel",
  both: "Zelfconsumptie én dynamische handel",
  lower_bill: "Lagere energierekening",
  future_proof: "Toekomstbestendig richting 2027",
  advice: "Persoonlijk advies",
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

  // Lead-magnet: na het teaser-resultaat blijft het detailrapport vergrendeld
  // tot de bezoeker het leadformulier opent. false = alleen teaser + slot-
  // kaarten + CTA; true = leadformulier zichtbaar.
  const [leadUnlocked, setLeadUnlocked] = useState(false);

  const resultRef = useRef(null);
  const leadRef = useRef(null);
  const wizardRef = useRef(null);
  // Wijst altijd naar de momenteel gerenderde stap-vraagkaart (usage/export/
  // sunny/contract/goal); precies één daarvan is tegelijk gemount.
  const stepRef = useRef(null);
  // Voorkomt een scroll bij de eerste paginalaad (alleen bij echte overgangen).
  const didMountScroll = useRef(false);

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

  // "Ja" en "Ik laat zonnepanelen plaatsen" volgen hetzelfde pad: de bestaande
  // teruglevering-flow + backend-API. "Nee" gaat naar de eerste-indicatie
  // zonder teruglevering. Zo hoeft de rest van de wizard maar één onderscheid
  // te kennen: solarPath vs. het geen-zon-pad.
  const solarPath = hasSolar === "yes" || hasSolar === "planned";

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

  // Eén identifier voor de zichtbare stap/toestand; stuurt de centrale scroll.
  const activeStepKey = leadState.sent
    ? "success"
    : leadUnlocked
      ? "lead"
      : activeResult
        ? "result"
        : hasSolar === null
          ? "choice"
          : stage;

  // ── Centrale step-scroll ──
  // Draait ná render (useLayoutEffect) + twee requestAnimationFrames, zodat de
  // nieuwe stap is gerenderd, een eventueel onboardingblok is verdwenen en de
  // uiteindelijke layoutpositie bekend is. Géén vaste timeout. Scrollt nooit
  // bij de eerste paginalaad en niet op het beginscherm ("choice"). Vervangt
  // de vroegere losse result-/lead-scrolls, zodat er nooit dubbel gescrold wordt.
  useLayoutEffect(() => {
    if (!didMountScroll.current) {
      didMountScroll.current = true;
      return;
    }
    if (activeStepKey === "choice") return;
    // Blog-deeplink (?advies=1) heeft zijn eigen scroll naar #advies.
    if (directAdvice && !activeResult) return;

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        let target = stepRef.current;
        if (activeStepKey === "result") target = resultRef.current;
        else if (activeStepKey === "lead" || activeStepKey === "success") {
          target = leadRef.current;
        }
        scrollToCalculatorTarget(target);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [activeStepKey, directAdvice, activeResult]);

  // Popup ná het resultaat, maar alleen zolang het leadformulier nog niet
  // inline is geopend: zodra de bezoeker op de CTA klikt, is het inline
  // formulier leidend en zou de popup alleen maar storen.
  useEffect(() => {
    if (!activeResult || leadUnlocked || leadState.sent) return;

    const timer = setTimeout(() => {
      setModalOpen(true);
    }, MODAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [activeResult, leadUnlocked, leadState.sent]);

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

  const sunnyDayExportOptions =
    form.customer_type === "business"
      ? SUNNY_DAY_EXPORT_OPTIONS_BUSINESS
      : SUNNY_DAY_EXPORT_OPTIONS_RESIDENTIAL;

  // ── Navigatie ──
  const clearResults = () => {
    setResult(null);
    setLastInputs(null);
    setNoSolarResult(null);
    setLeadUnlocked(false);
    setError(null);
    setModalOpen(false);
  };

  // Klanttype wordt nu in stap 1 gekozen (voor beide zon-antwoorden), dus
  // gedeeld door beide paden. Reset de zonnige-dag-keuze mee: particulier en
  // zakelijk hebben elk hun eigen bandbreedtes.
  const chooseCustomerType = (value) =>
    setForm({ ...form, customer_type: value, sunny_day_export: "" });

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

  // Alleen voor de onboarding-CTA ("Start hieronder met stap 1 ↓"): scroll naar
  // stap 1 op het beginscherm. De stapovergangen zelf scrollen via het centrale
  // useLayoutEffect (na render), niet hier.
  const scrollToWizard = () => scrollToCalculatorTarget(wizardRef.current);

  // Bij een validatiefout: naar de actieve stapkaart scrollen en het eerste
  // invoerveld focussen, zodat de foutmelding + het veld in beeld staan.
  const focusFirstInvalid = () => {
    const panel = stepRef.current;
    if (!panel) return;
    scrollToCalculatorTarget(panel);
    const field = panel.querySelector("input, select, textarea");
    if (field) field.focus({ preventScroll: true });
  };

  const goTo = (nextStage) => {
    setError(null);
    setStage(nextStage);
    // Scrollen gebeurt centraal in het useLayoutEffect zodra de nieuwe stap
    // is gerenderd (voorkomt scrollen op een nog-niet-bestaande layout).
  };

  // Stappenlijst per pad (voor "Stap X van Y" en de terugknop). De zonnige-
  // dag-stap telt alleen mee wanneer de trigger daadwerkelijk geraakt is.
  const steps =
    solarPath
      ? ["choice", "usage", "export", ...(needsSunnyDayQuestion ? ["sunny"] : []), "goal"]
      : hasSolar === "no"
        ? ["choice", "usage", "contract", "goal"]
        : ["choice"];
  const stepIndex = hasSolar === null ? 1 : steps.indexOf(stage) + 1;

  const goBack = () => {
    if (activeResult) {
      clearResults();
      setStage("goal");
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
      solarPath ? yearlyUsageNum : parseFloat(noSolarForm.yearly_usage);
    if (Number.isNaN(usage) || usage <= 0) {
      setError("Vul eerst uw jaarlijkse stroomverbruik in.");
      focusFirstInvalid();
      return;
    }
    goTo(solarPath ? "export" : "contract");
  };

  const nextFromExport = () => {
    if (Number.isNaN(exportedEnergyNum) || exportedEnergyNum < 0) {
      setError("Vul eerst uw jaarlijkse teruglevering in.");
      focusFirstInvalid();
      return;
    }
    goTo(needsSunnyDayQuestion ? "sunny" : "goal");
  };

  const nextFromSunny = () => {
    if (!form.sunny_day_export) {
      setError("Selecteer een optie — 'Ik weet het niet' is ook een geldig antwoord.");
      focusFirstInvalid();
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
      focusFirstInvalid();
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
      focusFirstInvalid();
      return;
    }
    const usage = parseFloat(noSolarForm.yearly_usage);
    setModalOpen(false);
    setError(null);
    setNoSolarResult({
      // Zonder zonnepanelen is teruglevering 0 kWh; expliciet vastleggen zodat
      // de leaddata dat toont. Klanttype (uit stap 1) reist mee zodat ook het
      // geen-zon-pad particulier/zakelijk onderscheidt.
      inputs: {
        has_solar: "no",
        customer_type: form.customer_type,
        exported_energy: 0,
        ...noSolarForm,
        yearly_usage: usage,
      },
      ...noSolarIndication(usage, noSolarForm.contract_type, noSolarForm.goal),
    });
  };

  const closeModal = () => setModalOpen(false);

  // ── Leaddata: het PUBLIEKE resultaat is een teaser, maar de lead-payload
  // blijft volledig — sales heeft alle rekendetails nodig. ──
  const leadCopy = hasSolar === "no" ? LEAD_COPY.nosolar : LEAD_COPY.solar;

  const leadInputs = activeResult
    ? {
        path: "advies_check",
        has_solar: hasSolar,
        ...(hasSolar === "no" ? noSolarResult.inputs : lastInputs),
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

  // De CTA opent het leadformulier (en scrollt ernaartoe via het effect).
  const unlockLead = () => setLeadUnlocked(true);

  // Klanttype-/doellabels voor de teaser-chips.
  const customerTypeLabel =
    form.customer_type === "business" ? "Zakelijk" : "Particulier";
  const goalLabel = solarPath
    ? GOAL_LABELS[lastInputs?.ui_goal] || null
    : GOAL_LABELS[noSolarForm.goal] || null;

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

      {/* Wat heeft u nodig? — voorbereiding, alleen op het startscherm. */}
      {hasSolar === null && (
        <div className="calc-needs">
          <p className="calc-needs-title">Wat heeft u nodig?</p>
          <ul className="calc-needs-list">
            <li>Jaarlijks stroomverbruik</li>
            <li>Of u zonnepanelen heeft</li>
            <li>Jaarlijkse teruglevering, indien bekend</li>
            <li>Uw doel: eigen verbruik of dynamische handel</li>
          </ul>
          <p className="calc-needs-help">
            Deze gegevens vindt u meestal terug in uw energieleverancier-app of
            jaarafrekening.
          </p>
        </div>
      )}

      {/* Onboardingblok: uitsluitend op het beginscherm (vóór stap 1). Verdwijnt
          zodra een pad is gekozen — geen pop-in boven stap 2, geen layout-shift. */}
      {hasSolar === null && (
        <CalcHelpCard onStart={scrollToWizard} variant="mobile" className="calc-help-mobile" />
      )}

      <div className="calc-wizard" ref={wizardRef}>

      {/* Voortgang + terugknop (niet op stap 1 en niet op het resultaat) */}
      {hasSolar !== null && !activeResult && (
        <div className="calc-wizard-bar">
          <button type="button" className="calc-back-btn" onClick={goBack}>
            ← Terug
          </button>
          <span className="mono calc-progress">{progressLabel}</span>
        </div>
      )}

      {/* Geen-zon-pad: teruglevering is meestal 0 kWh — dat leggen we direct uit. */}
      {hasSolar === "no" && !activeResult && (
        <div className="calc-note calc-nosolar-note">
          Zonder zonnepanelen is teruglevering meestal 0 kWh. Een batterij kan
          dan alleen interessant zijn bij specifieke situaties, zoals dynamische
          sturing of zakelijk energiebeheer.
        </div>
      )}

      {/* ── Stap 1: klanttype + zonnepanelen (voor beide klanttypen) ── */}
      {hasSolar === null && (
        <div className="calc-solar-choice calc-step-panel">
          <span className="mono calc-progress">Stap 1 van 4</span>

          <p className="calc-form-start">Bent u particulier of zakelijk?</p>
          <div className="calc-type-toggle">
            {CUSTOMER_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`calc-type-btn ${form.customer_type === option.value ? "active" : ""}`}
                onClick={() => chooseCustomerType(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="calc-form-start calc-solar-q">Heeft u zonnepanelen?</p>
          <p className="calc-solar-choice-sub">
            Zo stellen we direct de juiste vervolgvragen — u vult nooit gegevens
            in die niet op uw situatie slaan.
          </p>
          <div className="calc-solar-choice-buttons calc-solar-choice-buttons--three">
            <button
              type="button"
              className="calc-solar-btn"
              onClick={() => choosePath("yes")}
            >
              <b>Ja</b>
              <span>Advies op basis van uw teruglevering</span>
            </button>
            <button
              type="button"
              className="calc-solar-btn"
              onClick={() => choosePath("no")}
            >
              <b>Nee</b>
              <span>Advies op basis van dynamische handel</span>
            </button>
            <button
              type="button"
              className="calc-solar-btn"
              onClick={() => choosePath("planned")}
            >
              <b>Ik laat zonnepanelen plaatsen</b>
              <span>We rekenen met uw verwachte teruglevering</span>
            </button>
          </div>
        </div>
      )}

      {hasSolar !== null && !activeResult && stage === "usage" && (
        <div className="calc-step-panel" ref={stepRef}>
          <p className="calc-form-start">Wat is uw jaarlijkse stroomverbruik?</p>

          <label>
            <span className="field-label">Jaarlijks stroomverbruik (kWh) <span className="field-required">*</span></span>
            <input
              className="field-input"
              type="number"
              step="0.1"
              min="0.1"
              placeholder={solarPath ? "4500" : "3500"}
              value={solarPath ? form.yearly_usage : noSolarForm.yearly_usage}
              onChange={
                solarPath
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

      {solarPath && !activeResult && stage === "export" && (
        <div className="calc-step-panel" ref={stepRef}>
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

      {solarPath && !activeResult && stage === "sunny" && (
        <div className="calc-step-panel" ref={stepRef}>
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
        <div className="calc-step-panel" ref={stepRef}>
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
        <div className="calc-step-panel" ref={stepRef}>
          <p className="calc-form-start">
            {solarPath ? "Wat is uw doel?" : "Wat wilt u bereiken?"}
          </p>

          <div className="goal-choice goal-choice-wizard">
            {(solarPath ? SOLAR_GOALS : NO_SOLAR_GOALS).map((option) => {
              const selected =
                (solarPath ? form.goal : noSolarForm.goal) === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`goal-card goal-card-btn ${selected ? "active" : ""}`}
                  onClick={() =>
                    solarPath
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
              onClick={solarPath ? submitSolar : submitNoSolar}
              disabled={loading}
            >
              {loading
                ? "Bezig…"
                : solarPath
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

      {/* ── Teaser-resultaat (publiek): alleen bevestiging + indicatieve range.
          Terugverdientijd, maandvoordeel, product, prijs en financiering
          worden telefonisch besproken en zitten achter het leadformulier. ── */}
      {activeResult && (
        <div className="calc-result calc-teaser" ref={resultRef}>
          <span className="mono calc-result-label">
            {solarPath
              ? "Uw eerste batterijadvies is klaar"
              : "Uw situatie vraagt om extra controle"}
          </span>

          <p className="calc-teaser-text">
            {solarPath
              ? "Op basis van uw verbruik, teruglevering en gekozen doel hebben wij een eerste indicatie berekend. Voor de exacte terugverdientijd en beste batterijconfiguratie controleren wij uw situatie telefonisch."
              : "Zonder zonnepanelen hangt de waarde van een batterij vooral af van dynamische sturing, energiecontract en zakelijk energiebeheer. Wij controleren dit telefonisch."}
          </p>

          <div className="calc-teaser-headline">
            <span className="calc-card-label">Indicatieve capaciteit</span>
            <b className="calc-card-value">
              {solarPath
                ? `${result.lower_range} – ${result.upper_range} kWh`
                : noSolarResult.range}
            </b>
          </div>

          <div className="calc-teaser-meta">
            <span className="calc-chip">{customerTypeLabel}</span>
            {goalLabel && <span className="calc-chip">{goalLabel}</span>}
          </div>
        </div>
      )}

      {/* ── Vergrendelde rapportkaarten (geen nepcijfers) ── */}
      {activeResult && (
        <div className="calc-locked-grid">
          {LOCKED_CARDS.map((card) => (
            <div className="calc-locked-card" key={card.title}>
              <span className="calc-lock-pill" aria-hidden="true">🔒 Vergrendeld</span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Bevestiging na verzenden: rapport wordt telefonisch besproken ── */}
      {activeResult && leadState.sent && (
        <div className="lead-form lead-form-success lead-form--inline" ref={leadRef}>
          <h2>Bedankt, uw berekening is ontvangen.</h2>
          <p>
            Wij nemen telefonisch contact met u op om uw persoonlijke
            terugverdientijd, batterijadvies en eventuele Warmtefonds-
            mogelijkheden door te nemen.
          </p>
        </div>
      )}

      {/* ── Gated CTA: opent het leadformulier ── */}
      {activeResult && !leadState.sent && !leadUnlocked && (
        <section className="calc-report-cta">
          <h2>
            {solarPath
              ? "Ontvang uw persoonlijke terugverdientijd"
              : "Laat uw batterijcase controleren"}
          </h2>
          <p>
            {solarPath
              ? "Laat uw berekening gratis controleren. Wij nemen telefonisch contact met u op om de terugverdientijd, maandelijkse opbrengst, batterijcapaciteit en eventuele Warmtefonds-mogelijkheden door te nemen."
              : "Laat uw berekening gratis controleren. Wij nemen telefonisch contact met u op om dynamische sturing, uw energiecontract en de juiste batterijconfiguratie door te nemen."}
          </p>
          <button type="button" className="cta-button cta-button-sm" onClick={unlockLead}>
            {solarPath ? "Ontvang mijn terugverdientijd" : "Laat mijn batterijcase controleren"}
          </button>
          <p className="calc-report-cta-sub">Gratis en vrijblijvend</p>
        </section>
      )}

      {/* ── Leadformulier: de stap die het persoonlijke rapport ontgrendelt ── */}
      {((activeResult && leadUnlocked && !leadState.sent) ||
        (directAdvice && !activeResult)) && (
        <div id="advies" ref={leadRef}>
          {activeResult && (
            <p className="calc-lead-microcopy">
              Laat uw gegevens achter, dan bespreken wij uw persoonlijke
              berekening telefonisch.
            </p>
          )}
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

      {hasSolar === null && (
        <CalcHelpCard onStart={scrollToWizard} variant="desktop" className="calc-help-desktop" />
      )}
      </div>

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

      <LeadModal open={modalOpen && !leadState.sent} onClose={closeModal}>
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
