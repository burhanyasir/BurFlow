import { cn } from '../../utils/cn';
import { type ComponentSize, type FeedbackVariant } from '../../types';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: FeedbackVariant | 'neutral' | 'primary';
  size?: ComponentSize;
  className?: string;
}

const badgeVariants: Record<string, string> = {
  success: 'bg-[var(--color-success-500)] text-white',
  warning: 'bg-[var(--color-warning-500)] text-white',
  error: 'bg-[var(--color-error-500)] text-white',
  info: 'bg-[var(--color-accent-600)] text-white',
  neutral: 'bg-[var(--color-neutral-200)] text-[var(--color-neutral-700)]',
  primary: 'bg-[var(--color-accent-600)] text-white'
};

const badgeSizes: Record<ComponentSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-sm',
  lg: 'px-2.5 py-1 text-sm'
};

export function Badge({ children, variant = 'neutral', size = 'md', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center font-medium rounded-full', badgeVariants[variant], badgeSizes[size], className)}>
      {children}
    </span>
  );
}
