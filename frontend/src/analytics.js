// GTM is de single source of truth voor GA4 én Google Ads. Deze module laadt
// zelf geen gtag.js/gtm.js meer (de container wordt uitgesteld geladen via het
// snippet in index.html); ze stuurt alleen events naar window.dataLayer. Wat er
// met die events gebeurt (GA4-tags, Google Ads-conversies) wordt volledig in
// Google Tag Manager geconfigureerd.

function dataLayerPush(payload) {
  // dataLayer wordt al in index.html geïnitialiseerd; defensief voor het geval
  // een event vóór dat snippet of in een testomgeving binnenkomt.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

// Eén page_view per SPA-navigatie (inclusief de eerste). Belangrijk tegen
// dubbeltellingen: de GA4-configuratietag mag géén automatische page_view
// sturen en "Page changes based on browser history events" moet in Enhanced
// Measurement uit staan — deze push is de enige bron van page_views.
export function trackPageView(path) {
  dataLayerPush({
    event: "page_view",
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

// Generiek custom-event naar de dataLayer (zelfde uitgestelde mechanisme als de
// rest: GTM verwerkt het pas ná toestemming). Gebruikt voor de sitewide
// lead-CTA-events (lead_cta_click, lead_form_start, homepage_advice_submit,
// article_advice_submit, mobile_sticky_click). Laadt GTM NIET vroeger.
export function trackEvent(event, params = {}) {
  dataLayerPush({ event, ...params });
}

// Lead/conversie: één semantisch event. In GTM hangen zowel de GA4-event-tag
// als de Google Ads-conversietag aan de custom-event trigger "generate_lead".
export function trackLeadSubmit(source = "calculator_advies") {
  // GTM wordt uitsluitend via toestemming geladen (zie consent.js); we forceren
  // het laden hier NIET (dat zou de toestemming omzeilen). Het event wordt in de
  // dataLayer gebufferd en pas door GTM verwerkt zodra die na toestemming laadt.
  // De lead zelf gaat los naar de backend (postLead) — dat is functioneel en
  // staat los van deze marketing/statistiek-tracking.
  dataLayerPush({
    event: "generate_lead",
    lead_source: source,
  });
}
