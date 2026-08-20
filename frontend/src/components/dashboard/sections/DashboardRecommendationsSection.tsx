import { type HTMLAttributes } from 'react';
import { cn } from '../../../utils/cn';
import { DashboardChartCard } from '../DashboardChartCard';
import { AlertCircle, Lightbulb, ArrowRight } from 'lucide-react';

export interface Recommendation {
  id: string;
  message: string;
  href?: string;
  onClick?: () => void;
  severity: 'info' | 'warning' | 'error';
}

export interface DashboardRecommendationsSectionProps extends HTMLAttributes<HTMLDivElement> {
  recommendations: Recommendation[];
  loading?: boolean;
  empty?: boolean;
}

const severityMeta = {
  info: { icon: Lightbulb, border: 'border-border', bg: 'bg-white/[0.02]', dot: 'bg-wine' },
  warning: { icon: AlertCircle, border: 'border-warning/20', bg: 'bg-warning/[0.04]', dot: 'bg-warning' },
  error: { icon: AlertCircle, border: 'border-destructive/20', bg: 'bg-destructive/[0.04]', dot: 'bg-destructive' },
};

export function DashboardRecommendationsSection({ recommendations, loading, empty, className, ...props }: DashboardRecommendationsSectionProps) {
  return (
    <DashboardChartCard title="Recommendations" subtitle={loading ? undefined : `${recommendations.length} active`} loading={loading} empty={empty} className={cn('h-full', className)} {...props}>
      {recommendations.length === 0 ? (
        <div className="flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Lightbulb className="h-4 w-4" /> All clear
        </div>
      ) : (
        <div className="space-y-2">
          {recommendations.map((r) => {
            const meta = severityMeta[r.severity];
            return (
              <div
                key={r.id}
                onClick={r.onClick}
                className={cn(
                  'group flex items-center gap-3 rounded-xl border p-3 transition cursor-pointer',
                  meta.border, meta.bg, 'hover:bg-white/[0.04]',
                )}
              >
                <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
                <p className="flex-1 text-sm text-foreground/80">{r.message}</p>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </div>
            );
          })}
        </div>
      )}
    </DashboardChartCard>
  );
}
