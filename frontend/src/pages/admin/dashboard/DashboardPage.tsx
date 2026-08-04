import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from '../../../components/premium/PremiumCard';
import { MetricCard } from '../../../components/premium/MetricCard';
import { Badge } from '../../../components/premium/Badge';
import { DashboardSkeleton } from '../../../components/premium/Skeleton';
import { EmptyState } from '../../../components/premium/EmptyState';
import { DashboardLayout, DashboardContent } from '../../../components/dashboard';
import { useAuth } from '../../../lib/auth-context';
import { useSessions, useAnalytics } from '../../../hooks/useConversationIntelligence';
import { useOnboarding } from '../../../hooks/useOnboarding';
import { fetchWithAuth } from '../../../lib/api-client';
import { cn } from '../../../utils/cn';
import type { SidebarItem } from '../../../layouts/Sidebar';

const NAV_ITEMS: SidebarItem[] = [
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

const ONBOARDING_NAV_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard', active: true },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

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

interface BusinessIntelligenceReport {
  productsAndServices: string[];
  pricingPosition: string;
  idealCustomer: string;
  conversionIssues: string[];
  trustIssues: string[];
  missingContent: string[];
  recommendedImprovements: string[];
  salesOpportunity: string;
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
    <div className="flex items-end justify-between gap-1" style={{ height }} aria-label={label}>
      {data.map((val, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-[3px] bg-gradient-to-t from-[rgba(168,36,75,0.4)] to-[rgba(201,79,114,0.7)] transition-all duration-[var(--motion-functional)]"
          style={{ height: `${(val / max) * 100}%`, minHeight: val > 0 ? '4px' : '0' }}
          aria-label={`Day ${i + 1}: ${val}`}
        />
      ))}
    </div>
  );
}

function ProgressIndicators({ data, days }: { data: number[]; days: string[] }) {
  return (
    <div className="space-y-2" aria-label="Confidence trend per day">
      {data.map((val, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[11px] text-[rgba(255,255,255,0.4)] w-16 shrink-0">{days[i].slice(0, 3)}</span>
          <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-[var(--motion-functional)]',
                val >= 70 ? 'bg-[#3DDC97]' : val >= 40 ? 'bg-[#F5B454]' : 'bg-[#F26D6D]',
              )}
              style={{ width: `${val}%` }}
              aria-label={`${days[i].slice(0, 3)}: ${val}% confidence`}
            />
          </div>
          <span className="text-[11px] text-[rgba(255,255,255,0.6)] w-8 text-right tabular-nums">{val}%</span>
        </div>
      ))}
    </div>
  );
}

