import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Progress } from '../../../components/ui/Progress';
import { AppLayout } from '../../../layouts/AppLayout';
import { useToast } from '../../../components/ui/Toast';
import { fetchWithAuth } from '../../../lib/api-client';
import type { SidebarItem } from '../../../layouts/Sidebar';

interface UnansweredStats {
  totalUnanswered: number;
  trend: number;
  mostRequestedTopic: string;
  mostRequestedTopicCount: number;
  resolutionRate: number;
  averageConfidence: number;
  period: string;
}

interface Cluster {
  topic: string;
  questionPattern: string;
  occurrenceCount: number;
  averageConfidence: number;
  resolutionCount: number;
}

interface UnansweredQuestion {
  id: string;
  question: string;
  confidence: number;
  status: 'open' | 'reviewing' | 'resolved';
  escalated: boolean;
  createdAt: string;
  clusterTopic?: string;
}

interface Suggestion {
  id: string;
  question: string;
  answer: string;
  impactScore: number;
  status: 'pending' | 'applied' | 'dismissed';
  createdAt: string;
}

type PeriodFilter = 'today' | 'week' | 'month' | undefined;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const NAV_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard', active: false },
  { label: 'Conversations', href: '/dashboard/conversations', active: false },
  { label: 'Analytics', href: '/dashboard/analytics', active: false },
  { label: 'Knowledge', href: '/dashboard/knowledge', active: false },
  { label: 'Widget', href: '/dashboard/widget', active: false },
  { label: 'Billing', href: '/dashboard/billing', active: false },
  { label: 'Onboarding', href: '/dashboard/onboarding', active: false },
  { label: 'Unanswered', href: '/dashboard/unanswered', active: true },
];

function FrequencyBadge({ count }: { count: number }) {
  if (count >= 20) return <Badge variant="error" size="sm">High</Badge>;
  if (count >= 10) return <Badge variant="warning" size="sm">Medium</Badge>;
  return <Badge variant="neutral" size="sm">Low</Badge>;
}

