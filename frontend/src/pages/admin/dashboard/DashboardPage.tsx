import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Heart,
  MessageSquare,
  Rocket,
  Star,
  Target,
  TrendingUp,
  Upload,
  Zap,
} from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard';
import { PageHead, DashButton, Panel, StatCard, EmptyState } from '../../../components/dash/ui';
import { useAuth } from '../../../lib/auth-context';
import { useSessions, useAnalytics } from '../../../hooks/useConversationIntelligence';
import { useOnboarding } from '../../../hooks/useOnboarding';
import { fetchWithAuth } from '../../../lib/api-client';
import { cn } from '../../../utils/cn';

function formatDate(value?: string) {
  if (!value) return 'Not set yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set yet';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface KnowledgeSource {
  name: string;
  citationCount: number;
  status: 'indexed' | 'failed' | 'processing';
}

interface TopicStat {
  topic: string;
  count: number;
  percentage: number;
}

interface Recommendation {
  id: string;
  message: string;
  href: string;
  severity: 'info' | 'warning' | 'error';
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toDateString());
  }
  return days;
}

function countByDay(sessions: { createdAt: string }[], days: string[]): number[] {
  return days.map(day => sessions.filter(s => new Date(s.createdAt).toDateString() === day).length);
}

function avgConfidenceByDay(sessions: any[], days: string[]): number[] {
  return days.map(day => {
    const daySessions = sessions.filter(s => new Date(s.createdAt).toDateString() === day);
    if (daySessions.length === 0) return 0;
    return Math.round(daySessions.reduce((sum: number, s: any) => sum + (s.confidence || 0), 0) / daySessions.length);
  });
}

function BarChart({ data, label, max, height = 120 }: { data: number[]; label: string; max: number; height?: number }) {
  if (max === 0) max = 1;
  return (
    <div className="flex items-end justify-between gap-1.5" style={{ height }} aria-label={label}>
      {data.map((val, i) => (
        <div
          key={i}
          className="flex-1 rounded-md bg-gradient-to-t from-primary/25 to-primary/60 transition-all duration-300"
          style={{ height: `${(val / max) * 100}%`, minHeight: val > 0 ? '4px' : '0' }}
          aria-label={`Day ${i + 1}: ${val}`}
        />
      ))}
    </div>
  );
}

function ProgressIndicators({ data, days }: { data: number[]; days: string[] }) {
  return (
    <div className="space-y-2.5" aria-label="Confidence trend per day">
      {data.map((val, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="w-8 shrink-0 text-[11px] text-muted-foreground">{days[i].slice(0, 3)}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                val >= 70 ? 'bg-success' : val >= 40 ? 'bg-warning-500' : 'bg-error-500',
              )}
              style={{ width: `${val}%` }}
              aria-label={`${days[i].slice(0, 3)}: ${val}% confidence`}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{val}%</span>
        </div>
      ))}
    </div>
  );
}

function RecommendationRow({ recommendation, onClick }: { recommendation: Recommendation; onClick: () => void }) {
  const colors = {
    info: 'bg-ember-soft text-foreground',
    warning: 'bg-warning-300/25 text-foreground',
    error: 'bg-error-300/25 text-foreground',
  };
  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl border border-hairline p-3 transition-all duration-200 hover:-translate-y-px hover:shadow-soft',
        colors[recommendation.severity],
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Recommendation: ${recommendation.message}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <p className="text-sm">{recommendation.message}</p>
      <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}

