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
  default: 'bg-[#5865F2]',
  success: 'bg-[#10B981]',
  warning: 'bg-[#FFB800]',
  danger: 'bg-[#EF4444]'
};

const sizeStyles = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

export function Progress({ value, max = 100, variant = 'default', size = 'md', showLabel, className }: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('flex-1 bg-[#F0F1F3] rounded-full overflow-hidden', sizeStyles[size])} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className={cn('h-full rounded-full transition-all duration-300', variantStyles[variant])} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-sm text-[#5F6570] shrink-0">{Math.round(pct)}%</span>}
    </div>
  );
}
