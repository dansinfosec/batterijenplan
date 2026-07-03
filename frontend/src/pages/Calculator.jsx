import { useEffect, useState } from "react";
import { postCalculator } from "../api.js";

const CUSTOMER_TYPES = [
  { value: "residential", label: "Particulier" },
  { value: "business", label: "Zakelijk" },
];

const GOALS = [
  { value: "trading", label: "Handel / Dynamisch energiecontract" },
  { value: "self_consumption", label: "Zelfconsumptie" },
];

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
    </article>
  );
}
