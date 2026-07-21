import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import { cn } from '../../utils/cn';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    return (
      <label htmlFor={id} className="inline-flex items-center gap-2.5 cursor-pointer group">
        <input
          ref={ref}
          type="radio"
          id={id}
          className={cn(
            'h-4 w-4 border-[#D0D5DD] text-[#5865F2] focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-1 cursor-pointer',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {label && <span className="text-sm text-[#0B0C10] select-none">{label}</span>}
      </label>
    );
  }
);
Radio.displayName = 'Radio';

export interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  label?: string;
  error?: string;
  className?: string;
}

export function RadioGroup({ name, value, onChange, options, label, error, className }: RadioGroupProps) {
  return (
    <fieldset className={cn('flex flex-col gap-2', className)}>
      {label && <legend className="text-sm font-medium text-[#0B0C10] mb-1">{label}</legend>}
      {options.map(opt => (
        <Radio
          key={opt.value}
          name={name}
          value={opt.value}
          checked={value === opt.value}
          onChange={() => onChange(opt.value)}
          label={opt.label}
          disabled={opt.disabled}
        />
      ))}
      {error && <p className="text-sm text-[#EF4444]" role="alert">{error}</p>}
    </fieldset>
  );
}
