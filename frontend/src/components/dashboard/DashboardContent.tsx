import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface DashboardContentProps extends HTMLAttributes<HTMLDivElement> {
  loading?: boolean;
  empty?: boolean;
  error?: string | null;
  skeleton?: ReactNode;
  emptyState?: ReactNode;
  errorState?: ReactNode;
  onRetry?: () => void;
  children?: ReactNode;
}

export function DashboardContent({
  loading, empty, error, skeleton, emptyState, errorState, onRetry, children, className, ...props
}: DashboardContentProps) {
  return (
    <div className={cn('flex-1 overflow-auto', className)} {...props}>
      <div className="mx-auto w-full max-w-7xl p-4 lg:p-6">
        {loading ? (
          skeleton || (
            <div className="space-y-4">
              <div className="skeleton h-8 w-56" />
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
          )
        ) : error ? (
          errorState || (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
              <h3 className="mb-1 text-base font-medium text-foreground">Something went wrong</h3>
              <p className="mb-6 max-w-sm text-sm text-muted-foreground">{error}</p>
              {onRetry && (
                <button onClick={onRetry} className="btn-wine inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
                  <RefreshCw className="h-4 w-4" /> Try again
                </button>
              )}
            </div>
          )
        ) : empty ? (
          emptyState || (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <h3 className="mb-1 text-base font-medium text-foreground">No data yet</h3>
              <p className="max-w-sm text-sm text-muted-foreground">Data will appear here once available.</p>
            </div>
          )
        ) : (
          children
        )}
      </div>
    </div>
  );
}
