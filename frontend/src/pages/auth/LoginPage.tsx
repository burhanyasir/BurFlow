import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { useAuth } from '../../lib/auth-context';
import { useToast } from '../../components/ui/Toast';

export default function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email address';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
      addToast('Welcome back to BurFlow.', 'success');
      navigate(from, { replace: true });
    } catch (err: any) {
      addToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  const socialProofText = "Join 1,200+ companies shipping better support.";

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={socialProofText}
      showTrustBadges
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Social proof mini */}
        <div className="flex items-center justify-center gap-2 pb-2">
          <div className="flex -space-x-1.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full border-2 border-white bg-[var(--color-neutral-200)] flex items-center justify-center text-[8px] font-semibold text-[var(--color-neutral-500)]"
              >
                {['JD', 'AK', 'MR'][i - 1]}
              </div>
            ))}
          </div>
          <span className="text-[11px] text-[var(--color-neutral-500)]">
            <span className="font-semibold text-[var(--color-neutral-900)]">1,200+</span> teams
          </span>
        </div>

        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-[var(--color-neutral-900)] mb-1.5">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] px-3 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] hover:border-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition-all duration-150"
            placeholder="you@company.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-[var(--color-error-500)] flex items-center gap-1.5 animate-fade-in" role="alert">
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-[var(--color-neutral-900)] mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] px-3 pr-10 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] hover:border-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition-all duration-150"
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)] transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-sm text-[var(--color-error-500)] flex items-center gap-1.5 animate-fade-in" role="alert">
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errors.password}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)] font-medium transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-600)] text-white text-sm font-semibold hover:bg-[var(--color-accent-700)] active:bg-[var(--color-accent-800)] active:scale-[0.98] transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Logging in...
            </span>
          ) : (
            'Log in'
          )}
        </button>

        <p className="text-center text-sm text-[var(--color-neutral-500)]">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)] font-semibold transition-colors">
            Sign up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
