import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import useFetch from "../hooks/useFetch.js";
import { fetchPost, fetchComments, postComment } from "../api.js";
import { setPageMeta, setJsonLd, blogPostingSchema, breadcrumbSchema, postSeoTitle, DEFAULT_DESCRIPTION } from "../seo.js";
import { optimizedImageUrl, coverSrcSet } from "../images.js";
import RelatedPosts from "../components/RelatedPosts.jsx";
import AdviceForm from "../components/AdviceForm.jsx";
import MobileStickyCta from "../components/MobileStickyCta.jsx";
import ArticleCalculatorCta from "../components/ArticleCalculatorCta.jsx";
import ArticleShare from "../components/ArticleShare.jsx";

// Wrapt tabellen uit de (server-side gerenderde) markdown-body in een
// scroll-container, zodat brede vergelijkingstabellen op mobiel zijwaarts
// scrollen in plaats van de pagina te verbreden.
function wrapTables(html) {
  if (!html) return html;
  return html
    .replaceAll("<table>", '<div class="post-table-scroll"><table>')
    .replaceAll("</table>", "</table></div>");
}

// Stabiel, uniek anker-id afleiden uit een koptekst (Dutch-diacriticsveilig).
function slugify(text) {
  const base = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "sectie";
}

// "In dit artikel": injecteert id's op de H2's van de (al gerenderde) markdown
// en bouwt een inhoudsopgave. Pure string-transformatie, geen dependency en
// geen DOM-parser: bestaande id's worden gerespecteerd, nieuwe zijn uniek.
// Faalt veilig terug op de onbewerkte body (met tabel-wrapper) bij een fout.
function enhanceArticleBody(html) {
  if (!html) return { html, toc: [] };
  try {
    const toc = [];
    const used = new Set();
    const out = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (match, attrs, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      if (!text) return match;
      const existing = /\bid\s*=\s*["']([^"']+)["']/i.exec(attrs);
      let id;
      if (existing) {
        id = existing[1];
      } else {
        id = slugify(text);
        let n = 2;
        while (used.has(id)) id = `${slugify(text)}-${n++}`;
      }
      used.add(id);
      toc.push({ id, text });
      const newAttrs = existing ? attrs : `${attrs} id="${id}"`;
      return `<h2${newAttrs}>${inner}</h2>`;
    });
    return { html: wrapTables(out), toc };
  } catch {
    return { html: wrapTables(html), toc: [] };
  }
}

// Leesvoortgangsbalk: dun, vastgezet aan de bovenrand van de viewport, groeit
// horizontaal via CSS `transform: scaleX(var(--reading-progress))` (geen layout-
// breedte-wijziging). Berekening geklemd op 0..1, rAF-gethrottled, en luistert op
// scroll + resize; listeners worden bij unmount opgeruimd. Alleen op artikelpagina's.
function ReadProgress() {
  const barRef = useRef(null);

  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      const clamped = Math.min(1, Math.max(0, progress)); // nooit < 0 of > 1, geen NaN/Infinity
      if (barRef.current) {
        barRef.current.style.setProperty("--reading-progress", String(clamped || 0));
      }
    };

    const onChange = () => {
      if (!frame) frame = requestAnimationFrame(apply); // één update per frame; geen dubbele listeners
    };

    apply(); // initiële stand (0% boven aan het artikel, ook na route-wissel + scrollTo(0,0))
    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange, { passive: true });

    return () => {
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="reading-progress" aria-hidden="true">
      <div className="reading-progress__bar" ref={barRef} />
    </div>
  );
}

