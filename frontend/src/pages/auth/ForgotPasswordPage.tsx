import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { authClient } from '../../lib/auth-client';
import { useToast } from '../../components/ui/Toast';

export default function ForgotPasswordPage() {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});

  function validate() {
    if (!email.trim()) { setErrors({ email: 'Email is required' }); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrors({ email: 'Invalid email address' }); return false; }
    setErrors({});
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authClient.forgotPassword(email.trim());
      setSent(true);
      addToast('Check your email for the reset link.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to send reset email', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="If that email is registered, we've sent a reset link.">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[var(--color-success-100)] text-[var(--color-success-600)]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <p className="text-sm text-[var(--color-neutral-500)]">Didn't receive the email? Check your spam folder or</p>
          <button onClick={() => setSent(false)} className="text-sm text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)] font-medium">try again</button>
          <p className="text-sm text-[var(--color-neutral-500)]"><Link to="/login" className="text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)] font-medium">Back to login</Link></p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-[var(--color-neutral-900)] mb-1.5">Email</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="h-10 w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] px-3 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)] focus:border-[var(--color-accent-600)]"
            placeholder="you@company.com"
            autoComplete="email"
          />
          {errors.email && <p className="mt-1 text-sm text-[var(--color-error-500)]">{errors.email}</p>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 inline-flex items-center justify-center rounded-lg bg-[var(--color-accent-600)] text-white text-sm font-medium hover:bg-[var(--color-accent-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Sending...
            </span>
          ) : 'Send reset link'}
        </button>
        <p className="text-center text-sm text-[var(--color-neutral-500)]">
          <Link to="/login" className="text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)] font-medium">Back to login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
