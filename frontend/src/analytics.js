const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;
let scheduled = false;

// Events die binnenkomen vóórdat gtag klaar is; worden na init doorgestuurd.
const pendingEvents = [];

function flushPendingEvents() {
  for (const [name, params] of pendingEvents.splice(0)) {
    window.gtag("event", name, params);
  }
}

// Laadt gtag.js en zet de config. Idempotent: het script wordt maximaal
// één keer ingevoegd.
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

// Perf: gtag.js (~175 KB) mag niet meedoen in het FCP/LCP-venster.
// We laden pas bij de eerste échte gebruikersinteractie, of anders
// 5 seconden na window load. Geen requestIdleCallback meer: die vuurde
// vaak al tijdens de initial load.
const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"];

export function initAnalytics() {
  if (!GA_MEASUREMENT_ID || initialized || scheduled) return;
  scheduled = true;

  let loadTimer = null;

  const cleanup = () => {
    for (const evt of INTERACTION_EVENTS) {
      window.removeEventListener(evt, start);
    }
    window.removeEventListener("load", onLoad);
    if (loadTimer !== null) clearTimeout(loadTimer);
  };

  const start = () => {
    cleanup();
    setupGtag();
  };

  const onLoad = () => {
    loadTimer = setTimeout(start, 5000);
  };

  // a) eerste gebruikersinteractie…
  for (const evt of INTERACTION_EVENTS) {
    window.addEventListener(evt, start, { passive: true });
  }

  // b) …of window load + 5s, wat het eerst komt.
  if (document.readyState === "complete") {
    onLoad();
  } else {
    window.addEventListener("load", onLoad, { once: true });
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

  // Conversies mogen nooit wachten op het uitgestelde laden: eerst gtag
  // opzetten, daarna direct versturen. De gtag-stub queuet in de dataLayer
  // totdat gtag.js geladen is, dus de events komen gegarandeerd aan.
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
