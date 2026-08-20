import { type HTMLAttributes, useMemo } from 'react';
import { DashboardActivityPanel, type ActivityItem } from '../DashboardActivityPanel';
import { MessageSquare, AlertCircle, TrendingUp, UserCheck } from 'lucide-react';

export interface SessionBrief {
  sessionId: string;
  persona: string;
  funnelStage: string;
  buyingIntentDetected: boolean;
  createdAt: string;
  stateMachine: string;
}

export interface DashboardActivityTimelineSectionProps extends HTMLAttributes<HTMLDivElement> {
  sessions: SessionBrief[];
  loading?: boolean;
  empty?: boolean;
  maxItems?: number;
  onSessionClick?: (sessionId: string) => void;
  onViewAll?: () => void;
}

export function DashboardActivityTimelineSection({
  sessions, loading, empty, maxItems = 5, onSessionClick, onViewAll, className, ...props
}: DashboardActivityTimelineSectionProps) {
  const items: ActivityItem[] = useMemo(() => {
    const personaIcon = (p: string) => {
      const map: Record<string, typeof MessageSquare> = {
        developer: MessageSquare,
        enterprise: UserCheck,
        startup: TrendingUp,
        ecommerce: AlertCircle,
      };
      const Icon = map[p] || MessageSquare;
      return <Icon className="h-3.5 w-3.5" />;
    };
    return sessions.slice(0, maxItems).map((s) => ({
      id: s.sessionId,
      icon: personaIcon(s.persona),
      title: `${s.persona} — ${s.funnelStage}`,
      description: s.buyingIntentDetected ? 'Buying intent detected' : undefined,
      timestamp: s.createdAt,
      onClick: () => onSessionClick?.(s.sessionId),
      variant: s.buyingIntentDetected ? 'success' as const : 'default' as const,
    }));
  }, [sessions, maxItems, onSessionClick]);

  return (
    <DashboardActivityPanel
      title="Recent Activity"
      items={items}
      loading={loading}
      maxItems={maxItems}
      onViewAll={onViewAll}
      emptyState={empty ? (
        <div className="flex h-24 items-center justify-center">
          <p className="text-sm text-muted-foreground">No recent conversations</p>
        </div>
      ) : undefined}
      className={className}
      {...props}
    />
  );
}
