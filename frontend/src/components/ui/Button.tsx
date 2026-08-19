import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { type Variant, type ComponentSize } from '../../types';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: ComponentSize;
  loading?: boolean;
  fullWidth?: boolean;
  arrow?: boolean;
  glow?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-[var(--color-accent-600)] text-white hover:bg-[var(--color-accent-700)] active:bg-[var(--color-accent-700)] active:scale-[0.98] shadow-sm',
  secondary: 'bg-transparent text-[var(--color-accent-600)] border border-[var(--color-accent-600)] hover:bg-[var(--color-accent-200)] active:bg-[var(--color-accent-200)] active:scale-[0.98]',
  ghost: 'text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)] active:bg-[var(--color-neutral-200)] active:scale-[0.98]',
  danger: 'bg-[var(--color-error-500)] text-white hover:bg-[var(--color-error-500)] active:bg-[var(--color-error-500)] active:scale-[0.98] shadow-sm'
};

const sizeStyles: Record<ComponentSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 text-base rounded-lg gap-2'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, fullWidth = false, disabled, children, arrow = false, glow = false, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none group',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        glow && variant === 'primary' && 'shadow-[0_0_20px_-5px_rgba(0,98,72,0.35)] hover:shadow-[0_0_25px_-3px_rgba(0,98,72,0.5)]',
        glow && variant === 'secondary' && 'shadow-[0_0_20px_-5px_rgba(0,98,72,0.15)] hover:shadow-[0_0_25px_-3px_rgba(0,98,72,0.25)]',
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
      {arrow && !loading && (
        <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      )}
    </button>
  )
);
Button.displayName = 'Button';
