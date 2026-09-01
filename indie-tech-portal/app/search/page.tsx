'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { searchSystem, type SearchResultItem } from '@/lib/api';

const CATEGORY_LABELS: Record<SearchResultItem['category'], string> = {
  part: 'INVENTORY & SPARE PARTS',
  machine: 'REGISTERED MACHINES',
  job_card: 'JOB CARDS & REPORTS',
  documentation: 'MANUALS & GUIDES',
  serialized_item: 'SERIALIZED ITEMS',
};

function SearchPageInner() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function doSearch(queryStr: string) {
    if (!queryStr.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const resp = await searchSystem(queryStr.trim());
      setResults(resp.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialQ = searchParams.get('q');
    if (initialQ) {
      setQ(initialQ);
      doSearch(initialQ);
    }
  }, [searchParams]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSearch(q);
  }

  // Group results by category
  const grouped = results.reduce<Record<string, SearchResultItem[]>>((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs tracking-widest text-diag">SYSTEM SEARCH</p>
        <h1 className="mt-2 font-mono text-2xl text-ink">Search Inventory, Machines &amp; Manuals</h1>
        <p className="mt-2 text-sm text-inkMuted">
          Search parts, SKUs, serial numbers, registered machines, job cards, and technical manuals.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Thermal Head, THERM-HEAD-01, Kyocera, JOB-8K92L..."
          className="search-input flex-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded border border-diag bg-diag/10 px-5 py-3 font-mono text-sm text-diag transition-colors hover:bg-diag/20 disabled:opacity-50"
        >
          {loading ? 'SEARCHING...' : 'SEARCH'}
        </button>
      </form>

      {searched && !loading && results.length === 0 && (
        <p className="rounded border border-line bg-surface p-6 text-sm text-inkMuted">
          No matching records found for &quot;{q}&quot;. Try searching for part names, SKUs, or machine models.
        </p>
      )}

      {Object.keys(grouped).map((cat) => (
        <section key={cat} className="space-y-3">
          <h2 className="font-mono text-xs tracking-wider text-amber">
            {CATEGORY_LABELS[cat as SearchResultItem['category']] || cat.toUpperCase()}
          </h2>
          <div className="space-y-3">
            {grouped[cat].map((item) => (
              <div
                key={item.id + item.category}
                className="flex items-start justify-between rounded border border-line bg-surface p-4"
              >
                <div>
                  <h3 className="font-mono text-sm text-ink">{item.title}</h3>
                  {item.subtitle && <p className="font-mono text-xs text-diag mt-0.5">{item.subtitle}</p>}
                  {item.description && <p className="mt-1 text-xs text-inkMuted">{item.description}</p>}
                </div>
                {item.url && (
                  <Link
                    href={item.url}
                    className="whitespace-nowrap rounded border border-line bg-background px-3 py-1 font-mono text-xs text-ink hover:text-diag hover:border-diag"
                  >
                    VIEW →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <style jsx global>{`
        .search-input {
          background: #1e2328;
          border: 1px solid #31383e;
          border-radius: 4px;
          padding: 0.65rem 0.85rem;
          color: #e8eaed;
          font-family: 'Space Mono', monospace;
          font-size: 0.85rem;
        }
        .search-input::placeholder {
          color: #5c636b;
        }
        .search-input:focus {
          border-color: #3ecf8e;
        }
      `}</style>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-sm text-inkMuted">Loading search...</p>}>
      <SearchPageInner />
    </Suspense>
  );
}
