import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  initConsent,
  getConsent,
  hasConsent,
  saveConsent,
  DEFAULT_PREFERENCES,
} from "../consent.js";

// Event waarmee de footer-link "Cookie-instellingen" het voorkeurenscherm
// heropent, zonder prop-drilling of context.
export const OPEN_COOKIE_SETTINGS_EVENT = "open-cookie-settings";

function Toggle({ id, checked, disabled, onChange, children, note }) {
  return (
    <div className="cookie-option">
      <label className="cookie-option-head" htmlFor={id}>
        <span className="cookie-option-title">{children}</span>
        <span className={`cookie-switch${checked ? " on" : ""}${disabled ? " locked" : ""}`}>
          <input
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.checked)}
          />
          <span className="cookie-switch-track" aria-hidden="true" />
        </span>
      </label>
      {note && <p className="cookie-option-note">{note}</p>}
    </div>
  );
}

export default function CookieConsent() {
  // Banner tonen zolang er geen (geldige) keuze is opgeslagen.
  const [decided, setDecided] = useState(() => hasConsent());
  const [modalOpen, setModalOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => getConsent() || { ...DEFAULT_PREFERENCES });

  useEffect(() => {
    // Bestaande toestemming meteen toepassen (laadt GTM als die er is).
    initConsent();

    const openSettings = () => {
      setPrefs(getConsent() || { ...DEFAULT_PREFERENCES });
      setModalOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
  }, []);

  // Esc sluit het voorkeurenscherm (alleen als er al een keuze is gemaakt).
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape" && decided) setModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen, decided]);

  const acceptAll = () => {
    saveConsent({ statistics: true, marketing: true });
    setDecided(true);
    setModalOpen(false);
  };
  const rejectAll = () => {
    saveConsent({ statistics: false, marketing: false });
    setDecided(true);
    setModalOpen(false);
  };
  const savePrefs = () => {
    saveConsent(prefs);
    setDecided(true);
    setModalOpen(false);
  };

  const showBanner = !decided && !modalOpen;

  return (
    <>
      {showBanner && (
        <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookievoorkeuren">
          <div className="cookie-banner-inner">
            <div className="cookie-banner-text">
              <strong className="cookie-banner-title">Wij gebruiken cookies</strong>
              <p>
                Noodzakelijke cookies zijn altijd actief. Met uw toestemming
                gebruiken we cookies voor statistieken en marketing. Lees meer in
                ons <Link to="/privacy">privacybeleid</Link>.
              </p>
            </div>
            <div className="cookie-actions">
              <button type="button" className="cookie-btn cookie-btn-primary" onClick={acceptAll}>
                Alles accepteren
              </button>
              <button type="button" className="cookie-btn cookie-btn-secondary" onClick={rejectAll}>
                Alleen noodzakelijke cookies
              </button>
              <button type="button" className="cookie-btn cookie-btn-text" onClick={() => setModalOpen(true)}>
                Voorkeuren
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="cookie-modal-backdrop"
          onClick={() => decided && setModalOpen(false)}
        >
          <div
            className="cookie-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Cookievoorkeuren"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="cookie-modal-title">Cookievoorkeuren</h2>
            <p className="cookie-modal-intro">
              Kies zelf welke cookies wij mogen gebruiken. Uw keuze bewaren we 12
              maanden.
            </p>

            <Toggle id="cookie-necessary" checked disabled note="Nodig om de website te laten werken (bijvoorbeeld uw cookiekeuze). Kan niet uit.">
              Noodzakelijk
            </Toggle>

            <Toggle
              id="cookie-statistics"
              checked={prefs.statistics}
              onChange={(v) => setPrefs((p) => ({ ...p, statistics: v }))}
              note="Anonieme statistieken (GA4) om de website te verbeteren."
            >
              Statistieken
            </Toggle>

            <Toggle
              id="cookie-marketing"
              checked={prefs.marketing}
              onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
              note="Marketing en advertenties (Google Ads, Meta Pixel)."
            >
              Marketing
            </Toggle>

            <div className="cookie-modal-actions">
              <button type="button" className="cookie-btn cookie-btn-secondary" onClick={savePrefs}>
                Voorkeuren opslaan
              </button>
              <button type="button" className="cookie-btn cookie-btn-primary" onClick={acceptAll}>
                Alles accepteren
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
