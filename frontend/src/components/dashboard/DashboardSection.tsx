import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface DashboardSectionProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: ReactNode;
  variant?: 'default' | 'card';
}

export function DashboardSection({
  title, description, actions, variant = 'default', children, className, ...props
}: DashboardSectionProps) {
  return (
    <section className={cn(
      variant === 'card' && 'glass rounded-2xl p-5',
      className,
    )} {...props}>
      {(title || actions) && (
        <div className={cn('mb-4 flex items-baseline justify-between gap-4', variant === 'default' ? '' : '')}>
          <div>
            {title && <h2 className="text-[15px] font-medium text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
