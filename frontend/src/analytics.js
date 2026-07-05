const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;
let initScheduled = false;

// Events die binnenkomen vóórdat gtag klaar is; worden na init doorgestuurd.
const pendingEvents = [];

function flushPendingEvents() {
  for (const [name, params] of pendingEvents.splice(0)) {
    window.gtag("event", name, params);
  }
}

// Laadt gtag.js en zet de config. Idempotent.
function setupGtag() {
  if (!GA_MEASUREMENT_ID || initialized) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
  });

  initialized = true;
  flushPendingEvents();
}

// Perf: gtag.js pas laden als de browser idle is (of na een korte fallback-
// timeout), zodat het script niet concurreert met de LCP op mobiel.
// Events die eerder binnenkomen worden gequeued en gaan niet verloren.
export function initAnalytics() {
  if (!GA_MEASUREMENT_ID || initialized || initScheduled) return;
  initScheduled = true;

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(setupGtag, { timeout: 3000 });
  } else {
    setTimeout(setupGtag, 1500);
  }
}

export function trackPageView(path) {
  if (!GA_MEASUREMENT_ID) return;

  // Parameters nú vastleggen (titel/URL kloppen op dit moment), later versturen.
  const params = {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  };

  if (!initialized) {
    pendingEvents.push(["page_view", params]);
    return;
  }

  window.gtag("event", "page_view", params);
}

export function trackLeadSubmit(source = "calculator_advies") {
  if (!GA_MEASUREMENT_ID) return;

  // Conversies mogen niet wachten op de idle-init: eerst gtag opzetten,
  // daarna direct versturen. De gtag-stub queuet in de dataLayer totdat
  // gtag.js geladen is, dus de events komen gegarandeerd aan.
  if (!initialized) {
    setupGtag();
  }

  window.gtag("event", "generate_lead", {
    event_category: "lead",
    event_label: source,
  });

  window.gtag("event", "ads_conversion_signup", {
    event_category: "lead",
    event_label: source,
  });
}
