// ── Slimme-meter-analyse: pure client-logica ───────────────────────────────
// Payload-opbouw en foutvertaling voor POST /api/smartmeter/analysis/,
// zonder browser-API's op moduleniveau zodat alles onder `node --test`
// draait. De React-laag (api.js / SmartMeterFlow) levert alleen fetch en
// state; alle beslislogica staat hier.
//
// Contractregels (gespiegeld aan de backend):
// - financial_scenario wordt standaard WEGGELATEN: fysiek-only is de default.
//   Het zelfconsumptie-model is een expliciete tweede aanvraag.
// - De frontend berekent zelf nooit statistiek of totalen bovenop de
//   response en wijst nooit zelf een "beste" batterij aan.

export const ANALYSIS_PATH = "/smartmeter/analysis/";
export const SELF_CONSUMPTION_SCENARIO = "study_2027_post_fixed";
// Ruim boven de ~3 s die een vol jaar backend-rekentijd kost, maar eindig:
// zonder deadline zou een hangende verbinding de knop voorgoed blokkeren.
export const ANALYSIS_TIMEOUT_MS = 90_000;

// Nauwkeurige privacytekst: het CSV-bestand zelf blijft in de browser, de
// uitgelezen kwartierwaarden gaan tijdelijk naar de rekenmodule (stateloos,
// zie smartmeter/api.py — geen opslag, geen logging van intervaldata).
export const SMARTMETER_PRIVACY_NOTICE =
  "Uw CSV-bestand wordt lokaal in uw browser gelezen. Voor de berekening " +
  "sturen we de uitgelezen kwartierwaarden tijdelijk naar onze rekenmodule. " +
  "De meetdata wordt niet opgeslagen.";

export class SmartMeterApiError extends Error {
  constructor(kind, userMessage, { status = null, retryable = true } = {}) {
    super(userMessage);
    this.name = "SmartMeterApiError";
    this.kind = kind; // 'validation' | 'rate_limited' | 'server' | 'unavailable' | 'network' | 'timeout'
    this.userMessage = userMessage;
    this.status = status;
    this.retryable = retryable;
  }
}

export function buildAnalysisPayload(intervals, { intervalMinutes = 15, financialScenario = null } = {}) {
  const payload = {
    source: "homewizard",
    interval_minutes: intervalMinutes || 15,
    intervals,
  };
  // Alleen meesturen wanneer expliciet aangevraagd — nooit standaard.
  if (financialScenario) payload.financial_scenario = financialScenario;
  return payload;
}

export function mapHttpError(status, serverDetail) {
  if (status === 400) {
    return new SmartMeterApiError(
      "validation",
      serverDetail ||
        "De meetdata kon niet worden verwerkt. Controleer of het bestand een doorlopende kwartier-export is.",
      { status, retryable: false }
    );
  }
  if (status === 429) {
    return new SmartMeterApiError(
      "rate_limited",
      "Te veel berekeningen kort na elkaar. Wacht een minuut en probeer het opnieuw — uw ingelezen data blijft bewaard.",
      { status }
    );
  }
  if (status === 503) {
    return new SmartMeterApiError(
      "unavailable",
      "De rekenmodule is tijdelijk niet beschikbaar. Probeer het over enkele minuten opnieuw.",
      { status }
    );
  }
  return new SmartMeterApiError(
    "server",
    "Er ging iets mis in de rekenmodule. Probeer het opnieuw; uw ingelezen data blijft bewaard.",
    { status }
  );
}

export function mapTransportError(err) {
  if (err && err.name === "AbortError") {
    return new SmartMeterApiError(
      "timeout",
      "De analyse duurde te lang en is afgebroken. Probeer het opnieuw — uw ingelezen data blijft bewaard.",
      { retryable: true }
    );
  }
  return new SmartMeterApiError(
    "network",
    "Geen verbinding met de rekenmodule. Controleer uw internetverbinding en probeer het opnieuw.",
    { retryable: true }
  );
}

// Kern-request met injecteerbare fetch (testbaar zonder browser). De caller
// bewaart de geparsede intervallen; opnieuw proberen hergebruikt dus altijd
// dezelfde data en vraagt nooit om een nieuw bestand.
export async function requestAnalysis(
  fetchImpl,
  apiBase,
  intervals,
  { intervalMinutes = 15, financialScenario = null, signal } = {}
) {
  let res;
  try {
    res = await fetchImpl(`${apiBase}${ANALYSIS_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildAnalysisPayload(intervals, { intervalMinutes, financialScenario })
      ),
      signal,
    });
  } catch (err) {
    throw mapTransportError(err);
  }
  if (!res.ok) {
    let detail = null;
    try {
      const body = await res.json();
      detail = body?.error?.detail || null;
    } catch {
      /* geen JSON-body — generieke melding per status */
    }
    throw mapHttpError(res.status, detail);
  }
  return res.json();
}
