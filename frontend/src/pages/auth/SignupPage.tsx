import { useState, useMemo, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { useAuth } from '../../lib/auth-context';
import { useToast } from '../../components/ui/Toast';

function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return Math.min(score, 4);
  }, [password]);

  if (!password) return null;

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const colors = [
    'bg-[var(--color-error-500)]',
    'bg-[var(--color-warning-500)]',
    'bg-[var(--color-warning-500)]',
    'bg-[var(--color-success-500)]',
    'bg-[var(--color-success-500)]',
  ];
  const textColors = [
    'text-[var(--color-error-500)]',
    'text-[var(--color-warning-500)]',
    'text-[var(--color-warning-500)]',
    'text-[var(--color-success-500)]',
    'text-[var(--color-success-500)]',
  ];

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= strength ? colors[strength] : 'bg-[var(--color-neutral-200)]'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${textColors[strength]} animate-fade-in`}>
        {labels[strength]} password
      </p>
    </div>
  );
}

export default function SignupPage() {
  const { signup } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters';
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
      await signup(email.trim(), password, name.trim(), companyName.trim() || undefined);
      addToast('Welcome to BurFlow. Your sales agent workspace is ready.', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      addToast(err.message || 'Signup failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your free trial — no credit card required. Join 1,200+ teams."
      showTrustBadges
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-name" className="block text-sm font-medium text-[var(--color-neutral-900)] mb-1.5">
            Full name
          </label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] px-3 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] hover:border-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition-all duration-150"
            placeholder="Jane Smith"
            autoComplete="name"
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="mt-1.5 text-sm text-[var(--color-error-500)] flex items-center gap-1.5 animate-fade-in" role="alert">
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="signup-email" className="block text-sm font-medium text-[var(--color-neutral-900)] mb-1.5">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] px-3 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] hover:border-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition-all duration-150"
            placeholder="jane@company.com"
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
          <label htmlFor="signup-password" className="block text-sm font-medium text-[var(--color-neutral-900)] mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] px-3 pr-10 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] hover:border-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition-all duration-150"
              placeholder="At least 8 characters"
              autoComplete="new-password"
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
          <PasswordStrength password={password} />
          {errors.password && (
            <p className="mt-1.5 text-sm text-[var(--color-error-500)] flex items-center gap-1.5 animate-fade-in" role="alert">
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errors.password}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="signup-confirm" className="block text-sm font-medium text-[var(--color-neutral-900)] mb-1.5">
            Confirm password
          </label>
          <input
            id="signup-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] px-3 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] hover:border-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition-all duration-150"
            placeholder="Repeat your password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-[var(--color-error-500)] flex items-center gap-1.5 animate-fade-in" role="alert">
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="signup-company" className="block text-sm font-medium text-[var(--color-neutral-900)] mb-1.5">
            Company name <span className="text-[var(--color-neutral-400)]">(optional)</span>
          </label>
          <input
            id="signup-company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] px-3 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-500)] hover:border-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition-all duration-150"
            placeholder="Acme Inc."
            autoComplete="organization"
          />
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
              Creating account...
            </span>
          ) : (
            'Create account'
          )}
        </button>

        <p className="text-center text-sm text-[var(--color-neutral-500)]">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)] font-semibold transition-colors">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
