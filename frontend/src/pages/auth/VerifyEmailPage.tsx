import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { authClient } from '../../lib/auth-client';
import { useAuth } from '../../lib/auth-context';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { refreshUser } = useAuth();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    let cancelled = false;
    async function verify() {
      try {
        await authClient.verifyEmail(token);
        if (!cancelled) {
          await refreshUser();
          setStatus('success');
          setMessage('Your email has been verified successfully!');
        }
      } catch (err: any) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err.message || 'Failed to verify email.');
        }
      }
    }
    verify();
    return () => { cancelled = true; };
  }, [token, refreshUser]);

  return (
    <AuthLayout title="Email Verification" subtitle={status === 'verifying' ? 'Verifying your email...' : undefined}>
      <div className="text-center space-y-4">
        {status === 'verifying' && (
          <div className="flex justify-center">
            <div className="h-8 w-8 border-2 border-[var(--color-accent-600)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {status === 'success' && (
          <>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[var(--color-success-100)] text-[var(--color-success-600)]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-sm text-[var(--color-neutral-700)]">{message}</p>
            <Link to="/dashboard" className="inline-flex h-10 items-center px-4 rounded-lg bg-[var(--color-accent-600)] text-white text-sm font-medium hover:bg-[var(--color-accent-700)] transition-colors">Go to dashboard</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[var(--color-error-100)] text-[var(--color-error-600)]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <p className="text-sm text-[var(--color-error-600)]">{message}</p>
            <Link to="/login" className="text-sm text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)] font-medium">Back to login</Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
