import { cn } from '../../utils/cn';
import { type ComponentSize, type FeedbackVariant } from '../../types';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: FeedbackVariant | 'neutral' | 'primary';
  size?: ComponentSize;
  className?: string;
}

const badgeVariants: Record<string, string> = {
  success: 'bg-[#D1FAE5] text-[#065F46]',
  warning: 'bg-[#FFF8E0] text-[#92400E]',
  error: 'bg-[#FEE2E2] text-[#991B1B]',
  info: 'bg-[#DBEAFE] text-[#1E40AF]',
  neutral: 'bg-[#F0F1F3] text-[#5F6570]',
  primary: 'bg-[#E8EAFF] text-[#3B45A0]'
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
