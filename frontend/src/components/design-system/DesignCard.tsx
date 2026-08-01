import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface DesignCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'glass-strong' | 'glass-card' | 'default';
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  halo?: boolean;
}

const variantStyles = {
  glass: 'glass rounded-2xl',
  'glass-strong': 'glass-strong rounded-2xl',
  'glass-card': 'glass-card',
  default: 'bg-surface/40 border border-border rounded-2xl backdrop-blur-xl',
};

const paddingStyles = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export const DesignCard = forwardRef<HTMLDivElement, DesignCardProps>(
  ({ className, variant = 'glass-card', padding = 'md', hoverable = true, halo = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        variantStyles[variant],
        paddingStyles[padding],
        hoverable && !variant.startsWith('glass-card') && 'transition duration-300 hover:-translate-y-0.5 hover:border-border-strong',
        halo && 'halo',
        'rise',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
DesignCard.displayName = 'DesignCard';

export function DesignCardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex items-baseline justify-between', className)} {...props}>
      {children}
    </div>
  );
}

export function DesignCardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-[13px] font-medium tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}

export function DesignCardMeta({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('text-[11px] text-subtle', className)} {...props}>
      {children}
    </span>
  );
}
