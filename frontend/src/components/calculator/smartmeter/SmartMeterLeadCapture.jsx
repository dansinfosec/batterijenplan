import LeadCaptureForm, { useLeadCapture } from "../../LeadCaptureForm.jsx";
import { trackEvent } from "../../../analytics.js";
import {
  SMARTMETER_LEAD_SOURCE,
  SMARTMETER_LEAD_PRIVACY_NOTE,
  buildSmartMeterLeadPayload,
  findCandidate,
} from "../../../smartmeter/leadContext.js";

// ── Slimme-meter-leadsectie ────────────────────────────────────────────────
// Hergebruikt het bestaande leadformulier (useLeadCapture + LeadCaptureForm):
// zelfde velden, validatie, consent, honeypot en generate_lead-conversie.
// De analyse blijft altijd volledig zichtbaar — dit formulier is een
// vrijwillige vervolgstap, geen gate. Een batterij is alleen "geselecteerd"
// wanneer de bezoeker zelf op "Bespreek deze batterij" klikte; de sectie-CTA
// start een algemene aanvraag zonder kandidaat.

const nf1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });

const SUPPORT_TEXT =
  "Laat uw slimme-meteranalyse vrijblijvend beoordelen. We nemen uw gemeten " +
  "afname, teruglevering en de doorgerekende batterijgroottes mee in het " +
  "advies.";

export default function SmartMeterLeadCapture({
  analysis,
  // Alleen gezet wanneer de bezoeker het zelfconsumptie-model expliciet heeft
  // opgevraagd; anders null en blijft het model volledig buiten de lead.
  selfConsumptionAnalysis,
  open,
  selectedCandidateId,
  onOpenGeneral,
  onClose,
  onClearSelection,
  sectionRef,
}) {
  const leadState = useLeadCapture();
  const candidate = findCandidate(analysis, selectedCandidateId);
  const payload = buildSmartMeterLeadPayload(analysis, {
    selectedCandidateId,
    selfConsumptionAnalysis,
  });

  const copy = {
    title: candidate
      ? `Bespreek deze batterij: ${candidate.product_name}`
      : "Persoonlijk advies op basis van uw meterdata",
    text: SUPPORT_TEXT,
    button: "Vraag vrijblijvend advies aan",
  };

  return (
    <section
      className="calc2-sm-lead"
      aria-labelledby="sm-lead-title"
      ref={sectionRef}
    >
      {!open && !leadState.sent && (
        <div className="calc2-sm-lead-pitch">
          <h2 id="sm-lead-title">Persoonlijk advies op basis van uw meterdata</h2>
          <p>{SUPPORT_TEXT}</p>
          <button
            type="button"
            className="field-submit-button"
            onClick={onOpenGeneral}
          >
            Vraag vrijblijvend advies aan
          </button>
        </div>
      )}

      {(open || leadState.sent) && (
        <>
          {candidate && !leadState.sent && (
            <div className="calc2-sm-lead-chip" role="status">
              <span>
                Geselecteerd: <b>{candidate.product_name}</b> ·{" "}
                {nf1.format(candidate.usable_capacity_kwh)} kWh bruikbaar ·{" "}
                {nf1.format(candidate.inverter_power_kw)} kW
              </span>
              <button
                type="button"
                className="calc2-sm-linkbtn"
                onClick={onClearSelection}
              >
                Zonder batterijkeuze aanvragen
              </button>
            </div>
          )}

          <LeadCaptureForm
            state={leadState}
            calculatorInputs={payload.calculator_inputs}
            calculatorResult={payload.calculator_result}
            variant="inline"
            copy={copy}
            source={SMARTMETER_LEAD_SOURCE}
            trackingSource={SMARTMETER_LEAD_SOURCE}
            successCopy={{
              title:
                "Bedankt. Uw aanvraag en de samenvatting van uw " +
                "slimme-meteranalyse zijn ontvangen.",
              text:
                "Wij nemen vrijblijvend contact met u op. Uw analyse " +
                "hierboven blijft gewoon beschikbaar.",
            }}
            onSubmitted={() =>
              trackEvent("smartmeter_lead_submit_success", {
                lead_source: SMARTMETER_LEAD_SOURCE,
                selected_candidate_id: selectedCandidateId || null,
              })
            }
            onDismiss={onClose}
          />

          {!leadState.sent && (
            <p className="calc2-sm-lead-privacy">
              {SMARTMETER_LEAD_PRIVACY_NOTE}
            </p>
          )}
        </>
      )}
    </section>
  );
}