export default function UnansweredDashboard() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [period, setPeriod] = useState<PeriodFilter>(undefined);
  const [stats, setStats] = useState<UnansweredStats | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [questions, setQuestions] = useState<UnansweredQuestion[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);

  const buildPeriod = useCallback((p: PeriodFilter): string => {
    if (!p) return '';
    const now = new Date();
    switch (p) {
      case 'today':
        return now.toISOString().split('T')[0];
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo.toISOString().split('T')[0];
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo.toISOString().split('T')[0];
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const since = buildPeriod(period);
    const params = since ? `?since=${since}` : '';
    try {
      const [statsRes, clustersRes, questionsRes, suggestionsRes] = await Promise.allSettled([
        fetchWithAuth(`/api/admin/unanswered/stats${params}`),
        fetchWithAuth(`/api/admin/unanswered/clusters${params}`),
        fetchWithAuth(`/api/admin/unanswered${params}`),
        fetchWithAuth('/api/admin/knowledge/suggestions'),
      ]);
      if (statsRes.status === 'fulfilled') {
        const data = await statsRes.value.json();
        if (statsRes.value.ok) setStats(data);
        else addToast('Failed to load unanswered stats', 'error');
      } else addToast('Failed to load unanswered stats', 'error');
      if (clustersRes.status === 'fulfilled') {
        const data = await clustersRes.value.json();
        if (clustersRes.value.ok) setClusters(data.clusters || data);
        else addToast('Failed to load clusters', 'error');
      } else addToast('Failed to load clusters', 'error');
      if (questionsRes.status === 'fulfilled') {
        const data = await questionsRes.value.json();
        if (questionsRes.value.ok) setQuestions(data.questions || data);
        else addToast('Failed to load unanswered questions', 'error');
      } else addToast('Failed to load unanswered questions', 'error');
      if (suggestionsRes.status === 'fulfilled') {
        const data = await suggestionsRes.value.json();
        if (suggestionsRes.value.ok) setSuggestions(data.suggestions || data);
      }
    } catch {
      addToast('Failed to load unanswered dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [period, buildPeriod, addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleNavigate = (item: SidebarItem) => {
    if (item.href) navigate(item.href);
  };

  const handleResolve = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/admin/unanswered/${id}/resolve`, { method: 'PUT' });
      if (!res.ok) { addToast('Failed to resolve question', 'error'); return; }
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: 'resolved' as const } : q));
      addToast('Question resolved', 'success');
    } catch {
      addToast('Failed to resolve question', 'error');
    }
  };

  const handleGenerateSuggestions = async () => {
    setGeneratingSuggestions(true);
    try {
      const res = await fetchWithAuth('/api/admin/knowledge/suggestions/generate', { method: 'POST' });
      if (!res.ok) { addToast('Failed to generate suggestions', 'error'); return; }
      const data = await res.json();
      if (data.suggestions) setSuggestions(prev => [...data.suggestions, ...prev]);
      addToast('Suggestions generated', 'success');
    } catch {
      addToast('Failed to generate suggestions', 'error');
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const handleDismissSuggestion = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/admin/knowledge/suggestions/${id}/dismiss`, { method: 'PUT' });
      if (!res.ok) { addToast('Failed to dismiss suggestion', 'error'); return; }
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'dismissed' as const } : s));
      addToast('Suggestion dismissed', 'success');
    } catch {
      addToast('Failed to dismiss suggestion', 'error');
    }
  };

  const handleApplySuggestion = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/admin/knowledge/suggestions/${id}/apply`, { method: 'PUT' });
      if (!res.ok) { addToast('Failed to apply suggestion', 'error'); return; }
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'applied' as const } : s));
      addToast('Suggestion applied to knowledge base', 'success');
    } catch {
      addToast('Failed to apply suggestion', 'error');
    }
  };

  const sortedClusters = [...clusters].sort((a, b) => b.occurrenceCount - a.occurrenceCount);
  const sortedSuggestions = [...suggestions].filter(s => s.status === 'pending').sort((a, b) => b.impactScore - a.impactScore);

  return (
    <AppLayout sidebarItems={NAV_ITEMS} onNavigate={handleNavigate} workspaceName="Conversation Engine">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">Unanswered Questions</h1>
          <div className="flex gap-2">
            {(['today', 'week', 'month'] as const).map(p => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? 'primary' : 'secondary'}
                onClick={() => setPeriod(prev => prev === p ? undefined : p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
            <Button size="sm" variant={period === undefined ? 'primary' : 'secondary'} onClick={() => setPeriod(undefined)}>All</Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} padding="md"><div className="h-24 bg-[var(--color-neutral-50)] animate-pulse rounded" /></Card>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="elevated" padding="md">
                <CardContent>
                  <p className="text-xs text-[var(--color-neutral-500)]">Total Unanswered</p>
                  <p className="text-2xl font-bold text-[var(--color-neutral-900)] mt-1">{stats?.totalUnanswered ?? 0}</p>
                  {stats && (
                    <p className={`text-xs mt-1 ${(stats.trend || 0) <= 0 ? 'text-[var(--color-success-600)]' : 'text-[var(--color-error-600)]'}`}>
                      {(stats.trend || 0) > 0 ? '↑' : '↓'} {Math.abs(stats.trend || 0)}% vs previous period
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card variant="elevated" padding="md">
                <CardContent>
                  <p className="text-xs text-[var(--color-neutral-500)]">Most Requested Topic</p>
                  <p className="text-lg font-bold text-[var(--color-neutral-900)] mt-1 truncate">{stats?.mostRequestedTopic || '—'}</p>
                  {stats?.mostRequestedTopicCount ? (
                    <p className="text-xs text-[var(--color-neutral-400)] mt-1">{stats.mostRequestedTopicCount} occurrences</p>
                  ) : (
                    <p className="text-xs text-[var(--color-neutral-400)] mt-1">No data</p>
                  )}
                </CardContent>
              </Card>
              <Card variant="elevated" padding="md">
                <CardContent>
                  <p className="text-xs text-[var(--color-neutral-500)]">Resolution Rate</p>
                  <p className={`text-2xl font-bold mt-1 ${(stats?.resolutionRate ?? 0) >= 70 ? 'text-[var(--color-success-600)]' : (stats?.resolutionRate ?? 0) >= 40 ? 'text-[var(--color-warning-600)]' : 'text-[var(--color-error-600)]'}`}>
                    {stats ? `${Math.round(stats.resolutionRate)}%` : '—'}
                  </p>
                  <Progress value={stats?.resolutionRate ?? 0} variant={(stats?.resolutionRate ?? 0) >= 70 ? 'success' : (stats?.resolutionRate ?? 0) >= 40 ? 'warning' : 'danger'} size="sm" className="mt-2" showLabel />
                </CardContent>
              </Card>
              <Card variant="elevated" padding="md">
                <CardContent>
                  <p className="text-xs text-[var(--color-neutral-500)]">Average Confidence</p>
                  <p className={`text-2xl font-bold mt-1 ${(stats?.averageConfidence ?? 0) >= 70 ? 'text-[var(--color-success-600)]' : (stats?.averageConfidence ?? 0) >= 40 ? 'text-[var(--color-warning-600)]' : 'text-[var(--color-error-600)]'}`}>
                    {stats ? `${Math.round(stats.averageConfidence)}%` : '—'}
                  </p>
                  <Progress value={stats?.averageConfidence ?? 0} variant={(stats?.averageConfidence ?? 0) >= 70 ? 'success' : (stats?.averageConfidence ?? 0) >= 40 ? 'warning' : 'danger'} size="sm" className="mt-2" showLabel />
                </CardContent>
              </Card>
            </div>

            {/* Clusters Section */}
            <Card variant="elevated" padding="md">
              <CardHeader>
                <CardTitle>Question Clusters</CardTitle>
              </CardHeader>
              <CardContent>
                {sortedClusters.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[var(--color-neutral-400)]">
                    <p>No unanswered question clusters found</p>
                    <p className="text-xs mt-1">Clusters will appear here when questions with similar topics go unanswered.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedClusters.map((cluster, i) => (
                      <Card key={i} variant="bordered" padding="md" className="hover:bg-[var(--color-neutral-50)] transition-colors">
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[var(--color-neutral-900)] truncate">{cluster.topic}</p>
                            <FrequencyBadge count={cluster.occurrenceCount} />
                          </div>
                          <p className="text-xs text-[var(--color-neutral-500)] italic">"{cluster.questionPattern}"</p>
                          <div className="flex items-center justify-between text-xs text-[var(--color-neutral-500)] pt-1 border-t border-[var(--color-neutral-100)]">
                            <span>{cluster.occurrenceCount} occurrences</span>
                            <span>Avg conf: {Math.round(cluster.averageConfidence)}%</span>
                            <span>{cluster.resolutionCount} resolved</span>
                          </div>
                          <Progress value={cluster.averageConfidence} variant={cluster.averageConfidence >= 70 ? 'success' : cluster.averageConfidence >= 40 ? 'warning' : 'danger'} size="sm" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Questions Table */}
            <Card variant="elevated" padding="md">
              <CardHeader>
                <CardTitle>Unanswered Questions</CardTitle>
              </CardHeader>
              <CardContent>
                {questions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[var(--color-neutral-400)]">
                    <p>No unanswered questions</p>
                    <p className="text-xs mt-1">All questions have been answered or resolved.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-neutral-200)]">
                          <th className="text-left py-3 px-2 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wider">Question</th>
                          <th className="text-left py-3 px-2 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wider">Confidence</th>
                          <th className="text-left py-3 px-2 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wider">Status</th>
                          <th className="text-left py-3 px-2 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wider">Escalation</th>
                          <th className="text-left py-3 px-2 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wider">Created</th>
                          <th className="text-left py-3 px-2 text-xs font-semibold text-[var(--color-neutral-500)] uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.map(q => (
                          <tr key={q.id} className="border-b border-[var(--color-neutral-100)] hover:bg-[var(--color-neutral-50)] transition-colors">
                            <td className="py-3 px-2">
                              <p className="text-sm text-[var(--color-neutral-900)] max-w-[280px] truncate" title={q.question}>{q.question}</p>
                              {q.clusterTopic && <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">{q.clusterTopic}</p>}
                            </td>
                            <td className="py-3 px-2">
                              <span className={`text-sm font-medium ${q.confidence >= 70 ? 'text-[var(--color-success-600)]' : q.confidence >= 40 ? 'text-[var(--color-warning-600)]' : 'text-[var(--color-error-600)]'}`}>
                                {Math.round(q.confidence)}%
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant={q.status === 'resolved' ? 'success' : q.status === 'reviewing' ? 'warning' : 'neutral'} size="sm">
                                {q.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              {q.escalated ? <Badge variant="error" size="sm">Escalated</Badge> : <span className="text-xs text-[var(--color-neutral-400)]">—</span>}
                            </td>
                            <td className="py-3 px-2 text-sm text-[var(--color-neutral-500)] whitespace-nowrap">{formatDate(q.createdAt)}</td>
                            <td className="py-3 px-2">
                              {q.status !== 'resolved' && (
                                <Button size="sm" variant="secondary" onClick={() => handleResolve(q.id)}>Resolve</Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Knowledge Suggestions Section */}
            <Card variant="elevated" padding="md">
              <CardHeader>
                <CardTitle>Knowledge Suggestions</CardTitle>
                <Button size="sm" variant="secondary" loading={generatingSuggestions} onClick={handleGenerateSuggestions}>Generate Suggestions</Button>
              </CardHeader>
              <CardContent>
                {sortedSuggestions.length === 0 && suggestions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[var(--color-neutral-400)]">
                    <p>No suggestions yet</p>
                    <p className="text-xs mt-1">Generate suggestions from unanswered questions to improve your knowledge base.</p>
                  </div>
                ) : sortedSuggestions.length === 0 && suggestions.some(s => s.status !== 'pending') ? (
                  <div className="py-6 text-center text-sm text-[var(--color-neutral-400)]">
                    <p>All suggestions have been reviewed</p>
                    <p className="text-xs mt-1">Generate new suggestions to find more knowledge gaps.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedSuggestions.map(s => (
                      <div key={s.id} className="flex items-start justify-between gap-4 p-4 rounded-lg border border-[var(--color-neutral-200)] hover:bg-[var(--color-neutral-50)] transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-[var(--color-neutral-900)]">{s.question}</p>
                            <Badge variant="primary" size="sm">Impact: {Math.round(s.impactScore)}%</Badge>
                          </div>
                          <p className="text-xs text-[var(--color-neutral-500)] line-clamp-2">{s.answer}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => handleDismissSuggestion(s.id)}>Dismiss</Button>
                          <Button size="sm" variant="primary" onClick={() => handleApplySuggestion(s.id)}>Apply</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
