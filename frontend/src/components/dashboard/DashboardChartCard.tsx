import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface DashboardChartCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyState?: ReactNode;
  variant?: 'glass' | 'glass-strong' | 'glass-card';
}

export function DashboardChartCard({
  title, subtitle, action, loading, empty, emptyState, variant = 'glass-card', children, className, ...props
}: DashboardChartCardProps) {
  return (
    <div className={cn(
      variant === 'glass' ? 'glass rounded-2xl' : variant === 'glass-strong' ? 'glass-strong rounded-2xl' : 'glass-card',
      'p-5',
      className,
    )} {...props}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-medium text-foreground">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-32 w-full rounded-xl" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      ) : empty ? (
        emptyState || (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">No data available</p>
          </div>
        )
      ) : (
        children
      )}
    </div>
  );
}
