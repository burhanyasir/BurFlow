import { forwardRef, type SelectHTMLAttributes, useId } from 'react';
import { cn } from '../../utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label htmlFor={id} className="text-sm font-medium text-[var(--color-neutral-900)]">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={cn(
              'h-10 w-full rounded-lg border bg-white px-3 pr-8 text-sm text-[var(--color-neutral-900)] appearance-none cursor-pointer transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)] focus:border-[var(--color-accent-600)]',
              'disabled:opacity-50 disabled:bg-[var(--color-neutral-50)] disabled:cursor-not-allowed',
              error ? 'border-[var(--color-error-500)]' : 'border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)]',
              className
            )}
            aria-invalid={!!error}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-neutral-500)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        {error && <p className="text-sm text-[var(--color-error-500)]" role="alert">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
