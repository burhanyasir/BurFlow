import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'premium';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[rgba(31,157,107,0.12)] text-[#3DDC97] border border-[rgba(31,157,107,0.2)]',
  warning: 'bg-[rgba(199,126,31,0.12)] text-[#F5B454] border border-[rgba(199,126,31,0.2)]',
  error: 'bg-[rgba(201,59,59,0.12)] text-[#F26D6D] border border-[rgba(201,59,59,0.2)]',
  info: 'bg-[rgba(58,111,240,0.12)] text-[#6E96F5] border border-[rgba(58,111,240,0.2)]',
  neutral: 'bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.1)]',
  premium: 'bg-[rgba(168,36,75,0.15)] text-[#C94F72] border border-[rgba(168,36,75,0.25)]',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[11px] rounded-[var(--radius-sm)]',
  md: 'px-2.5 py-1 text-xs rounded-[var(--radius-sm)]',
};

export function Badge({ children, variant = 'neutral', size = 'sm', className, dot }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-medium', variantStyles[variant], sizeStyles[size], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
