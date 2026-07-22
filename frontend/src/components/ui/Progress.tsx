import { cn } from '../../utils/cn';

export interface ProgressProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const variantStyles = {
  default: 'bg-[var(--color-accent-600)]',
  success: 'bg-[var(--color-success-500)]',
  warning: 'bg-[var(--color-warning-500)]',
  danger: 'bg-[var(--color-error-500)]'
};

const sizeStyles = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

export function Progress({ value, max = 100, variant = 'default', size = 'md', showLabel, className }: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('flex-1 bg-[var(--color-neutral-50)] rounded-full overflow-hidden', sizeStyles[size])} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className={cn('h-full rounded-full transition-all duration-300', variantStyles[variant])} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-sm text-[var(--color-neutral-500)] shrink-0">{Math.round(pct)}%</span>}
    </div>
  );
}
