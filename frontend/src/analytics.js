const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;

export function initAnalytics() {
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
}

export function trackPageView(path) {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackLeadSubmit(source = "calculator_advies") {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  window.gtag("event", "generate_lead", {
    event_category: "lead",
    event_label: source,
  });

  window.gtag("event", "ads_conversion_signup", {
    event_category: "lead",
    event_label: source,
  });
}