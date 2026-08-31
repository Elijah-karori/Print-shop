import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getJobCard, APIError, type JobCard } from '@/lib/api';

interface JobCardPageProps {
  params: {
    code: string;
  };
}

export default async function JobCardPage({ params }: JobCardPageProps) {
  let jc: JobCard | null = null;
  try {
    jc = await getJobCard(params.code);
  } catch (err) {
    if (err instanceof APIError && err.status === 404) {
      notFound();
    }
  }

  if (!jc) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/track" className="font-mono text-xs tracking-widest text-diag hover:underline">
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
