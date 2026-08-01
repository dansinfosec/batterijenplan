import { Link } from "react-router-dom";
import { optimizedImageUrl } from "../../images.js";
import TagBar from "../TagBar.jsx";

// Artikelen als content-bestemming: één uitgelicht artikel met beeld, daarnaast
// compacte kaarten met chip + metadata, en een duidelijke archief-link.
// Data-gedrag (lazy fetch, tags, API) blijft in Home.jsx — deze component
// rendert alleen.
function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ArticlesSection({ posts, tags, tag, onSelectTag, sectionRef }) {
  const items = posts.data?.results ?? posts.data ?? [];
  const featured = items[0];
  const supporting = items.slice(1, 5);

  return (
    <section className="hp-articles hp2-articles" id="artikelen" ref={sectionRef}>
      <div className="container">
        <div className="hp-section-head hp2-articles-head">
          <div>
            <span className="hp-kicker">Kennisbank</span>
            <h2 className="hp-h2">Artikelen over thuisbatterijen en energieopslag</h2>
            <p className="hp-section-intro">
              Praktische kennis over batterijopslag, EMS en dynamische
              energiecontracten — zonder verkooppraat, wel getallen.
            </p>
          </div>
          <Link to="/artikelen" className="hp-link hp2-articles-all">
            Alle artikelen
            <span aria-hidden="true" className="hp-link-arrow">→</span>
          </Link>
        </div>

        <TagBar tags={tags.data} active={tag} onSelect={onSelectTag} />

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
          <div className="hp2-articles-grid">
            {featured && (
              <Link to={`/post/${featured.slug}`} className="hp2-feature">
                {featured.cover_image_url && (
                  <div className="hp2-feature-media">
                    <img
                      src={optimizedImageUrl(featured.cover_image_url, 800)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  </div>
                )}
                <div className="hp2-feature-body">
                  <span className="hp2-feature-flag mono">Uitgelicht</span>
                  {featured.tags?.length > 0 && (
                    <span className="hp-tag">{featured.tags[0]}</span>
                  )}
                  <h3>{featured.title}</h3>
                  {featured.excerpt && (
                    <p className="hp2-feature-excerpt">{featured.excerpt}</p>
                  )}
                  <span className="hp-meta">
                    {formatDate(featured.published_at)}
                    {featured.reading_minutes
                      ? ` · ${featured.reading_minutes} min leestijd`
                      : ""}
                  </span>
                  <span className="hp2-feature-more">
                    Lees artikel
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            )}

            {supporting.length > 0 && (
              <div className="hp2-article-list">
                {supporting.map((p) => (
                  <Link key={p.id} to={`/post/${p.slug}`} className="hp2-article">
                    <div className="hp2-article-top">
                      {p.tags?.length > 0 && <span className="hp-tag">{p.tags[0]}</span>}
                      <span className="hp-meta">{formatDate(p.published_at)}</span>
                    </div>
                    <h4>{p.title}</h4>
                    <span className="hp2-article-more" aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
