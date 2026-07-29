import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

// Kennisbank / artikeloverzicht. Editorial publicatielayout: compacte masthead,
// één uitgelicht artikel (eerste post uit de bestaande, gesorteerde API-respons —
// geen "featured"-veld verzonnen in de backend) en een gecontroleerde lijst van
// de overige artikelen. Hergebruikt de homepage-beeldtaal (Het Energiedossier).
function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ArticleCard({ post }) {
  return (
    <Link to={`/post/${post.slug}`} className="article-card">
      {post.cover_image_url && (
        <div className="article-card-media">
          <img
            src={optimizedImageUrl(post.cover_image_url, 640)}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
      )}
      <div className="article-card-body">
        {post.tags?.length > 0 && <span className="article-tag">{post.tags[0]}</span>}
        <h3>{post.title}</h3>
        {post.excerpt && <p className="article-card-excerpt">{post.excerpt}</p>}
        <span className="article-metaline">
          {formatDate(post.published_at)}
          {post.reading_minutes ? ` · ${post.reading_minutes} min` : ""}
        </span>
      </div>
    </Link>
  );
}

export default function Articles() {
  const [tag, setTag] = useState(null);

  const posts = useFetch(() => fetchPosts({ tag }), [tag]);
  const tags = useFetch(fetchTags, []);

  useEffect(() => {
    setPageMeta({
      title: "Kennisbank thuisbatterijen — artikelen | Batterijenplan",
      description:
        "Praktische uitleg over thuisbatterijcapaciteit, installatie, energieprijzen, rendement en slimme aansturing. Onafhankelijke kennisbank van Batterijenplan.",
      path: "/artikelen",
      image: DEFAULT_IMAGE,
    });
    setJsonLd([ORGANIZATION_SCHEMA, WEBSITE_SCHEMA]);
    window.scrollTo(0, 0);
  }, []);

  const items = posts.data?.results ?? posts.data ?? [];
  // Uitgelicht = de eerste post uit de bestaande sortering (geen backend-wijziging).
  const featured = items[0];
  const rest = items.slice(1);

  return (
    <section className="articles-page">
      <div className="container">
        <header className="articles-masthead">
          <span className="hp-kicker">Kennisbank</span>
          <h1 className="articles-title">
            Alles over thuisbatterijen en energieopslag
          </h1>
          <p className="articles-intro">
            Praktische uitleg over capaciteit, installatie, energieprijzen,
            rendement en slimme aansturing.
          </p>
        </header>

        <TagBar tags={tags.data} active={tag} onSelect={setTag} />

        {posts.loading && (
          <div className="state mono"><span className="blink">▮▮▮</span> laden…</div>
        )}
        {posts.error && (
          <div className="state">
            Kan de artikelen niet laden. Probeer het later opnieuw.
          </div>
        )}
        {!posts.loading && !posts.error && items.length === 0 && (
          <div className="state">Nog geen artikelen gevonden voor dit onderwerp.</div>
        )}

        {featured && (
          <Link to={`/post/${featured.slug}`} className="articles-featured">
            {featured.cover_image_url && (
              <div className="articles-featured-media">
                <img
                  src={optimizedImageUrl(featured.cover_image_url, 960)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>
            )}
            <div className="articles-featured-body">
              {featured.tags?.length > 0 && (
                <span className="article-tag">{featured.tags[0]}</span>
              )}
              <h2>{featured.title}</h2>
              {featured.excerpt && (
                <p className="articles-featured-excerpt">{featured.excerpt}</p>
              )}
              <span className="article-metaline">
                {formatDate(featured.published_at)}
                {featured.reading_minutes ? ` · ${featured.reading_minutes} min leestijd` : ""}
              </span>
              <span className="hp-link articles-featured-link">
                Lees het artikel
                <span aria-hidden="true" className="hp-link-arrow">→</span>
              </span>
            </div>
          </Link>
        )}

        {rest.length > 0 && (
          <div className="article-list">
            {rest.map((p) => <ArticleCard key={p.id} post={p} />)}
          </div>
        )}
      </div>
    </section>
  );
}
