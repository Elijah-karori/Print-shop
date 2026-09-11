import { TicketForm } from '../components/TicketForm';

export function Book() {
  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs tracking-widest text-diag">NEW TICKET</p>
        <h1 className="mt-2 font-mono text-2xl text-ink">Book a repair</h1>
        <p className="mt-2 text-sm text-inkMuted">
          You&apos;ll get a ticket code by WhatsApp — save it to track progress or reference the job later.
        </p>
      </div>
      <TicketForm />
    </div>
  );
}
