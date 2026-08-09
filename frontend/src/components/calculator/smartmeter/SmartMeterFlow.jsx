import { useEffect, useRef, useState } from "react";
import { scrollToCalculatorTarget } from "../scroll.js";
import SmartMeterSourcePicker from "./SmartMeterSourcePicker.jsx";
import SmartMeterUpload from "./SmartMeterUpload.jsx";
import SmartMeterProfileSummary from "./SmartMeterProfileSummary.jsx";
import BatteryProfileComparison from "./BatteryProfileComparison.jsx";
import BatteryRecommendationExplanation from "./BatteryRecommendationExplanation.jsx";
import { DEMO_BATTERY_ANALYSIS } from "../../../smartmeter/fixtures/demoBatteryAnalysis.js";

// ── Slimme-meterdata-route ─────────────────────────────────────────────────
// Orkestreert de substappen: bron kiezen → uploaden → profiel → analyse.
// Parsing gebeurt in de adapters (src/smartmeter/); dit component beheert
// alleen flow-state en presentatievolgorde. De batterijvergelijking draait in
// development op een expliciet gelabelde fixture (DEMO_BATTERY_ANALYSIS);
// in productie toont hij de eerlijke "in ontwikkeling"-status totdat de
// backend-rekenmodule bestaat.

const STEP_LABELS = {
  source: "Databron",
  upload: "Uploaden",
  summary: "Energieprofiel",
  analysis: "Batterijadvies",
};
const STEPS = ["source", "upload", "summary", "analysis"];

function SmartMeterAside() {
  return (
    <aside className="calc2-summary calc2-summary--desktop" aria-label="Over deze analyse">
      <div className="calc2-summary-head">
        <span>Uw analyse</span>
        <span className="mono">Slimme-meterdata</span>
      </div>
      <ul className="calc2-sm-benefits calc2-sm-aside-list">
        <li>Analyse van verbruik en teruglevering</li>
        <li>Inzicht per meetinterval</li>
        <li>Inzicht in benodigd laad- en ontlaadvermogen</li>
        <li>Vergelijking van meerdere batterijgroottes</li>
      </ul>
      <p className="calc2-sm-aside-privacy">
        Uw energiegegevens worden alleen gebruikt om uw batterijadvies te
        berekenen.
      </p>
    </aside>
  );
}

export default function SmartMeterFlow({ onExit, onUseInQuick }) {
  const [step, setStep] = useState("source");
  const [source, setSource] = useState(null); // 'homewizard' | 'other'
  const [parsed, setParsed] = useState(null); // { profile, intervals, meta, fileName }
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
  }, [step]);

  const stepIndex = STEPS.indexOf(step);

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
    setStep("summary");
  };

  const handleParsed = (data) => {
    setParsed(data);
    setStep("summary");
  };

  // Alleen in development bestaat de voorbeeld-analyse; productie krijgt de
  // eerlijke "in ontwikkeling"-weergave (analysis = null).
  const analysis = import.meta.env.DEV ? DEMO_BATTERY_ANALYSIS : null;

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
            onCalculate={() => setStep("analysis")}
            onUseInQuick={onUseInQuick}
          />
        )}

        {step === "analysis" && parsed && (
          <>
            <BatteryProfileComparison analysis={analysis} />
            <BatteryRecommendationExplanation analysis={analysis} />
            {!analysis && (
              <div className="calc-step-nav">
                <button type="button" className="field-submit-button" onClick={goBack}>
                  Terug naar mijn energieprofiel
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <SmartMeterAside />
    </div>
  );
}
