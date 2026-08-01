import { type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface DashboardErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function DashboardErrorState({ message = 'Something went wrong', onRetry, compact = false, className, ...props }: DashboardErrorStateProps) {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.04] px-4 py-3', className)} {...props}>
        <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
        <p className="flex-1 text-sm text-foreground/80">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="shrink-0 rounded-lg border border-hairline px-2.5 py-1 text-xs transition hover:bg-white/[0.04]" aria-label="Retry">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)} {...props}>
      <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
      <h3 className="mb-1 text-base font-medium text-foreground">Failed to load</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-wine inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      )}
    </div>
  );
}
