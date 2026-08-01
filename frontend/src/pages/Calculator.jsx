import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { postCalculator } from "../api.js";
import LeadCaptureForm, { useLeadCapture } from "../components/LeadCaptureForm.jsx";
import Stage2Analysis from "../components/Stage2Analysis.jsx";
import ChoiceCard from "../components/calculator/ChoiceCard.jsx";
import CalcProgress from "../components/calculator/CalcProgress.jsx";
import LiveSummary from "../components/calculator/LiveSummary.jsx";
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

export default function Calculator() {
  const [searchParams] = useSearchParams();
  const directAdvice = searchParams.get("advies") === "1";

  // ── Wizard-state ──
  // hasSolar: null = stap 1 (keuze) · "yes"/"no" = pad gekozen.
  // stage: actieve vraag binnen het pad. Bij ?advies=1 (deep-link vanuit
  // blogposts) default "yes" + eerste vraag, zodat het bestaande gedrag
  // (direct naar het leadformulier scrollen) blijft werken.
  const [hasSolar, setHasSolar] = useState(directAdvice ? "yes" : null);
  // Zon-pad start direct in de gecombineerde energieprofiel-stap (verbruik +
  // teruglevering samen); geen-zon-pad start bij het losse verbruik.
  const [stage, setStage] = useState(directAdvice ? "energy" : "usage");

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

  const resultRef = useRef(null);
  const leadRef = useRef(null);
  const wizardRef = useRef(null);
  // Wijst altijd naar de momenteel gerenderde stap-vraagkaart (usage/export/
  // contract/goal); precies één daarvan is tegelijk gemount.
  const stepRef = useRef(null);
  // De conditionele zonnige-dag-vraag binnen de teruglevering-stap.
  const sunnyRef = useRef(null);
  const sunnyShownRef = useRef(false);
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
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [directAdvice]);

  // Eén identifier voor de zichtbare stap/toestand; stuurt de centrale scroll.
  // Na verzenden: "success" (scrollt naar Stage 2). Zodra er een resultaat is:
  // "result" (scrollt naar het rapport); het inline leadformulier staat er als
  // vervolgstap direct onder. Het aparte "lead"-scrolldoel verviel met de gate.
  const activeStepKey = leadState.sent
    ? "success"
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
        // Resultaat: scroll betrouwbaar naar de echte teaser-kaart (geldt voor
        // zowel het zon- als het geen-zon-pad, één gedeelde wrapper). Native
        // scrollIntoView + scroll-margin-top klaart de sticky header en pakt de
        // definitieve layout, ook nadat de goal-stap en de CTA-strip verdwenen.
        if (activeStepKey === "result") {
          if (resultRef.current) {
            resultRef.current.scrollIntoView({
              behavior: prefersReducedMotion() ? "auto" : "smooth",
              block: "start",
            });
          }
          return;
        }
        const target =
          activeStepKey === "lead" || activeStepKey === "success"
            ? leadRef.current
            : stepRef.current;
        scrollToCalculatorTarget(target);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [activeStepKey, directAdvice, activeResult]);

  // Conditionele zonnige-dag-vraag binnen de teruglevering-stap: géén volledige
  // step-scroll (de stap verandert niet). Scroll alleen naar de vraag als die
  // buiten beeld valt, één keer bij verschijnen, met dezelfde header-offset.
  const showSunnyQuestion =
    solarPath && !activeResult && stage === "energy" && needsSunnyDayQuestion;
  useEffect(() => {
    if (!showSunnyQuestion) {
      sunnyShownRef.current = false;
      return;
    }
    if (sunnyShownRef.current) return;
    sunnyShownRef.current = true;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = sunnyRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.bottom > window.innerHeight || r.top < 0) {
          scrollToCalculatorTarget(el);
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [showSunnyQuestion]);

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
    setError(null);
  };

  // Klanttype wordt nu in stap 1 gekozen (voor beide zon-antwoorden), dus
  // gedeeld door beide paden. Reset de zonnige-dag-keuze mee: particulier en
  // zakelijk hebben elk hun eigen bandbreedtes.
  const chooseCustomerType = (value) =>
    setForm({ ...form, customer_type: value, sunny_day_export: "" });

  const choosePath = (value) => {
    clearResults();
    setHasSolar(value);
    // Zon ("yes"/"planned") gaat naar de gecombineerde energieprofiel-stap;
    // "nee" volgt het losse verbruik-pad.
    setStage(value === "yes" || value === "planned" ? "energy" : "usage");
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

  // Stappenlijst per pad (voor "Stap X van Y" en de terugknop). Zon-pad:
  // verbruik + teruglevering (+ conditionele zonnige-dag-vraag) vormen samen
  // één "energy"-stap → maximaal 3 stappen. Geen-zon-pad houdt de bestaande
  // 4-staps-progressie (verbruik en contract als losse stappen).
  const steps =
    solarPath
      ? ["choice", "energy", "goal"]
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
  // Geen-zon-pad: verbruik is een losse stap vóór het energiecontract.
  const nextFromUsage = () => {
    const usage = parseFloat(noSolarForm.yearly_usage);
    if (Number.isNaN(usage) || usage <= 0) {
      setError("Vul eerst uw jaarlijkse stroomverbruik in.");
      focusFirstInvalid();
      return;
    }
    goTo("contract");
  };

  // Zon-pad: verbruik én teruglevering staan samen in de energieprofiel-stap.
  // Beide hoofdvelden worden pas bij deze ene Volgende-knop gevalideerd; is de
  // zonnige-dag-vraag getoond, dan telt die als derde verplichte veld
  // ("Ik weet het niet" is ook een geldig antwoord).
  const nextFromEnergy = () => {
    if (Number.isNaN(yearlyUsageNum) || yearlyUsageNum <= 0) {
      setError("Vul eerst uw jaarlijkse stroomverbruik in.");
      focusFirstInvalid();
      return;
    }
    if (Number.isNaN(exportedEnergyNum) || exportedEnergyNum < 0) {
      setError("Vul ook uw jaarlijkse teruglevering in.");
      const inputs = stepRef.current?.querySelectorAll('input[type="number"]');
      const exportInput = inputs && inputs[1];
      if (exportInput) exportInput.focus({ preventScroll: true });
      return;
    }
    if (needsSunnyDayQuestion && !form.sunny_day_export) {
      setError("Selecteer een optie — 'Ik weet het niet' is ook een geldig antwoord.");
      const sel = sunnyRef.current?.querySelector("select");
      if (sel) {
        scrollToCalculatorTarget(sunnyRef.current);
        sel.focus({ preventScroll: true });
      }
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

  // Klanttype-/doellabels voor de teaser-chips.
  const customerTypeLabel =
    form.customer_type === "business" ? "Zakelijk" : "Particulier";
  const goalLabel = solarPath
    ? GOAL_LABELS[lastInputs?.ui_goal] || null
    : GOAL_LABELS[noSolarForm.goal] || null;

  const progressLabel = `Stap ${stepIndex} van ${steps.length}`;

  return (
    <article className="calc2-page calc-page">
      {/* ── Calculator-hero: vloeit direct de wizard in ── */}
      <header className="calc2-hero">
        <div className="calc2-hero-deco" aria-hidden="true" />
        <div className="container calc2-container">
          <p className="mono kicker calc2-kicker">Calculator · batterijcapaciteit · advies</p>
          <h1>
            Thuisbatterij <span className="accent">Calculator</span>
          </h1>
          <p className="sub calc2-intro">
            Bereken gratis welke batterijcapaciteit past bij uw stroomverbruik,
            teruglevering en energiedoel.
          </p>
          <p className="calc2-hero-trust">
            Gratis · direct resultaat · geen e-mailadres nodig voor de eerste indicatie
          </p>

          {/* Educatieve indicatoren — geen harde beloftes (bestaande teksten) */}
          <div className="calc2-strip">
            <div><b>10–20 kWh</b><span>Vaak geschikt voor woningen</span></div>
            <div><b>250 dagen</b><span>Zonopwek als rekenbasis</span></div>
            <div><b>Gratis check</b><span>Laat uw uitkomst controleren</span></div>
          </div>
        </div>
      </header>

      <div className="container calc2-container">
      <div className="calc2-layout">
      <div className="calc2-main">

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

      <div className="calc-wizard calc2-wizard" ref={wizardRef}>

      {/* Voortgang + terugknop: verbonden stappen zodra het pad bekend is. */}
      {hasSolar !== null && (
        <CalcProgress
          steps={steps}
          currentStage={stage}
          hasResult={!!activeResult}
          onBack={goBack}
          showBack
        />
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
          {/* Het totaal aantal stappen hangt af van het antwoord hieronder
              (zon = 3 stappen, geen zon = 4). Daarom hier alleen "Stap 1";
              vanaf stap 2 toont de wizard-bar het juiste totaal. */}
          <span className="mono calc-progress">Stap 1</span>

          <p className="calc-form-start">Bent u particulier of zakelijk?</p>
          <div className="calc-type-toggle calc2-seg">
            {CUSTOMER_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`calc-type-btn calc2-seg-btn ${form.customer_type === option.value ? "active" : ""}`}
                aria-pressed={form.customer_type === option.value}
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
          <div className="calc2-choice-grid calc2-choice-grid--three">
            <ChoiceCard
              selected={hasSolar === "yes"}
              onSelect={() => choosePath("yes")}
              title="Ja"
              text="Advies op basis van uw teruglevering"
            />
            <ChoiceCard
              selected={hasSolar === "no"}
              onSelect={() => choosePath("no")}
              title="Nee"
              text="Advies op basis van dynamische handel"
            />
            <ChoiceCard
              selected={hasSolar === "planned"}
              onSelect={() => choosePath("planned")}
              title="Ik laat zonnepanelen plaatsen"
              text="We rekenen met uw verwachte teruglevering"
            />
          </div>
        </div>
      )}

      {hasSolar === "no" && !activeResult && stage === "usage" && (
        <div className="calc-step-panel" ref={stepRef}>
          <p className="calc-form-start">Wat is uw jaarlijkse stroomverbruik?</p>

          <label>
            <span className="field-label">Jaarlijks stroomverbruik (kWh) <span className="field-required">*</span></span>
            <input
              className="field-input"
              type="number"
              step="0.1"
              min="0.1"
              placeholder="3500"
              value={noSolarForm.yearly_usage}
              onChange={(e) => updateNoSolar("yearly_usage", e.target.value)}
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

      {/* ── Zon-pad: gecombineerde energieprofiel-stap (Stap 2 van 3) ──
          Verbruik én teruglevering staan samen in één kaart; de conditionele
          zonnige-dag-vraag verschijnt eronder binnen dezelfde kaart. Eén
          Volgende-knop valideert beide hoofdvelden. */}
      {solarPath && !activeResult && stage === "energy" && (
        <div className="calc-step-panel" ref={stepRef}>
          <p className="calc-form-start">Vul uw verbruik en teruglevering in</p>

          <label>
            <span className="field-label">Jaarlijks stroomverbruik (kWh) <span className="field-required">*</span></span>
            <input
              className="field-input"
              type="number"
              step="0.1"
              min="0.1"
              placeholder="4500"
              value={form.yearly_usage}
              onChange={withValidityClear(update("yearly_usage"))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); nextFromEnergy(); } }}
            />
            <span className="field-help">Gemiddeld huishouden: ±4500 kWh per jaar.</span>
            <span className="field-help">Weet u het niet precies? Een schatting is voldoende.</span>
          </label>

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
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); nextFromEnergy(); } }}
            />
            <span className="field-help">
              U vindt dit meestal in de app of jaarafrekening van uw
              energieleverancier.
            </span>
            <span className="field-help">Veel zonnepanelen: ±2500–5000 kWh per jaar.</span>
          </label>

          {/* Conditionele zonnige-dag-vraag binnen dezelfde energieprofiel-stap:
              de progress blijft "Stap 2 van 3". Bestaande logica/waarden/veld. */}
          {showSunnyQuestion && (
            <div className="calc-sunny-warning" ref={sunnyRef}>
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
          )}

          <div className="calc-step-nav">
            <button type="button" className="field-submit-button" onClick={nextFromEnergy}>
              Volgende
            </button>
          </div>
        </div>
      )}

      {hasSolar === "no" && !activeResult && stage === "contract" && (
        <div className="calc-step-panel" ref={stepRef}>
          <p className="calc-form-start">Wat voor energiecontract heeft u?</p>
          <div className="calc2-choice-grid">
            {CONTRACT_TYPES.map((option) => (
              <ChoiceCard
                key={option.value}
                compact
                selected={noSolarForm.contract_type === option.value}
                onSelect={() => chooseContract(option.value)}
                title={option.label}
              />
            ))}
          </div>
        </div>
      )}

      {hasSolar !== null && !activeResult && stage === "goal" && (
        <div className="calc-step-panel" ref={stepRef}>
          <p className="calc-form-start">
            {solarPath ? "Wat is uw doel?" : "Wat wilt u bereiken?"}
          </p>

          <div className="calc2-choice-grid calc2-choice-grid--goals">
            {(solarPath ? SOLAR_GOALS : NO_SOLAR_GOALS).map((option) => {
              const selected =
                (solarPath ? form.goal : noSolarForm.goal) === option.value;
              return (
                <ChoiceCard
                  key={option.value}
                  selected={selected}
                  onSelect={() =>
                    solarPath
                      ? setForm({ ...form, goal: option.value })
                      : updateNoSolar("goal", option.value)
                  }
                  title={option.title}
                  text={option.text}
                />
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
              <span>✓ Gratis advies</span>
              <span>✓ Direct resultaat</span>
              <span>✓ Geen e-mailadres nodig</span>
            </p>
          </div>
        </div>
      )}

      {error && <div className="calc-error mono" role="alert">{error}</div>}

      </div>

      {/* ── Resultaat als navolgbaar rapport: geadviseerde capaciteit, passend
          systeem (model + capaciteit), de ingevoerde waarden, waarom deze
          capaciteit en wat een specialist nog controleert. Prijs en exacte
          terugverdientijd volgen via het adviesformulier hieronder — de
          lead-payload (leadResult) blijft wél volledig. ── */}
      {activeResult && (
        <section className="calc-report calc2-report" ref={resultRef}>
          <span className="mono calc-report-eyebrow calc2-report-eyebrow">
            {solarPath ? "Uw eerste batterijadvies" : "Uw eerste indicatie"}
          </span>

          <div className="calc-report-headline calc2-report-headline">
            <div className="calc2-report-headline-text">
              <span className="calc-report-headline-label">Geadviseerde capaciteit</span>
              <b className="calc-report-headline-value">
                {solarPath
                  ? `${result.lower_range} – ${result.upper_range} kWh`
                  : noSolarResult.range}
              </b>
              <span className="calc-report-headline-note">
                Indicatieve bandbreedte
              </span>
            </div>
            {/* Decoratieve batterij-indicator — geen berekende vulgraad. */}
            <span className="calc2-report-batt" aria-hidden="true">
              <span className="calc2-report-batt-cap" />
              <span className="calc2-report-batt-fill" />
            </span>
          </div>

          <div className="calc-report-rows">
            <div className="calc-drow">
              <span className="calc-drow-label">Passend systeem</span>
              <span className="calc-drow-value">
                {solarPath ? result.product_name : noSolarResult.productHint}
              </span>
            </div>
            {solarPath && (
              <div className="calc-drow">
                <span className="calc-drow-label">Batterijcapaciteit</span>
                <span className="calc-drow-value">{result.product_capacity}</span>
              </div>
            )}
            <div className="calc-drow">
              <span className="calc-drow-label">Doel</span>
              <span className="calc-drow-value">
                {solarPath ? result.goal_label : goalLabel || "—"}
              </span>
            </div>
            <div className="calc-drow">
              <span className="calc-drow-label">Klanttype</span>
              <span className="calc-drow-value">{customerTypeLabel}</span>
            </div>
          </div>

          <div className="calc-report-section">
            <p className="calc-report-subhead">Uw ingevoerde gegevens</p>
            <div className="calc-report-rows">
              <div className="calc-drow">
                <span className="calc-drow-label">Jaarverbruik</span>
                <span className="calc-drow-value">
                  {solarPath ? lastInputs?.yearly_usage : noSolarResult.inputs.yearly_usage} kWh
                </span>
              </div>
              <div className="calc-drow">
                <span className="calc-drow-label">Teruglevering</span>
                <span className="calc-drow-value">
                  {solarPath
                    ? `${lastInputs?.exported_energy} kWh`
                    : "0 kWh (geen zonnepanelen)"}
                </span>
              </div>
              {solarPath && (
                <div className="calc-drow">
                  <span className="calc-drow-label">Teruglevering per zonnige dag</span>
                  <span className="calc-drow-value">± {result.daily_export} kWh</span>
                </div>
              )}
            </div>
          </div>

          <div className="calc-report-section calc-report-why">
            <p className="calc-report-subhead">Waarom deze capaciteit?</p>
            {solarPath ? (
              <>
                <p>{result.explanation}</p>
                {result.extra_notes?.map((note, i) => (
                  <p key={i} className="calc-report-note">{note}</p>
                ))}
                {result.note && <p className="calc-report-note">{result.note}</p>}
              </>
            ) : (
              <>
                <p>
                  Zonder zonnepanelen hangt de waarde van een batterij vooral af
                  van dynamische sturing, uw energiecontract en zakelijk
                  energiebeheer.
                </p>
                {noSolarResult.notes?.map((note, i) => (
                  <p key={i} className="calc-report-note">{note}</p>
                ))}
              </>
            )}
          </div>

          <div className="calc-report-section">
            <p className="calc-report-subhead">
              Wat wij controleren voor een definitief advies
            </p>
            <ul className="calc-check-list">
              <li>Zonnepanelen en werkelijke teruglevering</li>
              <li>Netaansluiting en omvormervermogen</li>
              <li>EMS-sturing en energiecontract</li>
              <li>Uw toekomstige verbruik (EV, warmtepomp)</li>
            </ul>
          </div>
        </section>
      )}

      {/* ── Na verzenden: Stage 2-analysevragen (of de bestaande bedankkaart
          als er geen lead-id/token beschikbaar is, bv. bij een honeypot). ── */}
      {activeResult && leadState.sent && (
        <div className="stage2-wrap" ref={leadRef}>
          {leadState.leadMeta ? (
            <Stage2Analysis leadMeta={leadState.leadMeta} />
          ) : (
            <div className="lead-form lead-form-success lead-form--inline">
              <h2>Bedankt, uw berekening is ontvangen.</h2>
              <p>
                Wij nemen telefonisch contact met u op om uw persoonlijke
                terugverdientijd, batterijadvies en eventuele Warmtefonds-
                mogelijkheden door te nemen.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Volgende stap: leadformulier inline (geen popup, geen gate).
          Positioneert het als de logische vervolgstap ná het advies: hier
          ontvangt de bezoeker prijs en terugverdientijd. Alle indien-/payload-
          logica (leadInputs/leadResult, GA4/Ads-events) blijft ongewijzigd. ── */}
      {((activeResult && !leadState.sent) || (directAdvice && !activeResult)) && (
        <div id="advies" ref={leadRef} className="calc-next-step">
          {activeResult && (
            <div className="calc-next-step-head">
              <span className="mono calc-next-step-eyebrow">Volgende stap</span>
              <p className="calc-lead-microcopy">
                Ontvang uw persoonlijke prijs en terugverdientijd. Laat uw
                gegevens achter, dan bespreken wij uw berekening — gratis en
                vrijblijvend.
              </p>
            </div>
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

      <LiveSummary
        customerTypeLabel={customerTypeLabel}
        hasSolar={hasSolar}
        solarPath={solarPath}
        form={form}
        noSolarForm={noSolarForm}
        goalLabel={goalLabel}
        hasResult={!!activeResult}
        remainingLabel={hasSolar !== null && !activeResult ? progressLabel : null}
      />
      </div>
      </div>

      {/* Ondersteunende secties in hun eigen container (het artikel zelf is
          full-width geworden voor de hero en afwisselende banden). */}
      <div className="container calc2-container">
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
          lead-modal). Bewust ná de info, vóór de FAQ/artikelen. Verdwijnt
          zodra er een resultaat is — dan is deze CTA overbodig. */}
      {!activeResult && (
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
      )}

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
      </div>

    </article>
  );
}