function RecommendationCard({ recommendation, onClick }: { recommendation: Recommendation; onClick: () => void }) {
  const colors = {
    info: 'border-[rgba(58,111,240,0.2)] bg-[rgba(58,111,240,0.06)]',
    warning: 'border-[rgba(199,126,31,0.2)] bg-[rgba(199,126,31,0.06)]',
    error: 'border-[rgba(201,59,59,0.2)] bg-[rgba(201,59,59,0.06)]',
  };
  const dots = {
    info: 'bg-[#6E96F5]',
    warning: 'bg-[#F5B454]',
    error: 'bg-[#F26D6D]',
  };
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer transition-all duration-[var(--motion-functional)]',
        'hover:bg-[rgba(255,255,255,0.04)] hover:-translate-y-[1px]',
        colors[recommendation.severity],
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Recommendation: ${recommendation.message}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <span className={cn('w-2 h-2 rounded-full shrink-0', dots[recommendation.severity])} />
      <p className="text-sm text-[rgba(255,255,255,0.8)]">{recommendation.message}</p>
      <span className="text-xs text-[rgba(255,255,255,0.3)] ml-auto shrink-0">&rarr;</span>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, tenant, logout } = useAuth();
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

  const resolutionRate = analyticsData ? Math.round((analyticsData.qualificationCompletionRate || 0) * 100) : 0;

  const indexedDocs = monitoring?.indexedDocuments || 0;
  const totalDocs = monitoring?.totalDocuments || 0;
  const knowledgeCoverage = totalDocs > 0 ? Math.round((indexedDocs / totalDocs) * 100) : indexedDocs > 0 ? 100 : 0;

  const handoffRate = analyticsData ? Math.round((analyticsData.handoffRate || 0) * 100) : 0;
  const csat = analyticsData ? Math.round((analyticsData.avgConversationScore || 0) * 100) : null;

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
  const usagePercent = usageLimit > 0 ? Math.round((usageThisMonth / usageLimit) * 100) : 0;


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
        message: 'Knowledge coverage dropped &mdash; review failed or missing documents',
        href: '/dashboard/knowledge',
        severity: 'warning',
      });
    }
    if (avgConfidence > 0 && avgConfidence < 60) {
      items.push({
        id: 'low-confidence',
        message: 'Low confidence detected &mdash; add more knowledge sources to improve answers',
        href: '/dashboard/analytics',
        severity: 'warning',
      });
    }
    if (dashboard?.firstUnansweredQuestion) {
      items.push({
        id: 'unanswered',
        message: `Customers asking about &ldquo;${dashboard.firstUnansweredQuestion}&rdquo; &mdash; add a knowledge source`,
        href: '/dashboard/unanswered',
        severity: 'error',
      });
    }
    if (items.length === 0 && totalSessions > 0) {
      items.push({
        id: 'all-clear',
        message: 'Everything looks good &mdash; no recommendations at this time',
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
    const website = progress?.primaryWebsite || 'your website';
    const companyName = (businessProfile?.businessName as string) || workspaceName;
    const knowledgeLabel = totalDocs > 0
      ? `${totalDocs} source${totalDocs === 1 ? '' : 's'} indexed`
      : 'knowledge is still being prepared';
    const widgetLabel = dashboard?.widgetInstalled ? 'installed and ready to engage visitors' : 'pending installation';
    const conversationLabel = totalSessions > 0
      ? `${totalSessions} conversations captured`
      : 'waiting for the first visitor conversation';
    return `${companyName} has a working profile for ${industry}. ${knowledgeLabel}, the widget is ${widgetLabel}, and ${conversationLabel}.`;
  }, [dashboard?.widgetInstalled, businessProfile?.businessName, businessProfile?.industry, progress?.businessType, progress?.primaryWebsite, totalDocs, totalSessions, workspaceName]);

  const profileScores = useMemo(() => ({
    intelligence: typeof businessProfile?.intelligenceScore === 'number' ? businessProfile.intelligenceScore : 0,
    conversion: typeof businessProfile?.conversionScore === 'number' ? businessProfile.conversionScore : 0,
    trust: typeof businessProfile?.trustScore === 'number' ? businessProfile.trustScore : 0,
  }), [businessProfile]);

  const intelligenceReport = useMemo<BusinessIntelligenceReport>(() => {
    const productsAndServices = (businessProfile?.productsAndServices as string[] | undefined) || (totalDocs > 0 ? ['Core offering', 'Support and onboarding guidance'] : ['Core offering']);
    const pricingPosition = (businessProfile?.pricingModel as string | undefined) || (totalSessions > 0 ? 'Positioned around guided next steps and demo conversion' : 'Needs clearer pricing or offer framing');
    const idealCustomer = (businessProfile?.idealCustomer as string | undefined) || (progress?.businessType ? `Visitors evaluating ${progress.businessType} solutions` : 'Prospective buyers who need guidance');
    const salesOpportunity = (businessProfile?.recommendedNextAction as string | undefined) || (totalSessions > 0 ? 'Turn the first conversations into booked demos by guiding each visitor to a concrete next step.' : 'A stronger first-contact path should increase demo conversion as soon as the widget engages visitors.');

    return {
      productsAndServices,
      pricingPosition,
      idealCustomer,
      conversionIssues: totalSessions > 0 ? ['Some visitors still need stronger CTAs and clearer pricing cues'] : ['No visitor conversations yet; conversion path is still unproven'],
      trustIssues: totalDocs > 0 ? ['Trust improves when the site clearly explains the offer and next steps'] : ['Knowledge coverage needs to be strengthened to inspire confidence'],
      missingContent: businessProfile?.missingWebsiteContent as string[] | undefined || (totalDocs > 0 ? ['Pricing clarity', 'Product comparison guidance'] : ['Core offer summary', 'Pricing clarity']),
      recommendedImprovements: [
        'Add clear pricing and comparison cues to the widget prompts',
        'Surface the best next step in the dashboard and widget',
        'Strengthen the website scan inputs with higher-signal documents',
      ],
      salesOpportunity,
    };
  }, [businessProfile, progress?.businessType, totalDocs, totalSessions]);

  const profileItems = useMemo(() => [
    { label: 'Industry', value: (businessProfile?.industry as string) || progress?.businessType || 'Pending', accent: 'bg-[rgba(168,36,75,0.16)] text-white' },
    { label: 'Knowledge', value: totalDocs > 0 ? `${totalDocs} sources` : 'Adding sources', accent: 'bg-[rgba(58,111,240,0.16)] text-white' },
    { label: 'Widget', value: dashboard?.widgetInstalled ? 'Live' : 'Setup needed', accent: 'bg-[rgba(61,220,151,0.16)] text-white' },
  ], [businessProfile?.industry, dashboard?.widgetInstalled, progress?.businessType, totalDocs]);

  const recommendedNextAction = useMemo(() => {
    if (!dashboard?.widgetInstalled) return 'Install the widget to start turning visitors into real conversations.';
    if (totalSessions === 0) return 'Let the widget engage a few visitors first, then review the first real questions it handles.';
    return 'Review the newest conversations and strengthen the knowledge base around the topics visitors ask about most.';
  }, [dashboard?.widgetInstalled, totalSessions]);

  const handleNavigate = (item: SidebarItem) => {
    if (item.href) navigate(item.href);
  };

  const isOnboardingComplete = progress?.onboardingStatus === 'completed';

  return (
    <DashboardLayout
      sidebarItems={isOnboardingComplete ? NAV_ITEMS : ONBOARDING_NAV_ITEMS}
      onNavigate={handleNavigate}
      workspaceName={workspaceName}
      planName={planTrial ? 'Trial' : planName}
      userName={user?.name}
      userEmail={user?.email}
      usagePercent={usagePercent}
      onUpgrade={() => navigate('/dashboard/billing')}
      onLogout={logout}
      onSettings={() => navigate('/dashboard/settings')}
    >
      <div className="premium-layout min-h-full p-4 md:p-6 space-y-6" aria-label="Executive Dashboard">
        {isBusy ? (
          <DashboardSkeleton />
        ) : !hasData ? (
          <EmptyState
            icon="📊"
            title="Welcome to your Dashboard"
            description="Start by uploading knowledge sources and installing the widget. Your analytics and metrics will appear here once you have conversations."
            primaryAction={{ label: 'Upload Documents', onClick: () => navigate('/dashboard/knowledge') }}
            secondaryAction={{ label: 'Install Widget', onClick: () => navigate('/dashboard/widget') }}
          />
        ) : (
          <>
            <PremiumCard variant="glass" padding="lg">
              <PremiumCardContent>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[rgba(168,36,75,0.15)] flex items-center justify-center text-xl" aria-hidden="true">
                      &#x1F44B;
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-white">Welcome back{subscription?.contactName ? `, ${subscription.contactName}` : ''}</h1>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-[rgba(255,255,255,0.5)]">{workspaceName}</span>
                        <Badge variant={planTrial ? 'premium' : 'info'} size="sm">{planTrial ? 'Trial' : planName}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center" aria-label="AI Health Score">
                      <p className="text-[11px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider">AI Health</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-20 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              healthScore >= 70 ? 'bg-[#3DDC97]' : healthScore >= 40 ? 'bg-[#F5B454]' : 'bg-[#F26D6D]',
                            )}
                            style={{ width: `${healthScore}%` }}
                          />
                        </div>
                        <span className={cn(
                          'text-sm font-bold tabular-nums',
                          healthScore >= 70 ? 'text-[#3DDC97]' : healthScore >= 40 ? 'text-[#F5B454]' : 'text-[#F26D6D]',
                        )}>
                          {healthScore}
                        </span>
                      </div>
                    </div>
                    <div className="text-center" aria-label="Usage this month">
                      <p className="text-[11px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider">Usage</p>
                      <p className="text-sm font-bold text-white mt-1 tabular-nums">
                        {usageThisMonth} <span className="text-[rgba(255,255,255,0.3)] font-normal">/ {usageLimit}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </PremiumCardContent>
            </PremiumCard>

            <PremiumCard variant="glass" padding="lg">
              <PremiumCardContent>
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[rgba(255,255,255,0.5)]">Business profile snapshot</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Here is what BurFlow learned about {workspaceName}</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[rgba(255,255,255,0.72)]">{businessProfileSummary}</p>
                    {businessProfile && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {[
                          { label: 'AI readiness', value: `${profileScores.intelligence}%`, accent: 'bg-[rgba(61,220,151,0.16)] text-white' },
                          { label: 'Conversion confidence', value: `${profileScores.conversion}%`, accent: 'bg-[rgba(58,111,240,0.16)] text-white' },
                          { label: 'Trust strength', value: `${profileScores.trust}%`, accent: 'bg-[rgba(168,36,75,0.16)] text-white' },
                        ].map((item) => (
                          <div key={item.label} className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.4)]">{item.label}</p>
                            <div className={cn('mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', item.accent)}>
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {profileItems.map((item) => (
                        <div key={item.label} className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.4)]">{item.label}</p>
                          <div className={cn('mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', item.accent)}>
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.16)] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[rgba(255,255,255,0.5)]">Recommended next move</p>
                    <p className="mt-3 text-sm leading-7 text-[rgba(255,255,255,0.82)]">{recommendedNextAction}</p>
                    <div className="mt-4 space-y-2 text-sm text-[rgba(255,255,255,0.7)]">
                      <div className="flex items-center justify-between rounded-xl bg-[rgba(255,255,255,0.04)] px-3 py-2">
                        <span>Last update</span>
                        <span className="font-medium text-white">{formatDate(progress?.updatedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-[rgba(255,255,255,0.04)] px-3 py-2">
                        <span>Grounded answers</span>
                        <span className="font-medium text-white">{dashboard?.groundedAnswerRate ? `${Math.round(dashboard.groundedAnswerRate * 100)}%` : 'Pending'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </PremiumCardContent>
            </PremiumCard>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3" aria-label="Key metrics">
              <MetricCard icon="&#x1F4AC;" label="Conversations" value={totalSessions.toLocaleString()} onClick={() => navigate('/dashboard/conversations')} />
              <MetricCard
                icon="&#x2705;"
                label="Resolution Rate"
                value={`${resolutionRate}%`}
                variant={resolutionRate >= 70 ? 'success' : resolutionRate >= 40 ? 'warning' : 'error'}
                onClick={() => navigate('/dashboard/analytics')}
              />
              <MetricCard
                icon="&#x1F3AF;"
                label="Avg Confidence"
                value={`${avgConfidence}%`}
                variant={avgConfidence >= 70 ? 'success' : avgConfidence >= 40 ? 'warning' : 'error'}
                onClick={() => navigate('/dashboard/analytics')}
              />
              <MetricCard
                icon="&#x1F4DA;"
                label="Knowledge Coverage"
                value={totalDocs > 0 ? `${knowledgeCoverage}%` : '\u2014'}
                variant={knowledgeCoverage >= 80 ? 'success' : knowledgeCoverage >= 50 ? 'warning' : knowledgeCoverage > 0 ? 'error' : 'default'}
                onClick={() => navigate('/dashboard/knowledge')}
              />
              <MetricCard
                icon="&#x1F504;"
                label="Human Handoff"
                value={`${handoffRate}%`}
                variant={handoffRate <= 20 ? 'success' : handoffRate <= 50 ? 'warning' : 'error'}
                onClick={() => navigate('/dashboard/analytics')}
              />
              <MetricCard
                icon="&#x2B50;"
                label="Satisfaction"
                value={csat !== null ? `${csat}%` : '\u2014'}
                variant={csat !== null ? (csat >= 70 ? 'success' : csat >= 40 ? 'warning' : 'error') : 'default'}
                onClick={() => navigate('/dashboard/analytics')}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4" aria-label="Charts and recommendations">
              <PremiumCard variant="elevated" padding="md">
                <PremiumCardHeader>
                  <PremiumCardTitle>Business Intelligence Report</PremiumCardTitle>
                  <Badge variant="premium" size="sm">Beta</Badge>
                </PremiumCardHeader>
                <PremiumCardContent>
                  <div className="space-y-3 text-sm text-[rgba(255,255,255,0.78)]">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.4)]">Products & services</p>
                      <p className="mt-1">{intelligenceReport.productsAndServices.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.4)]">Pricing position</p>
                      <p className="mt-1">{intelligenceReport.pricingPosition}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.4)]">Ideal customer</p>
                      <p className="mt-1">{intelligenceReport.idealCustomer}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.4)]">Sales opportunity</p>
                      <p className="mt-1">{intelligenceReport.salesOpportunity}</p>
                    </div>
                  </div>
                </PremiumCardContent>
              </PremiumCard>

              <PremiumCard variant="elevated" padding="md">
                <PremiumCardHeader>
                  <PremiumCardTitle>Conversations &mdash; Last 7 Days</PremiumCardTitle>
                </PremiumCardHeader>
                <PremiumCardContent>
                  <BarChart data={dailyCounts} label="Conversations per day" max={maxDailyCount} height={160} />
                  <div className="flex justify-between mt-2">
                    {last7Days.map((day, i) => (
                      <span key={i} className="text-[10px] text-[rgba(255,255,255,0.3)]">{day.slice(0, 3)}</span>
                    ))}
                  </div>
                </PremiumCardContent>
              </PremiumCard>

              <PremiumCard variant="elevated" padding="md">
                <PremiumCardHeader>
                  <PremiumCardTitle>Confidence Trend &mdash; Last 7 Days</PremiumCardTitle>
                </PremiumCardHeader>
                <PremiumCardContent>
                  <ProgressIndicators data={dailyConfidence} days={last7Days} />
                </PremiumCardContent>
              </PremiumCard>

              <PremiumCard variant="glass" padding="md">
                <PremiumCardHeader>
                  <PremiumCardTitle>Today&rsquo;s Recommendations</PremiumCardTitle>
                  <Badge variant="premium" size="sm">{recommendations.length}</Badge>
                </PremiumCardHeader>
                <PremiumCardContent>
                  <div className="space-y-2">
                    {recommendations.map(r => (
                      <RecommendationCard key={r.id} recommendation={r} onClick={() => navigate(r.href)} />
                    ))}
                  </div>
                </PremiumCardContent>
              </PremiumCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-label="Knowledge sources and topics">
              <PremiumCard variant="elevated" padding="md">
                <PremiumCardHeader>
                  <PremiumCardTitle>Top Knowledge Sources</PremiumCardTitle>
                  <Badge variant="neutral" size="sm">{knowledgeSources.length} sources</Badge>
                </PremiumCardHeader>
                <PremiumCardContent>
                  {knowledgeSources.length === 0 ? (
                    <div className="py-6 text-center">
                      <span className="text-2xl mb-2 block" aria-hidden="true">&#x1F4C4;</span>
                      <p className="text-sm text-[rgba(255,255,255,0.5)]">No knowledge sources indexed yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {knowledgeSources.map((source, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors cursor-pointer"
                          onClick={() => navigate('/dashboard/knowledge')}
                          role="button"
                          tabIndex={0}
                          aria-label={`Knowledge source: ${source.name}`}
                          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/dashboard/knowledge'); }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={cn(
                              'w-2 h-2 rounded-full shrink-0',
                              source.status === 'indexed' ? 'bg-[#3DDC97]' : source.status === 'failed' ? 'bg-[#F26D6D]' : 'bg-[#F5B454]',
                            )} />
                            <span className="text-sm text-[rgba(255,255,255,0.8)] truncate">{source.name}</span>
                          </div>
                          <span className="text-xs text-[rgba(255,255,255,0.4)] tabular-nums shrink-0 ml-3">
                            {source.citationCount} citation{source.citationCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {totalDocs > 0 && (
                    <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                      <div className="flex items-center justify-between text-xs text-[rgba(255,255,255,0.4)]">
                        <span>{indexedDocs} of {totalDocs} documents indexed</span>
                        <span>{knowledgeCoverage}% coverage</span>
                      </div>
                    </div>
                  )}
                </PremiumCardContent>
              </PremiumCard>

              <PremiumCard variant="elevated" padding="md">
                <PremiumCardHeader>
                  <PremiumCardTitle>Most Asked Topics</PremiumCardTitle>
                  <Badge variant="neutral" size="sm">{topTopics.length} topics</Badge>
                </PremiumCardHeader>
                <PremiumCardContent>
                  {topTopics.length === 0 ? (
                    <div className="py-6 text-center">
                      <span className="text-2xl mb-2 block" aria-hidden="true">&#x1F4AC;</span>
                      <p className="text-sm text-[rgba(255,255,255,0.5)]">No conversation data yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topTopics.map((topic, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors cursor-pointer"
                          onClick={() => navigate('/dashboard/conversations')}
                          role="button"
                          tabIndex={0}
                          aria-label={`Topic: ${topic.topic}`}
                          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/dashboard/conversations'); }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-[rgba(168,36,75,0.12)] flex items-center justify-center text-xs text-[rgba(255,255,255,0.6)] shrink-0">
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-[rgba(255,255,255,0.8)] truncate">{topic.topic}</p>
                              <p className="text-[11px] text-[rgba(255,255,255,0.35)]">{topic.count} conversation{topic.count !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <div className="w-16 h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                              <div className="h-full rounded-full bg-[rgba(168,36,75,0.6)]" style={{ width: `${topic.percentage}%` }} />
                            </div>
                            <span className="text-xs text-[rgba(255,255,255,0.4)] tabular-nums w-8 text-right">{topic.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </PremiumCardContent>
              </PremiumCard>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
