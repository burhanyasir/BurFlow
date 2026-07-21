import { forwardRef, type TextareaHTMLAttributes, useId } from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label htmlFor={id} className="text-sm font-medium text-[#0B0C10]">{label}</label>}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#0B0C10] placeholder:text-[#A0A5B0] transition-colors duration-150 resize-y min-h-[80px]',
            'focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-0 focus:border-[#5865F2]',
            'disabled:opacity-50 disabled:bg-[#F0F1F3] disabled:cursor-not-allowed',
            error ? 'border-[#EF4444] focus:ring-[#EF4444] focus:border-[#EF4444]' : 'border-[#D0D5DD] hover:border-[#A0A5B0]',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          {...props}
        />
        {error && <p id={`${id}-error`} className="text-sm text-[#EF4444]" role="alert">{error}</p>}
        {helperText && !error && <p id={`${id}-helper`} className="text-sm text-[#5F6570]">{helperText}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
