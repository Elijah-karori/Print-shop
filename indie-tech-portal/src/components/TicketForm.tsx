import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTicket, APIError, type CreateTicketInput } from '../lib/api';

const DEVICE_TYPES = ['Printer', 'POS Terminal', 'Smart Board', 'Network Equipment', 'Other'];
const PRIORITIES: { value: CreateTicketInput['priority']; label: string }[] = [
  { value: 'normal', label: 'Normal — within 2 business days' },
  { value: 'high', label: 'High — same day' },
  { value: 'emergency', label: 'Emergency — need someone now' },
];

const MAINTENANCE_TYPES: { value: CreateTicketInput['maintenance_type']; label: string; desc: string }[] = [
  { value: 'corrective', label: 'Corrective Maintenance', desc: 'Fix an active fault, broken hardware, or system failure' },
  { value: 'preventive', label: 'Preventive Maintenance', desc: 'Routine servicing, cleaning, inspection & health check' },
];

type FieldErrors = Partial<Record<keyof CreateTicketInput, string>>;

export function TicketForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateTicketInput>({
    client_phone: '',
    client_name: '',
    business_type: '',
    device_type: '',
    brand: '',
    model: '',
    serial_number: '',
    issue_desc: '',
    priority: 'normal',
    maintenance_type: 'corrective',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof CreateTicketInput>(key: K, value: CreateTicketInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!/^2547\d{8}$/.test(form.client_phone.replace(/\s+/g, ''))) {
      next.client_phone = 'Enter a phone number in the format 2547XXXXXXXX';
    }
    if (!form.device_type) next.device_type = 'Select what needs repair';
    if (form.issue_desc.trim().length < 10) {
      next.issue_desc = 'Give a few more details so we know what to bring';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const ticket = await createTicket({
        ...form,
        client_phone: form.client_phone.replace(/\s+/g, ''),
      });
      navigate(`/track?code=${ticket.ticket_code}&phone=${form.client_phone.replace(/\s+/g, '')}`);
    } catch (err) {
      if (err instanceof APIError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Something went wrong sending your ticket. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <fieldset>
        <legend className="mb-3 font-mono text-xs tracking-wider text-inkMuted">SERVICE TYPE</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MAINTENANCE_TYPES.map((m) => (
            <label
              key={m.value}
              className="flex cursor-pointer flex-col rounded border border-line p-4 has-[:checked]:border-diag has-[:checked]:bg-diag/5"
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="maintenance_type"
                  checked={form.maintenance_type === m.value}
                  onChange={() => update('maintenance_type', m.value)}
                  className="accent-diag"
                />
                <span className="font-mono text-sm text-ink">{m.label}</span>
              </div>
              <span className="mt-1 text-xs text-inkMuted pl-5">{m.desc}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Your name" optional>
          <input
            type="text"
            value={form.client_name}
            onChange={(e) => update('client_name', e.target.value)}
            className="input"
            placeholder="Jane Wanjiru"
          />
        </Field>

        <Field label="Phone number (WhatsApp)" error={errors.client_phone}>
          <input
            type="tel"
            value={form.client_phone}
            onChange={(e) => update('client_phone', e.target.value)}
            className="input"
            placeholder="2547XXXXXXXX"
            aria-invalid={!!errors.client_phone}
          />
        </Field>
      </div>

      <Field label="Business type" optional>
        <input
          type="text"
          value={form.business_type}
          onChange={(e) => update('business_type', e.target.value)}
          className="input"
          placeholder="Clinic, cybercafé, retail shop..."
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Device type" error={errors.device_type}>
          <select
            value={form.device_type}
            onChange={(e) => update('device_type', e.target.value)}
            className="input"
            aria-invalid={!!errors.device_type}
          >
            <option value="">Select...</option>
            {DEVICE_TYPES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Brand" optional>
          <input
            type="text"
            value={form.brand}
            onChange={(e) => update('brand', e.target.value)}
            className="input"
            placeholder="Kyocera, Epson..."
          />
        </Field>

        <Field label="Model" optional>
          <input
            type="text"
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
            className="input"
            placeholder="TASKalfa 3212i"
          />
        </Field>

        <Field label="Serial Number / Asset Tag" optional>
          <input
            type="text"
            value={form.serial_number}
            onChange={(e) => update('serial_number', e.target.value)}
            className="input"
            placeholder="SN-98765432"
          />
        </Field>
      </div>

      <Field label="What's wrong / Service scope?" error={errors.issue_desc}>
        <textarea
          value={form.issue_desc}
          onChange={(e) => update('issue_desc', e.target.value)}
          className="input min-h-28 resize-y"
          placeholder="e.g. Thermal printer not powering on since yesterday's power surge or request monthly maintenance check"
          aria-invalid={!!errors.issue_desc}
        />
      </Field>

      <fieldset>
        <legend className="mb-3 font-mono text-xs tracking-wider text-inkMuted">PRIORITY</legend>
        <div className="space-y-2">
          {PRIORITIES.map((p) => (
            <label
              key={p.value}
              className="flex cursor-pointer items-center gap-3 rounded border border-line px-4 py-3 has-[:checked]:border-diag has-[:checked]:bg-diag/5"
            >
              <input
                type="radio"
                name="priority"
                checked={form.priority === p.value}
                onChange={() => update('priority', p.value)}
                className="accent-diag"
              />
              <span className="text-sm text-ink">{p.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {submitError && (
        <p role="alert" className="rounded border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded border border-diag bg-diag/10 px-5 py-3 font-mono text-sm text-diag transition-colors hover:bg-diag/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'SUBMITTING...' : 'SUBMIT TICKET →'}
      </button>

      <style>{`
        .input {
          width: 100%;
          background: #1e2328;
          border: 1px solid #31383e;
          border-radius: 4px;
          padding: 0.65rem 0.85rem;
          color: #e8eaed;
          font-size: 0.9rem;
        }
        .input::placeholder {
          color: #5c636b;
        }
        .input:focus {
          border-color: #3ecf8e;
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  optional,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between font-mono text-xs tracking-wider text-inkMuted">
        {label.toUpperCase()}
        {optional && <span className="text-[10px] text-inkMuted/60">OPTIONAL</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
