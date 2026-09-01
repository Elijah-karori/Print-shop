import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <p className="font-mono text-xs tracking-widest text-diag">ON-SITE TECH REPAIR</p>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Hardware &amp; Software Support for Independent Business
        </h1>
        <p className="max-w-2xl text-base text-inkMuted leading-relaxed">
          Thermal printers, POS terminals, network gear, and smart boards. Fast diagnostics,
          guaranteed OEM replacement parts, and preventive SLA maintenance across Nairobi.
        </p>
        <div className="flex flex-wrap gap-4 pt-2">
          <Link
            to="/book"
            className="rounded border border-diag bg-diag/10 px-6 py-3 font-mono text-sm text-diag transition-colors hover:bg-diag/20"
          >
            BOOK A REPAIR →
          </Link>
          <Link
            to="/track"
            className="rounded border border-line bg-surface px-6 py-3 font-mono text-sm text-ink transition-colors hover:border-diag"
          >
            TRACK STATUS
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-3 pt-6 border-t border-line">
        <div className="rounded border border-line bg-surface p-5 space-y-2">
          <h3 className="font-mono text-sm text-diag">NO ACCOUNT NEEDED</h3>
          <p className="text-xs text-inkMuted">Book and track tickets directly via phone number and WhatsApp notifications.</p>
        </div>
        <div className="rounded border border-line bg-surface p-5 space-y-2">
          <h3 className="font-mono text-sm text-diag">M-PESA CHECKOUT</h3>
          <p className="text-xs text-inkMuted">Instant STK Push prompts on checkout for spare parts and service packages.</p>
        </div>
        <div className="rounded border border-line bg-surface p-5 space-y-2">
          <h3 className="font-mono text-sm text-diag">RELIABILITY ANALYTICS</h3>
          <p className="text-xs text-inkMuted">MTBF metrics, machine job cards, and transparent technician service reports.</p>
        </div>
      </section>
    </div>
  );
}
