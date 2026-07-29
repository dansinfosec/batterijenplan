import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useFetch from "../hooks/useFetch.js";
import { fetchPosts, fetchTags } from "../api.js";
import { optimizedImageUrl } from "../images.js";
import TagBar from "../components/TagBar.jsx";
import {
  setPageMeta,
  setJsonLd,
  ORGANIZATION_SCHEMA,
  WEBSITE_SCHEMA,
  DEFAULT_IMAGE,
} from "../seo.js";

// ── Statische content (geen API/CMS) ──────────────────────────────────────
// Bewust geen harde beloftes of verzonnen cijfers. De voorbeeldberekening in
// de hero is expliciet gelabeld als "Voorbeeldberekening".
const STEPS = [
  {
    num: "01",
    title: "Uw energiegegevens",
    text: "Verbruik, zonnepanelen en teruglevering vormen de basis.",
  },
  {
    num: "02",
    title: "Uw energiedoel",
    text: "Kies tussen meer eigen verbruik, dynamische prijzen of toekomstige uitbreiding.",
  },
  {
    num: "03",
    title: "Uw batterijadvies",
    text: "Ontvang een passende indicatie voor capaciteit en systeemopbouw.",
  },
];

const COMPARE_POINTS = [
  {
    term: "Bruikbare capaciteit",
    text: "Niet de bruto-kWh, maar wat u werkelijk kunt gebruiken (ontlaaddiepte).",
  },
  {
    term: "Laad- en ontlaadvermogen",
    text: "Hoe snel de batterij kan laden en leveren, uitgedrukt in kW.",
  },
  {
    term: "Garantie en restcapaciteit",
    text: "Aantal cycli of jaren en de capaciteit die daarna gegarandeerd overblijft.",
  },
  {
    term: "EMS en slimme aansturing",
    text: "Sturing op verbruik, teruglevering en dynamische stroomprijzen.",
  },
  {
    term: "Uitbreidbaarheid",
    text: "Kunt u later modules bijplaatsen als uw verbruik groeit?",
  },
  {
    term: "Compatibiliteit met omvormer en woning",
    text: "Past het systeem bij uw omvormer, meterkast en netaansluiting?",
  },
];

