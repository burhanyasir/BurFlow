import { type HTMLAttributes } from 'react';
import { cn } from '../../../utils/cn';
import { DashboardChartCard } from '../DashboardChartCard';
import { Activity, Brain, TrendingUp, BarChart3 } from 'lucide-react';

export interface AiHealthMetric {
  label: string;
  value: number;
  max?: number;
  variant: 'success' | 'warning' | 'error' | 'default';
}

export interface DashboardAiHealthSectionProps extends HTMLAttributes<HTMLDivElement> {
  score: number;
  metrics?: AiHealthMetric[];
  loading?: boolean;
  empty?: boolean;
}

const variantColors = {
  success: { text: 'text-success', bar: 'bg-success', glow: 'shadow-success/30' },
  warning: { text: 'text-warning', bar: 'bg-warning', glow: 'shadow-warning/30' },
  error: { text: 'text-destructive', bar: 'bg-destructive', glow: 'shadow-destructive/30' },
  default: { text: 'text-muted-foreground', bar: 'bg-muted', glow: 'shadow-muted/30' },
};

const scoreMeta = (s: number) =>
  s >= 70 ? { label: 'Healthy', variant: 'success' as const }
    : s >= 40 ? { label: 'Needs attention', variant: 'warning' as const }
    : { label: 'Critical', variant: 'error' as const };

export function DashboardAiHealthSection({ score, metrics, loading, empty, className, ...props }: DashboardAiHealthSectionProps) {
  const meta = scoreMeta(score);
  const c = variantColors[meta.variant];

  return (
    <DashboardChartCard title="AI Health" subtitle={loading ? undefined : meta.label} loading={loading} empty={empty} className={cn('h-full', className)} {...props}>
      <div className="flex flex-col items-center py-4">
        {/* Ring gauge */}
        <div className="relative mb-4 flex h-28 w-28 items-center justify-center">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="oklch(1 0 0 / 0.06)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke={c.bar.includes('success') ? 'oklch(0.72 0.1 165)' : c.bar.includes('warning') ? 'oklch(0.78 0.1 80)' : 'oklch(0.58 0.16 25)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 326.7} 326.7`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className={cn('text-3xl font-bold tabular-nums', c.text)}>{score}</span>
        </div>

        {/* Sub-metrics */}
        {metrics && metrics.length > 0 && (
          <div className="w-full space-y-2.5">
            {metrics.map((m) => {
              const mc = variantColors[m.variant];
              const pct = m.max ? Math.round((m.value / m.max) * 100) : 0;
              return (
                <div key={m.label} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-muted-foreground">{m.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', mc.bar)}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className={cn('w-8 text-right text-xs tabular-nums font-medium', mc.text)}>{m.value}{m.max ? `/${m.max}` : '%'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardChartCard>
  );
}
