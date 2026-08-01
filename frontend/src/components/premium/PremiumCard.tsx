import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface PremiumCardProps {
  children: ReactNode;
  variant?: 'glass' | 'elevated' | 'flat' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  className?: string;
  onClick?: () => void;
}

const variantStyles = {
  glass: 'bg-[rgba(18,18,24,0.65)] backdrop-blur-[28px] saturate-[160%] border border-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_64px_rgba(0,0,0,0.6)]',
  elevated: 'bg-[rgba(22,22,30,0.7)] border border-[rgba(255,255,255,0.07)] shadow-[0_12px_32px_rgba(0,0,0,0.4)]',
  flat: 'bg-[rgba(18,18,24,0.4)] border border-[rgba(255,255,255,0.04)]',
  bordered: 'bg-transparent border-2 border-[rgba(255,255,255,0.1)]',
};

const paddingStyles = { none: '', sm: 'p-3 md:p-4', md: 'p-4 md:p-5', lg: 'p-5 md:p-7' };

export function PremiumCard({ children, variant = 'glass', padding = 'md', hoverable, className, onClick }: PremiumCardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] transition-all duration-[var(--motion-functional)] ease-[var(--motion-ease-out)]',
        variantStyles[variant],
        hoverable && 'cursor-pointer hover:bg-[rgba(28,28,38,0.7)] hover:border-[rgba(201,79,114,0.3)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_20px_48px_rgba(138,21,56,0.18)] hover:-translate-y-[2px]',
        paddingStyles[padding],
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {children}
    </div>
  );
}

export function PremiumCardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-between mb-3', className)}>{children}</div>;
}

export function PremiumCardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-sm font-semibold text-[rgba(255,255,255,0.9)]', className)}>{children}</h3>;
}

export function PremiumCardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(className)}>{children}</div>;
}
