import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listBlogPosts, type BlogPost } from '../lib/api';

export function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    listBlogPosts()
      .then(setPosts)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-10">
      <div>
        <p className="font-mono text-xs tracking-widest text-diag">KNOWLEDGE BASE</p>
        <h1 className="mt-2 font-mono text-2xl text-ink">Blog &amp; Technician Service Guides</h1>
        <p className="mt-2 text-sm text-inkMuted">
          Diagnostic procedures, preventive maintenance steps, and hardware repair guides.
        </p>
      </div>

      {error && (
        <p className="rounded border border-line bg-surface px-4 py-3 text-sm text-inkMuted">
          Couldn&apos;t load articles right now — check that the API is running.
        </p>
      )}

      {!error && posts.length === 0 && (
        <p className="text-sm text-inkMuted">No articles or guides published yet.</p>
      )}

      <div className="space-y-6">
        {posts.map((post) => (
          <article
            key={post.id}
            className="flex flex-col justify-between rounded border border-line bg-surface p-6 space-y-4"
          >
            <div>
              <span className="font-mono text-[10px] tracking-wider text-diag">
                {post.published_at
                  ? new Date(post.published_at).toLocaleDateString('en-KE', {
                      dateStyle: 'medium',
                    })
                  : 'GUIDE'}
              </span>
              <h2 className="mt-1 font-mono text-lg text-ink hover:text-diag">
                <Link to={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              {post.excerpt && <p className="mt-2 text-sm text-inkMuted">{post.excerpt}</p>}
            </div>
            <div>
              <Link
                to={`/blog/${post.slug}`}
                className="inline-block rounded border border-diag bg-diag/10 px-3 py-1.5 font-mono text-xs text-diag transition-colors hover:bg-diag/20"
              >
                READ GUIDE →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
