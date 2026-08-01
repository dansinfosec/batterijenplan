// Compacte voortgangsindicator boven in het capaciteitsresultaat: laat zien
// dat de capaciteit al klaarstaat en welke twee stappen nog naar de
// persoonlijke terugverdientijd leiden. Puur decoratief/visueel — de
// eigenlijke voortgang wordt al hoorbaar gemaakt door CalcProgress,
// LiveSummary en (na verzenden) SubmissionReward, dus dit blok is
// aria-hidden om dubbele screenreader-aankondigingen te voorkomen.
const STEPS = [
  { key: "capacity", label: "Capaciteit berekend" },
  { key: "unlock", label: "Terugverdientijd" },
  { key: "analysis", label: "Persoonlijke analyse" },
];

export default function MilestoneTracker({ leadDone, stage2Done }) {
  const statusOf = (key) => {
    if (key === "capacity") return "done";
    if (key === "unlock") return leadDone ? "done" : "current";
    // "analysis" (Stage 2): pas actief zodra de lead is verzonden, pas
    // afgerond zodra de backend het echte rapport heeft teruggegeven.
    if (stage2Done) return "done";
    return leadDone ? "current" : "upcoming";
  };

  return (
    <ol className="calc2-milestones" aria-hidden="true">
      {STEPS.map((step) => {
        const status = statusOf(step.key);
        return (
          <li key={step.key} className={`calc2-mstep calc2-mstep--${status}`}>
            <span className="calc2-mstep-dot">{status === "done" ? "✓" : ""}</span>
            <span className="calc2-mstep-label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
