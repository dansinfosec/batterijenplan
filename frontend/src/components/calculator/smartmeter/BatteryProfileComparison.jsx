import {
  candidateViewModels,
  N1_BADGE,
  NOT_ADDITIVE_NOTE,
  exportObservationLabel,
} from "../../../smartmeter/presentAnalysis.js";

// ── Batterijvergelijking op het echte analyse-antwoord ─────────────────────
// Volgorde per kandidaat (bewust): 1) batterijprofiel, 2) praktijkband
// actieve handel (primaire commerciële indicatie), 3) gerapporteerde
// praktijkreferenties, 4) fysieke benutting uit het geüploade profiel,
// 5) optioneel het zelfconsumptie-model (aparte, expliciete aanvraag).
// De frontend berekent nergens statistiek of totalen bovenop de response en
// wijst zonder backend-recommendation nooit een "beste" batterij aan.

const nf0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function euroRange(range, formatter = nf0) {
  if (!range) return "—";
  return `€ ${formatter.format(range[0])} – € ${formatter.format(range[1])}`;
}

function PracticeReference({ reference }) {
  return (
    <article className="calc2-sm-ref" data-ref-id={reference.id}>
      <p className="calc2-sm-ref-title">{reference.title}</p>
      <p className="calc2-sm-ref-specs mono">
        {nf1.format(reference.capacityKwh)} kWh · {nf1.format(reference.powerKw)} kW
        {" · "}N={nf0.format(reference.sampleN)} ({reference.sampleClass})
        {" · "}{reference.period}
      </p>
      <p className="calc2-sm-ref-provider">
        Provider/EMS: {reference.provider || "niet gepubliceerd in de bron"}
      </p>
      <p className="calc2-sm-ref-range">
        Gerapporteerd: € {nf2.format(reference.annualMinEur)}
        {reference.annualMinEur !== reference.annualMaxEur &&
          ` – € ${nf2.format(reference.annualMaxEur)}`}{" "}
        per jaar
      </p>
      {reference.isN1 && (
        <p className="calc2-sm-ref-warning" role="note">{N1_BADGE}</p>
      )}
      {reference.partialYear && (
        <p className="calc2-sm-ref-warning" role="note">
          Bevat deeljaar-resultaten; de range is geen representatieve volledige
          jaaropbrengst.
        </p>
      )}
      <p className="calc2-sm-ref-distance">{reference.distance}</p>
    </article>
  );
}

