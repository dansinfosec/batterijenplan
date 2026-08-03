import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useFetch from "../hooks/useFetch.js";
import { fetchPostsPage, fetchTags } from "../api.js";
import MobileStickyCta from "../components/MobileStickyCta.jsx";
import BatteryPreview from "../components/home/BatteryPreview.jsx";
import AdviceJourney from "../components/home/AdviceJourney.jsx";
import CapacityCompare from "../components/home/CapacityCompare.jsx";
import CalcTransparency from "../components/home/CalcTransparency.jsx";
import LeadSection from "../components/home/LeadSection.jsx";
import ArticlesSection from "../components/home/ArticlesSection.jsx";
import {
  setPageMeta,
  setJsonLd,
  ORGANIZATION_SCHEMA,
  WEBSITE_SCHEMA,
  DEFAULT_IMAGE,
} from "../seo.js";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function Home() {
  const [tag, setTag] = useState(null);
  const location = useLocation();

  // Perf: de bloglijst/tags staan onder de vouw. De API-calls starten pas
  // wanneer de artikelensectie in de buurt van de viewport komt (600px marge),
  // zodat /api/posts/ en /api/tags/ volledig uit het kritieke laadpad van
  // de hero verdwijnen.
  const [fetchReady, setFetchReady] = useState(false);
  const blogSectionRef = useRef(null);
  useEffect(() => {
    if ("IntersectionObserver" in window && blogSectionRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            observer.disconnect();
            setFetchReady(true);
          }
        },
        { rootMargin: "600px" },
      );
      observer.observe(blogSectionRef.current);
      return () => observer.disconnect();
    }

    // Fallback zonder IntersectionObserver: 2s na window load.
    let timer;
    const startLater = () => {
      timer = setTimeout(() => setFetchReady(true), 2000);
    };
    if (document.readyState === "complete") {
      startLater();
    } else {
      window.addEventListener("load", startLater, { once: true });
    }
    return () => {
      window.removeEventListener("load", startLater);
      clearTimeout(timer);
    };
  }, []);

  // Homepage toont maar een handvol artikelen: één pagina volstaat (geen volledige archief-fetch).
  const posts = useFetch(() => fetchPostsPage({ tag }), [tag], fetchReady);
  const tags = useFetch(fetchTags, [], fetchReady);

  useEffect(() => {
    // Defaults uit seo.js: titel + omschrijving van de site.
    setPageMeta({ path: "/", image: DEFAULT_IMAGE });
    setJsonLd([ORGANIZATION_SCHEMA, WEBSITE_SCHEMA]);
  }, []);

  // Anker-navigatie vanuit de header (/#artikelen, /#rekenmethode): scroll naar
  // de sectie zodra hij bestaat. De secties staan altijd in de DOM (ook vóór de
  // lazy fetch), dus dit werkt ook direct na een navigatie van een andere pagina.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  }, [location.hash]);

  return (
    <>
      {/* ── Hero: interactief beslisgebied. H1/sub/CTA/note-teksten zijn
          identiek aan de statische shell in index.html (LCP-continuïteit). ── */}
      <section className="hp-hero hp2-hero">
        <div className="hp2-hero-deco" aria-hidden="true" />
        <div className="container">
          <div className="hp2-hero-grid">
            <div className="hp-hero-content">
              <span className="hp-kicker">
                Onafhankelijk · thuisbatterijen · dynamische contracten
              </span>
              <h1>
                Bereken welke <span className="accent">thuisbatterij</span> bij uw
                woning past
              </h1>
              <p className="hp-hero-sub">
                Ontvang een persoonlijk capaciteitsadvies op basis van uw
                stroomverbruik, teruglevering en energiedoel.
              </p>
              <div className="hp-hero-actions">
                <Link to="/calculator" className="hp-btn hp2-btn-main">
                  Bereken uw thuisbatterij
                  <span aria-hidden="true" className="hp-btn-arrow">→</span>
                </Link>
                <Link to="/#rekenmethode" className="hp-link">
                  Bekijk hoe de berekening werkt
                </Link>
              </div>
              <p className="hp-hero-note">
                Binnen enkele minuten een eerste indicatie
              </p>
              <p className="hp2-hero-trust">
                Zonder verkooppraat · uw gegevens alleen voor uw advies
              </p>
            </div>

            {/* Bron-volgorde: op mobiel verschijnt de preview automatisch ónder
                de tekst + CTA; op desktop staat hij rechts naast de tekst. */}
            <BatteryPreview />
          </div>
        </div>
      </section>

      <AdviceJourney />

      <CapacityCompare />

      <CalcTransparency />

      <LeadSection />

      <ArticlesSection
        posts={posts}
        tags={tags}
        tag={tag}
        onSelectTag={setTag}
        sectionRef={blogSectionRef}
      />

      {/* ── Afsluitende CTA: donkere contrastband ── */}
      <section className="hp2-final">
        <div className="container">
          <div className="hp2-final-inner">
            <div className="hp2-final-text">
              <span className="hp2-final-kicker mono">Klaar voor de volgende stap?</span>
              <h2>Bereken uw batterijcapaciteit</h2>
              <p>
                Gebruik uw eigen verbruik en teruglevering voor een persoonlijk
                eerste advies.
              </p>
            </div>
            <Link to="/calculator" className="hp-btn hp2-btn-main hp2-final-btn">
              Start de berekening
              <span aria-hidden="true" className="hp-btn-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      <MobileStickyCta />
    </>
  );
}
