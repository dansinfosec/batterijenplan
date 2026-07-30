import { Link } from "react-router-dom";

// Compacte kaarten voor "Gerelateerde artikelen" onder een blogpost. Data
// komt kant-en-klaar van de API (PostDetailSerializer.related_posts):
// voorkeur voor overlappende tags, aangevuld met de meest recente posts.
export default function RelatedPosts({ posts }) {
  if (!posts?.length) return null;

  // Maximaal drie gerelateerde artikelen (data komt kant-en-klaar van de API:
  // voorkeur voor overlappende tags, aangevuld met recente posts).
  const items = posts.slice(0, 3);

  return (
    <section className="related-posts">
      <h2>Gerelateerde artikelen</h2>

      <div className="related-posts-grid">
        {items.map((post) => (
          <Link key={post.slug} to={`/post/${post.slug}`} className="related-post-card">
            {post.tags?.length > 0 && (
              <span className="related-post-tag mono">{post.tags[0]}</span>
            )}
            <h3>{post.title}</h3>
            {post.excerpt && <p>{post.excerpt}</p>}
            <span className="related-post-link">Lees verder →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
