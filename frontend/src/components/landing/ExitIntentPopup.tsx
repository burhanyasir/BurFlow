import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { track } from '../../lib/analytics';

export function ExitIntentPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('https://');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger when mouse leaves from the top of the viewport
    if (e.clientY <= 0 && !isVisible) {
      setIsVisible(true);
      track('exit_intent_popup_shown');
    }
  }, [isVisible]);

  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    // Show popup on page unload (mobile/back button)
    if (!isVisible && !isSubmitted) {
      setIsVisible(true);
      track('exit_intent_popup_shown');
    }
  }, [isVisible, isSubmitted]);

  useEffect(() => {
    // Don't show if already submitted or dismissed in this session
    if (sessionStorage.getItem('exit_intent_dismissed')) return;
    if (sessionStorage.getItem('exit_intent_submitted')) return;

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleMouseLeave, handleBeforeUnload]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || url === 'https://') return;

    setIsSubmitting(true);
    try {
      // Submit as a lead
      await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || undefined,
          websiteUrl: url,
          source: 'exit_intent_popup',
        }),
      });
      setIsSubmitted(true);
      sessionStorage.setItem('exit_intent_submitted', 'true');
      track('exit_intent_popup_submitted', { url, hasEmail: !!email });
    } catch {
      // Non-fatal — still close the popup
      setIsSubmitted(true);
      sessionStorage.setItem('exit_intent_submitted', 'true');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('exit_intent_dismissed', 'true');
    track('exit_intent_popup_dismissed');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)] transition-colors"
          aria-label="Close"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {isSubmitted ? (
          /* Success state */
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-600)]/10">
              <svg className="h-8 w-8 text-[var(--color-accent-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-neutral-900)]">
              You're all set!
            </h3>
            <p className="mt-3 text-[var(--color-neutral-500)]">
              We'll scan your website and show you exactly how BurFlow can convert your visitors into demos.
            </p>
            <Link
              to="/"
              onClick={() => handleDismiss()}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[var(--color-accent-600)] px-8 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              See the scan results →
            </Link>
          </div>
        ) : (
          /* Form state */
          <>
            <div className="mb-6">
              <span className="inline-block rounded-full bg-[var(--color-accent-600)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent-600)]">
                Free website scan
              </span>
              <h3 className="mt-3 text-2xl font-bold text-[var(--color-neutral-900)]">
                Don't lose another visitor
              </h3>
              <p className="mt-2 text-[var(--color-neutral-500)]">
                See how BurFlow would convert your website traffic into qualified demos — free, no card required.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="exit-url" className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1">
                  Your website URL
                </label>
                <input
                  id="exit-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourcompany.com"
                  required
                  className="w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent-600)] focus:ring-2 focus:ring-[var(--color-accent-600)]/20"
                />
              </div>

              <div>
                <label htmlFor="exit-email" className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1">
                  Email <span className="text-[var(--color-neutral-400)]">(optional)</span>
                </label>
                <input
                  id="exit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent-600)] focus:ring-2 focus:ring-[var(--color-accent-600)]/20"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !url || url === 'https://'}
                className="w-full rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:pointer-events-none disabled:opacity-60"
              >
                {isSubmitting ? 'Scanning...' : 'Scan my website free →'}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--color-neutral-400)]">
              <span>✓ No credit card</span>
              <span>✓ Results in 2 minutes</span>
              <span>✓ Free forever</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
