import { useEffect, useRef, useState } from "react";
import { scrollToCalculatorTarget } from "../scroll.js";
import SmartMeterSourcePicker from "./SmartMeterSourcePicker.jsx";
import SmartMeterUpload from "./SmartMeterUpload.jsx";
import SmartMeterProfileSummary from "./SmartMeterProfileSummary.jsx";
import BatteryProfileComparison from "./BatteryProfileComparison.jsx";
import BatteryRecommendationExplanation from "./BatteryRecommendationExplanation.jsx";
import { postSmartMeterAnalysis } from "../../../api.js";
import {
  SELF_CONSUMPTION_SCENARIO,
  SMARTMETER_PRIVACY_NOTICE,
  SmartMeterApiError,
} from "../../../smartmeter/analysisClient.js";

// ── Slimme-meterdata-route ─────────────────────────────────────────────────
// Orkestreert de substappen: bron kiezen → uploaden → profiel → analyse.
// Parsing gebeurt in de adapters (src/smartmeter/); de analyse draait op de
// echte backend (POST /api/smartmeter/analysis/). Fysiek-only is de default;
// het zelfconsumptie-model wordt alleen op expliciet verzoek als tweede
// aanvraag opgehaald. Opnieuw proberen hergebruikt altijd de al geparsede
// intervallen — er hoeft nooit opnieuw een bestand gekozen te worden.

const STEP_LABELS = {
  source: "Databron",
  upload: "Uploaden",
  summary: "Energieprofiel",
  analysis: "Batterijadvies",
};
const STEPS = ["source", "upload", "summary", "analysis"];

const nf0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

function SmartMeterAside() {
  return (
    <aside className="calc2-summary calc2-summary--desktop" aria-label="Over deze analyse">
      <div className="calc2-summary-head">
        <span>Uw analyse</span>
        <span className="mono">Slimme-meterdata</span>
      </div>
      <ul className="calc2-sm-benefits calc2-sm-aside-list">
        <li>Analyse van verbruik en teruglevering</li>
        <li>Indicatieve handelsopbrengst uit praktijkdata</li>
        <li>Fysieke benutting per batterijgrootte</li>
        <li>Vergelijking van meerdere batterijgroottes</li>
      </ul>
      <p className="calc2-sm-aside-privacy">{SMARTMETER_PRIVACY_NOTICE}</p>
    </aside>
  );
}

function AnalysisLoading({ pointCount }) {
  const count = pointCount ? `${nf0.format(pointCount)}` : "Uw";
  return (
    <section className="calc-step-panel calc2-sm-loading" role="status" aria-live="polite">
      <span className="calc2-summary-batt calc2-sm-loading-batt" aria-hidden="true">
        <span className="calc2-summary-batt-fill" />
      </span>
      <p className="calc2-sm-drop-title">
        {pointCount
          ? `Uw ${count} kwartieren worden geanalyseerd`
          : "Uw kwartieren worden geanalyseerd"}
      </p>
      <p className="calc2-sm-drop-sub">
        Netprofiel analyseren en batterijgroottes vergelijken…
      </p>
    </section>
  );
}

