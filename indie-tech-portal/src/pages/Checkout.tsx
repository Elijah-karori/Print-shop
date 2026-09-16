import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { checkout, createTicket, getOrderStatus, APIError, type CheckoutInput, type OrderStatus } from '../lib/api';
import { PaymentStatus } from '../components/PaymentStatus';
import { ShoppingCart, Wrench, ArrowLeft, Calendar, MapPin, Phone, CheckCircle2 } from 'lucide-react';

export function Checkout() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'service' ? 'service' : 'pick';

  const [mode, setMode] = useState<'pick' | 'buy' | 'service' | 'confirm'>(initialMode);

  // Buy part / package params
  const itemType = (searchParams.get('type') as CheckoutInput['item_type']) ?? 'spare_part';
  const itemRef = searchParams.get('ref') ?? undefined;
  const description = searchParams.get('desc') ?? 'Spare Part or Service Package';
  const amountKes = Number(searchParams.get('amount') ?? '8500');

  // Technician request form state
  const [techDevice, setTechDevice] = useState('');
  const [techIssue, setTechIssue] = useState('');
  const [techDate, setTechDate] = useState('');
  const [techAddress, setTechAddress] = useState('');
  const [techName, setTechName] = useState('');
  const [techPhone, setTechPhone] = useState('');

  // Buy form state
  const [buyName, setBuyName] = useState('');
  const [buyPhone, setBuyPhone] = useState('');

  // Validation & Submission state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Order & Ticket state
  const [orderId, setOrderId] = useState<string | null>(null);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [mpesaReceipt, setMpesaReceipt] = useState<string | undefined>(undefined);

  async function handleBuySubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPhone = buyPhone.replace(/\s+/g, '');
    if (!/^2547\d{8}$|^07\d{8}$/.test(cleanPhone)) {
      setErrorMsg('Enter phone in the format 2547XXXXXXXX or 07XXXXXXXX');
      return;
    }

    const formattedPhone = cleanPhone.startsWith('0') ? '254' + cleanPhone.slice(1) : cleanPhone;

    setSubmitting(true);
    try {
      const res = await checkout({
        client_phone: formattedPhone,
        client_name: buyName || undefined,
        item_type: itemType,
        item_ref: itemRef,
        description,
        amount_kes: amountKes,
      });
      setOrderId(res.order_id);
      setStatus('pending');
    } catch (err: any) {
      if (err instanceof APIError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Could not trigger payment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTechSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!techDevice || !techIssue) {
      setErrorMsg('Device/model and issue description are required.');
      return;
    }

    const cleanPhone = techPhone.replace(/\s+/g, '');
    if (!/^2547\d{8}$|^07\d{8}$/.test(cleanPhone)) {
      setErrorMsg('Enter phone in format 2547XXXXXXXX or 07XXXXXXXX');
      return;
    }

    const formattedPhone = cleanPhone.startsWith('0') ? '254' + cleanPhone.slice(1) : cleanPhone;

    setSubmitting(true);
    try {
      // 1. Create ticket
      const ticket = await createTicket({
        client_phone: formattedPhone,
        client_name: techName || undefined,
        device_type: 'On-Site Machine',
        brand: techDevice,
        model: techDevice,
        issue_desc: `${techIssue} | Preferred date: ${techDate || 'Flexible'} | Address: ${techAddress || 'N/A'}`,
        priority: 'high',
      });

      setTicketCode(ticket.ticket_code);

      // 2. Trigger M-Pesa call-out deposit (KES 500)
      const res = await checkout({
        client_phone: formattedPhone,
        client_name: techName || undefined,
        item_type: 'service_package',
        item_ref: ticket.id,
        description: `Technician On-Site Callout Deposit (${ticket.ticket_code})`,
        amount_kes: 500,
      });

      setOrderId(res.order_id);
      setStatus('pending');
      setMode('confirm');
    } catch (err: any) {
      if (err instanceof APIError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Could not process technician request. Please try again.');
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

  if (mode === 'pick') {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-6">
        <div>
          <p className="font-mono text-xs tracking-widest text-inkMuted uppercase">WHAT DO YOU NEED</p>
          <h1 className="mt-1 font-mono text-2xl font-bold text-ink">Get something fixed, or shop parts</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('service')}
            className="rounded-lg border border-line bg-surface p-5 text-left space-y-3 transition-colors hover:border-diag"
          >
            <Wrench className="h-6 w-6 text-diag" />
            <div>
              <p className="font-mono text-sm font-bold text-ink">Request a technician</p>
              <p className="font-mono text-xs text-inkMuted mt-1 leading-relaxed">
                On-site repair, diagnosis, or a device that won't turn on
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode('buy')}
            className="rounded-lg border border-line bg-surface p-5 text-left space-y-3 transition-colors hover:border-diag"
          >
            <ShoppingCart className="h-6 w-6 text-diag" />
            <div>
              <p className="font-mono text-sm font-bold text-ink">Buy a part or package</p>
              <p className="font-mono text-xs text-inkMuted mt-1 leading-relaxed">
                Spare parts, service packages, ready to check out
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'buy') {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-6">
        <button onClick={() => setMode('pick')} className="flex items-center gap-1 font-mono text-xs text-inkMuted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> BACK
        </button>

        <div className="rounded-lg border border-line bg-surface p-5 space-y-3">
          <p className="font-mono text-xs text-inkMuted tracking-wider">ITEM SUMMARY</p>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-sm font-bold text-ink">{description}</p>
              <p className="font-mono text-xs text-inkMuted uppercase mt-0.5">{itemType.replace('_', ' ')}</p>
            </div>
            <p className="font-mono text-base font-bold text-diag">KES {amountKes.toLocaleString()}</p>
          </div>
        </div>

        {!orderId ? (
          <form onSubmit={handleBuySubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block font-mono text-xs text-inkMuted uppercase mb-1">YOUR NAME (OPTIONAL)</span>
                <input
                  type="text"
                  value={buyName}
                  onChange={(e) => setBuyName(e.target.value)}
                  placeholder="Jane Wanjiru"
                  className="w-full rounded-md border border-line bg-background p-2.5 font-mono text-xs text-ink outline-none focus:border-diag"
                />
              </label>

              <label className="block">
                <span className="block font-mono text-xs text-inkMuted uppercase mb-1">M-PESA PHONE NUMBER *</span>
                <input
                  type="tel"
                  value={buyPhone}
                  onChange={(e) => setBuyPhone(e.target.value)}
                  placeholder="2547XXXXXXXX or 07XXXXXXXX"
                  className="w-full rounded-md border border-line bg-background p-2.5 font-mono text-xs text-ink outline-none focus:border-diag"
                />
              </label>
            </div>

            {errorMsg && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs text-red-400">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md border border-diag bg-diag/10 px-5 py-3 font-mono text-xs font-bold text-diag transition-colors hover:bg-diag/20 disabled:opacity-50"
            >
              {submitting ? 'SENDING STK PROMPT...' : `PAY KES ${amountKes.toLocaleString()} VIA M-PESA →`}
            </button>
          </form>
        ) : (
          <div className="rounded-lg border border-line bg-surface p-6 space-y-4">
            <p className="font-mono text-xs text-inkMuted tracking-wider">PAYMENT CONFIRMATION</p>
            <PaymentStatus status={status} mpesaReceipt={mpesaReceipt} />
          </div>
        )}
      </div>
    );
  }

  if (mode === 'service') {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-6">
        <button onClick={() => setMode('pick')} className="flex items-center gap-1 font-mono text-xs text-inkMuted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> BACK
        </button>

        <div>
          <p className="font-mono text-xs text-inkMuted uppercase">TECHNICIAN REQUEST</p>
          <h1 className="mt-1 font-mono text-xl font-bold text-ink">Tell us what's wrong</h1>
        </div>

        <form onSubmit={handleTechSubmit} className="space-y-4">
          <label className="block">
            <span className="block font-mono text-xs text-inkMuted uppercase mb-1">DEVICE / MODEL *</span>
            <input
              type="text"
              value={techDevice}
              onChange={(e) => setTechDevice(e.target.value)}
              placeholder="e.g. Kyocera ECOSYS M2540dn"
              className="w-full rounded-md border border-line bg-background p-2.5 font-mono text-xs text-ink outline-none focus:border-diag"
            />
          </label>

          <label className="block">
            <span className="block font-mono text-xs text-inkMuted uppercase mb-1">DESCRIBE THE ISSUE *</span>
            <textarea
              rows={3}
              value={techIssue}
              onChange={(e) => setTechIssue(e.target.value)}
              placeholder="Won't power on since yesterday, paper jam error on panel"
              className="w-full rounded-md border border-line bg-background p-2.5 font-mono text-xs text-ink outline-none focus:border-diag"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="flex items-center gap-1 font-mono text-xs text-inkMuted uppercase mb-1">
                <Calendar className="h-3.5 w-3.5" /> PREFERRED DATE
              </span>
              <input
                type="date"
                value={techDate}
                onChange={(e) => setTechDate(e.target.value)}
                className="w-full rounded-md border border-line bg-background p-2.5 font-mono text-xs text-ink outline-none focus:border-diag"
              />
            </label>

            <label className="block">
              <span className="flex items-center gap-1 font-mono text-xs text-inkMuted uppercase mb-1">
                <MapPin className="h-3.5 w-3.5" /> SERVICE ADDRESS
              </span>
              <input
                type="text"
                value={techAddress}
                onChange={(e) => setTechAddress(e.target.value)}
                placeholder="Westlands, Nairobi"
                className="w-full rounded-md border border-line bg-background p-2.5 font-mono text-xs text-ink outline-none focus:border-diag"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block font-mono text-xs text-inkMuted uppercase mb-1">YOUR NAME</span>
              <input
                type="text"
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                placeholder="Jane Wanjiru"
                className="w-full rounded-md border border-line bg-background p-2.5 font-mono text-xs text-ink outline-none focus:border-diag"
              />
            </label>

            <label className="block">
              <span className="flex items-center gap-1 font-mono text-xs text-inkMuted uppercase mb-1">
                <Phone className="h-3.5 w-3.5" /> M-PESA PHONE *
              </span>
              <input
                type="tel"
                value={techPhone}
                onChange={(e) => setTechPhone(e.target.value)}
                placeholder="2547XXXXXXXX or 07XXXXXXXX"
                className="w-full rounded-md border border-line bg-background p-2.5 font-mono text-xs text-ink outline-none focus:border-diag"
              />
            </label>
          </div>

          <div className="rounded-lg border border-line bg-surface p-4 flex items-center justify-between">
            <span className="font-mono text-xs text-inkMuted uppercase">CALL-OUT DEPOSIT</span>
            <span className="font-mono text-sm font-bold text-amber">KES 500</span>
          </div>

          {errorMsg && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs text-red-400">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md border border-diag bg-diag/10 px-5 py-3 font-mono text-xs font-bold text-diag transition-colors hover:bg-diag/20 disabled:opacity-50"
          >
            {submitting ? 'PROCESSING REQUEST...' : 'CONFIRM REQUEST — PAY KES 500 DEPOSIT →'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-12 space-y-6 text-center">
      <div className="flex justify-center">
        <CheckCircle2 className="h-12 w-12 text-diag" />
      </div>
      <div>
        <p className="font-mono text-xs text-inkMuted uppercase">TICKET CREATED</p>
        <h2 className="font-mono text-xl font-bold text-ink mt-1">Technician Request Received</h2>
        {ticketCode && (
          <p className="font-mono text-sm text-diag font-bold mt-2">
            Ticket Code: {ticketCode}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-line bg-surface p-6 text-left space-y-4">
        <p className="font-mono text-xs text-inkMuted tracking-wider uppercase">DEPOSIT STK PROMPT</p>
        <PaymentStatus status={status} mpesaReceipt={mpesaReceipt} />
      </div>

      <div className="pt-4 flex justify-center gap-4">
        <button onClick={() => setMode('pick')} className="rounded border border-line px-4 py-2 font-mono text-xs text-inkMuted hover:text-ink">
          START NEW REQUEST
        </button>
        <Link to={`/track?code=${ticketCode || ''}`} className="rounded border border-diag bg-diag/10 px-4 py-2 font-mono text-xs text-diag hover:bg-diag/20">
          TRACK TICKET →
        </Link>
      </div>
    </div>
  );
}
