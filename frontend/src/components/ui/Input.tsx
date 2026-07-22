import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label htmlFor={id} className="text-sm font-medium text-[var(--color-neutral-900)]">{label}</label>}
        <input
          ref={ref}
          id={id}
          className={cn(
            'h-10 w-full rounded-lg border bg-white px-3 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-300)] transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)] focus:ring-offset-0 focus:border-[var(--color-accent-600)]',
            'disabled:opacity-50 disabled:bg-[var(--color-neutral-50)] disabled:cursor-not-allowed',
            error ? 'border-[var(--color-error-500)] focus:ring-[var(--color-error-500)] focus:border-[var(--color-error-500)]' : 'border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)]',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          {...props}
        />
        {error && <p id={`${id}-error`} className="text-sm text-[var(--color-error-500)]" role="alert">{error}</p>}
        {helperText && !error && <p id={`${id}-helper`} className="text-sm text-[var(--color-neutral-500)]">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
