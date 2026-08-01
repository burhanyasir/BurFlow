import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface ActivityItem {
  id: string;
  icon?: ReactNode;
  title: string;
  description?: string;
  timestamp: string | Date;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export interface DashboardActivityPanelProps extends HTMLAttributes<HTMLDivElement> {
  items: ActivityItem[];
  title?: string;
  maxItems?: number;
  loading?: boolean;
  emptyState?: ReactNode;
  onViewAll?: () => void;
}

const dotColors = {
  default: 'bg-muted-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
};

export function DashboardActivityPanel({
  items, title, maxItems = 10, loading, emptyState, onViewAll, className, ...props
}: DashboardActivityPanelProps) {
  const displayItems = items.slice(0, maxItems);

  return (
    <div className={cn('glass rounded-2xl p-5', className)} {...props}>
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {onViewAll && items.length > maxItems && (
            <button onClick={onViewAll} className="text-xs text-muted-foreground transition hover:text-foreground">
              View all
            </button>
          )}
        </div>
      )}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="skeleton h-6 w-6 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3 w-3/4" />
                <div className="skeleton h-2 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        emptyState || (
          <div className="flex h-24 items-center justify-center">
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        )
      ) : (
        <div className="space-y-0">
          {displayItems.map((item, i) => (
            <div
              key={item.id}
              onClick={item.onClick}
              className={cn(
                'flex items-start gap-3 py-2.5 transition',
                i < displayItems.length - 1 && 'border-b border-hairline',
                item.onClick && 'cursor-pointer hover:bg-white/[0.02]',
              )}
            >
              {item.icon || (
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotColors[item.variant || 'default'])} />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground/90">{item.title}</div>
                {item.description && <div className="mt-0.5 text-xs text-muted-foreground">{item.description}</div>}
              </div>
              <time className="shrink-0 text-xs text-muted-foreground">
                {typeof item.timestamp === 'string' ? item.timestamp : item.timestamp.toLocaleDateString()}
              </time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