function SetupStep({ done, label, to, onNavigate, index }: { done: boolean; label: string; to: string; onNavigate: (to: string) => void; index: number }) {
  return (
    <button
      onClick={() => onNavigate(to)}
      className="flex w-full items-center gap-3 rounded-xl border border-hairline bg-surface-2/60 px-4 py-3 text-left transition hover:-translate-y-px hover:shadow-soft"
    >
      {done ? (
        <CheckCircle2 className="size-5 shrink-0 text-success" />
      ) : (
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ember-soft text-[11px] font-bold text-foreground">
          {index + 1}
        </span>
      )}
      <span className={cn('text-sm font-medium', done ? 'text-muted-foreground line-through' : 'text-foreground')}>
        {label}
      </span>
      {!done && <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground" />}
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, tenant } = useAuth();
  const { data: analyticsData, loading: analyticsLoading } = useAnalytics();
  const { data: sessionsData, loading: sessionsLoading } = useSessions(200, 0);
  const { progress, dashboard, loading: onboardingLoading } = useOnboarding();

  const [monitoring, setMonitoring] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadExternal = useCallback(async () => {
    try {
      const [monRes, subRes] = await Promise.allSettled([
        fetchWithAuth('/api/admin/knowledge/monitoring'),
        fetchWithAuth('/api/billing/current'),
      ]);
      if (monRes.status === 'fulfilled') {
        const body = await monRes.value.json();
        setMonitoring(body);
      }
      if (subRes.status === 'fulfilled') {
        const body = await subRes.value.json();
        setSubscription(body);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadExternal(); }, [loadExternal]);

  const isBusy = loading || analyticsLoading || sessionsLoading || onboardingLoading;

  const sessions = sessionsData?.sessions || [];
  const totalSessions = sessionsData?.total || 0;

  const avgConfidence = useMemo(() => {
    if (sessions.length === 0) return 0;
    return Math.round(sessions.reduce((sum, s: any) => sum + (s.confidence || 0), 0) / sessions.length);
  }, [sessions]);

  // qualificationCompletionRate is already a 0-100 percentage (matches the
  // AnalyticsResponse contract); multiplying by 100 inflated it 100x.
  const resolutionRate = analyticsData ? Math.round(analyticsData.qualificationCompletionRate || 0) : 0;

  const indexedDocs = monitoring?.indexedDocuments || 0;
  const totalDocs = monitoring?.totalDocuments || 0;
  const knowledgeCoverage = totalDocs > 0 ? Math.round((indexedDocs / totalDocs) * 100) : indexedDocs > 0 ? 100 : 0;

  const healthScore = useMemo(() => {
    if (totalSessions === 0 && totalDocs === 0) return 0;
    const coverageWeight = totalDocs > 0 ? Math.min(knowledgeCoverage / 100, 1) * 40 : 20;
    const confidenceWeight = (avgConfidence / 100) * 30;
    const resolutionWeight = (resolutionRate / 100) * 20;
    const activityWeight = Math.min(totalSessions / 100, 1) * 10;
    return Math.round(coverageWeight + confidenceWeight + resolutionWeight + activityWeight);
  }, [totalDocs, knowledgeCoverage, avgConfidence, resolutionRate, totalSessions]);

  const usageThisMonth = subscription?.usageThisMonth ?? totalSessions;
  const usageLimit = subscription?.usageLimit ?? 1000;
  const workspaceName = subscription?.companyName || subscription?.workspaceName || tenant?.name || 'Workspace';
  const planName = subscription?.planName || 'Free';
  const planTrial = subscription?.onTrial || false;

  const last7Days = useMemo(() => getLast7Days(), []);
  const dailyCounts = useMemo(() => countByDay(sessions, last7Days), [sessions, last7Days]);
  const dailyConfidence = useMemo(() => avgConfidenceByDay(sessions, last7Days), [sessions, last7Days]);
  const maxDailyCount = Math.max(...dailyCounts, 1);

  const knowledgeSources: KnowledgeSource[] = useMemo(() => {
    if (monitoring?.documents?.length > 0) {
      return monitoring.documents.slice(0, 5).map((d: any) => ({
        name: d.name || d.filename || 'Untitled',
        citationCount: d.citationCount || 0,
        status: (d.status === 'failed' ? 'failed' : d.status === 'processing' ? 'processing' : 'indexed') as KnowledgeSource['status'],
      }));
    }
    const sources: KnowledgeSource[] = [];
    if (indexedDocs > 0) {
      sources.push({ name: `${indexedDocs} indexed documents`, citationCount: sessions.filter(s => s.hasIntel).length, status: 'indexed' });
    }
    if (monitoring?.failedDocuments > 0) {
      sources.push({ name: `${monitoring.failedDocuments} failed documents`, citationCount: 0, status: 'failed' });
    }
    return sources;
  }, [monitoring, indexedDocs, sessions]);

  const topTopics: TopicStat[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const stage = s.funnelStage || 'Unknown';
      map.set(stage, (map.get(stage) || 0) + 1);
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total = sorted.reduce((sum, [, count]) => sum + count, 0) || 1;
    return sorted.map(([topic, count]) => ({ topic, count, percentage: Math.round((count / total) * 100) }));
  }, [sessions]);

  const recommendations: Recommendation[] = useMemo(() => {
    const items: Recommendation[] = [];
    if (totalDocs < 3) {
      items.push({
        id: 'upload-docs',
        message: `Upload ${3 - totalDocs} more document${3 - totalDocs > 1 ? 's' : ''} to improve knowledge base`,
        href: '/dashboard/knowledge',
        severity: 'info',
      });
    }
    if (totalDocs > 0 && knowledgeCoverage < 50) {
      items.push({
        id: 'coverage-drop',
        message: 'Knowledge coverage dropped — review failed or missing documents',
        href: '/dashboard/knowledge',
        severity: 'warning',
      });
    }
    if (avgConfidence > 0 && avgConfidence < 60) {
      items.push({
        id: 'low-confidence',
        message: 'Low confidence detected — add more knowledge sources to improve answers',
        href: '/dashboard/analytics',
        severity: 'warning',
      });
    }
    if (dashboard?.firstUnansweredQuestion) {
      items.push({
        id: 'unanswered',
        message: `Customers asking about "${dashboard.firstUnansweredQuestion}" — add a knowledge source`,
        href: '/dashboard/unanswered',
        severity: 'error',
      });
    }
    if (items.length === 0 && totalSessions > 0) {
      items.push({
        id: 'all-clear',
        message: 'Everything looks good — no recommendations at this time',
        href: '/dashboard',
        severity: 'info',
      });
    }
    return items;
  }, [totalDocs, knowledgeCoverage, avgConfidence, dashboard, totalSessions]);

  const hasData = totalSessions > 0 || totalDocs > 0;

  const businessProfile = progress?.businessProfile as Record<string, any> | undefined;
  const businessProfileSummary = useMemo(() => {
    const industry = (businessProfile?.industry as string) || progress?.businessType || 'your market';
    const companyName = (businessProfile?.businessName as string) || workspaceName;
    const knowledgeLabel = totalDocs > 0
      ? `${totalDocs} source${totalDocs === 1 ? '' : 's'} indexed`
      : 'knowledge is still being prepared';
    const widgetLabel = dashboard?.widgetInstalled ? 'installed and ready to engage visitors' : 'pending installation';
    const conversationLabel = totalSessions > 0
      ? `${totalSessions} conversations captured`
      : 'waiting for the first visitor conversation';
    return `${companyName} has a working profile for ${industry}. ${knowledgeLabel}, the widget is ${widgetLabel}, and ${conversationLabel}.`;
  }, [dashboard?.widgetInstalled, businessProfile?.businessName, businessProfile?.industry, progress?.businessType, totalDocs, totalSessions, workspaceName]);

  const recommendedNextAction = useMemo(() => {
    if (!dashboard?.widgetInstalled) return 'Install the widget to start turning visitors into real conversations.';
    if (totalSessions === 0) return 'Let the widget engage a few visitors first, then review the first real questions it handles.';
    return 'Review the newest conversations and strengthen the knowledge base around the topics visitors ask about most.';
  }, [dashboard?.widgetInstalled, totalSessions]);

  const isOnboardingComplete = progress?.onboardingStatus === 'completed';

  const welcomeName = subscription?.contactName || user?.name?.split(' ')[0];

  return (
    <DashboardLayout>
      <PageHead
        title={welcomeName ? `Welcome back, ${welcomeName}` : 'Welcome back'}
        sub={workspaceName}
        actions={
          <>
            <span className="inline-flex items-center rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold text-foreground">
              {planTrial ? 'Trial' : planName} plan
            </span>
            <DashButton onClick={() => navigate('/dashboard/widget')}>
              <Zap className="size-4" /> Open widget
            </DashButton>
          </>
        }
      />

      {isBusy ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-36 animate-pulse rounded-2xl border border-hairline bg-surface" />
          ))}
        </div>
      ) : !hasData ? (
        <EmptyState
          icon={<MessageSquare className="size-6" />}
          title="Welcome to your Dashboard"
          body="Start by uploading knowledge sources and installing the widget. Your analytics and metrics will appear here once you have conversations."
          actions={
            <>
              <DashButton onClick={() => navigate('/dashboard/knowledge')}>
                <Upload className="size-4" /> Upload documents
              </DashButton>
              <DashButton variant="ghost" onClick={() => navigate('/dashboard/widget')}>
                Install widget
              </DashButton>
            </>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* ── AI Health + usage strip ── */}
          <Panel className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-ember-soft text-primary">
                <Activity className="size-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">AI Health score</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-2 w-40 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        healthScore >= 70 ? 'bg-success' : healthScore >= 40 ? 'bg-warning-500' : 'bg-error-500',
                      )}
                      style={{ width: `${healthScore}%` }}
                    />
                  </div>
                  <span className="font-display text-2xl font-bold tabular-nums">{healthScore}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Usage this month</p>
                <p className="mt-1 font-display text-lg font-bold tabular-nums">
                  {usageThisMonth} <span className="font-normal text-muted-foreground">/ {usageLimit}</span>
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Grounded answers</p>
                <p className="mt-1 font-display text-lg font-bold tabular-nums">
                  {dashboard?.groundedAnswerRate ? `${Math.round(dashboard.groundedAnswerRate * 100)}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Last update</p>
                <p className="mt-1 font-display text-lg font-bold">{formatDate(progress?.updatedAt)}</p>
              </div>
            </div>
          </Panel>

          {/* ── Key metrics ── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<MessageSquare className="size-4" />}
              label="Conversations"
              value={totalSessions.toLocaleString()}
              hint="Total captured this period"
            />
            <StatCard
              icon={<Target className="size-4" />}
              label="Resolution rate"
              value={`${resolutionRate}%`}
              hint={resolutionRate >= 70 ? 'Strong performance' : 'Room to improve'}
            />
            <StatCard
              icon={<TrendingUp className="size-4" />}
              label="Avg confidence"
              value={`${avgConfidence}%`}
              hint="Across all grounded answers"
            />
            <StatCard
              icon={<BookOpen className="size-4" />}
              label="Knowledge coverage"
              value={totalDocs > 0 ? `${knowledgeCoverage}%` : '—'}
              hint={`${indexedDocs} of ${totalDocs} documents indexed`}
            />
          </div>

          {/* ── Recommended next move ── */}
          <Panel>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Recommended next move</p>
            <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-sm leading-7 text-foreground/85">{recommendedNextAction}</p>
              <DashButton onClick={() => navigate('/dashboard/knowledge')}>
                {recommendedNextAction.startsWith('Install') ? 'Install widget' : 'Go to knowledge'}
                <ArrowRight className="size-4" />
              </DashButton>
            </div>
          </Panel>

          {/* ── Finish setup ── */}
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Finish setup</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold text-foreground">
                <Rocket className="size-3.5" /> {isOnboardingComplete ? 'On track' : `${Math.min(3, (totalDocs > 0 ? 1 : 0) + (dashboard?.widgetInstalled ? 1 : 0) + (totalSessions > 0 ? 1 : 0))} of 3 done`}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <SetupStep done={totalDocs > 0} label="Upload knowledge sources" to="/dashboard/knowledge" onNavigate={navigate} index={0} />
              <SetupStep done={!!dashboard?.widgetInstalled} label="Install the widget" to="/dashboard/widget" onNavigate={navigate} index={1} />
              <SetupStep done={totalSessions > 0} label="First visitor conversation" to="/dashboard/conversations" onNavigate={navigate} index={2} />
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{businessProfileSummary}</p>
          </Panel>

          {/* ── Recommendations ── */}
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Today's recommendations</h2>
              <span className="rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold">{recommendations.length}</span>
            </div>
            <div className="mt-4 grid gap-2.5">
              {recommendations.map(r => (
                <RecommendationRow key={r.id} recommendation={r} onClick={() => navigate(r.href)} />
              ))}
            </div>
          </Panel>

          {/* ── Charts ── */}
          <div className="grid gap-4 xl:grid-cols-3">
            <Panel>
              <h2 className="text-lg font-bold tracking-tight">Conversations — last 7 days</h2>
              <div className="mt-6">
                <BarChart data={dailyCounts} label="Conversations per day" max={maxDailyCount} height={160} />
                <div className="mt-2 flex justify-between">
                  {last7Days.map((day, i) => (
                    <span key={i} className="text-[10px] text-muted-foreground">{day.slice(0, 3)}</span>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel>
              <h2 className="text-lg font-bold tracking-tight">Confidence trend — last 7 days</h2>
              <div className="mt-6">
                <ProgressIndicators data={dailyConfidence} days={last7Days} />
              </div>
            </Panel>
            <Panel>
              <h2 className="text-lg font-bold tracking-tight">Business intelligence</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Sales opportunity</p>
                  <p className="mt-1 leading-6 text-foreground/85">{businessProfile?.recommendedNextAction || 'A stronger first-contact path should increase demo conversion as soon as the widget engages visitors.'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-ember-soft px-2.5 py-1 text-xs font-medium">
                    <Heart className="size-3 text-primary" /> Trust building
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-ember-soft px-2.5 py-1 text-xs font-medium">
                    <Star className="size-3 text-primary" /> Conversion focus
                  </span>
                </div>
              </div>
            </Panel>
          </div>

          {/* ── Knowledge sources + topics ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">Top knowledge sources</h2>
                <span className="rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold">{knowledgeSources.length} sources</span>
              </div>
              {knowledgeSources.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">No knowledge sources indexed yet</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {knowledgeSources.map((source, i) => (
                    <div
                      key={i}
                      className="flex cursor-pointer items-center justify-between rounded-xl bg-surface-2/60 p-3 transition hover:-translate-y-px hover:shadow-soft"
                      onClick={() => navigate('/dashboard/knowledge')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate('/dashboard/knowledge'); }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={cn(
                          'size-2 shrink-0 rounded-full',
                          source.status === 'indexed' ? 'bg-success' : source.status === 'failed' ? 'bg-error-500' : 'bg-warning-500',
                        )} />
                        <span className="truncate text-sm">{source.name}</span>
                      </div>
                      <span className="ml-3 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {source.citationCount} citation{source.citationCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {totalDocs > 0 && (
                <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4 text-xs text-muted-foreground">
                  <span>{indexedDocs} of {totalDocs} documents indexed</span>
                  <span>{knowledgeCoverage}% coverage</span>
                </div>
              )}
            </Panel>
            <Panel>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">Most asked topics</h2>
                <span className="rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold">{topTopics.length} topics</span>
              </div>
              {topTopics.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">No conversation data yet</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {topTopics.map((topic, i) => (
                    <div
                      key={i}
                      className="flex cursor-pointer items-center justify-between rounded-xl bg-surface-2/60 p-3 transition hover:-translate-y-px hover:shadow-soft"
                      onClick={() => navigate('/dashboard/conversations')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate('/dashboard/conversations'); }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ember-soft text-xs font-semibold text-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm">{topic.topic}</p>
                          <p className="text-[11px] text-muted-foreground">{topic.count} conversation{topic.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="ml-3 flex shrink-0 items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${topic.percentage}%` }} />
                        </div>
                        <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{topic.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
