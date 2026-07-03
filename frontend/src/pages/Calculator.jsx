import { useEffect, useState } from "react";
import { postCalculator, postLead } from "../api.js";

const CUSTOMER_TYPES = [
  { value: "residential", label: "Particulier" },
  { value: "business", label: "Zakelijk" },
];

const GOALS = [
  { value: "trading", label: "Handel / Dynamisch energiecontract" },
  { value: "self_consumption", label: "Zelfconsumptie" },
];

function LeadForm({ calculatorInputs, calculatorResult }) {
  const [lead, setLead] = useState({
    name: "",
    phone: "",
    email: "",
    postcode: "",
    message: "",
    consent: false,
    website: "", // honeypot — mensen laten dit leeg
  });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const update = (field) => (e) =>
    setLead({
      ...lead,
      [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!lead.consent) {
      setError("U moet akkoord gaan voordat wij contact mogen opnemen.");
      return;
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
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="lead-form lead-form-success">
        <h2>Bedankt, wij nemen binnenkort contact met u op.</h2>
        <p>Uw berekening is meegestuurd, zodat de specialist direct kan meekijken.</p>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={submit}>
      <h2>Gratis batterijadvies ontvangen</h2>
      <p>Laat uw berekening gratis controleren door een specialist.</p>

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
          Ik ga akkoord dat Batterijenplan contact met mij opneemt over mijn
          berekening.
        </span>
      </label>

      {error && <div className="calc-error mono">{error}</div>}

      <button type="submit" disabled={sending}>
        {sending ? "Bezig…" : "Advies aanvragen"}
      </button>
    </form>
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
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Thuisbatterij Calculator — Batterijenplan";
    window.scrollTo(0, 0);
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await postCalculator({
        customer_type: form.customer_type,
        yearly_usage: parseFloat(form.yearly_usage),
        goal: form.goal,
        exported_energy: parseFloat(form.exported_energy),
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        <LeadForm
          calculatorInputs={{
            customer_type: form.customer_type,
            yearly_usage: parseFloat(form.yearly_usage),
            goal: form.goal,
            exported_energy: parseFloat(form.exported_energy),
          }}
          calculatorResult={result}
        />
      )}
    </article>
  );
}
