import { useState } from "react";
import { Link } from "react-router-dom";
import { postLead } from "../api.js";
import { trackLeadSubmit } from "../analytics.js";
import { friendlyValidity, withValidityClear } from "../formValidation.js";

const EMPTY_LEAD = {
  name: "",
  phone: "",
  email: "",
  postcode: "",
  message: "",
  consent: false,
  website: "", // honeypot — mensen laten dit leeg
};

// Gedeelde state zodat modal en inline formulier dezelfde invoer tonen:
// wat de gebruiker in de popup typt, staat ook in het formulier eronder.
export function useLeadCapture() {
  const [lead, setLead] = useState(EMPTY_LEAD);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  // Response van postLead ({id, stage2_token}) — nodig voor de Stage 2-
  // vervolgvragen. Blijft null bij bots (honeypot) of oudere API-responses;
  // dan valt de UI terug op de bestaande bedankkaart.
  const [leadMeta, setLeadMeta] = useState(null);
  // Puur voor de weergave van foutstatussen (rode randen/tekst pas na een
  // verzendpoging); gedeeld tussen de modal- en inline-variant, net als de
  // rest van deze state. Verandert niets aan de validatielogica zelf.
  const [validated, setValidated] = useState(false);

  const update = (field) => (e) =>
    setLead((prev) => ({
      ...prev,
      [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  // source/trackingSource zijn optioneel met defaults die het bestaande
  // calculator-gedrag EXACT behouden: zonder argumenten blijft de payload
  // source "react_calculator" en het conversie-event lead_source
  // "calculator_advies". De sitewide adviesformulieren geven eigen waarden mee.
  const submit = async ({
    calculatorInputs,
    calculatorResult,
    source = "react_calculator",
    trackingSource = "calculator_advies",
  } = {}) => {
    setError(null);
    if (!lead.consent) {
      setError("U moet akkoord gaan voordat wij contact mogen opnemen.");
      return false;
    }
    setSending(true);
    try {
      const response = await postLead({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        postcode: lead.postcode,
        message: lead.message,
        consent: lead.consent,
        website: lead.website,
        calculator_inputs: calculatorInputs,
        calculator_result: calculatorResult,
        source,
      });
      if (response && response.id && response.stage2_token) {
        setLeadMeta({ id: response.id, stage2_token: response.stage2_token });
      }
      setSent(true);
      trackLeadSubmit(trackingSource);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSending(false);
    }
  };

  return { lead, update, submit, sent, sending, error, validated, setValidated, leadMeta };
}

const COPY = {
  modal: {
    title: "Laat uw berekening gratis controleren",
    text:
      "Uw batterijadvies is een eerste indicatie. Een specialist van " +
      "Batterijenplan of Groene Vrienden kan gratis controleren welke " +
      "capaciteit technisch en financieel het beste past.",
    button: "Gratis advies aanvragen",
  },
  inline: {
    title: "Gratis batterijadvies ontvangen",
    text: "Laat uw berekening gratis controleren door een specialist.",
    button: "Advies aanvragen",
  },
};

export default function LeadCaptureForm({
  state,
  calculatorInputs,
  calculatorResult,
  variant = "inline",
  onDismiss,
  copy: copyOverride,
  // Sitewide lead-CTA-opties (opt-in; calculator geeft ze niet mee en houdt
  // dus zijn exacte gedrag). source/trackingSource sturen payload + conversie-
  // event; compact verbergt het optionele bericht-veld; onStart vuurt bij de
  // eerste focus (lead_form_start); onSubmitted vuurt ná een geslaagde inzending.
  source,
  trackingSource,
  compact = false,
  onStart,
  onSubmitted,
}) {
  const { lead, update, submit, sent, sending, error, validated, setValidated } = state;
  // Padspecifieke titel/tekst/knop (advies-check, handelscase, terugverdientijd)
  // kan door de aanroeper worden meegegeven; zonder override blijft de
  // bestaande variant-copy exact zoals hij was.
  const copy = copyOverride ?? COPY[variant] ?? COPY.inline;

  if (sent) {
    return (
      <div className={`lead-form lead-form-success lead-form--${variant}`}>
        <h2>Bedankt, wij nemen binnenkort contact met u op.</h2>
        <p>
          {compact
            ? "Wij nemen zo snel mogelijk contact met u op over uw situatie."
            : "Uw berekening is meegestuurd, zodat de specialist direct kan meekijken."}
        </p>
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const ok = await submit({ calculatorInputs, calculatorResult, source, trackingSource });
    if (ok && onSubmitted) onSubmitted();
  };

  return (
    <form
      className={`lead-form lead-form--${variant}${validated ? " form-validated" : ""}`}
      onSubmit={onSubmit}
      onInvalidCapture={() => setValidated(true)}
      onFocusCapture={onStart ? () => onStart() : undefined}
    >
      <h2>{copy.title}</h2>
      <p>{copy.text}</p>

      <div className="lead-fields">
        <label>
          Naam <span className="field-required">*</span>
          <input
            className="field-input"
            placeholder="Uw naam"
            value={lead.name}
            onChange={withValidityClear(update("name"))}
            onInvalid={friendlyValidity("Vul uw naam in.")}
            required
            autoComplete="name"
          />
          <span className="field-error-text">Vul uw naam in.</span>
        </label>
        <label>
          Telefoonnummer <span className="field-required">*</span>
          <input
            className="field-input"
            type="tel"
            placeholder="06 12345678"
            value={lead.phone}
            onChange={withValidityClear(update("phone"))}
            onInvalid={friendlyValidity("Vul uw telefoonnummer in.")}
            required
            autoComplete="tel"
          />
          <span className="field-error-text">Vul uw telefoonnummer in.</span>
        </label>
        <label>
          E-mail <span className="field-required">*</span>
          <input
            className="field-input"
            type="email"
            placeholder="uw@email.nl"
            value={lead.email}
            onChange={withValidityClear(update("email"))}
            onInvalid={friendlyValidity("Vul een geldig e-mailadres in.")}
            required
            autoComplete="email"
          />
          <span className="field-error-text">Vul een geldig e-mailadres in.</span>
        </label>
        <label>
          Postcode
          <input
            className="field-input"
            placeholder="1234 AB"
            value={lead.postcode}
            onChange={update("postcode")}
            autoComplete="postal-code"
          />
        </label>
      </div>

      {!compact && (
        <label className="lead-message">
          Bericht
          <textarea
            className="field-input"
            value={lead.message} onChange={update("message")}
            placeholder="Bijvoorbeeld: ik heb 12 zonnepanelen en een dynamisch contract."
          />
        </label>
      )}

      {/* Honeypot: verborgen voor mensen, bots vullen hem in */}
      <label className="lead-website" aria-hidden="true">
        Website
        <input
          type="text" value={lead.website} onChange={update("website")}
          tabIndex={-1} autoComplete="off"
        />
      </label>

      <label className="lead-consent">
        <input type="checkbox" checked={lead.consent} onChange={update("consent")} required />
        <span>
          Ik ga akkoord dat Batterijenplan en/of Groene Vrienden contact met
          mij opneemt over mijn thuisbatterij-berekening.
        </span>
      </label>

      <p className="lead-privacy">
        Wij verwerken uw gegevens volgens onze{" "}
        <Link to="/privacy">privacyverklaring</Link>.
      </p>

      {error && <div className="calc-error mono">{error}</div>}

      <button type="submit" className="field-submit-button" disabled={sending}>
        {sending ? "Bezig…" : copy.button}
      </button>

      {onDismiss && (
        <button type="button" className="lead-modal-dismiss" onClick={onDismiss}>
          Ik bekijk eerst mijn resultaat
        </button>
      )}
    </form>
  );
}
