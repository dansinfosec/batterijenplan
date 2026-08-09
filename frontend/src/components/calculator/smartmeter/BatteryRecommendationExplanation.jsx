// ── "Waarom dit advies?" ───────────────────────────────────────────────────
// Toont uitsluitend de redenen die de datalaag (straks: backend) meegeeft bij
// een expliciete aanbeveling. Geen aanbeveling → geen paneel. De frontend
// formuleert zelf geen financiële conclusies.

export default function BatteryRecommendationExplanation({ analysis }) {
  const recommendation = analysis?.recommendation;
  if (!recommendation || !recommendation.reasons?.length) return null;

  const recommended = analysis.candidates?.find(
    (c) => c.id === recommendation.candidate_id
  );

  return (
    <section className="calc-step-panel calc2-sm-why" aria-labelledby="sm-why-title">
      <h2 id="sm-why-title" className="calc-form-start">
        Waarom dit advies?
      </h2>
      {recommended && (
        <p className="calc2-sm-entry-sub">
          Op basis van uw profiel wijst de analyse {recommended.label} aan als
          best passende bruikbare capaciteit.
        </p>
      )}
      <ul className="calc2-sm-benefits calc2-sm-why-list">
        {recommendation.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  );
}
