import { Link } from "react-router-dom";

// Kaart als batterijcel: nokje bovenop (CSS ::before) en een
// laadbalk onderaan waarvan de vulling de leestijd weergeeft.
export default function PostCard({ post }) {
  const cells = 6;
  const filled = Math.min(cells, Math.max(1, Math.round(post.reading_minutes / 2)));
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <Link to={`/post/${post.slug}`} className="post-card">
      {post.cover_image && (
        <img className="cover" src={post.cover_image} alt="" loading="lazy" />
      )}
      <div className="body">
        <h2>{post.title}</h2>
        {post.excerpt && <p>{post.excerpt}</p>}
        {post.tags?.length > 0 && (
          <div className="tags">
            {post.tags.map((t) => <span key={t}>{t}</span>)}
          </div>
        )}
      </div>
      <div className="gauge">
        <div className="track" aria-hidden="true">
          {Array.from({ length: cells }).map((_, i) => (
            <i key={i} className={i < filled ? "" : "empty"} />
          ))}
        </div>
        <span className="label">{post.reading_minutes} min · {date}</span>
      </div>
    </Link>
  );
}