const METHOD_FACTORS = [
  { factor: "Jaarlijks stroomverbruik", unit: "kWh / jaar" },
  { factor: "Teruglevering", unit: "kWh / jaar" },
  { factor: "Zonnepanelen", unit: "vermogen / aantal" },
  { factor: "Energiecontract", unit: "vast / dynamisch" },
  { factor: "Energieverlies", unit: "rendement" },
  { factor: "Toekomstig verbruik", unit: "EV / warmtepomp" },
];

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Compacte voorbeeldberekening — volledig in HTML/CSS opgebouwd (geen
// afbeelding), zodat er geen extra netwerk- of LCP-kosten zijn.
function CalculationPreview() {
  return (
    <aside className="hp-preview" aria-label="Voorbeeldberekening">
      <div className="hp-preview-head">
        <span className="hp-preview-title">Energieprofiel</span>
        <span className="hp-preview-tag">Voorbeeldberekening</span>
      </div>
      <div className="hp-prow">
        <span className="hp-prow-label">Jaarverbruik</span>
        <span className="hp-prow-value">4.500 kWh</span>
      </div>
      <div className="hp-prow">
        <span className="hp-prow-label">Teruglevering</span>
        <span className="hp-prow-value">3.200 kWh</span>
      </div>
      <div className="hp-prow">
        <span className="hp-prow-label">Doel</span>
        <span className="hp-prow-value">Meer eigen stroom</span>
      </div>
      <div className="hp-prow hp-prow--result">
        <span className="hp-prow-label">Indicatief advies</span>
        <span className="hp-result-value">14 kWh</span>
      </div>
    </aside>
  );
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

  const posts = useFetch(() => fetchPosts({ tag }), [tag], fetchReady);
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

  const items = posts.data?.results ?? posts.data ?? [];
  const featured = items[0];
  const supporting = items.slice(1, 5);

  return (
    <>
      {/* ── Hero: compacte editorial hero + voorbeeldberekening ── */}
      <section className="hp-hero">
        <div className="container">
          <div className="hp-hero-grid">
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
                <Link to="/calculator" className="hp-btn">
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
            </div>

            {/* Bron-volgorde: op mobiel verschijnt de preview automatisch ónder
                de tekst + CTA; op desktop staat hij rechts naast de tekst. */}
            <CalculationPreview />
          </div>
        </div>
      </section>

      {/* ── Van energieprofiel naar batterijadvies ── */}
      <section className="hp-section">
        <div className="container">
          <div className="hp-section-head">
            <h2 className="hp-h2">Van energieprofiel naar batterijadvies</h2>
          </div>
          <div className="hp-steps">
            {STEPS.map((step) => (
              <div className="hp-step" key={step.num}>
                <span className="hp-step-num">{step.num}</span>
                <span className="hp-step-title">{step.title}</span>
                <p className="hp-step-text">{step.text}</p>
              </div>
            ))}
          </div>
          <div className="hp-section-cta">
            <Link to="/calculator" className="hp-link">
              Start de berekening
              <span aria-hidden="true" className="hp-link-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Vergelijken op meer dan capaciteit ── */}
      <section className="hp-section">
        <div className="container">
          <div className="hp-section-head">
            <h2 className="hp-h2">
              Een thuisbatterij vergelijkt u op meer dan capaciteit
            </h2>
            <p className="hp-section-intro">
              Capaciteit is maar één maatstaf. Voor een eerlijke vergelijking
              telt vooral hoe een systeem zich in de praktijk gedraagt.
            </p>
          </div>
          <div className="hp-compare-list">
            {COMPARE_POINTS.map((point) => (
              <div className="hp-compare-item" key={point.term}>
                <div className="hp-compare-term">{point.term}</div>
                <p className="hp-compare-text">{point.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Methodiek: berekeningen die u kunt volgen ── */}
      <section className="hp-method" id="rekenmethode">
        <div className="container">
          <div className="hp-method-grid">
            <div>
              <span className="hp-kicker">Rekenmethode</span>
              <h2 className="hp-h2">Berekeningen die u kunt volgen</h2>
              <p className="hp-section-intro">
                Wij rekenen niet met vaste beloftes, maar met uw eigen situatie.
                Voor een passend batterijadvies kijken wij naar:
              </p>
              <ul className="hp-method-intro-list">
                <li>Jaarlijks stroomverbruik</li>
                <li>Teruglevering</li>
                <li>Zonnepanelen</li>
                <li>Energiecontract</li>
                <li>Energieverlies</li>
                <li>Toekomstig verbruik</li>
              </ul>
              <div className="hp-section-cta">
                {/* Er bestaat (nog) geen aparte rekenmethode-route. Bewust naar de
                    calculator gelinkt i.p.v. een gebroken route aan te maken;
                    vervang dit door de methodiek-pagina zodra die bestaat. */}
                <Link to="/calculator" className="hp-link">
                  Bekijk de rekenmethode
                  <span aria-hidden="true" className="hp-link-arrow">→</span>
                </Link>
              </div>
            </div>

            <div className="hp-sheet" aria-hidden="true">
              <div className="hp-sheet-head">
                <span>Rekenbladen</span>
                <span>Invoer → advies</span>
              </div>
              {METHOD_FACTORS.map((row) => (
                <div className="hp-sheet-row" key={row.factor}>
                  <span className="hp-sheet-factor">{row.factor}</span>
                  <span className="hp-sheet-unit">{row.unit}</span>
                </div>
              ))}
              <div className="hp-sheet-total">
                <span className="hp-sheet-factor">Passend batterijadvies</span>
                <span className="hp-sheet-unit">kWh-capaciteit</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Artikelen: editorial publicatielayout ── */}
      <section className="hp-articles" id="artikelen" ref={blogSectionRef}>
        <div className="container">
          <div className="hp-section-head">
            <h2 className="hp-h2">Artikelen over thuisbatterijen en energieopslag</h2>
            <p className="hp-section-intro">
              Praktische kennis over batterijopslag, EMS en dynamische
              energiecontracten — zonder verkooppraat, wel getallen.
            </p>
          </div>

          <TagBar tags={tags.data} active={tag} onSelect={setTag} />

          {posts.loading && (
            <div className="state mono"><span className="blink">▮▮▮</span> laden…</div>
          )}
          {posts.error && (
            <div className="state">
              Kan de artikelen niet laden. Draait de Django-server op poort 8000?
            </div>
          )}
          {!posts.loading && !posts.error && items.length === 0 && (
            <div className="state">
              Nog geen gepubliceerde artikelen. Maak er één aan in de Django-admin.
            </div>
          )}

          {items.length > 0 && (
            <div className="hp-articles-grid">
              {featured && (
                <Link to={`/post/${featured.slug}`} className="hp-feature">
                  {featured.cover_image_url && (
                    <div className="hp-feature-media">
                      <img
                        src={optimizedImageUrl(featured.cover_image_url, 800)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    </div>
                  )}
                  <div className="hp-feature-body">
                    {featured.tags?.length > 0 && (
                      <span className="hp-tag">{featured.tags[0]}</span>
                    )}
                    <h3>{featured.title}</h3>
                    {featured.excerpt && (
                      <p className="hp-feature-excerpt">{featured.excerpt}</p>
                    )}
                    <span className="hp-meta">
                      {formatDate(featured.published_at)}
                      {featured.reading_minutes
                        ? ` · ${featured.reading_minutes} min leestijd`
                        : ""}
                    </span>
                  </div>
                </Link>
              )}

              {supporting.length > 0 && (
                <div className="hp-article-list">
                  {supporting.map((p) => (
                    <Link key={p.id} to={`/post/${p.slug}`} className="hp-article">
                      <div className="hp-article-top">
                        {p.tags?.length > 0 && <span className="hp-tag">{p.tags[0]}</span>}
                        <span className="hp-meta">{formatDate(p.published_at)}</span>
                      </div>
                      <h4>{p.title}</h4>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Afsluitende CTA ── */}
      <section className="hp-final">
        <div className="container">
          <div className="hp-final-inner">
            <div className="hp-final-text">
              <h2>Klaar om uw batterijcapaciteit te berekenen?</h2>
              <p>
                Gebruik uw eigen verbruik en teruglevering voor een persoonlijk
                eerste advies.
              </p>
            </div>
            <Link to="/calculator" className="hp-btn">
              Start de berekening
              <span aria-hidden="true" className="hp-btn-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
