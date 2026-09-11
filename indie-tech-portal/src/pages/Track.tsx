import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { lookupTicket, getJobCardsByTicket, APIError, type Ticket, type JobCard } from '../lib/api';
import { StatusTicker } from '../components/StatusTicker';

export function Track() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') ?? '');
  const [phone, setPhone] = useState(searchParams.get('phone') ?? '');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function doLookup(lookupCode: string, lookupPhone: string) {
    setLoading(true);
    setError(null);
    setTicket(null);
    setJobCards([]);
    try {
      const t = await lookupTicket(lookupCode.trim(), lookupPhone.trim());
      setTicket(t);
      try {
        const jcs = await getJobCardsByTicket(t.id);
        setJobCards(jcs);
      } catch {
        // optional job card lookup
      }
    } catch (err) {
      if (err instanceof APIError && err.status === 404) {
        setError("No ticket found for that code and phone number — double-check both and try again.");
      } else {
        setError('Could not look up that ticket right now. Try again shortly.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (searchParams.get('code') && searchParams.get('phone')) {
      doLookup(searchParams.get('code')!, searchParams.get('phone')!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !phone.trim()) {
      setError('Enter both your ticket code and phone number.');
      return;
    }
    doLookup(code, phone);
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="font-mono text-xs tracking-widest text-diag">TRACK</p>
        <h1 className="mt-2 font-mono text-2xl text-ink">Ticket status</h1>
        <p className="mt-2 text-sm text-inkMuted">
          Enter the ticket code you received on WhatsApp along with your phone number.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="TKT-XXXXX"
          className="track-input"
          aria-label="Ticket code"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="2547XXXXXXXX"
          className="track-input"
          aria-label="Phone number"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded border border-diag bg-diag/10 px-5 py-3 font-mono text-sm text-diag transition-colors hover:bg-diag/20 disabled:opacity-50"
        >
          {loading ? '...' : 'LOOK UP'}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {ticket && (
        <div className="space-y-6 rounded border border-line bg-surface p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs tracking-wider text-inkMuted">TICKET</p>
              <p className="font-mono text-lg text-ink">{ticket.ticket_code}</p>
            </div>
            <div className="flex gap-2">
              <span className="rounded border border-diag/40 bg-diag/10 px-2 py-1 font-mono text-[10px] tracking-wider text-diag">
                {(ticket.maintenance_type || 'corrective').toUpperCase()}
              </span>
              {ticket.priority === 'emergency' && (
                <span className="rounded border border-amber/40 bg-amber/10 px-2 py-1 font-mono text-[10px] tracking-wider text-amber">
                  EMERGENCY
                </span>
              )}
            </div>
          </div>

          <StatusTicker status={ticket.status} />

          <div className="border-t border-line pt-4">
            <p className="font-mono text-xs tracking-wider text-inkMuted">ISSUE / SERVICE SCOPE</p>
            <p className="mt-1 text-sm text-ink">{ticket.issue_desc}</p>
          </div>

          {ticket.scheduled_at && (
            <div>
              <p className="font-mono text-xs tracking-wider text-inkMuted">SCHEDULED VISIT</p>
              <p className="mt-1 text-sm text-ink">
                {new Date(ticket.scheduled_at).toLocaleString('en-KE', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          )}

          {jobCards.length > 0 && (
            <div className="border-t border-line pt-4 space-y-3">
              <p className="font-mono text-xs tracking-wider text-amber">MACHINE JOB CARDS &amp; REPORTS</p>
              <div className="space-y-2">
                {jobCards.map((jc) => (
                  <div key={jc.id} className="flex items-center justify-between rounded border border-line bg-background p-3">
                    <div>
                      <span className="font-mono text-xs text-ink">{jc.job_card_code}</span>
                      <span className="ml-3 font-mono text-[10px] text-diag">[{jc.status.toUpperCase()}]</span>
                    </div>
                    <Link
                      to={`/track/jobcard/${jc.job_card_code}`}
                      className="font-mono text-xs text-diag underline hover:text-diag/80"
                    >
                      VIEW SERVICE REPORT →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .track-input {
          background: #1e2328;
          border: 1px solid #31383e;
          border-radius: 4px;
          padding: 0.65rem 0.85rem;
          color: #e8eaed;
          font-family: 'Space Mono', monospace;
          font-size: 0.85rem;
        }
        .track-input::placeholder {
          color: #5c636b;
        }
        .track-input:focus {
          border-color: #3ecf8e;
        }
      `}</style>
    </div>
  );
}
