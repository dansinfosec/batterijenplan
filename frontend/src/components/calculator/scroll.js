// ── Gedeelde step-scroll voor de calculatorflows ───────────────────────────
// Eén betrouwbare functie voor stapovergangen: scrollt naar de bovenkant van
// de actieve kaart, met ruimte voor de sticky header. Respecteert
// prefers-reduced-motion. Gebruikt door Calculator.jsx (bestaande wizard) en
// SmartMeterFlow.jsx (slimme-meterdata-route).

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Sticky-headerhoogte dynamisch meten (verschilt desktop/mobiel) + visuele marge.
export function calcHeaderOffset() {
  const header = document.querySelector(".site-header");
  const h = header ? header.getBoundingClientRect().height : 64;
  return h + 20;
}

export function scrollToCalculatorTarget(el) {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - calcHeaderOffset();
  window.scrollTo({
    top: Math.max(0, top),
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}
