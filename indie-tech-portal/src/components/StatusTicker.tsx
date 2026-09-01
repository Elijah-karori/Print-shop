import type { TicketStatus } from '../lib/api';

const STAGES: { key: TicketStatus; label: string }[] = [
  { key: 'received', label: 'RECEIVED' },
  { key: 'dispatched', label: 'DISPATCHED' },
  { key: 'in_progress', label: 'IN PROGRESS' },
  { key: 'resolved', label: 'RESOLVED' },
];

const STAGE_ORDER: TicketStatus[] = ['received', 'dispatched', 'in_progress', 'resolved'];

export function StatusTicker({ status }: { status: TicketStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 font-mono text-sm">
        <span className="h-3 w-3 rounded-full bg-danger shadow-led text-danger" />
        <span className="text-danger tracking-wide">CANCELLED</span>
      </div>
    );
  }

  const currentIndex = STAGE_ORDER.indexOf(status);

  return (
    <div className="w-full">
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isLit = isComplete || isCurrent;

          return (
            <div key={stage.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <span
                  className={[
                    'h-3 w-3 rounded-full transition-colors',
                    isLit ? 'bg-diag shadow-led text-diag' : 'bg-line',
                    isCurrent ? 'animate-pulse' : '',
                  ].join(' ')}
                  aria-hidden="true"
                />
                <span
                  className={[
                    'font-mono text-[10px] tracking-wider whitespace-nowrap',
                    isLit ? 'text-ink' : 'text-inkMuted',
                  ].join(' ')}
                >
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={[
                    'mx-1 mb-5 h-px flex-1',
                    isComplete ? 'bg-diag' : 'bg-line',
                  ].join(' ')}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
      <span className="sr-only">Current status: {status.replace('_', ' ')}</span>
    </div>
  );
}
