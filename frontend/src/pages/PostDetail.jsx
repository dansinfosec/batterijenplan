import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import useFetch from "../hooks/useFetch.js";
import { fetchPost, fetchComments, postComment } from "../api.js";
import { setPageMeta, setJsonLd, blogPostingSchema, breadcrumbSchema, postSeoTitle, DEFAULT_DESCRIPTION } from "../seo.js";
import { optimizedImageUrl, coverSrcSet } from "../images.js";
import RelatedPosts from "../components/RelatedPosts.jsx";
import AdviceForm from "../components/AdviceForm.jsx";
import MobileStickyCta from "../components/MobileStickyCta.jsx";
import ArticleCalculatorCta from "../components/ArticleCalculatorCta.jsx";

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

function ReadProgress() {
  const [w, setW] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setW(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="read-progress"
      style={{ width: `${w}%` }}
      aria-hidden="true"
    />
  );
}

// Splitst de body op het tweede H2 (≈ na de intro + eerste sectie) zodat de
// lichte inline CTA ongeveer na het eerste derde tussen twee blokken valt.
// Splitst alleen tussen top-level elementen (H2 is een blokgrens), dus de
// markdown-structuur blijft intact. Null als er geen tweede H2 is.
function splitAtSecondH2(html) {
  if (!html) return null;
  const re = /<h2[\s>]/gi;
  let match;
  let count = 0;
  while ((match = re.exec(html)) !== null) {
    count += 1;
    if (count === 2) return [html.slice(0, match.index), html.slice(match.index)];
  }
  return null;
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

  // Lichte inline CTA na ~eerste derde: alleen bij voldoende lange artikelen
  // (genoeg leestijd of structuur) én als er een natuurlijk splitspunt (2e H2)
  // is. Zeer korte artikelen krijgen geen inline CTA.
  const longEnough = (post.reading_minutes ?? 0) >= 4 || toc.length >= 4;
  const inlineParts = longEnough ? splitAtSecondH2(bodyHtml) : null;

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

      {/* Precies één calculator-CTA per artikel. Lange artikelen: licht,
          tekst-only, na ~het eerste derde (tussen twee H2's). Korte artikelen
          (geen tweede H2 / te kort): dezelfde herbruikbare CTA aan het einde,
          mét kop. De CTA is een React-broer van de body en wijzigt de body_html
          van de API niet. */}
      {inlineParts ? (
        <>
          <div className="prose article-body" dangerouslySetInnerHTML={{ __html: inlineParts[0] }} />
          <ArticleCalculatorCta
            heading=""
            body="Bereken met uw eigen energiegegevens welke batterijcapaciteit bij uw woning past."
            source="article_inline"
          />
          <div className="prose article-body" dangerouslySetInnerHTML={{ __html: inlineParts[1] }} />
        </>
      ) : (
        <>
          <div className="prose article-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          <ArticleCalculatorCta source="article_end" />
        </>
      )}

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
