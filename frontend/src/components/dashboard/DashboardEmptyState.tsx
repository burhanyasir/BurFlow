import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { Inbox } from 'lucide-react';

export interface DashboardEmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export function DashboardEmptyState({ icon, title, description, primaryAction, secondaryAction, className, ...props }: DashboardEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)} {...props}>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-hairline bg-white/[0.03]">
        {icon || <Inbox className="h-6 w-6 text-muted-foreground" />}
      </div>
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3">
          {primaryAction && (
            <button onClick={primaryAction.onClick} className="btn-wine rounded-xl px-4 py-2 text-sm font-medium">
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button onClick={secondaryAction.onClick} className="rounded-xl border border-hairline px-4 py-2 text-sm text-foreground transition hover:bg-white/[0.04]">
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
