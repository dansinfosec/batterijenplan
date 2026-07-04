import { useEffect, useState } from "react";
import { postCalculator } from "../api.js";
import LeadCaptureForm, { useLeadCapture } from "../components/LeadCaptureForm.jsx";

const CUSTOMER_TYPES = [
  { value: "residential", label: "Particulier" },
  { value: "business", label: "Zakelijk" },
];

const GOALS = [
  { value: "trading", label: "Handel / Dynamisch energiecontract" },
  { value: "self_consumption", label: "Zelfconsumptie" },
];

const MODAL_DELAY_MS = 4000;

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
  const [form, setForm] = useState({
    customer_type: "residential",
    yearly_usage: "",
    goal: "trading",
    exported_energy: "",
  });
  const [result, setResult] = useState(null);
  // Invoer zoals die was op het moment van berekenen (form kan daarna wijzigen).
  const [lastInputs, setLastInputs] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const leadState = useLeadCapture();

  useEffect(() => {
    document.title = "Thuisbatterij Calculator — Batterijenplan";
    window.scrollTo(0, 0);
  }, []);

  // Na elk nieuw resultaat: popup na 4 s, maar maximaal één keer per resultaat
  // en niet meer zodra er al een aanvraag is verstuurd.
  useEffect(() => {
    if (!result || leadState.sent) return;
    const timer = setTimeout(() => setModalOpen(true), MODAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [result, leadState.sent]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setModalOpen(false);
    const payload = {
      customer_type: form.customer_type,
      yearly_usage: parseFloat(form.yearly_usage),
      goal: form.goal,
      exported_energy: parseFloat(form.exported_energy),
    };
    try {
      const data = await postCalculator(payload);
      setLastInputs(payload);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => setModalOpen(false);

  return (
    <article className="container post-detail">
      <p className="mono kicker">Calculator · batterijcapaciteit · advies</p>
      <h1>
        Thuisbatterij <span className="accent">Calculator</span>
      </h1>
      <p className="sub" style={{ marginTop: 12, marginBottom: 36 }}>
        Bereken welke thuisbatterij past bij uw stroomverbruik, teruglevering
        en energiedoel.
      </p>

      <form className="calc-form" onSubmit={submit}>
        <label>
          Type klant
          <select value={form.customer_type} onChange={update("customer_type")}>
            {CUSTOMER_TYPES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label>
          Jaarlijks stroomverbruik (kWh)
          <input
            type="number" step="0.1" min="0.1" placeholder="Bijvoorbeeld 3500"
            value={form.yearly_usage} onChange={update("yearly_usage")} required
          />
        </label>

        <label>
          Doel van de batterij
          <select value={form.goal} onChange={update("goal")}>
            {GOALS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label>
          Jaarlijkse teruglevering (kWh)
          <input
            type="number" step="0.1" min="0" placeholder="Bijvoorbeeld 5000"
            value={form.exported_energy} onChange={update("exported_energy")} required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Bezig…" : "Bereken batterijcapaciteit"}
        </button>
      </form>

      {error && (
        <div className="calc-error mono">{error}</div>
      )}

      {result && (
        <div className="calc-result">
          <p>
            Op basis van <strong>{result.goal_label}</strong> adviseren wij een
            batterijcapaciteit van:
          </p>
          <h2>{result.lower_range} – {result.upper_range} kWh</h2>
          <p>Mogelijk passend systeem: <strong>{result.product_advice}</strong></p>
          <div className="calc-stats mono">
            <span>Gem. teruglevering/dag: {result.daily_export} kWh</span>
            <span>Gem. verbruik/dag: {result.daily_usage} kWh</span>
          </div>
          <div className="calc-note">
            <strong>Let op:</strong> deze berekening is indicatief. Voor een
            nauwkeurig advies kijken we ook naar zonnepanelen, netaansluiting,
            omvormervermogen, energiecontract en toekomstig verbruik.
          </div>
        </div>
      )}

      {result && (
        <LeadCaptureForm
          state={leadState}
          calculatorInputs={lastInputs}
          calculatorResult={result}
          variant="inline"
        />
      )}

      <LeadModal open={modalOpen} onClose={closeModal}>
        <LeadCaptureForm
          state={leadState}
          calculatorInputs={lastInputs}
          calculatorResult={result}
          variant="modal"
          onDismiss={closeModal}
        />
      </LeadModal>
    </article>
  );
}
