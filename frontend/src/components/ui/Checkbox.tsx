import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="inline-flex items-center gap-2.5 cursor-pointer group">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className={cn(
              'h-4 w-4 rounded border-[var(--color-neutral-200)] text-[var(--color-accent-600)] focus:ring-2 focus:ring-[var(--color-accent-600)] focus:ring-offset-1 cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />
          {label && <span className="text-sm text-[var(--color-neutral-900)] select-none">{label}</span>}
        </label>
        {error && <p className="text-sm text-[var(--color-error-500)]" role="alert">{error}</p>}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';
