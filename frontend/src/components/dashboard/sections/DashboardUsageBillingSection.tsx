import { type HTMLAttributes } from 'react';
import { cn } from '../../../utils/cn';
import { DashboardChartCard } from '../DashboardChartCard';
import { Zap, BarChart3, CalendarDays } from 'lucide-react';

export interface PlanInfo {
  name: string;
  onTrial?: boolean;
  usageThisMonth: number;
  usageLimit: number;
  periodStart?: string;
  periodEnd?: string;
}

export interface DashboardUsageBillingSectionProps extends HTMLAttributes<HTMLDivElement> {
  plan: PlanInfo;
  totalConversations?: number;
  avgConfidence?: number;
  resolutionRate?: number;
  loading?: boolean;
  empty?: boolean;
  onUpgrade?: () => void;
  onBilling?: () => void;
}

export function DashboardUsageBillingSection({
  plan, totalConversations, avgConfidence, resolutionRate, loading, empty, onUpgrade, onBilling, className, ...props
}: DashboardUsageBillingSectionProps) {
  const usagePct = plan.usageLimit > 0 ? Math.round((plan.usageThisMonth / plan.usageLimit) * 100) : 0;

  return (
    <DashboardChartCard title="Usage & Billing" subtitle={plan.name} loading={loading} empty={empty} className={cn('h-full', className)} {...props}>
      <div className="space-y-4">
        {/* Usage bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <Zap className="mr-1 inline h-3 w-3" />
              Monthly usage
            </span>
            <span className={cn('font-medium tabular-nums', usagePct >= 90 ? 'text-destructive' : usagePct >= 75 ? 'text-warning' : 'text-foreground/80')}>
              {plan.usageThisMonth.toLocaleString()} / {plan.usageLimit.toLocaleString()}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn('h-full rounded-full transition-all duration-500', usagePct >= 90 ? 'bg-destructive' : usagePct >= 75 ? 'bg-warning' : 'bg-wine')}
              style={{ width: `${Math.min(usagePct, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">{usagePct}% consumed</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/[0.03] p-3 text-center">
            <BarChart3 className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-bold tabular-nums text-foreground">{totalConversations ?? '—'}</p>
            <p className="text-[10px] text-muted-foreground">Conversations</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-3 text-center">
            <Zap className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-bold tabular-nums text-foreground">{avgConfidence != null ? `${avgConfidence}%` : '—'}</p>
            <p className="text-[10px] text-muted-foreground">Confidence</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-3 text-center">
            <CalendarDays className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-bold tabular-nums text-foreground">{resolutionRate != null ? `${resolutionRate}%` : '—'}</p>
            <p className="text-[10px] text-muted-foreground">Resolution</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {plan.onTrial && onUpgrade && (
            <button onClick={onUpgrade} className="btn-wine flex-1 rounded-xl py-2 text-xs font-medium text-center">
              Upgrade plan
            </button>
          )}
          {onBilling && (
            <button onClick={onBilling} className="flex-1 rounded-xl border border-hairline py-2 text-xs text-foreground transition hover:bg-white/[0.04] text-center">
              View billing
            </button>
          )}
        </div>
      </div>
    </DashboardChartCard>
  );
}
