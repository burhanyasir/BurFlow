import { type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface DashboardLoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'spinner' | 'skeleton' | 'pulse';
  label?: string;
}

export function DashboardLoadingState({ variant = 'skeleton', label, className, ...props }: DashboardLoadingStateProps) {
  if (variant === 'spinner') {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)} {...props}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-wine" />
        {label && <p className="mt-3 text-sm text-muted-foreground">{label}</p>}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)} {...props}>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '120ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '240ms' }} />
        </div>
        {label && <p className="mt-3 text-sm text-muted-foreground">{label}</p>}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)} {...props}>
      <div className="skeleton h-7 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    </div>
  );
}