function TradingBandBlock({ band }) {
  if (!band) return null;
  return (
    <div className="calc2-sm-band">
      <p className="calc2-sm-band-eyebrow mono">Praktijkband actieve batterijhandel</p>
      <p className="calc2-sm-band-range">{euroRange(band.primary.annualRange)} per jaar</p>
      <p className="calc2-sm-band-sub">
        Indicatieve handelsopbrengst bij een {band.primary.contractLabel.toLowerCase()}
        {band.primary.perKwhRange &&
          `, ofwel € ${nf0.format(band.primary.perKwhRange[0])}–${nf0.format(band.primary.perKwhRange[1])} per kWh per jaar`}
        .
      </p>
      <details className="calc2-sm-details">
        <summary>Alle contractbanden</summary>
        <dl className="calc2-sm-batt-rows">
          {band.allContracts.map((row) => (
            <div key={row.key} className="calc2-sm-batt-row">
              <dt>{row.label}</dt>
              <dd>{euroRange(row.annualRange)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

function PhysicalBlock({ physical }) {
  const rows = [
    { label: "Minder netafname", value: `${nf0.format(physical.importReductionKwh)} kWh/jaar` },
    { label: "Minder teruglevering", value: `${nf0.format(physical.exportReductionKwh)} kWh/jaar` },
    { label: "Teruglevering benut", value: `${nf1.format(physical.exportCapturePct)}%` },
    { label: "Capaciteit benut (piek)", value: `${nf1.format(physical.capacityUtilizationPct)}%` },
    { label: "Equivalente volle cycli", value: nf0.format(physical.equivalentFullCycles) },
  ];
  const t = physical.technical;
  return (
    <div className="calc2-sm-phys">
      <p className="calc2-sm-band-eyebrow mono">Uw netprofiel met deze batterij</p>
      <dl className="calc2-sm-batt-rows">
        {rows.map((row) => (
          <div key={row.label} className="calc2-sm-batt-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {physical.incremental && (
        <p className="calc2-sm-batt-delta">
          T.o.v. {physical.incremental.referenceLabel}:{" "}
          {physical.incremental.importReductionKwh >= 0 ? "+" : ""}
          {nf0.format(physical.incremental.importReductionKwh)} kWh minder afname,{" "}
          {physical.incremental.exportCapturePct >= 0 ? "+" : ""}
          {nf1.format(physical.incremental.exportCapturePct)}%-punt benutting
        </p>
      )}
      <details className="calc2-sm-details">
        <summary>Technische details</summary>
        <dl className="calc2-sm-batt-rows">
          <div className="calc2-sm-batt-row"><dt>Geladen uit teruglevering</dt><dd>{nf0.format(t.chargedFromExportKwh)} kWh</dd></div>
          <div className="calc2-sm-batt-row"><dt>Ontlading dekt afname</dt><dd>{nf0.format(t.dischargeOffsetKwh)} kWh</dd></div>
          <div className="calc2-sm-batt-row"><dt>Laad-/ontlaadverliezen</dt><dd>{nf0.format(t.chargeLossesKwh + t.dischargeLossesKwh)} kWh</dd></div>
          <div className="calc2-sm-batt-row"><dt>Hoogste laadtoestand</dt><dd>{nf1.format(t.peakSocKwh)} kWh</dd></div>
          <div className="calc2-sm-batt-row"><dt>Kwartieren vol (capaciteitslimiet)</dt><dd>{nf0.format(t.capacityLimitedIntervals)}</dd></div>
          <div className="calc2-sm-batt-row"><dt>Kwartieren op vermogenslimiet</dt><dd>{nf0.format(t.powerLimitedChargeIntervals + t.powerLimitedDischargeIntervals)}</dd></div>
        </dl>
      </details>
    </div>
  );
}

function SelfConsumptionSection({ selfConsumption }) {
  if (!selfConsumption) return null;
  const { state, analysis, error, onRequest, onRetry } = selfConsumption;

  if (state === "idle") {
    return (
      <div className="calc2-sm-sc">
        <button type="button" className="calc2-sm-linkbtn" onClick={onRequest}>
          Bekijk ook waarde uit zelfconsumptie
        </button>
      </div>
    );
  }
  if (state === "loading") {
    return (
      <div className="calc2-sm-sc" role="status">
        <p className="calc2-sm-drop-sub">Zelfconsumptie-model wordt berekend…</p>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="calc2-sm-sc">
        <div className="calc-error mono" role="alert">{error}</div>
        <button type="button" className="calc2-sm-linkbtn" onClick={onRetry}>
          Opnieuw proberen
        </button>
      </div>
    );
  }

  const models = candidateViewModels(analysis).filter((c) => c.selfConsumption);
  const annualized = models.some((c) => c.selfConsumption.basis === "annualized");
  return (
    <div className="calc2-sm-sc">
      <h3 className="calc2-sm-sc-title">Zelfconsumptie/netverschuiving (2027-model)</h3>
      <dl className="calc2-sm-batt-rows">
        {models.map((c) => (
          <div key={c.id} className="calc2-sm-batt-row">
            <dt>{c.label}</dt>
            <dd>€ {nf0.format(c.selfConsumption.annualValueEur)} per jaar</dd>
          </div>
        ))}
      </dl>
      <p className="calc2-sm-sc-note" role="note">{NOT_ADDITIVE_NOTE}</p>
      <p className="calc2-sm-sc-note">
        Modelwaarde onder het expliciete 2027-scenario (vaste prijzen, geen
        saldering){annualized ? ", geannualiseerd vanuit de aangeleverde periode" : ""}.
        Dit is een simulatie, geen gemeten resultaat.
      </p>
    </div>
  );
}

// onDiscussCandidate (optioneel): opent de leadsectie met deze kandidaat als
// gekozen context. Puur een gebruikersactie — de vergelijking zelf blijft
// zonder "beste"-aanwijzing (analysis.recommendation is null).
export default function BatteryProfileComparison({ analysis, selfConsumption, onDiscussCandidate }) {
  if (!analysis) return null;
  const candidates = candidateViewModels(analysis);
  const firstBand = candidates[0]?.tradingBand;
  const rawBand = analysis.candidates?.[0]?.calculator_trading_band;

  return (
    <section className="calc2-sm-compare" aria-labelledby="sm-compare-title">
      <h2 id="sm-compare-title" className="calc-form-start">
        Uw batterijvergelijking
      </h2>

      {rawBand && (
        <p className="calc2-sm-entry-sub">{exportObservationLabel(rawBand)}</p>
      )}

      {firstBand && (
        <div className="calc2-sm-band-explain" role="note">
          <p>
            De <strong>praktijkband actieve batterijhandel</strong> is de
            bestaande, bewust conservatieve praktijkband van Batterijenplan,
            afgeleid uit gerapporteerde MijnBatterij-praktijkresultaten per
            contracttype. Het is een indicatie: geen garantie, geen
            statistisch betrouwbaarheidsinterval, en niet berekend uit uw
            geüploade meterprofiel. Uw meterdata bepaalt wél de fysieke
            benutting per batterij hieronder.
          </p>
        </div>
      )}

      <div className="calc2-sm-compare-grid">
        {candidates.map((c) => (
          <article key={c.id} className="calc2-sm-batt-card">
            <p className="calc2-sm-batt-size">{c.label}</p>
            <p className="calc2-sm-batt-product mono">
              {c.productName} · {nf1.format(c.usableKwh)} kWh bruikbaar ·{" "}
              {nf1.format(c.powerKw)} kW
            </p>

            <TradingBandBlock band={c.tradingBand} />

            {c.practice && (
              <details className="calc2-sm-details calc2-sm-refs">
                <summary>Bekijk praktijkreferenties</summary>
                {c.practice.coverageNote && (
                  <p className="calc2-sm-ref-warning" role="note">
                    {c.practice.coverageNote}
                  </p>
                )}
                {c.practice.nearest.length > 0 && (
                  <>
                    <p className="calc2-sm-refs-head">
                      Dichtstbijzijnde gerapporteerde systemen
                    </p>
                    {c.practice.nearest.map((ref) => (
                      <PracticeReference key={ref.id} reference={ref} />
                    ))}
                  </>
                )}
                {c.practice.largeSample && (
                  <>
                    <p className="calc2-sm-refs-head">
                      Grootste steekproef in de dataset (marktcontext)
                    </p>
                    <p className="calc2-sm-ref-distance">{c.practice.largeSample.role}</p>
                    <PracticeReference reference={c.practice.largeSample} />
                  </>
                )}
                <p className="calc2-sm-ref-disclaimer">{c.practice.disclaimer}</p>
              </details>
            )}

            <PhysicalBlock physical={c.physical} />

            {onDiscussCandidate && (
              <button
                type="button"
                className="calc2-sm-btn-secondary calc2-sm-batt-cta"
                onClick={() => onDiscussCandidate(c.id)}
              >
                Bespreek deze batterij
              </button>
            )}
          </article>
        ))}
      </div>

      <SelfConsumptionSection selfConsumption={selfConsumption} />
    </section>
  );
}
