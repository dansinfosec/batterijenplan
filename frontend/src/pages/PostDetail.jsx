import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import useFetch from "../hooks/useFetch.js";
import { fetchPost, fetchComments, postComment } from "../api.js";

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
  return <div className="read-progress" style={{ width: `${w}%` }} aria-hidden="true" />;
}

function Comments({ slug }) {
  const { data, loading } = useFetch(() => fetchComments(slug), [slug]);
  const [form, setForm] = useState({ name: "", email: "", body: "" });
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);

  const items = data?.results ?? data ?? [];

  const submit = async () => {
    setErr(null);
    try {
      await postComment(slug, form);
      setSent(true);
    } catch {
      setErr("Versturen mislukt. Zijn alle velden ingevuld?");
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
      {!loading && items.length === 0 && <p style={{ color: "var(--ink-60)" }}>Nog geen reacties.</p>}

      {sent ? (
        <p style={{ marginTop: 24 }}>
          Bedankt! Je reactie verschijnt na goedkeuring.
        </p>
      ) : (
        <div className="comment-form">
          <input placeholder="Naam" value={form.name}
                 onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="E-mail (niet zichtbaar)" type="email" value={form.email}
                 onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <textarea placeholder="Je reactie…" value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })} />
          {err && <p style={{ color: "var(--copper)" }}>{err}</p>}
          <button onClick={submit}>Plaats reactie</button>
        </div>
      )}
    </section>
  );
}

export default function PostDetail() {
  const { slug } = useParams();
  const { data: post, loading, error } = useFetch(() => fetchPost(slug), [slug]);

  useEffect(() => {
    if (post) document.title = `${post.title} — Batterijenplan`;
    window.scrollTo(0, 0);
  }, [post]);

  if (loading) return <div className="state mono"><span className="blink">▮▮▮</span> laden…</div>;
  if (error) return (
    <div className="state">
      Artikel niet gevonden. <Link to="/">Terug naar overzicht</Link>
    </div>
  );

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
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
      {post.cover_image && <img className="cover" src={post.cover_image} alt="" />}
      <div className="prose" dangerouslySetInnerHTML={{ __html: post.body_html }} />
      <Comments slug={slug} />
    </article>
  );
}
