import { useState } from "react";
import useFetch from "../hooks/useFetch.js";
import { fetchPosts, fetchTags } from "../api.js";
import PostCard from "../components/PostCard.jsx";
import TagBar from "../components/TagBar.jsx";

export default function Home() {
  const [tag, setTag] = useState(null);
  const posts = useFetch(() => fetchPosts({ tag }), [tag]);
  const tags = useFetch(fetchTags, []);

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
