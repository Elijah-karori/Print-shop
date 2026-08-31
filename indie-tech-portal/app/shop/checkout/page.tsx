'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { checkout, getOrderStatus, APIError, type OrderStatus } from '@/lib/api';
import { PaymentStatus } from '@/components/PaymentStatus';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120_000; // 2 minutes — STK prompts expire around then anyway

function CheckoutPageInner() {
  const params = useSearchParams();
  const itemType = (params.get('type') as 'spare_part' | 'service_package' | 'digital_download') || 'spare_part';
  const itemRef = params.get('ref') || undefined;
  const description = params.get('desc') || 'Purchase';
  const amount = Number(params.get('amount') || 0);

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStart = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  function startPolling(id: string) {
    pollStart.current = Date.now();
    pollTimer.current = setInterval(async () => {
      if (Date.now() - pollStart.current > POLL_TIMEOUT_MS) {
        if (pollTimer.current) clearInterval(pollTimer.current);
        return;
      }
      try {
        const res = await getOrderStatus(id);
        setStatus(res.status);
        if (res.status !== 'pending' && pollTimer.current) {
          clearInterval(pollTimer.current);
        }
      } catch {
        // transient — keep polling, don't surface every miss as an error
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const cleaned = phone.replace(/\s+/g, '');
    if (!/^2547\d{8}$/.test(cleaned)) {
      setPhoneError('Enter a phone number in the format 2547XXXXXXXX');
      return;
    }
    setPhoneError(null);
    setSubmitting(true);
    try {
      const res = await checkout({
        client_phone: cleaned,
        item_type: itemType,
        item_ref: itemRef,
        description,
        amount_kes: amount,
      });
      setOrderId(res.order_id);
      setStatus('pending');
      startPolling(res.order_id);
    } catch (err) {
      setSubmitError(err instanceof APIError ? err.message : 'Could not start checkout. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs tracking-widest text-diag">CHECKOUT</p>
        <h1 className="mt-2 font-mono text-2xl text-ink">{description}</h1>
        <p className="mt-2 font-mono text-lg text-diag">KES {amount.toLocaleString()}</p>
      </div>

      {!orderId ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block">
            <span className="mb-2 block font-mono text-xs tracking-wider text-inkMuted">
              M-PESA PHONE NUMBER
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="2547XXXXXXXX"
              className="checkout-input"
              aria-invalid={!!phoneError}
            />
            {phoneError && (
              <span role="alert" className="mt-1 block text-xs text-danger">
                {phoneError}
              </span>
            )}
          </label>

          {submitError && (
            <p role="alert" className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || amount <= 0}
            className="w-full rounded border border-diag bg-diag/10 px-5 py-3 font-mono text-sm text-diag transition-colors hover:bg-diag/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'SENDING PROMPT...' : 'PAY WITH M-PESA →'}
          </button>
        </form>
      ) : (
        <div className="space-y-6 rounded border border-line bg-surface p-6">
          <PaymentStatus status={status ?? 'pending'} />
          {status === 'pending' && (
            <p className="text-sm text-inkMuted">
              Check your phone for the M-Pesa PIN prompt and enter your PIN to complete payment.
              This page updates automatically once payment is confirmed.
            </p>
          )}
          {status === 'paid' && (
            <p className="text-sm text-inkMuted">
              Payment received. We&apos;ll be in touch on WhatsApp to arrange fulfilment.
            </p>
          )}
          {status === 'failed' && (
            <p className="text-sm text-inkMuted">
              The payment didn&apos;t go through — it may have been cancelled or timed out.
              Refresh this page or try checking out again.
            </p>
          )}
        </div>
      )}

      <style jsx global>{`
        .checkout-input {
          width: 100%;
          background: #1e2328;
          border: 1px solid #31383e;
          border-radius: 4px;
          padding: 0.65rem 0.85rem;
          color: #e8eaed;
          font-family: 'Space Mono', monospace;
          font-size: 0.9rem;
        }
        .checkout-input::placeholder {
          color: #5c636b;
        }
        .checkout-input:focus {
          border-color: #3ecf8e;
        }
      `}</style>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p className="text-sm text-inkMuted">Loading...</p>}>
      <CheckoutPageInner />
    </Suspense>
  );
}
