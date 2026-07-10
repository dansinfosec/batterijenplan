// Cookie-toestemming (GDPR/ePrivacy). Bewaart de keuze 12 maanden in
// localStorage en stuurt de status naar de dataLayer. Google Tag Manager
// wordt PAS geladen zodra er toestemming is voor statistieken óf marketing
// (via window.__gtmLoad, gedefinieerd in index.html). Zonder toestemming
// laadt GTM nooit, dus GA4/Google Ads/Meta Pixel kunnen niet vuren.

const STORAGE_KEY = "bp_cookie_consent";
const VERSION = 1;
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // ~12 maanden

// Noodzakelijke cookies staan altijd aan; alleen deze twee zijn optioneel.
export const DEFAULT_PREFERENCES = { statistics: false, marketing: false };

// Geldige, niet-verlopen keuze ophalen — anders null (opnieuw vragen).
export function getConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (c.v !== VERSION || !c.ts || Date.now() - c.ts > MAX_AGE_MS) return null;
    return { statistics: !!c.statistics, marketing: !!c.marketing };
  } catch {
    return null;
  }
}

export function hasConsent() {
  return getConsent() !== null;
}

function dataLayerPush(payload) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

// Status naar de dataLayer sturen zodat GTM zijn consent-variabelen en
// trigger-condities kan bijwerken.
function pushConsentUpdate(consent) {
  dataLayerPush({
    event: "cookie_consent_update",
    statistics_consent: !!consent.statistics,
    marketing_consent: !!consent.marketing,
  });
}

// Toestemming toepassen: status pushen en GTM laden zodra er voor statistieken
// óf marketing toestemming is. Bij "alleen noodzakelijk" gebeurt er niets meer.
function applyConsent(consent) {
  pushConsentUpdate(consent);
  if ((consent.statistics || consent.marketing) && typeof window.__gtmLoad === "function") {
    window.__gtmLoad();
  }
}

// Keuze opslaan (12 maanden) en direct toepassen.
export function saveConsent(preferences) {
  const record = {
    v: VERSION,
    statistics: !!preferences.statistics,
    marketing: !!preferences.marketing,
    ts: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage geblokkeerd: keuze geldt dan alleen voor deze sessie.
  }
  applyConsent(record);
  return record;
}

// Bij het laden van de app: bestaande (geldige) toestemming meteen toepassen.
// Geen keuze → GTM blijft ongeladen tot de bezoeker kiest.
export function initConsent() {
  const consent = getConsent();
  if (consent) applyConsent(consent);
  return consent;
}
