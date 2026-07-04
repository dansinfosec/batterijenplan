import { useState } from "react";
import { Link } from "react-router-dom";
import { postLead } from "../api.js";

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

  const update = (field) => (e) =>
    setLead((prev) => ({
      ...prev,
      [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const submit = async ({ calculatorInputs, calculatorResult }) => {
    setError(null);
    if (!lead.consent) {
      setError("U moet akkoord gaan voordat wij contact mogen opnemen.");
      return false;
    }
    setSending(true);
    try {
      await postLead({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        postcode: lead.postcode,
        message: lead.message,
        consent: lead.consent,
        website: lead.website,
        calculator_inputs: calculatorInputs,
        calculator_result: calculatorResult,
        source: "react_calculator",
      });
      setSent(true);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSending(false);
    }
  };

  return { lead, update, submit, sent, sending, error };
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
}) {
  const { lead, update, submit, sent, sending, error } = state;
  const copy = COPY[variant] ?? COPY.inline;

  if (sent) {
    return (
      <div className={`lead-form lead-form-success lead-form--${variant}`}>
        <h2>Bedankt, wij nemen binnenkort contact met u op.</h2>
        <p>Uw berekening is meegestuurd, zodat de specialist direct kan meekijken.</p>
      </div>
    );
  }

  const onSubmit = (e) => {
    e.preventDefault();
    submit({ calculatorInputs, calculatorResult });
  };

  return (
    <form className={`lead-form lead-form--${variant}`} onSubmit={onSubmit}>
      <h2>{copy.title}</h2>
      <p>{copy.text}</p>

      <div className="lead-fields">
        <label>
          Naam *
          <input value={lead.name} onChange={update("name")} required autoComplete="name" />
        </label>
        <label>
          Telefoonnummer *
          <input type="tel" value={lead.phone} onChange={update("phone")} required autoComplete="tel" />
        </label>
        <label>
          E-mail *
          <input type="email" value={lead.email} onChange={update("email")} required autoComplete="email" />
        </label>
        <label>
          Postcode
          <input value={lead.postcode} onChange={update("postcode")} autoComplete="postal-code" />
        </label>
      </div>

      <label className="lead-message">
        Bericht
        <textarea
          value={lead.message} onChange={update("message")}
          placeholder="Bijvoorbeeld: ik heb 12 zonnepanelen en een dynamisch contract."
        />
      </label>

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

      <button type="submit" disabled={sending}>
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
