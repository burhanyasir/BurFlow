import { cn } from '../../utils/cn';
import { type ComponentSize, type FeedbackVariant } from '../../types';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: FeedbackVariant | 'neutral' | 'primary' | 'danger' | 'error' | 'default';
  size?: ComponentSize;
  className?: string;
  dot?: boolean;
  onClick?: () => void;
}

const badgeVariants: Record<string, string> = {
  success: 'bg-[var(--color-success-500)] text-white',
  warning: 'bg-[var(--color-warning-500)] text-white',
  error: 'bg-[var(--color-error-500)] text-white',
  danger: 'bg-[var(--color-error-500)] text-white',
  info: 'bg-[var(--color-accent-600)] text-white',
  neutral: 'bg-[var(--color-neutral-200)] text-[var(--color-neutral-700)]',
  primary: 'bg-[var(--color-accent-600)] text-white',
  default: 'bg-[var(--color-neutral-200)] text-[var(--color-neutral-700)]'
};

const badgeSizes: Record<ComponentSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-sm',
  lg: 'px-2.5 py-1 text-sm'
};

export function Badge({ children, variant = 'neutral', size = 'md', className, dot, onClick }: BadgeProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        badgeVariants[variant] || badgeVariants.neutral,
        badgeSizes[size],
        onClick && 'cursor-pointer hover:opacity-90',
        className
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
      {children}
    </span>
  );
}
