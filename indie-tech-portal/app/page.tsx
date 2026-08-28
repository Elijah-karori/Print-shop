import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="space-y-6">
        <p className="font-mono text-xs tracking-widest text-diag">
          PRINTERS · POS · SMART BOARDS · NETWORK GEAR
        </p>
        <h1 className="font-mono text-3xl leading-tight text-ink sm:text-4xl">
          Field diagnostics,
          <br />
          dispatched in hours,
          <br />
          not days.
        </h1>
        <p className="max-w-md text-inkMuted">
          Submit a ticket, get a technician on-site, and watch it move from
          received to resolved — no account, no app install, just your phone
          number and a ticket code.
        </p>
        <div className="flex gap-4 pt-2">
          <Link
            href="/book"
            className="rounded border border-diag bg-diag/10 px-5 py-3 font-mono text-sm text-diag transition-colors hover:bg-diag/20"
          >
            BOOK A REPAIR →
          </Link>
          <Link
            href="/track"
            className="rounded border border-line px-5 py-3 font-mono text-sm text-inkMuted transition-colors hover:border-inkMuted hover:text-ink"
          >
            TRACK A TICKET
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-3">
        {[
          {
            label: '01 SUBMIT',
            body: 'Describe the device and the fault. Takes under a minute.',
          },
          {
            label: '02 DISPATCH',
            body: 'A technician is assigned and en route to your location.',
          },
          {
            label: '03 RESOLVED',
            body: 'Status updates land on WhatsApp at every stage — no need to call in.',
          },
        ].map((step) => (
          <div key={step.label} className="bg-surface p-6">
            <p className="font-mono text-xs tracking-wider text-amber">{step.label}</p>
            <p className="mt-3 text-sm text-inkMuted">{step.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
