import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import { DashboardMetricGrid } from '../DashboardMetricGrid';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricCardData {
  id: string;
  icon?: ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' };
  variant?: 'default' | 'success' | 'warning' | 'error';
  onClick?: () => void;
}

export interface DashboardKpiSectionProps extends HTMLAttributes<HTMLDivElement> {
  metrics: MetricCardData[];
  columns?: 2 | 3 | 4 | 5 | 6;
  loading?: boolean;
}

function KpiCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <div className="skeleton h-9 w-9 rounded-xl" />
      <div className="skeleton h-8 w-24" />
      <div className="skeleton h-3 w-20" />
    </div>
  );
}

export function DashboardKpiSection({ metrics, columns = 4, loading, className, ...props }: DashboardKpiSectionProps) {
  if (loading) {
    return (
      <DashboardMetricGrid columns={columns} className={className} {...props}>
        {Array.from({ length: columns }).map((_, i) => <KpiCardSkeleton key={i} />)}
      </DashboardMetricGrid>
    );
  }

  return (
    <DashboardMetricGrid columns={columns} className={className} {...props}>
      {metrics.map((m) => {
        const variantStyles = {
          default: 'bg-wine/[0.1] text-wine',
          success: 'bg-success/[0.1] text-success',
          warning: 'bg-warning/[0.1] text-warning',
          error: 'bg-destructive/[0.1] text-destructive',
        };
        const TrendIcon = m.trend?.direction === 'up' ? TrendingUp : m.trend?.direction === 'down' ? TrendingDown : Minus;
        const trendColor = m.trend?.direction === 'up'
          ? 'text-success'
          : m.trend?.direction === 'down'
          ? 'text-destructive'
          : 'text-muted-foreground';
        return (
          <div
            key={m.id}
            onClick={m.onClick}
            className={cn(
              'glass rounded-2xl p-5 transition duration-300',
              m.onClick && 'cursor-pointer hover:-translate-y-0.5 hover:border-border-strong',
            )}
          >
            <div className="flex items-start justify-between">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl text-base', variantStyles[m.variant || 'default'])}>
                {m.icon}
              </div>
              {m.trend && (
                <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', trendColor)}>
                  <TrendIcon className="h-3 w-3" /> {m.trend.value}%
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground tabular-nums">{m.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{m.label}</p>
          </div>
        );
      })}
    </DashboardMetricGrid>
  );
}
