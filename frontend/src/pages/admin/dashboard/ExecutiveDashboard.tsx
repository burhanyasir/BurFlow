import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DashboardLayout,
  DashboardContent,
  DashboardSection,
  DashboardKpiSection,
  DashboardConversationChartSection,
  DashboardAiHealthSection,
  DashboardKnowledgeHealthSection,
  DashboardActivityTimelineSection,
  DashboardRecommendationsSection,
  DashboardUsageBillingSection,
  DashboardLoadingState,
  DashboardErrorState,
} from '../../../components/dashboard';
import { useSessions, useAnalytics, useDashboard } from '../../../hooks/useConversationIntelligence';
import { useOnboarding } from '../../../hooks/useOnboarding';
import type { NavItem, MetricCardData } from '../../../components/dashboard';
import { useAuth } from '../../../lib/auth-context';
import { fetchWithAuth } from '../../../lib/api-client';
import { scoreToVariant, scoreToMetricVariant } from '../../../types/conversation-intelligence';
import { MessageSquare, Target, BookOpen, RefreshCw, Activity, Zap, Shield } from 'lucide-react';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', active: true },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Unanswered', href: '/dashboard/unanswered' },
  { label: 'Citations', href: '/dashboard/citations' },
  { label: 'Insights', href: '/dashboard/insights' },
  { label: 'Widget', href: '/dashboard/widget' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

const ONBOARDING_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', active: true },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

function getLast7Days(): Date[] {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { user, tenant, logout } = useAuth();
  const { data: sessionsData, loading: sessionsLoading, error: sessionsError, reload: reloadSessions } = useSessions(200, 0);
  const { data: analyticsData, loading: analyticsLoading, error: analyticsError, reload: reloadAnalytics } = useAnalytics();
  const { progress, loading: onboardingLoading } = useOnboarding();

  const [monitoring, setMonitoring] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [monLoading, setMonLoading] = useState(true);
  const [monError, setMonError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setMonLoading(true);
      setMonError(null);
      try {
        const [monRes, subRes] = await Promise.allSettled([
          fetchWithAuth('/api/admin/knowledge/monitoring'),
          fetchWithAuth('/api/billing/current'),
        ]);
        if (cancelled) return;
        if (monRes.status === 'fulfilled') {
          const json = await monRes.value.json();
          if (!cancelled) setMonitoring(json);
        }
        if (subRes.status === 'fulfilled') {
          const json = await subRes.value.json();
          if (!cancelled) setSubscription(json);
        }
      } catch {
        if (!cancelled) setMonError('Failed to load monitoring data');
      } finally {
        if (!cancelled) setMonLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const loading = sessionsLoading || analyticsLoading || onboardingLoading || monLoading;
  const error = sessionsError || analyticsError || monError;

  const sessions = sessionsData?.sessions || [];
  const totalSessions = sessionsData?.total || 0;

  const avgConfidence = useMemo(() => {
    if (sessions.length === 0) return 0;
    return Math.round(sessions.reduce((sum: number, s: any) => sum + (s.confidence || 0), 0) / sessions.length);
  }, [sessions]);

  // These analytics fields are already 0-100 percentages per the
  // AnalyticsResponse contract; multiplying by 100 inflated them 100x.
  const resolutionRate = analyticsData ? Math.round(analyticsData.qualificationCompletionRate || 0) : 0;
  const handoffRate = analyticsData ? Math.round(analyticsData.handoffRate || 0) : 0;
  const csat = analyticsData ? Math.round(analyticsData.avgConversationScore || 0) : null;

  const indexedDocs = monitoring?.indexedDocuments || 0;
  const totalDocs = monitoring?.totalDocuments || 0;
  const failedDocs = monitoring?.failedDocuments || 0;
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
  const planName = subscription?.planName || 'Free';
  const planTrial = subscription?.onTrial || false;
  const workspaceName = subscription?.companyName || subscription?.workspaceName || tenant?.name || 'Workspace';
  const periodStart = subscription?.periodStart;
  const periodEnd = subscription?.periodEnd;

  const last7Days = useMemo(() => getLast7Days(), []);
  const dailyCounts = useMemo(() => {
    return last7Days.map((day) => {
      const dayStr = day.toDateString();
      return sessions.filter((s: any) => new Date(s.createdAt).toDateString() === dayStr).length;
    });
  }, [sessions, last7Days]);
  const dailySeries = useMemo(() => last7Days.map((d, i) => ({ date: d.toISOString(), value: dailyCounts[i] })), [last7Days, dailyCounts]);

  const knowledgeSources = useMemo(() => {
    if (monitoring?.documents?.length > 0) {
      return monitoring.documents.slice(0, 5).map((d: any) => ({
        name: d.name || d.filename || 'Untitled',
        citationCount: d.citationCount || 0,
        status: (d.status === 'failed' ? 'failed' : d.status === 'processing' ? 'processing' : 'indexed') as 'indexed' | 'failed' | 'processing',
      }));
    }
    const sources: Array<{ name: string; citationCount: number; status: 'indexed' | 'failed' | 'processing' }> = [];
    if (indexedDocs > 0) sources.push({ name: `${indexedDocs} indexed documents`, citationCount: sessions.filter((s: any) => s.hasIntel).length, status: 'indexed' });
    if (failedDocs > 0) sources.push({ name: `${failedDocs} failed documents`, citationCount: 0, status: 'failed' });
    return sources;
  }, [monitoring, indexedDocs, sessions, failedDocs]);

  const topTopics = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const stage = s.funnelStage || 'Unknown';
      map.set(stage, (map.get(stage) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [sessions]);

  const recommendations = useMemo(() => {
    const items: Array<{ id: string; message: string; href?: string; onClick?: () => void; severity: 'info' | 'warning' | 'error' }> = [];
    if (totalDocs < 3) items.push({ id: 'upload-docs', message: `Upload ${3 - totalDocs} more document${3 - totalDocs > 1 ? 's' : ''} to improve knowledge base`, onClick: () => navigate('/dashboard/knowledge'), severity: 'info' });
    if (totalDocs > 0 && knowledgeCoverage < 50) items.push({ id: 'coverage-drop', message: 'Knowledge coverage dropped — review failed or missing documents', onClick: () => navigate('/dashboard/knowledge'), severity: 'warning' });
    if (avgConfidence > 0 && avgConfidence < 60) items.push({ id: 'low-confidence', message: 'Low confidence detected — add more knowledge sources to improve answers', onClick: () => navigate('/dashboard/analytics'), severity: 'warning' });
    if (items.length === 0 && totalSessions > 0) items.push({ id: 'all-clear', message: 'Everything looks good — no recommendations at this time', onClick: () => navigate('/dashboard'), severity: 'info' });
    return items;
  }, [totalDocs, knowledgeCoverage, avgConfidence, totalSessions, navigate]);

  const hasData = totalSessions > 0 || totalDocs > 0;
  const isOnboardingComplete = progress?.onboardingStatus === 'completed';

  const kpiMetrics = useMemo((): MetricCardData[] => [
    { id: 'conversations', icon: <MessageSquare className="h-4 w-4" />, label: 'Conversations', value: totalSessions.toLocaleString(), onClick: () => navigate('/dashboard/conversations'), variant: 'default' },
    { id: 'resolution', icon: <Target className="h-4 w-4" />, label: 'Resolution Rate', value: `${resolutionRate}%`, variant: scoreToMetricVariant(resolutionRate), onClick: () => navigate('/dashboard/analytics') },
    { id: 'confidence', icon: <Activity className="h-4 w-4" />, label: 'Avg Confidence', value: `${avgConfidence}%`, variant: scoreToMetricVariant(avgConfidence), onClick: () => navigate('/dashboard/analytics') },
    { id: 'coverage', icon: <BookOpen className="h-4 w-4" />, label: 'Knowledge Coverage', value: totalDocs > 0 ? `${knowledgeCoverage}%` : '\u2014', variant: knowledgeCoverage >= 80 ? 'success' : knowledgeCoverage >= 50 ? 'warning' : knowledgeCoverage > 0 ? 'error' : 'default', onClick: () => navigate('/dashboard/knowledge') },
    { id: 'handoff', icon: <RefreshCw className="h-4 w-4" />, label: 'Human Handoff', value: `${handoffRate}%`, variant: handoffRate <= 20 ? 'success' : handoffRate <= 50 ? 'warning' : 'error', onClick: () => navigate('/dashboard/analytics') },
    { id: 'csat', icon: <Zap className="h-4 w-4" />, label: 'Satisfaction', value: csat !== null ? `${csat}%` : '\u2014', variant: csat !== null ? scoreToMetricVariant(csat) : 'default', onClick: () => navigate('/dashboard/analytics') },
  ], [totalSessions, resolutionRate, avgConfidence, knowledgeCoverage, totalDocs, handoffRate, csat, navigate]);

  const aiHealthMetrics = useMemo(() => [
    { id: 'coverage', label: 'Knowledge', value: knowledgeCoverage, variant: scoreToMetricVariant(knowledgeCoverage) },
    { id: 'confidence', label: 'Confidence', value: avgConfidence, variant: scoreToMetricVariant(avgConfidence) },
    { id: 'resolution', label: 'Resolution', value: resolutionRate, variant: scoreToMetricVariant(resolutionRate) },
  ], [knowledgeCoverage, avgConfidence, resolutionRate]);

  if (loading) {
    return (
      <DashboardLayout
        sidebarItems={isOnboardingComplete ? NAV_ITEMS : ONBOARDING_NAV_ITEMS}
        onNavigate={(item) => item.href && navigate(item.href)}
        workspaceName={workspaceName}
        planName={planTrial ? 'Trial' : planName}
        userName={user?.name}
        userEmail={user?.email}
        usagePercent={usageLimit > 0 ? Math.round((usageThisMonth / usageLimit) * 100) : 0}
        onUpgrade={() => navigate('/dashboard/billing')}
        onLogout={logout}
        onSettings={() => navigate('/dashboard/settings')}
      >
        <DashboardContent loading />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        sidebarItems={isOnboardingComplete ? NAV_ITEMS : ONBOARDING_NAV_ITEMS}
        onNavigate={(item) => item.href && navigate(item.href)}
        workspaceName={workspaceName}
        planName={planTrial ? 'Trial' : planName}
        userName={user?.name}
        userEmail={user?.email}
        usagePercent={usageLimit > 0 ? Math.round((usageThisMonth / usageLimit) * 100) : 0}
        onUpgrade={() => navigate('/dashboard/billing')}
        onLogout={logout}
        onSettings={() => navigate('/dashboard/settings')}
      >
        <DashboardContent>
          <DashboardErrorState message={error} onRetry={() => { reloadSessions(); reloadAnalytics(); }} />
        </DashboardContent>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebarItems={isOnboardingComplete ? NAV_ITEMS : ONBOARDING_NAV_ITEMS}
      onNavigate={(item) => item.href && navigate(item.href)}
      workspaceName={workspaceName}
      planName={planTrial ? 'Trial' : planName}
      userName={user?.name}
      userEmail={user?.email}
      usagePercent={usageLimit > 0 ? Math.round((usageThisMonth / usageLimit) * 100) : 0}
      onUpgrade={() => navigate('/dashboard/billing')}
      onLogout={logout}
      onSettings={() => navigate('/dashboard/settings')}
    >
      <DashboardContent>
        {!hasData ? (
          <DashboardSection>
            <div className="glass rounded-2xl p-6 text-center py-16">
              <Shield className="mx-auto mb-4 h-12 w-12 text-wine" />
              <h2 className="mb-1 text-lg font-medium text-foreground">Welcome to your Dashboard</h2>
              <p className="mb-6 max-w-md mx-auto text-sm text-muted-foreground">
                Start by uploading knowledge sources and installing the widget. Your analytics and metrics will appear here once you have conversations.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => navigate('/dashboard/knowledge')} className="btn-wine rounded-xl px-4 py-2 text-sm">Upload Documents</button>
                <button onClick={() => navigate('/dashboard/widget')} className="rounded-xl border border-hairline px-4 py-2 text-sm text-foreground transition hover:bg-white/[0.04]">Install Widget</button>
              </div>
            </div>
          </DashboardSection>
        ) : (
          <>
            {/* Section 1: KPI / Metric Cards */}
            <DashboardSection>
              <DashboardKpiSection metrics={kpiMetrics} columns={6} />
            </DashboardSection>

            {/* Section 2: Charts row */}
            <DashboardSection>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="xl:col-span-1">
                  <DashboardConversationChartSection
                    data={dailySeries}
                    loading={false}
                    empty={totalSessions === 0}
                  />
                </div>
                <DashboardAiHealthSection
                  score={healthScore}
                  metrics={aiHealthMetrics}
                  loading={false}
                  empty={!hasData}
                />
                <DashboardUsageBillingSection
                  plan={{ name: planName, onTrial: planTrial, usageThisMonth, usageLimit, periodStart, periodEnd }}
                  totalConversations={totalSessions}
                  avgConfidence={avgConfidence}
                  resolutionRate={resolutionRate}
                  loading={false}
                  empty={!hasData}
                  onUpgrade={() => navigate('/dashboard/billing')}
                  onBilling={() => navigate('/dashboard/billing')}
                />
              </div>
            </DashboardSection>

            {/* Section 3: Activity + Recommendations */}
            <DashboardSection>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <DashboardActivityTimelineSection
                  sessions={sessions.slice(0, 5).map((s: any) => ({
                    sessionId: s.sessionId,
                    persona: s.persona,
                    funnelStage: s.funnelStage,
                    buyingIntentDetected: s.buyingIntentDetected,
                    createdAt: s.createdAt,
                    stateMachine: s.stateMachine,
                  }))}
                  loading={false}
                  empty={sessions.length === 0}
                  onSessionClick={(id) => navigate(`/dashboard/conversations/${id}`)}
                  onViewAll={() => navigate('/dashboard/conversations')}
                />
                <div className="flex flex-col gap-4">
                  <DashboardRecommendationsSection
                    recommendations={recommendations}
                    loading={false}
                    empty={recommendations.length === 0}
                  />
                </div>
              </div>
            </DashboardSection>

            {/* Section 4: Knowledge Health */}
            <DashboardSection>
              <DashboardKnowledgeHealthSection
                sources={knowledgeSources}
                totalDocs={totalDocs}
                indexedDocs={indexedDocs}
                failedDocs={failedDocs}
                coverage={knowledgeCoverage}
                loading={false}
                empty={totalDocs === 0}
                onSourceClick={() => navigate('/dashboard/knowledge')}
              />
            </DashboardSection>
          </>
        )}
      </DashboardContent>
    </DashboardLayout>
  );
}
