import type { OrderStatus } from '../lib/api';

const CONFIG: Record<OrderStatus, { color: string; glow: string; label: string; pulse?: boolean }> = {
  pending: { color: 'bg-amber', glow: 'text-amber', label: 'WAITING FOR M-PESA PIN', pulse: true },
  paid: { color: 'bg-diag', glow: 'text-diag', label: 'PAYMENT CONFIRMED' },
  failed: { color: 'bg-danger', glow: 'text-danger', label: 'PAYMENT FAILED OR CANCELLED' },
  refunded: { color: 'bg-inkMuted', glow: 'text-inkMuted', label: 'REFUNDED' },
};

export function PaymentStatus({ status, mpesaReceipt }: { status: OrderStatus; mpesaReceipt?: string }) {
  const c = CONFIG[status];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 font-mono text-sm">
        <span
          className={['h-3 w-3 rounded-full shadow-led', c.color, c.glow, c.pulse ? 'animate-pulse' : ''].join(' ')}
          aria-hidden="true"
        />
        <span className={c.glow}>{c.label}</span>
      </div>
      {mpesaReceipt && (
        <p className="font-mono text-xs text-ink">M-Pesa Receipt: <span className="text-diag">{mpesaReceipt}</span></p>
      )}
    </div>
  );
}
