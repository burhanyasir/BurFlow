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
  success: 'bg-success/[0.12] text-success border border-success/20',
  warning: 'bg-warning/[0.12] text-warning border border-warning/20',
  error: 'bg-destructive/[0.12] text-destructive border border-destructive/20',
  info: 'bg-wine/[0.12] text-wine border border-wine/20',
  neutral: 'bg-white/[0.06] text-muted-foreground border border-hairline',
  premium: 'bg-wine/[0.15] text-wine border border-wine/25',
};

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-[10px] rounded-md',
  md: 'px-2 py-1 text-xs rounded-lg',
};

export function Badge({ children, variant = 'neutral', size = 'sm', className, dot }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-medium', variantStyles[variant], sizeStyles[size], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
