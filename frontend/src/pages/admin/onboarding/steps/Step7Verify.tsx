import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { Progress } from '../../../../components/ui/Progress';

interface Props {
  verified: boolean;
  snippet: string | null;
  onVerify: () => Promise<boolean>;
}

export function Step7Verify({ verified, snippet, onVerify }: Props) {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    try {
      await onVerify();
      setAttempts(a => a + 1);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Make sure the snippet is installed on your website.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto py-4">
      <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] mb-2">Verify Installation</h2>
      <p className="text-sm text-[var(--color-neutral-500)] mb-8">After adding the snippet to your website, click verify to check that the widget is loading correctly.</p>

      <div className="space-y-6">
        <div className="bg-[var(--color-neutral-50)] rounded-xl p-4 border border-[var(--color-neutral-100)]">
          <h4 className="text-sm font-semibold text-[var(--color-neutral-700)] mb-2">Before verifying</h4>
          <ul className="space-y-2 text-xs text-[var(--color-neutral-500)]">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[var(--color-accent-500)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              Make sure you've saved and published your website changes
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[var(--color-accent-500)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              Open your website in a new tab and check the widget appears
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[var(--color-accent-500)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              If using a CDN or cache, it may take a few minutes to propagate
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-[var(--color-neutral-200)] p-6">
          <div className="flex items-center gap-4">
            <Button onClick={handleVerify} disabled={verifying || verified} size="lg" className="flex-1">
              {verifying ? (
                <span className="flex items-center gap-2">
                  <Progress value={-1} size="sm" className="w-5" />
                  Checking…
                </span>
              ) : verified ? 'Verified ✓' : 'Verify Installation'}
            </Button>
          </div>

          {verified && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-xl bg-[var(--color-success-50)] border border-[var(--color-success-100)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-success-100)] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[var(--color-success-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-success-700)]">Widget is Active</p>
                  <p className="text-xs text-[var(--color-success-600)] mt-0.5">Your chatbot widget is live and responding on your website.</p>
                </div>
              </div>
            </motion.div>
          )}

          {!verified && attempts > 0 && !verifying && (
            <div className="mt-4 p-3 rounded-lg bg-[var(--color-warning-50)] border border-[var(--color-warning-100)]">
              <p className="text-sm text-[var(--color-warning-700)]">
                Widget not found yet. This could mean:
              </p>
              <ul className="text-xs text-[var(--color-warning-600)] mt-1 space-y-1">
                <li>• The snippet hasn't been added to your site yet</li>
                <li>• Your site is cached and needs a hard refresh</li>
                <li>• The snippet was modified or has a syntax error</li>
                <li>• If you deployed recently, wait 1-2 minutes and try again</li>
              </ul>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-[var(--color-error-50)] border border-[var(--color-error-100)] text-sm text-[var(--color-error-700)]">
              {error}
              <p className="text-xs mt-1">If the problem persists, check that your website is publicly accessible and the snippet is correctly placed before the &lt;/body&gt; tag.</p>
            </div>
          )}
        </div>

        {snippet && !verified && (
          <details className="rounded-xl border border-[var(--color-neutral-200)]">
            <summary className="px-4 py-3 text-sm font-medium text-[var(--color-neutral-700)] cursor-pointer hover:bg-[var(--color-neutral-50)]">
              Show embed code
            </summary>
            <pre className="p-4 text-xs text-[var(--color-neutral-600)] bg-[var(--color-neutral-50)] overflow-x-auto border-t border-[var(--color-neutral-100)]"><code>{snippet}</code></pre>
          </details>
        )}
      </div>
    </motion.div>
  );
}
