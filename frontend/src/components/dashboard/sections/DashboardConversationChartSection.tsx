import { type HTMLAttributes, useMemo } from 'react';
import { DashboardChartCard } from '../DashboardChartCard';

export interface DailySeries {
  date: string;
  value: number;
}

export interface DashboardConversationChartSectionProps extends HTMLAttributes<HTMLDivElement> {
  data: DailySeries[];
  label?: string;
  loading?: boolean;
  empty?: boolean;
  height?: number;
  barColor?: string;
}

export function DashboardConversationChartSection({
  data, label = 'Last 7 Days', loading, empty, height = 160, barColor, className, ...props
}: DashboardConversationChartSectionProps) {
  const max = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);
  const days = useMemo(() => data.map((d) => new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })), [data]);

  return (
    <DashboardChartCard
      title="Conversations"
      subtitle={label}
      loading={loading}
      empty={empty}
      className={className}
      {...props}
    >
      <div className="flex items-end justify-between gap-1.5" style={{ height }} aria-label="Conversations per day">
        {data.map((d, i) => (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground">{d.value}</span>
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{
                height: `${(d.value / max) * 100}%`,
                minHeight: d.value > 0 ? '4px' : '0',
                background: barColor || 'linear-gradient(180deg, var(--wine), oklch(0.42 0.15 15 / 0.5))',
              }}
              aria-label={`${days[i]}: ${d.value}`}
            />
            <span className="text-[10px] text-muted-foreground/60">{days[i]}</span>
          </div>
        ))}
      </div>
    </DashboardChartCard>
  );
}
