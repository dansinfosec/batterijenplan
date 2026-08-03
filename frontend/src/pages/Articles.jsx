import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useFetch from "../hooks/useFetch.js";
import { fetchPostsPage, fetchTags } from "../api.js";
import { optimizedImageUrl } from "../images.js";
import TagBar from "../components/TagBar.jsx";
import {
  setPageMeta,
  setJsonLd,
  ORGANIZATION_SCHEMA,
  WEBSITE_SCHEMA,
  DEFAULT_IMAGE,
} from "../seo.js";

// Kennisbank / artikeloverzicht. PROGRESSIEVE lading: pagina 1 wordt geladen (1 uitgelicht + de rest
// als kaarten), latere DRF-pagina's worden pas opgehaald bij naderen van de onderkant (IntersectionObserver)
// of via de knop "Meer artikelen laden". Latere pagina's voegen alleen normale kaarten toe; het
// uitgelichte artikel wordt nooit dubbel getoond. Geen backend-wijziging.
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

const keyOf = (p) => (p && (p.slug ?? p.id)) ?? null;

export default function Articles() {
  const [tag, setTag] = useState(null);
  const tags = useFetch(fetchTags, []);

  const [featured, setFeatured] = useState(null);
  const [cards, setCards] = useState([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialError, setInitialError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);

  // Refs beschermen tegen: dubbele observer/knop-triggers, StrictMode dubbel-mount, verouderde
  // responses na filterwissel, en requests die ná unmount binnenkomen.
  const genRef = useRef(0);             // request-generatie; bump bij filterwissel/unmount
  const inFlightRef = useRef(false);    // er loopt een request
  const visitedRef = useRef(new Set()); // opgehaalde pagina-URLs (nooit dezelfde twee keer)
  const seenRef = useRef(new Set());    // slugs die al getoond worden (ontdubbelen)
  const abortRef = useRef(null);
  const sentinelRef = useRef(null);
  const nextRef = useRef(null);
  useEffect(() => { nextRef.current = next; }, [next]);

  const runLoad = useCallback(async (gen, { initial, url }) => {
    if (!initial) {
      if (inFlightRef.current) return;
      if (!url || visitedRef.current.has(url)) return;
      visitedRef.current.add(url);
    }
    inFlightRef.current = true;
    if (initial) setInitialLoading(true); else { setLoadingMore(true); setLoadMoreError(false); }

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const arg = initial ? { tag } : url;
      const page = await fetchPostsPage(arg, { signal: controller.signal });
      if (gen !== genRef.current) return; // stale (filter changed / unmounted)
      if (initial) {
        const results = page.results || [];
        seenRef.current = new Set(results.map(keyOf).filter((k) => k != null));
        setFeatured(results[0] ?? null);
        setCards(results.slice(1));
      } else {
        const fresh = [];
        for (const p of page.results || []) {
          const k = keyOf(p);
          if (k != null && seenRef.current.has(k)) continue; // dedupe by slug across pages
          if (k != null) seenRef.current.add(k);
          fresh.push(p);
        }
        setCards((prev) => [...prev, ...fresh]);
      }
      setCount(page.count);
      setNext(page.next);
    } catch (err) {
      if (controller.signal.aborted || gen !== genRef.current) return;
      if (initial) {
        setInitialError(true);
      } else {
        setLoadMoreError(true);
        visitedRef.current.delete(url); // allow retry of the same page
      }
    } finally {
      if (gen === genRef.current) {
        if (initial) setInitialLoading(false); else setLoadingMore(false);
        inFlightRef.current = false;
      }
    }
  }, [tag]);

  // One guarded entry point shared by the observer and the button.
  const loadMore = useCallback(() => {
    if (inFlightRef.current || !nextRef.current) return;
    runLoad(genRef.current, { initial: false, url: nextRef.current });
  }, [runLoad]);

  // Filterwissel (of eerste mount): reset alles en laad pagina 1. Bump de generatie zodat een nog
  // lopende oudere request wordt genegeerd/afgebroken.
  useEffect(() => {
    const gen = ++genRef.current;
    abortRef.current?.abort();
    inFlightRef.current = false;
    visitedRef.current = new Set();
    seenRef.current = new Set();
    setFeatured(null);
    setCards([]);
    setCount(0);
    setNext(null);
    setInitialError(false);
    setLoadMoreError(false);
    setInitialLoading(true);
    runLoad(gen, { initial: true });
    return () => { abortRef.current?.abort(); };
  }, [tag, runLoad]);

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

  // Bump de generatie op unmount zodat laat-binnenkomende responses niets meer zetten.
  useEffect(() => () => { genRef.current += 1; abortRef.current?.abort(); }, []);

  // IntersectionObserver: laad volgende pagina vóór de bezoeker de bodem raakt. Alleen actief zolang
  // er een `next` is en er niet al geladen wordt. Eén observer, netjes opgeruimd.
  useEffect(() => {
    // Pause the observer after a load-more error so it does not auto-retry in a storm; the visible
    // button remains for a MANUAL retry (which clears the error and re-enables the observer on success).
    if (!next || initialLoading || loadMoreError) return undefined;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const obs = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) loadMore(); },
      { rootMargin: "600px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [next, initialLoading, loadMoreError, loadMore]);

  const loadedCount = (featured ? 1 : 0) + cards.length;
  const isEmpty = !initialLoading && !initialError && !featured && cards.length === 0;

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

        {initialLoading && (
          <div className="state mono"><span className="blink">▮▮▮</span> laden…</div>
        )}
        {initialError && (
          <div className="state">
            Kan de artikelen niet laden.{" "}
            <button type="button" className="linklike" onClick={() => setTag((t) => t)}>
              Probeer het opnieuw
            </button>
          </div>
        )}
        {isEmpty && (
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

        {cards.length > 0 && (
          <div className="article-list">
            {cards.map((p) => <ArticleCard key={keyOf(p)} post={p} />)}
          </div>
        )}

        {/* Statuslijn: telt het uitgelichte artikel mee. */}
        {loadedCount > 0 && (
          <p className="articles-count">
            {loadedCount} van {count} artikelen geladen
          </p>
        )}

        {/* aria-live meldt "meer laden" voor schermlezers zonder de hele pagina te vervangen. */}
        <div className="articles-more-status" aria-live="polite">
          {loadingMore ? "Meer artikelen laden…" : ""}
        </div>

        {loadMoreError && (
          <p className="articles-loadmore-error" role="alert">
            Meer artikelen konden niet worden geladen.
          </p>
        )}

        {/* Sentinel net boven de knop; activeert vroeg (rootMargin 600px). */}
        {next && <div ref={sentinelRef} className="articles-sentinel" aria-hidden="true" />}

        {next && (
          <div className="articles-loadmore">
            <button
              type="button"
              className="articles-loadmore-btn"
              onClick={loadMore}
              disabled={loadingMore}
              aria-busy={loadingMore}
            >
              {loadingMore ? "Meer artikelen laden…" : "Meer artikelen laden"}
            </button>
          </div>
        )}

        {!next && !initialLoading && loadedCount > 0 && (
          <p className="articles-allloaded">Alle artikelen zijn geladen.</p>
        )}
      </div>
    </section>
  );
}
