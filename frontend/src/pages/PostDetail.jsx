import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import useFetch from "../hooks/useFetch.js";
import { fetchPost, fetchComments, postComment } from "../api.js";
import { setPageMeta, DEFAULT_DESCRIPTION } from "../seo.js";

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

function CalculatorCta() {
  return (
    <aside className="cta-block">
      <h2>Bereken welke thuisbatterij bij uw woning past</h2>
      <p>
        Gebruik de gratis thuisbatterij calculator en ontvang direct een eerste
        indicatie op basis van uw verbruik en teruglevering.
      </p>

      <div className="cta-block-actions">
        <Link to="/calculator" className="cta-button cta-button-sm">
          Start de calculator
        </Link>

        <Link to="/calculator?advies=1#advies" className="cta-text-link">
          Of vraag gratis advies aan
        </Link>
      </div>
    </aside>
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
            {c.name} · {new Date(c.created_at).toLocaleDateString("nl-NL")}
          </div>
          <p>{c.body}</p>
        </div>
      ))}

      {!loading && items.length === 0 && (
        <p style={{ color: "var(--ink-60)" }}>Nog geen reacties.</p>
      )}

      {sent ? (
        <p style={{ marginTop: 24 }}>
          Bedankt! Uw reactie verschijnt na goedkeuring.
        </p>
      ) : (
        <form className="comment-form" onSubmit={submit}>
          <input
            placeholder="Naam"
            value={form.name}
            onChange={update("name")}
            required
          />

          <input
            placeholder="E-mail (niet zichtbaar)"
            type="email"
            value={form.email}
            onChange={update("email")}
            required
          />

          <textarea
            placeholder="Uw reactie…"
            value={form.body}
            onChange={update("body")}
            required
          />

          {err && <p style={{ color: "var(--copper)" }}>{err}</p>}

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

  useEffect(() => {
    if (post) {
      setPageMeta({
        title: `${post.title} — Batterijenplan`,
        description: post.meta_description || post.excerpt || DEFAULT_DESCRIPTION,
        type: "article",
      });
    }

    window.scrollTo(0, 0);
  }, [post]);

  if (loading) {
    return (
      <div className="state mono">
        <span className="blink">▮▮▮</span> laden…
      </div>
    );
  }

  if (error) {
    return (
      <div className="state">
        Artikel niet gevonden. <Link to="/">Terug naar overzicht</Link>
      </div>
    );
  }

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <article className="container post-detail">
      <ReadProgress />

      <p className="mono kicker">{post.tags?.join(" · ")}</p>

      <h1>{post.title}</h1>

      <div className="byline mono">
        <span>{post.author}</span>
        <span>{date}</span>
        <span>{post.reading_minutes} min leestijd</span>
      </div>

      <p className="cta-inline mono">
        Niet zeker welke batterijcapaciteit u nodig heeft?{" "}
        <Link to="/calculator">Bereken het gratis.</Link>
      </p>

      {post.cover_image && (
        <img className="cover" src={post.cover_image} alt="" />
      )}

      <CalculatorCta />

      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: post.body_html }}
      />

      <CalculatorCta />

      <Comments slug={slug} />
    </article>
  );
}