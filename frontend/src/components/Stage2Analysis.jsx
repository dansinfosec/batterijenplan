import { useState } from "react";
import { postLeadStage2 } from "../api.js";

// ── Stage 2: extra analysevragen ná het leadformulier ─────────────────────
// Vier korte hoofdvragen (grote tap-targets, gestapeld op mobiel) plus een
// ingeklapt blok met optionele verdieping. Na verzenden toont dezelfde plek
// de premium rapportkaart met veilige, indicatieve bandbreedtes.

const QUESTIONS = [
  {
    field: "heat_pump",
    label: "Heeft u een warmtepomp?",
    options: [
      { value: "none", label: "Nee" },
      { value: "hybrid", label: "Ja, hybride warmtepomp" },
      { value: "all_electric", label: "Ja, volledig elektrisch / all-electric" },
      { value: "unknown", label: "Weet ik niet" },
    ],
  },
  {
    field: "ev",
    label: "Heeft u een elektrische auto of laadpaal?",
    options: [
      { value: "no", label: "Nee" },
      { value: "yes", label: "Ja" },
      { value: "soon", label: "Binnenkort" },
      { value: "unknown", label: "Weet ik niet" },
    ],
  },
  {
    field: "contract_type",
    label: "Welk energiecontract heeft u?",
    options: [
      { value: "fixed", label: "Vast" },
      { value: "variable", label: "Variabel" },
      { value: "dynamic", label: "Dynamisch" },
      { value: "unknown", label: "Weet ik niet" },
    ],
  },
  {
    field: "return_costs",
    label: "Heeft u terugleverkosten?",
    options: [
      { value: "yes", label: "Ja" },
      { value: "no", label: "Nee" },
      { value: "unknown", label: "Weet ik niet" },
    ],
  },
];

const GRID_OPTIONS = [
  { value: "", label: "Maak een keuze" },
  { value: "1_phase", label: "1-fase" },
  { value: "3_phase", label: "3-fase" },
  { value: "unknown", label: "Weet ik niet" },
];

const WARMTEFONDS_OPTIONS = [
  { value: "", label: "Maak een keuze" },
  { value: "yes", label: "Ja" },
  { value: "no", label: "Nee" },
  { value: "maybe", label: "Misschien" },
];

const CONFIDENCE_LABELS = { laag: "Laag", normaal: "Normaal", hoog: "Hoog" };

// 4,5 → "4,5" · 7 → "7" (NL-decimaalkomma)
const formatYears = (value) => String(value).replace(".", ",");

// 7454 → "€ 7.454" (NL-duizendtallen, hele euro's)
const formatEuro = (value) => `€ ${Number(value).toLocaleString("nl-NL")}`;

