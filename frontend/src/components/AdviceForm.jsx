import { useRef } from "react";
import LeadCaptureForm, { useLeadCapture } from "./LeadCaptureForm.jsx";
import { trackEvent } from "../analytics.js";

// Eén herbruikbaar, compact adviesformulier voor sitewide lead-capture. Bouwt
// volledig op de bestaande leadlogica (useLeadCapture + LeadCaptureForm):
// dezelfde validatie, consent, honeypot en conversietracking — geen
// duplicatie van verzendlogica.
//
// Props:
//  - headline / text / button : zichtbare kop, ondersteunende tekst, knoptekst
//  - source                   : backend `source` (vrij CharField ≤50) én
//                               lead_source op het generate_lead-conversie-event
//  - submitEvent              : extra semantisch event bij geslaagde inzending
//  - articleSlug              : optioneel; meegestuurd als paginacontext
//  - variant                  : "compact" (naam/telefoon/e-mail/postcode) of
//                               "full" (met bericht)
//
// Paginacontext (page_url + article_slug) reist mee via het bestaande
// calculator_inputs-JSONveld — de backend kent geen apart slug-/URL-veld.
export default function AdviceForm({
  headline,
  text,
  button,
  source,
  submitEvent,
  articleSlug,
  variant = "compact",
}) {
  const state = useLeadCapture();
  const startedRef = useRef(false);

  const context = {
    context: source,
    page_url: typeof window !== "undefined" ? window.location.pathname : "",
    ...(articleSlug ? { article_slug: articleSlug } : {}),
  };

  const handleStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent("lead_form_start", { lead_source: source });
  };

  return (
    <LeadCaptureForm
      state={state}
      calculatorInputs={context}
      calculatorResult={null}
      variant={variant}
      compact={variant === "compact"}
      source={source}
      trackingSource={source}
      copy={{ title: headline, text, button }}
      onStart={handleStart}
      onSubmitted={() => trackEvent(submitEvent, { lead_source: source })}
    />
  );
}
