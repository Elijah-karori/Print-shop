import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { checkout, getOrderStatus, APIError, type CheckoutInput, type OrderStatus } from '../lib/api';
import { PaymentStatus } from '../components/PaymentStatus';

export function Checkout() {
  const [searchParams] = useSearchParams();
  const itemType = (searchParams.get('type') as CheckoutInput['item_type']) ?? 'spare_part';
  const itemRef = searchParams.get('ref') ?? undefined;
  const description = searchParams.get('desc') ?? 'Service or Part Purchase';
  const amountKes = Number(searchParams.get('amount') ?? '0');

  const [clientPhone, setClientPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [mpesaReceipt, setMpesaReceipt] = useState<string | undefined>(undefined);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError(null);
    setSubmitError(null);

    const cleanPhone = clientPhone.replace(/\s+/g, '');
    if (!/^2547\d{8}$/.test(cleanPhone)) {
      setPhoneError('Enter phone in the format 2547XXXXXXXX');
      return;
    }

    setSubmitting(true);
    try {
      const res = await checkout({
        client_phone: cleanPhone,
        client_name: clientName || undefined,
        item_type: itemType,
        item_ref: itemRef,
        description,
        amount_kes: amountKes,
      });
      setOrderId(res.order_id);
      setStatus('pending');
    } catch (err) {
      if (err instanceof APIError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Could not trigger payment. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Poll order status
  useEffect(() => {
    if (!orderId || status === 'paid' || status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const res = await getOrderStatus(orderId);
        setStatus(res.status);
        if (res.mpesa_receipt) setMpesaReceipt(res.mpesa_receipt);
      } catch {
        // keep polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, status]);

  return (
    <div className="space-y-10">
      <div>
        <Link to="/shop" className="font-mono text-xs tracking-widest text-diag hover:underline">
          ← BACK TO STOREFRONT
        </Link>
        <h1 className="mt-2 font-mono text-2xl text-ink">Checkout — M-Pesa Till</h1>
      </div>

      <div className="rounded border border-line bg-surface p-6 space-y-4">
        <p className="font-mono text-xs text-inkMuted tracking-wider">ITEM SUMMARY</p>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-mono text-base text-ink">{description}</h2>
            <p className="mt-1 text-xs text-inkMuted uppercase font-mono">{itemType.replace('_', ' ')}</p>
          </div>
          <p className="font-mono text-lg text-diag">KES {amountKes.toLocaleString()}</p>
        </div>
      </div>

      {!orderId ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block font-mono text-xs text-inkMuted tracking-wider">YOUR NAME (OPTIONAL)</span>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="checkout-input"
                placeholder="Jane Wanjiru"
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-mono text-xs text-inkMuted tracking-wider">M-PESA PHONE NUMBER</span>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="checkout-input"
                placeholder="2547XXXXXXXX"
              />
              {phoneError && <span className="mt-1 block text-xs text-danger">{phoneError}</span>}
            </label>
          </div>

          {submitError && (
            <p role="alert" className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded border border-diag bg-diag/10 px-5 py-3 font-mono text-sm text-diag transition-colors hover:bg-diag/20 disabled:opacity-50"
          >
            {submitting ? 'SENDING STK PROMPT...' : `PAY KES ${amountKes.toLocaleString()} VIA M-PESA →`}
          </button>
        </form>
      ) : (
        <div className="space-y-6 rounded border border-line bg-surface p-6">
          <p className="font-mono text-xs text-inkMuted tracking-wider">PAYMENT CONFIRMATION</p>
          <PaymentStatus status={status} mpesaReceipt={mpesaReceipt} />
        </div>
      )}

      <style>{`
        .checkout-input {
          width: 100%;
          background: #1e2328;
          border: 1px solid #31383e;
          border-radius: 4px;
          padding: 0.65rem 0.85rem;
          color: #e8eaed;
          font-family: 'Space Mono', monospace;
          font-size: 0.85rem;
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
