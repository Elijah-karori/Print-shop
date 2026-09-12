import React, { useState } from 'react';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, Info, ArrowRight, ShieldCheck, Wrench, Smartphone, Laptop, Cpu } from 'lucide-react';
import { createTicket, type Ticket } from '../lib/api';

const ticketSchema = z.object({
  client_name: z.string().min(2, 'Full name must be at least 2 characters'),
  client_phone: z.string().regex(/^(?:\+254|0)?7\d{8}$|^(?:\+254|0)?1\d{8}$/, 'Valid Kenyan phone number required (e.g., 0712345678 or 07...)'),
  client_email: z.string().email('Valid email address required').optional().or(z.literal('')),
  device_brand: z.string().min(1, 'Device brand is required'),
  device_model: z.string().min(1, 'Device model is required'),
  device_serial: z.string().optional(),
  problem_description: z.string().min(10, 'Please provide a detailed problem description (min 10 characters)'),
});

type FormData = z.infer<typeof ticketSchema>;

interface Props {
  onCreated?: (ticket: Ticket) => void;
}

export function TicketForm({ onCreated }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<FormData>({
    client_name: '',
    client_phone: '',
    client_email: '',
    device_brand: '',
    device_model: '',
    device_serial: '',
    problem_description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateStep = (currentStep: number): boolean => {
    let fieldsToValidate: (keyof FormData)[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ['client_name', 'client_phone', 'client_email'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['device_brand', 'device_model'];
    } else if (currentStep === 3) {
      fieldsToValidate = ['problem_description'];
    }

    const stepErrors: Record<string, string> = {};
    for (const field of fieldsToValidate) {
      try {
        ticketSchema.shape[field].parse(formData[field]);
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          stepErrors[field] = err.issues[0]?.message || 'Invalid field';
        }
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => (prev < 3 ? ((prev + 1) as any) : prev));
    }
  };

  const handleBack = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as any) : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    const fullValidation = ticketSchema.safeParse(formData);
    if (!fullValidation.success) {
      const formatted: Record<string, string> = {};
      fullValidation.error.issues.forEach((issue: any) => {
        if (issue.path[0]) formatted[issue.path[0].toString()] = issue.message;
      });
      setErrors(formatted);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const apiPayload = {
        client_phone: fullValidation.data.client_phone,
        client_name: fullValidation.data.client_name,
        device_type: 'Laptop',
        brand: fullValidation.data.device_brand,
        model: fullValidation.data.device_model,
        serial_number: fullValidation.data.device_serial || '',
        issue_desc: fullValidation.data.problem_description,
      };
      const result = await createTicket(apiPayload);
      if (onCreated) {
        onCreated(result);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit service ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-line bg-surface p-6 sm:p-8 shadow-xl">
      {/* Progress Steps Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-mono mb-3">
          <span className={step >= 1 ? 'text-diag font-bold' : 'text-inkMuted'}>01. CLIENT DETAILS</span>
          <span className={step >= 2 ? 'text-diag font-bold' : 'text-inkMuted'}>02. DEVICE SPECS</span>
          <span className={step >= 3 ? 'text-diag font-bold' : 'text-inkMuted'}>03. DIAGNOSTIC INFO</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-background overflow-hidden">
          <motion.div
            className="h-full bg-diag"
            initial={{ width: '33.3%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {submitError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{submitError}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-mono font-bold text-ink flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-diag" /> Contact Information
              </h3>
              <div>
                <label className="block text-xs font-mono text-inkMuted uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => handleChange('client_name', e.target.value)}
                  placeholder="e.g., John Doe"
                  className={`w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-ink outline-none transition-colors ${
                    errors.client_name ? 'border-red-500' : 'border-line focus:border-diag'
                  }`}
                />
                {errors.client_name && <p className="mt-1 text-xs text-red-400">{errors.client_name}</p>}
              </div>

              <div>
                <label className="block text-xs font-mono text-inkMuted uppercase mb-1">Phone Number (M-Pesa / WhatsApp) *</label>
                <input
                  type="text"
                  value={formData.client_phone}
                  onChange={(e) => handleChange('client_phone', e.target.value)}
                  placeholder="0712345678"
                  className={`w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-ink outline-none transition-colors ${
                    errors.client_phone ? 'border-red-500' : 'border-line focus:border-diag'
                  }`}
                />
                {errors.client_phone && <p className="mt-1 text-xs text-red-400">{errors.client_phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-mono text-inkMuted uppercase mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => handleChange('client_email', e.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-lg border border-line bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-diag"
                />
                {errors.client_email && <p className="mt-1 text-xs text-red-400">{errors.client_email}</p>}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-mono font-bold text-ink flex items-center gap-2">
                <Wrench className="h-5 w-5 text-diag" /> Device Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-inkMuted uppercase mb-1">Brand *</label>
                  <input
                    type="text"
                    value={formData.device_brand}
                    onChange={(e) => handleChange('device_brand', e.target.value)}
                    placeholder="e.g. Apple, Dell, Samsung"
                    className={`w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-ink outline-none transition-colors ${
                      errors.device_brand ? 'border-red-500' : 'border-line focus:border-diag'
                    }`}
                  />
                  {errors.device_brand && <p className="mt-1 text-xs text-red-400">{errors.device_brand}</p>}
                </div>

                <div>
                  <label className="block text-xs font-mono text-inkMuted uppercase mb-1">Model *</label>
                  <input
                    type="text"
                    value={formData.device_model}
                    onChange={(e) => handleChange('device_model', e.target.value)}
                    placeholder="e.g. MacBook Pro M1, XPS 15"
                    className={`w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-ink outline-none transition-colors ${
                      errors.device_model ? 'border-red-500' : 'border-line focus:border-diag'
                    }`}
                  />
                  {errors.device_model && <p className="mt-1 text-xs text-red-400">{errors.device_model}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-inkMuted uppercase mb-1">Serial Number (Optional)</label>
                <input
                  type="text"
                  value={formData.device_serial}
                  onChange={(e) => handleChange('device_serial', e.target.value)}
                  placeholder="e.g. C02FX01234"
                  className="w-full rounded-lg border border-line bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-diag font-mono"
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-mono font-bold text-ink flex items-center gap-2">
                <Info className="h-5 w-5 text-diag" /> Issue Description &amp; Fault Log
              </h3>
              <div>
                <label className="block text-xs font-mono text-inkMuted uppercase mb-1">Problem Description *</label>
                <textarea
                  rows={4}
                  value={formData.problem_description}
                  onChange={(e) => handleChange('problem_description', e.target.value)}
                  placeholder="Describe the fault symptoms, noise, liquid spill, or error messages..."
                  className={`w-full rounded-lg border bg-background p-4 text-sm text-ink outline-none transition-colors ${
                    errors.problem_description ? 'border-red-500' : 'border-line focus:border-diag'
                  }`}
                />
                {errors.problem_description && <p className="mt-1 text-xs text-red-400">{errors.problem_description}</p>}
              </div>

              {/* Summary card before submission */}
              <div className="rounded-lg border border-line bg-background p-4 text-xs font-mono space-y-2 text-inkMuted">
                <p className="font-bold text-diag uppercase">SUMMARY CHECK</p>
                <p>Client: <span className="text-ink">{formData.client_name} ({formData.client_phone})</span></p>
                <p>Device: <span className="text-ink">{formData.device_brand} {formData.device_model}</span></p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-lg border border-line px-4 py-2 text-xs font-mono text-ink transition-colors hover:bg-background"
            >
              BACK
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 rounded-lg bg-diag px-5 py-2.5 text-xs font-mono font-bold text-background transition-transform hover:scale-[1.02]"
            >
              CONTINUE <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-diag px-6 py-2.5 text-xs font-mono font-bold text-background transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> SUBMITTING...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> SUBMIT TICKET
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
