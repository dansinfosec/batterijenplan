import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useFetch from "../hooks/useFetch.js";
import { fetchPosts, fetchTags } from "../api.js";
import PostCard from "../components/PostCard.jsx";
import TagBar from "../components/TagBar.jsx";
import { setPageMeta, setJsonLd, ORGANIZATION_SCHEMA, WEBSITE_SCHEMA } from "../seo.js";

export default function Home() {
  const [tag, setTag] = useState(null);

  // Perf: de bloglijst/tags staan onder de vouw. We stellen die API-calls
  // uit tot de browser idle is (of kort daarna), zodat de hero — het
  // LCP-element — niet hoeft te concurreren met fetches op mobiel.
  const [fetchReady, setFetchReady] = useState(false);
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setFetchReady(true), { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(() => setFetchReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  const posts = useFetch(() => fetchPosts({ tag }), [tag], fetchReady);
  const tags = useFetch(fetchTags, [], fetchReady);

  useEffect(() => {
    // Defaults uit seo.js: titel + omschrijving van de site.
    setPageMeta({ path: "/" });
    setJsonLd([ORGANIZATION_SCHEMA, WEBSITE_SCHEMA]);
  }, []);

  const items = posts.data?.results ?? posts.data ?? [];

  return (
    <>
      <section className="hero">
        <div className="container" style={{ position: "relative" }}>
          <p className="mono" style={{ color: "var(--volt-dk)", marginBottom: 16 }}>
            Kennisbank · thuisbatterijen · dynamische contracten
          </p>
          <h1>
            Sla je <span className="accent">energie</span> slim op
          </h1>
          <p className="sub">
            Onafhankelijke uitleg over thuisbatterijen, zonnepanelen en
            dynamische energiecontracten. Geen verkooppraat, wel getallen.
          </p>
          <Link to="/calculator" className="cta-button">
            Bereken uw thuisbatterij
          </Link>
          <div className="meta-strip">
            <div className="stat"><b>kWh</b><span className="mono">opslag uitgelegd</span></div>
            <div className="stat"><b>€/dag</b><span className="mono">besparing berekend</span></div>
            <div className="stat"><b>NL</b><span className="mono">salderen &amp; regels</span></div>
          </div>
          <div className="hero-battery" aria-hidden="true">
            <div className="charge" />
          </div>
        </div>
      </section>

      <div className="container">
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
