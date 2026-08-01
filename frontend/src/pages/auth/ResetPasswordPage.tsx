import { useState, type FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { authClient } from '../../lib/auth-client';
import { useToast } from '../../components/ui/Toast';

export default function ResetPasswordPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Must be at least 8 characters';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authClient.resetPassword(token, password);
      addToast('Password reset successfully. You can now log in.', 'success');
      navigate('/login', { replace: true });
    } catch (err: any) {
      addToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Invalid link" subtitle="This password reset link is invalid or expired.">
        <div className="text-center">
          <Link to="/forgot-password" className="text-sm text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)] font-medium">Request a new reset link</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set new password" subtitle="Enter your new password below.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-password" className="block text-sm font-medium text-[var(--color-neutral-900)] mb-1.5">New password</label>
          <div className="relative">
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] px-3 pr-10 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)] focus:border-[var(--color-accent-600)]"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-sm text-[var(--color-error-500)]">{errors.password}</p>}
        </div>
        <div>
          <label htmlFor="reset-confirm" className="block text-sm font-medium text-[var(--color-neutral-900)] mb-1.5">Confirm new password</label>
          <input
            id="reset-confirm"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="h-10 w-full rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] px-3 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)] focus:border-[var(--color-accent-600)]"
            placeholder="Repeat your new password"
            autoComplete="new-password"
          />
          {errors.confirmPassword && <p className="mt-1 text-sm text-[var(--color-error-500)]">{errors.confirmPassword}</p>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 inline-flex items-center justify-center rounded-lg bg-[var(--color-accent-600)] text-white text-sm font-medium hover:bg-[var(--color-accent-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Resetting...
            </span>
          ) : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  );
}
