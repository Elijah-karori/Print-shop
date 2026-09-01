import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getJobCard, type JobCard } from '../lib/api';

export function JobCardView() {
  const { code } = useParams<{ code: string }>();
  const [jc, setJc] = useState<JobCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      getJobCard(code)
        .then(setJc)
        .catch(() => setError('Job card not found.'))
        .finally(() => setLoading(false));
    }
  }, [code]);

  if (loading) return <p className="text-sm text-inkMuted">Loading job card...</p>;

  if (error || !jc) {
    return (
      <div className="space-y-4">
        <Link to="/track" className="font-mono text-xs tracking-widest text-diag hover:underline">
          ← BACK TO TICKET LOOKUP
        </Link>
        <p className="rounded border border-line bg-surface p-6 text-sm text-inkMuted">Job card not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/track" className="font-mono text-xs tracking-widest text-diag hover:underline">
          ← BACK TO TICKET LOOKUP
        </Link>
        <div className="mt-4 flex items-center justify-between">
          <h1 className="font-mono text-2xl text-ink">Job Card: {jc.job_card_code}</h1>
          <span className="rounded border border-diag/40 bg-diag/10 px-3 py-1 font-mono text-xs tracking-wider text-diag">
            {jc.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="rounded border border-line bg-surface p-6 space-y-6">
        <div>
          <p className="font-mono text-xs text-inkMuted tracking-wider">TECHNICIAN</p>
          <p className="mt-1 font-mono text-sm text-ink">{jc.technician_name || 'Assigned Engineer'}</p>
        </div>

        {jc.work_done && (
          <div>
            <p className="font-mono text-xs text-inkMuted tracking-wider">WORK PERFORMED</p>
            <p className="mt-1 text-sm text-ink leading-relaxed">{jc.work_done}</p>
          </div>
        )}

        {jc.parts_used && jc.parts_used.length > 0 && (
          <div>
            <p className="font-mono text-xs text-inkMuted tracking-wider">PARTS INSTALLED / REPLACED</p>
            <ul className="mt-2 list-disc list-inside text-sm text-ink space-y-1 font-mono">
              {jc.parts_used.map((part, i) => (
                <li key={i}>{part}</li>
              ))}
            </ul>
          </div>
        )}

        {jc.service_report && (
          <div className="border-t border-line pt-4">
            <p className="font-mono text-xs text-inkMuted tracking-wider">OFFICIAL SERVICE REPORT</p>
            <div className="mt-2 rounded bg-background p-4 font-mono text-xs text-ink leading-relaxed whitespace-pre-line border border-line">
              {jc.service_report}
            </div>
          </div>
        )}

        <div className="border-t border-line pt-4 flex items-center justify-between text-xs font-mono text-inkMuted">
          <span>CREATED: {new Date(jc.created_at).toLocaleString()}</span>
          {jc.completed_at && <span>COMPLETED: {new Date(jc.completed_at).toLocaleString()}</span>}
        </div>
      </div>
    </div>
  );
}