export default function Stage2Analysis({ leadMeta }) {
  const [answers, setAnswers] = useState({
    heat_pump: "",
    ev: "",
    contract_type: "",
    return_costs: "",
    panel_count: "",
    panel_power_wp: "",
    inverter_power: "",
    grid_connection: "",
    warmtefonds_check: "",
  });
  const [report, setReport] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const choose = (field, value) => {
    setError(null);
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const updateField = (field) => (e) =>
    setAnswers((prev) => ({ ...prev, [field]: e.target.value }));

  const submit = async () => {
    const missing = QUESTIONS.find((q) => !answers[q.field]);
    if (missing) {
      setError(
        "Beantwoord eerst de 4 korte vragen — 'Weet ik niet' is ook een geldig antwoord."
      );
      return;
    }
    setSending(true);
    setError(null);

    const payload = {
      stage2_token: leadMeta.stage2_token,
      heat_pump: answers.heat_pump,
      ev: answers.ev,
      contract_type: answers.contract_type,
      return_costs: answers.return_costs,
    };
    // Optionele verdieping: alleen meesturen wat daadwerkelijk is ingevuld.
    const panelCount = parseInt(answers.panel_count, 10);
    if (!Number.isNaN(panelCount)) payload.panel_count = panelCount;
    const panelPower = parseInt(answers.panel_power_wp, 10);
    if (!Number.isNaN(panelPower)) payload.panel_power_wp = panelPower;
    const inverterPower = parseFloat(answers.inverter_power);
    if (!Number.isNaN(inverterPower)) payload.inverter_power = inverterPower;
    if (answers.grid_connection) payload.grid_connection = answers.grid_connection;
    if (answers.warmtefonds_check) payload.warmtefonds_check = answers.warmtefonds_check;

    try {
      const data = await postLeadStage2(leadMeta.id, payload);
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  // ── Rapportkaart na verzenden ──
  if (report) {
    return (
      <section className="stage2-card stage2-report">
        <span className="mono stage2-kicker">Analyse gereed</span>
        <h2>Uw persoonlijke analyse is aangemaakt</h2>

        <div className="stage2-figures">
          <div className="stage2-figure stage2-figure-accent">
            <span className="stage2-figure-label">Indicatief maandvoordeel</span>
            <b>
              € {report.estimated_monthly_benefit_min} – €{" "}
              {report.estimated_monthly_benefit_max}
            </b>
          </div>
          <div className="stage2-figure">
            <span className="stage2-figure-label">Indicatieve terugverdientijd</span>
            <b>
              {formatYears(report.estimated_payback_years_min)} –{" "}
              {formatYears(report.estimated_payback_years_max)} jaar
            </b>
          </div>
        </div>

        {/* ── Upsell: huidige situatie vs. potentieel met dynamisch contract
            + EMS/handel. Verschijnt voor iedereen behalve de volledige
            dynamische-handel-setup. Alles indicatief en mogelijk — nooit als
            zekerheid gebracht. ── */}
        {report.dynamic_contract_potential?.enabled && (
          <div className="stage2-compare">
            <h3>Extra voordeel met dynamisch contract + EMS</h3>
            <p className="stage2-compare-intro">
              U rekent nu conservatief. Met een dynamisch energiecontract,
              EMS-sturing en handel op prijsverschillen kan er extra voordeel
              ontstaan.
            </p>
            {report.contract_switch_note && (
              <p className="stage2-compare-intro">{report.contract_switch_note}</p>
            )}
            {report.trading_goal_note && (
              <p className="stage2-compare-intro">{report.trading_goal_note}</p>
            )}

            <div className="stage2-compare-rows">
              <div className="stage2-compare-row">
                <span>Huidige situatie</span>
                <b>
                  € {report.estimated_monthly_benefit_min} – €{" "}
                  {report.estimated_monthly_benefit_max} per maand
                </b>
              </div>
              <div className="stage2-compare-row">
                <span>Met dynamisch contract + EMS/handel</span>
                <b>
                  € {report.dynamic_contract_potential.monthly_benefit_min} – €{" "}
                  {report.dynamic_contract_potential.monthly_benefit_max} per maand
                </b>
              </div>
              <div className="stage2-compare-row stage2-compare-extra">
                <span>Extra potentieel</span>
                <b>
                  +€ {report.dynamic_contract_potential.extra_monthly_benefit_min} – €{" "}
                  {report.dynamic_contract_potential.extra_monthly_benefit_max} per maand
                </b>
              </div>
            </div>

            <p className="stage2-compare-payback">
              Indicatieve terugverdientijd bij dynamisch contract:{" "}
              {formatYears(report.dynamic_contract_potential.payback_years_min)} –{" "}
              {formatYears(report.dynamic_contract_potential.payback_years_max)} jaar
            </p>

            {report.dynamic_contract_potential.vat_refund_possible ? (
              <>
                <p className="stage2-confidence">
                  <span className="stage2-chip">
                    BTW-teruggave mogelijk onder voorwaarden
                  </span>
                </p>
                <div className="stage2-invest">
                  <span>
                    Bruto investering:{" "}
                    {formatEuro(report.dynamic_contract_potential.investment_gross)}
                  </span>
                  <span>
                    Mogelijke btw-teruggave:{" "}
                    {formatEuro(report.dynamic_contract_potential.vat_refund_estimate)}
                  </span>
                  <span>
                    Netto investering na btw-teruggave:{" "}
                    {formatEuro(report.dynamic_contract_potential.investment_net_after_vat)}
                  </span>
                </div>
              </>
            ) : (
              // Zakelijk: catalogusprijzen zijn al exclusief btw — geen
              // teruggave tonen, alleen deze verduidelijking.
              <p className="stage2-compare-small">
                Zakelijke prijzen zijn exclusief btw.
              </p>
            )}

            {report.dynamic_contract_potential.note && (
              <p className="stage2-compare-small">
                {report.dynamic_contract_potential.note}
              </p>
            )}
            <p className="stage2-compare-small">
              Indicatief. Geen garantie. Wij controleren dit telefonisch op
              basis van uw contract, teruglevering en EMS-sturing.
            </p>
          </div>
        )}

        {/* ── Dynamisch contract mét handelsdoel: sturing-uitleg + mogelijke
            btw-teruggave onder voorwaarden (geen overstap-blok nodig). ── */}
        {report.dynamic_trading_note && (
          <p className="stage2-dynamic-note">{report.dynamic_trading_note}</p>
        )}
        {report.vat_refund?.possible && !report.dynamic_contract_potential?.enabled && (
          <div className="stage2-compare">
            <p className="stage2-confidence">
              <span className="stage2-chip">
                BTW-teruggave mogelijk onder voorwaarden
              </span>
            </p>
            <div className="stage2-invest">
              <span>
                Bruto investering: {formatEuro(report.vat_refund.investment_gross)}
              </span>
              <span>
                Mogelijke btw-teruggave: {formatEuro(report.vat_refund.estimate)}
              </span>
              <span>
                Netto investering na btw-teruggave:{" "}
                {formatEuro(report.vat_refund.investment_net_after_vat)}
              </span>
            </div>
            <p className="stage2-compare-small">{report.vat_refund.note}</p>
          </div>
        )}

        {/* Zakelijk + dynamisch contract: geen btw-teruggave (prijzen al
            exclusief btw), alleen deze verduidelijking. */}
        {report.dynamic_trading_note &&
          !report.vat_refund &&
          !report.dynamic_contract_potential?.enabled && (
            <p className="stage2-compare-small">
              Zakelijke prijzen zijn exclusief btw.
            </p>
          )}

        {report.warmtefonds && (
          <div className="stage2-warmtefonds">
            <span className="stage2-figure-label">
              Warmtefonds-voorbeeld (financiering / maandlast)
            </span>
            <p>{report.warmtefonds.text}</p>
          </div>
        )}

        <p className="stage2-confidence">
          <span className={`stage2-chip stage2-chip-${report.confidence_level}`}>
            Betrouwbaarheid: {CONFIDENCE_LABELS[report.confidence_level] || report.confidence_level}
          </span>
        </p>

        {report.missing_data && report.missing_data.length > 0 && (
          <p className="stage2-missing">
            Nog niet bekend: {report.missing_data.join(", ")}.
            {report.confidence_note ? ` ${report.confidence_note}` : ""}
          </p>
        )}

        <p className="stage2-followup">
          Wij nemen telefonisch contact met u op om deze berekening te
          controleren en het juiste batterijsysteem te bepalen.
        </p>
        <p className="stage2-disclaimer">{report.disclaimer}</p>
      </section>
    );
  }

  // ── Vragenkaart ──
  return (
    <section className="stage2-card">
      <span className="mono stage2-kicker stage2-received">
        ✓ Uw berekening is ontvangen. Beantwoord nog 4 korte vragen voor een
        betere terugverdientijd.
      </span>
      <h2>Maak uw terugverdientijd nauwkeuriger</h2>
      <p className="stage2-intro">
        Beantwoord nog 4 korte vragen. Dan kunnen wij uw maandvoordeel,
        terugverdientijd en Warmtefonds-mogelijkheden beter inschatten.
      </p>

      {QUESTIONS.map((q) => (
        <div className="stage2-q" key={q.field}>
          <p className="stage2-q-label">{q.label}</p>
          <div className="stage2-options">
            {q.options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`stage2-opt ${answers[q.field] === option.value ? "active" : ""}`}
                onClick={() => choose(q.field, option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <details className="stage2-advanced">
        <summary>Ik wil extra gegevens invullen</summary>
        <div className="stage2-adv-grid">
          <label>
            <span className="field-label">Aantal zonnepanelen</span>
            <input
              className="field-input"
              type="number"
              min="1"
              step="1"
              placeholder="12"
              value={answers.panel_count}
              onChange={updateField("panel_count")}
            />
          </label>
          <label>
            <span className="field-label">Totaal vermogen zonnepanelen (Wp)</span>
            <input
              className="field-input"
              type="number"
              min="100"
              step="10"
              placeholder="4800"
              value={answers.panel_power_wp}
              onChange={updateField("panel_power_wp")}
            />
          </label>
          <label>
            <span className="field-label">Omvormervermogen zonnepanelen (kW)</span>
            <input
              className="field-input"
              type="number"
              min="0.1"
              step="0.1"
              placeholder="4"
              value={answers.inverter_power}
              onChange={updateField("inverter_power")}
            />
          </label>
          <label>
            <span className="field-label">Netaansluiting</span>
            <select
              className="field-input"
              value={answers.grid_connection}
              onChange={updateField("grid_connection")}
            >
              {GRID_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">
              Wilt u Warmtefonds-financiering laten checken?
            </span>
            <select
              className="field-input"
              value={answers.warmtefonds_check}
              onChange={updateField("warmtefonds_check")}
            >
              {WARMTEFONDS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>

      {error && <div className="calc-error mono">{error}</div>}

      <div className="stage2-submit">
        <button
          type="button"
          className="field-submit-button"
          onClick={submit}
          disabled={sending}
        >
          {sending ? "Bezig…" : "Bereken mijn terugverdientijd"}
        </button>
      </div>
    </section>
  );
}
