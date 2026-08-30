import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPost, APIError, type BlogPost } from '@/lib/api';

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  let post: BlogPost | null = null;
  try {
    post = await getBlogPost(params.slug);
  } catch (err) {
    if (err instanceof APIError && err.status === 404) {
      notFound();
    }
  }

  if (!post) {
    notFound();
  }

  return (
    <article className="space-y-8">
      <div>
        <Link
          href="/blog"
          className="font-mono text-xs tracking-widest text-diag hover:underline"
        >
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
