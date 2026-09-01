import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBlogPost, recordTelemetry, type BlogPost } from '../lib/api';

export function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (slug) {
      getBlogPost(slug)
        .then((p) => {
          setPost(p);
          recordTelemetry({
            event_type: 'blog_view',
            target_type: 'blog_post',
            target_id: slug,
          }).catch(() => {});
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }
  }, [slug]);

  if (loading) return <p className="text-sm text-inkMuted">Loading guide...</p>;

  if (error || !post) {
    return (
      <div className="space-y-4">
        <Link to="/blog" className="font-mono text-xs tracking-widest text-diag hover:underline">
          ← BACK TO GUIDES
        </Link>
        <p className="rounded border border-line bg-surface p-6 text-sm text-inkMuted">Article not found.</p>
      </div>
    );
  }

  return (
    <article className="space-y-8">
      <div>
        <Link to="/blog" className="font-mono text-xs tracking-widest text-diag hover:underline">
          ← BACK TO GUIDES
        </Link>
        <h1 className="mt-4 font-mono text-2xl text-ink">{post.title}</h1>
        {post.published_at && (
          <p className="mt-2 font-mono text-xs text-inkMuted">
            PUBLISHED:{' '}
            {new Date(post.published_at).toLocaleDateString('en-KE', {
              dateStyle: 'medium',
            })}
          </p>
        )}
      </div>

      <div className="rounded border border-line bg-surface p-6 font-sans text-sm text-ink leading-relaxed space-y-4 whitespace-pre-line">
        {post.body_md}
      </div>
    </article>
  );
}
