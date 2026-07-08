import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useFetch from "../hooks/useFetch.js";
import { fetchPosts, fetchTags } from "../api.js";
import PostCard from "../components/PostCard.jsx";
import TagBar from "../components/TagBar.jsx";
import {
  setPageMeta,
  setJsonLd,
  ORGANIZATION_SCHEMA,
  WEBSITE_SCHEMA,
  DEFAULT_IMAGE,
} from "../seo.js";

// Trust-/adviescijfers in de hero — bewust hardcoded, geen admin/API/CMS.
// Bewust geen garanties: alles is "doorgerekend" of "inzichtelijk gemaakt",
// op basis van de situatie.
const HERO_TRUST_CARDS = [
  {
    id: "opslag",
    value: "1.000+ kWh",
    title: "Opslag uitgelegd",
    text: "Voor klanten doorgerekend en uitgelegd: van kleine thuisbatterijen tot grotere opslagoplossingen.",
    detail: "Capaciteit · teruglevering · verbruik",
    panel: {
      title: "Wat betekent opslag uitgelegd?",
      text:
        "Bij batterijadvies draait het niet alleen om een product, maar om de " +
        "juiste capaciteit. Batterijenplan kijkt naar verbruik, teruglevering, " +
        "zonnepanelen en toekomstplannen. Zo wordt duidelijk hoeveel opslag " +
        "logisch is en waarom groter niet altijd beter is.",
    },
  },
  {
    id: "dagwaarde",
    value: "€350+ / dag",
    title: "Dagwaarde inzichtelijk",
    text: "Besparingspotentieel en batterijwaarde inzichtelijk gemaakt op basis van verbruik, teruglevering en contractvorm.",
    detail: "Geen belofte · wel rekenwerk",
    panel: {
      title: "Waarom dagwaarde inzichtelijk maken?",
      text:
        "De waarde van een batterij verschilt per situatie. Op basis van " +
        "teruglevering, stroomprijzen, eigen verbruik en contractvorm kan " +
        "worden doorgerekend wat slim opslaan mogelijk betekent. Dit is geen " +
        "vaste belofte, maar een praktische indicatie.",
    },
  },
  {
    id: "salderen",
    value: "01-01-2027",
    title: "Salderen stopt",
    text: "Vanaf 2027 verandert de rol van teruglevering. Eigen verbruik en slim opslaan worden belangrijker.",
    detail: "Nederlandse regels · terugleverkosten · netbelasting",
    panel: {
      title: "Wat verandert er met salderen?",
      text:
        "Vanaf 1 januari 2027 stopt de salderingsregeling. Daardoor wordt het " +
        "belangrijker om meer eigen zonnestroom direct te gebruiken of " +
        "tijdelijk op te slaan. Een thuisbatterij kan daarbij helpen, " +
        "afhankelijk van uw situatie.",
    },
  },
];

// Alleen de kaartenrij; het uitlegpaneel staat los onder de hero-grid zodat
// het de twee kolommen (content links, batterij rechts) niet verdringt.
function TrustCards({ activeId, onToggle }) {
  return (
    <div className="trust-strip">
      <div className="trust-cards">
        {HERO_TRUST_CARDS.map((card) => {
          const isActive = card.id === activeId;
          return (
            <button
              key={card.id}
              type="button"
              className={`trust-card${isActive ? " active" : ""}`}
              aria-expanded={isActive}
              aria-controls="trust-panel"
              onClick={() => onToggle(card.id)}
            >
              <span className="trust-title">{card.title}</span>
              <b className="trust-value">{card.value}</b>
              <span className="trust-text">{card.text}</span>
              <span className="trust-detail">{card.detail}</span>
              <span className="trust-chev" aria-hidden="true">▾</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [tag, setTag] = useState(null);
  const [activeTrustId, setActiveTrustId] = useState(null);
  const activeTrustCard = HERO_TRUST_CARDS.find((c) => c.id === activeTrustId);

  // Perf: de bloglijst/tags staan onder de vouw. De API-calls starten pas
  // wanneer de blogsectie in de buurt van de viewport komt (600px marge),
  // zodat /api/posts/ en /api/tags/ volledig uit het kritieke laadpad van
  // de hero (het LCP-element) verdwijnen.
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

  const items = posts.data?.results ?? posts.data ?? [];

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <p className="mono" style={{ color: "var(--volt-dk)", marginBottom: 16 }}>
                Kennisbank · thuisbatterijen · dynamische contracten
              </p>
              <h1>
                Sla je energie slim op met een{" "}
                <span className="accent">thuisbatterij</span>
              </h1>
              <p className="sub">
                Onafhankelijke uitleg over thuisbatterijen, zonnepanelen en
                dynamische energiecontracten. Geen verkooppraat, wel getallen.
              </p>
              <Link to="/calculator" className="cta-button">
                Bereken uw thuisbatterij
              </Link>
              <p className="cta-inline mono" style={{ marginTop: 16 }}>
                Liever persoonlijk contact?{" "}
                <Link to="/contact">Vraag gratis advies aan.</Link>
              </p>
              <TrustCards
                activeId={activeTrustId}
                onToggle={(id) => setActiveTrustId(activeTrustId === id ? null : id)}
              />
            </div>

            <div className="hero-visual" aria-hidden="true">
              <div className="hero-battery">
                <div className="charge" />
              </div>
            </div>
          </div>

          {activeTrustCard && (
            <div
              className="trust-panel"
              id="trust-panel"
              role="region"
              aria-label={activeTrustCard.panel.title}
            >
              <h2>{activeTrustCard.panel.title}</h2>
              <p>{activeTrustCard.panel.text}</p>
              <Link to="/calculator" className="cta-button cta-button-sm">
                Bereken uw thuisbatterij
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="container" ref={blogSectionRef}>
        <div className="blog-intro">
          <h2>Laatste artikelen over thuisbatterijen en energieopslag</h2>
          <p>
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

        <div className="post-grid">
          {items.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      </div>
    </>
  );
}