function Comments({ slug }) {
  const { data, loading } = useFetch(() => fetchComments(slug), [slug]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    body: "",
  });

  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);
  const [sending, setSending] = useState(false);

  const items = data?.results ?? data ?? [];

  const update = (field) => (e) => {
    setForm({
      ...form,
      [field]: e.target.value,
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      body: form.body.trim(),
    };

    if (!payload.name || !payload.email || !payload.body) {
      setErr("Vul uw naam, e-mail en reactie in.");
      return;
    }

    try {
      setSending(true);
      await postComment(slug, payload);
      setSent(true);
      setForm({
        name: "",
        email: "",
        body: "",
      });
    } catch (error) {
      console.error("Reactie versturen mislukt:", error);
      setErr("Versturen mislukt. Controleer of alle velden goed zijn ingevuld.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="comments">
      <h2>Reacties</h2>

      {loading && <p className="mono">laden…</p>}

      {items.map((c) => (
        <div className="comment" key={c.id}>
          <div className="who">
            <span className="comment-author">{c.name}</span>
            <span className="comment-date">
              {new Date(c.created_at).toLocaleDateString("nl-NL")}
            </span>
          </div>
          <p>{c.body}</p>
        </div>
      ))}

      {!loading && items.length === 0 && (
        <p className="comments-empty">Nog geen reacties.</p>
      )}

      {sent ? (
        <p className="comments-thanks">
          Bedankt! Uw reactie verschijnt na goedkeuring.
        </p>
      ) : (
        <form className="comment-form" onSubmit={submit}>
          <input
            placeholder="Naam"
            aria-label="Naam"
            value={form.name}
            onChange={update("name")}
            required
          />

          <input
            placeholder="E-mail (niet zichtbaar)"
            aria-label="E-mailadres"
            type="email"
            value={form.email}
            onChange={update("email")}
            required
          />

          <textarea
            placeholder="Uw reactie…"
            aria-label="Uw reactie"
            value={form.body}
            onChange={update("body")}
            required
          />

          {err && <p className="comment-error">{err}</p>}

          <button type="submit" disabled={sending}>
            {sending ? "Bezig met plaatsen…" : "Plaats reactie"}
          </button>
        </form>
      )}
    </section>
  );
}

export default function PostDetail() {
  const { slug } = useParams();
  const { data: post, loading, error } = useFetch(() => fetchPost(slug), [slug]);

  // Body-verrijking (H2-ankers + inhoudsopgave + tabel-wrapper) is puur afgeleid
  // van de body-HTML; memoiseren voorkomt herberekening bij elke render.
  const { html: bodyHtml, toc } = useMemo(
    () => enhanceArticleBody(post?.body_html),
    [post?.body_html],
  );

  useEffect(() => {
    if (post) {
      setPageMeta({
        // Korte SEO-titel voor <title>/og:title/twitter:title; de zichtbare
        // H1 hieronder blijft de volledige post.title.
        title: postSeoTitle(post),
        // Voorkeur: backend seo_description > (uit body afgeleide)
        // meta_description > excerpt > site-default.
        description:
          post.seo_description || post.meta_description || post.excerpt || DEFAULT_DESCRIPTION,
        type: "article",
        path: `/post/${post.slug}`,
        image: post.cover_image_url,
      });
      setJsonLd([blogPostingSchema(post), breadcrumbSchema(post)]);
    }

    window.scrollTo(0, 0);
  }, [post]);

  if (loading) {
    // Skeleton dat ruwweg dezelfde ruimte inneemt als een geladen artikel
    // (titel, byline, 16:9-cover, CTA-blok, tekstregels), zodat content en
    // footer niet verspringen zodra de post binnenkomt — dat drukte CLS.
    // Bewust simpel: geen animaties, geen dependencies.
    return (
      <article
        className="container post-detail article-detail post-detail-skeleton"
        aria-busy="true"
        aria-label="Artikel wordt geladen"
      >
        <div className="sk sk-kicker" />
        <div className="sk sk-title" />
        <div className="sk sk-title sk-title-2" />
        <div className="sk sk-byline" />
        <div className="sk sk-ctaline" />
        <div className="sk sk-cover" />
        <div className="sk sk-block" />
        <div className="sk sk-line" />
        <div className="sk sk-line" />
        <div className="sk sk-line sk-line-short" />
        <div className="sk sk-line" />
        <div className="sk sk-line" />
        <div className="sk sk-line sk-line-short" />
        <div className="sk sk-line" />
        <div className="sk sk-line" />
        <div className="sk sk-block" />
      </article>
    );
  }

  if (error) {
    return (
      <div className="state">
        Artikel niet gevonden. <Link to="/artikelen">Terug naar de kennisbank</Link>
      </div>
    );
  }

  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const updatedDate = post.updated_at
    ? new Date(post.updated_at).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const showUpdated = updatedDate && updatedDate !== publishedDate;
  const primaryTag = post.tags?.[0];

  return (
    <article className="container post-detail article-detail">
      <ReadProgress />

      <header className="article-header">
        {primaryTag && <p className="article-eyebrow">{primaryTag}</p>}

        <h1>{post.title}</h1>

        {post.excerpt && <p className="article-lead">{post.excerpt}</p>}

        <div className="article-meta">
          {post.author && <span>{post.author}</span>}
          {publishedDate && <span>{publishedDate}</span>}
          {showUpdated && <span>Bijgewerkt {updatedDate}</span>}
          {post.reading_minutes ? <span>{post.reading_minutes} min leestijd</span> : null}
        </div>

        {/* Compacte deelrij direct onder titel/meta/intro. Zelfde component als
            het sterkere blok onderaan; deelt automatisch de canonieke
            productie-URL van dit artikel. */}
        <ArticleShare title={post.title} slug={post.slug} variant="row" />
      </header>

      {post.cover_image_url && (
        <img
          className="cover"
          src={optimizedImageUrl(post.cover_image_url, 1200)}
          srcSet={coverSrcSet(post.cover_image_url)}
          sizes="(max-width: 720px) 100vw, 760px"
          width="1200"
          height="675"
          alt={post.cover_alt || post.title}
          fetchPriority="high"
          decoding="async"
          onError={(e) => {
            // Geen kapot-plaatje-icoon tonen; verberg de afbeelding gewoon.
            e.currentTarget.style.display = "none";
          }}
        />
      )}

      {toc.length >= 3 && (
        <nav className="article-toc" aria-label="In dit artikel">
          <p className="article-toc-title">In dit artikel</p>
          <ol className="article-toc-list">
            {toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="prose article-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

      {/* Sterker deelblok aan het einde van het artikel, vóór de calculator-CTA. */}
      <ArticleShare title={post.title} slug={post.slug} variant="block" />

      {/* Precies één gebrande calculator-CTA per artikel, altijd onderaan: ná de
          volledige body + FAQ en vóór het adviesformulier / gerelateerde
          artikelen. Geldt automatisch voor bestaande én toekomstige posts. De
          CTA is een React-broer van de body en wijzigt de body_html van de API
          niet; contextuele /calculator-links in de tekst blijven behouden. */}
      <ArticleCalculatorCta source="article_end" />

      {/* Compact adviesformulier aan het einde, vóór gerelateerde artikelen. */}
      <div className="article-advice">
        <AdviceForm
          variant="compact"
          headline="Wat betekent dit voor uw woning?"
          text="Laat uw verbruik, zonnepanelen en teruglevering controleren en ontvang een persoonlijk eerste advies."
          button="Vraag batterijadvies aan"
          source="article_advice"
          submitEvent="article_advice_submit"
          articleSlug={post.slug}
        />
      </div>

      <RelatedPosts posts={post.related_posts} />

      <Comments slug={slug} />

      <MobileStickyCta />
    </article>
  );
}