export default function SmartMeterFlow({ onExit, onUseInQuick }) {
  const [step, setStep] = useState("source");
  const [source, setSource] = useState(null); // 'homewizard' | 'other'
  const [parsed, setParsed] = useState(null); // { profile, intervals, meta, fileName }
  // Analyse-state: fysiek-only default; zelfconsumptie is een tweede,
  // expliciete aanvraag met financial_scenario.
  const [analysis, setAnalysis] = useState(null);
  const [analysisState, setAnalysisState] = useState("idle"); // idle | loading | done | error
  const [analysisError, setAnalysisError] = useState(null);
  const [scAnalysis, setScAnalysis] = useState(null);
  const [scState, setScState] = useState("idle"); // idle | loading | done | error
  const [scError, setScError] = useState(null);
  const busyRef = useRef(false); // dubbelklik-/dubbelsubmit-slot over beide aanvragen
  const stepRef = useRef(null);
  const didMount = useRef(false);

  // Zelfde stap-scrollgedrag als de bestaande wizard: bij elke overgang naar
  // de bovenkant van de actieve kaart, nooit bij de eerste render.
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const raf = requestAnimationFrame(() => scrollToCalculatorTarget(stepRef.current));
    return () => cancelAnimationFrame(raf);
  }, [step, analysisState]);

  const stepIndex = STEPS.indexOf(step);

  const runAnalysis = async (data) => {
    if (busyRef.current) return; // dubbele submissions voorkomen
    busyRef.current = true;
    setAnalysisState("loading");
    setAnalysisError(null);
    try {
      const result = await postSmartMeterAnalysis(data.intervals, {
        intervalMinutes: data.meta?.intervalMinutes || 15,
      });
      setAnalysis(result);
      setAnalysisState("done");
    } catch (err) {
      setAnalysisError(
        err instanceof SmartMeterApiError
          ? err.userMessage
          : "Er ging iets mis bij de analyse. Probeer het opnieuw."
      );
      setAnalysisState("error");
    } finally {
      busyRef.current = false;
    }
  };

  // Tweede aanvraag: zelfde intervallen, nu mét financial_scenario. Alleen op
  // expliciet verzoek van de bezoeker ("Bekijk ook waarde uit zelfconsumptie").
  const runSelfConsumption = async () => {
    if (busyRef.current || !parsed) return;
    busyRef.current = true;
    setScState("loading");
    setScError(null);
    try {
      const result = await postSmartMeterAnalysis(parsed.intervals, {
        intervalMinutes: parsed.meta?.intervalMinutes || 15,
        financialScenario: SELF_CONSUMPTION_SCENARIO,
      });
      setScAnalysis(result);
      setScState("done");
    } catch (err) {
      setScError(
        err instanceof SmartMeterApiError
          ? err.userMessage
          : "Er ging iets mis bij het ophalen van het zelfconsumptie-model."
      );
      setScState("error");
    } finally {
      busyRef.current = false;
    }
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setAnalysisState("idle");
    setAnalysisError(null);
    setScAnalysis(null);
    setScState("idle");
    setScError(null);
  };

  const goBack = () => {
    if (step === "source") {
      onExit();
      return;
    }
    if (step === "upload") {
      setStep("source");
      return;
    }
    if (step === "summary") {
      setParsed(null);
      setStep("upload");
      return;
    }
    resetAnalysis();
    setStep("summary");
  };

  const handleParsed = (data) => {
    setParsed(data);
    resetAnalysis();
    setStep("summary");
  };

  const startAnalysis = () => {
    setStep("analysis");
    runAnalysis(parsed);
  };

  return (
    <div className="calc2-layout">
      <div className="calc2-main calc2-sm-main" ref={stepRef}>
        <div className="calc2-progress">
          <div className="calc2-progress-top">
            <button type="button" className="calc2-back" onClick={goBack}>
              ← Terug
            </button>
            <span className="mono calc2-progress-label" aria-live="polite">
              {`Slimme-meterdata · ${STEP_LABELS[step]} (${stepIndex + 1}/${STEPS.length})`}
            </span>
          </div>
          <div className="calc2-progress-track" aria-hidden="true">
            <span style={{ width: `${((stepIndex + 0.5) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {step === "source" && <SmartMeterSourcePicker onPickSource={(s) => { setSource(s); setStep("upload"); }} />}

        {step === "upload" && <SmartMeterUpload source={source} onParsed={handleParsed} />}

        {step === "summary" && parsed && (
          <SmartMeterProfileSummary
            data={parsed}
            onCalculate={startAnalysis}
            onUseInQuick={onUseInQuick}
          />
        )}

        {step === "analysis" && parsed && (
          <>
            {analysisState === "loading" && (
              <AnalysisLoading pointCount={parsed.profile?.pointCount} />
            )}

            {analysisState === "error" && (
              <section className="calc-step-panel" aria-labelledby="sm-analysis-error">
                <h2 id="sm-analysis-error" className="calc-form-start">
                  De analyse is niet gelukt
                </h2>
                <div className="calc-error mono" role="alert">
                  {analysisError}
                </div>
                <div className="calc-step-nav">
                  {/* Retry hergebruikt de al geparsede intervallen — nooit
                      opnieuw een bestand vragen. */}
                  <button
                    type="button"
                    className="field-submit-button"
                    onClick={() => runAnalysis(parsed)}
                  >
                    Opnieuw proberen
                  </button>
                  <button type="button" className="calc2-sm-linkbtn" onClick={goBack}>
                    Terug naar mijn energieprofiel
                  </button>
                </div>
              </section>
            )}

            {analysisState === "done" && analysis && (
              <>
                <BatteryProfileComparison
                  analysis={analysis}
                  selfConsumption={{
                    state: scState,
                    analysis: scAnalysis,
                    error: scError,
                    onRequest: runSelfConsumption,
                    onRetry: runSelfConsumption,
                  }}
                />
                <BatteryRecommendationExplanation analysis={analysis} />
              </>
            )}
          </>
        )}
      </div>

      <SmartMeterAside />
    </div>
  );
}
