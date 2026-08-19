import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Mail, X } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { track } from '../lib/analytics';
import { cn } from '../utils/cn';

interface LeadCaptureModalProps {
  open: boolean;
  onClose: () => void;
  toolSlug: string;
  toolName: string;
  resultType: string;
  resultSummary: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function LeadCaptureModal({ open, onClose, toolSlug, toolName, resultType, resultSummary }: LeadCaptureModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setStatus('idle');
      setError('');
      setTimeout(() => emailRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setStatus('submitting');
    setError('');
    try {
      await apiClient.post('/leads', {
        source: 'tool',
        email: email.trim(),
        name: name.trim() || undefined,
        tool: toolSlug,
        toolName,
        resultType,
        resultSummary: resultSummary.slice(0, 1000),
      });
      setStatus('success');
      track('lead_capture_submitted', { tool_id: toolSlug, result_type: resultType });
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      track('lead_capture_error', { tool_id: toolSlug, result_type: resultType });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Email your ${resultType}`}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-[var(--color-neutral-900)]/50 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-[var(--color-neutral-200)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg p-2 text-[var(--color-neutral-400)] transition-colors hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-700)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {status === 'success' ? (
          <div className="px-6 py-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--color-success-600)]" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-bold text-[var(--color-neutral-900)]">You&apos;re all set</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-neutral-500)]">
              We&apos;ve saved your {toolName} results{email ? ` for ${email}` : ''}. A BurFlow specialist may follow up to help
              you put them into action — no spam, ever.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex items-center rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-8">
            <div className="flex items-center gap-2 text-[var(--color-accent-700)]">
              <Mail className="h-5 w-5" aria-hidden="true" />
              <h3 className="text-base font-bold text-[var(--color-neutral-900)]">Email me this {resultType}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-neutral-500)]">
              Get your <span className="font-semibold text-[var(--color-neutral-700)]">{toolName}</span> result sent to your
              inbox — and see how BurFlow can capture leads like this for your site automatically.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="lcm-email" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                  Work email
                </label>
                <input
                  ref={emailRef}
                  id="lcm-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] transition focus:border-[var(--color-accent-600)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30"
                />
              </div>
              <div>
                <label htmlFor="lcm-name" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                  Name <span className="font-normal text-[var(--color-neutral-400)]">(optional)</span>
                </label>
                <input
                  id="lcm-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] transition focus:border-[var(--color-accent-600)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-3 rounded-lg bg-[var(--color-error-500)]/10 px-3 py-2 text-xs font-medium text-[var(--color-error-600)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className={cn(
                'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]',
                status === 'submitting' && 'cursor-not-allowed opacity-70'
              )}
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                'Send me my result'
              )}
            </button>
            <p className="mt-3 text-center text-xs text-[var(--color-neutral-400)]">
              By submitting, you agree to our{' '}
              <a href="/privacy" className="underline underline-offset-2 hover:text-[var(--color-neutral-600)]">
                Privacy Policy
              </a>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  );
}