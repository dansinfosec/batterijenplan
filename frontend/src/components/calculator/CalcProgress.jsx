// Verbonden stappen-indicator + voortgangsbalk. Leest de bestaande
// steps/stage-state van Calculator.jsx — verandert niets aan de flow.
// aria-live meldt de voortgang aan screenreaders bij elke stapwissel.
const STEP_LABELS = {
  choice: "Situatie",
  energy: "Energieprofiel",
  usage: "Verbruik",
  contract: "Contract",
  goal: "Doel",
};

export default function CalcProgress({ steps, currentStage, hasResult, onBack, showBack }) {
  // "Advies" als afsluitende (virtuele) stap: pas actief wanneer er een
  // resultaat is. Niet klikbaar — puur voortgangsweergave.
  const allSteps = [...steps, "advies"];
  const currentIndex = hasResult ? allSteps.length - 1 : steps.indexOf(currentStage);
  const progressPct = ((currentIndex + (hasResult ? 1 : 0.5)) / allSteps.length) * 100;

  return (
    <div className="calc2-progress">
      <div className="calc2-progress-top">
        {showBack ? (
          <button type="button" className="calc2-back" onClick={onBack}>
            ← Terug
          </button>
        ) : (
          <span />
        )}
        <span className="mono calc2-progress-label" aria-live="polite">
          {hasResult
            ? "Advies gereed"
            : `Stap ${currentIndex + 1} van ${allSteps.length}`}
        </span>
      </div>

      <ol className="calc2-progress-steps" aria-hidden="true">
        {allSteps.map((step, i) => {
          const done = i < currentIndex || hasResult;
          const active = i === currentIndex && !hasResult;
          return (
            <li
              key={step}
              className={`calc2-pstep${done ? " done" : ""}${active ? " active" : ""}`}
            >
              <span className="calc2-pstep-dot">{done ? "✓" : i + 1}</span>
              <span className="calc2-pstep-label">
                {step === "advies" ? "Advies" : STEP_LABELS[step] || step}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="calc2-progress-track" aria-hidden="true">
        <span style={{ width: `${Math.min(progressPct, 100)}%` }} />
      </div>
    </div>
  );
}
