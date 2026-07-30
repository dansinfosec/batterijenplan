import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { trackEvent } from "../analytics.js";

const DISMISS_KEY = "bp_sticky_dismissed";

// Compacte, mobiel-only onderbalk die naar de calculator leidt. Wordt alleen
// gerenderd door de homepage en artikeldetailpagina (dus nooit op /calculator).
// Verschijnt pas na het scrollen voorbij de openingssectie, is te sluiten
// (onthouden per sessie), verbergt zich bij focus in een invoerveld en wanneer
// de cookiebanner zichtbaar is. Vaste overlay: reserveert geen ruimte en geeft
// geen layout shift. Geen externe library.
export default function MobileStickyCta() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [scrolledPast, setScrolledPast] = useState(false);
  const [fieldFocused, setFieldFocused] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    const check = () => {
      // Voorbij de openingssectie: ongeveer één schermhoogte.
      setScrolledPast(window.scrollY > Math.min(window.innerHeight, 640));
      // Niet over de cookiecontrols heen tonen.
      setCookieOpen(!!document.querySelector(".cookie-banner"));
    };
    check();

    const onFocusIn = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") setFieldFocused(true);
    };
    const onFocusOut = () => setFieldFocused(false);

    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [dismissed]);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* sessionStorage kan geblokkeerd zijn; dan gewoon deze render sluiten */
    }
    setDismissed(true);
  };

  const show = scrolledPast && !fieldFocused && !cookieOpen;

  return (
    <div className={`sticky-cta${show ? " is-visible" : ""}`} aria-hidden={!show}>
      <span className="sticky-cta-text">Welke batterij past bij uw woning?</span>
      <Link
        to="/calculator"
        className="sticky-cta-btn"
        tabIndex={show ? 0 : -1}
        onClick={() => trackEvent("mobile_sticky_click")}
      >
        Bereken
      </Link>
      <button
        type="button"
        className="sticky-cta-close"
        onClick={dismiss}
        aria-label="Sluiten"
        tabIndex={show ? 0 : -1}
      >
        ×
      </button>
    </div>
  );
}
