import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { postCalculator } from "../api.js";
import LeadCaptureForm, { useLeadCapture } from "../components/LeadCaptureForm.jsx";
import { setPageMeta, setJsonLd, ORGANIZATION_SCHEMA } from "../seo.js";

const CUSTOMER_TYPES = [
  { value: "residential", label: "Particulier" },
  { value: "business", label: "Zakelijk" },
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
  const [searchParams] = useSearchParams();
  const directAdvice = searchParams.get("advies") === "1";

  const [form, setForm] = useState({
    customer_type: "residential",
    yearly_usage: "",
    goal: "trading",
    exported_energy: "",
  });

  const [result, setResult] = useState(null);
  const [lastInputs, setLastInputs] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const leadState = useLeadCapture();

  useEffect(() => {
    setPageMeta({
      title: "Thuisbatterij Calculator — Batterijenplan",
      path: "/calculator",
    });
    setJsonLd([ORGANIZATION_SCHEMA]);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!directAdvice) return;

    const timer = setTimeout(() => {
      document.getElementById("advies")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [directAdvice]);

  // Na elk nieuw resultaat: popup na 4 seconden.
  // Niet tonen als er al een aanvraag is verstuurd.
  useEffect(() => {
    if (!result || leadState.sent) return;

    const timer = setTimeout(() => {
      setModalOpen(true);
    }, MODAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [result, leadState.sent]);

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.goal) {
      setError("Kies eerst uw doel: zelfconsumptie of handel met een dynamisch contract.");
      return;
    }

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

  const showLeadForm = Boolean(result || directAdvice);

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
            {CUSTOMER_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Jaarlijks stroomverbruik (kWh)
          <input
            type="number"
            step="0.1"
            min="0.1"
            placeholder="Bijvoorbeeld 3500"
            value={form.yearly_usage}
            onChange={update("yearly_usage")}
            required
          />
        </label>

        <fieldset className="goal-choice">
          <legend>Doel van de batterij</legend>

          <label className={`goal-card ${form.goal === "self_consumption" ? "active" : ""}`}>
            <input
              type="radio"
              name="goal"
              value="self_consumption"
              checked={form.goal === "self_consumption"}
              onChange={update("goal")}
              required
            />

            <span className="goal-title">Zelfconsumptie</span>

            <span className="goal-text">
              Ik wil vooral mijn eigen zonnestroom opslaan en later zelf gebruiken.
            </span>
          </label>

          <label className={`goal-card ${form.goal === "trading" ? "active" : ""}`}>
            <input
              type="radio"
              name="goal"
              value="trading"
              checked={form.goal === "trading"}
              onChange={update("goal")}
              required
            />

            <span className="goal-title">Handel / Dynamisch contract</span>

            <span className="goal-text">
              Ik wil de batterij ook gebruiken voor slimme sturing op dynamische
              energieprijzen.
            </span>
          </label>
        </fieldset>

        <label>
          Jaarlijkse teruglevering (kWh)
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="Bijvoorbeeld 5000"
            value={form.exported_energy}
            onChange={update("exported_energy")}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Bezig…" : "Bereken batterijcapaciteit"}
        </button>
      </form>

      {error && <div className="calc-error mono">{error}</div>}

      {result && (
        <div className="calc-result">
          <p>
            Op basis van <strong>{result.goal_label}</strong> adviseren wij een
            batterijcapaciteit van:
          </p>

          <h2>
            {result.lower_range} – {result.upper_range} kWh
          </h2>

          <p>
            Mogelijk passend systeem: <strong>{result.product_advice}</strong>
          </p>

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

      {showLeadForm && (
        <div id="advies">
          <LeadCaptureForm
            state={leadState}
            calculatorInputs={result ? lastInputs : null}
            calculatorResult={result || null}
            source={directAdvice && !result ? "blog_cta_direct_advice" : "react_calculator"}
            variant="inline"
          />
        </div>
      )}

      <LeadModal open={modalOpen} onClose={closeModal}>
        <LeadCaptureForm
          state={leadState}
          calculatorInputs={lastInputs}
          calculatorResult={result}
          source="react_calculator_modal"
          variant="modal"
          onDismiss={closeModal}
        />
      </LeadModal>
    </article>
  );
}