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

const NAV_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget' },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
  { label: 'Citations', href: '/dashboard/citations', active: true },
];

interface OverviewData {
  totalCitations: number;
  uniqueDocuments: number;
  averageConfidence: number;
}

interface ConfidenceBucket {
  range: string;
  count: number;
  percentage: number;
}

interface TopDocument {
  documentName: string;
  citationCount: number;
  avgConfidence: number;
  lastCited: string;
}

const CONFIDENCE_LABELS = ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'];

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function confidenceVariant(pct: number): 'danger' | 'warning' | 'success' {
  if (pct < 40) return 'danger';
  if (pct < 70) return 'warning';
  return 'success';
}

export default function CitationDashboard() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [distribution, setDistribution] = useState<ConfidenceBucket[]>([]);
  const [topDocs, setTopDocs] = useState<TopDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, distRes, docsRes] = await Promise.allSettled([
        fetchWithAuth('/api/admin/citations/overview'),
        fetchWithAuth('/api/admin/citations/confidence-distribution'),
        fetchWithAuth('/api/admin/citations/top-documents'),
      ]);

      if (overviewRes.status === 'fulfilled') {
        if (overviewRes.value.ok) setOverview(await overviewRes.value.json());
        else addToast('Failed to load citation overview', 'error');
      } else addToast('Citation overview request failed', 'error');

      if (distRes.status === 'fulfilled') {
        if (distRes.value.ok) {
          const body = await distRes.value.json();
          setDistribution(body.distribution || []);
        } else addToast('Failed to load confidence distribution', 'error');
      } else addToast('Confidence distribution request failed', 'error');

      if (docsRes.status === 'fulfilled') {
        if (docsRes.value.ok) {
          const body = await docsRes.value.json();
          const sorted = (body.documents || []).sort((a: TopDocument, b: TopDocument) => b.citationCount - a.citationCount);
          setTopDocs(sorted);
        } else addToast('Failed to load top cited documents', 'error');
      } else addToast('Top documents request failed', 'error');
    } catch {
      addToast('Citation dashboard data load failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleNavigate = (item: SidebarItem) => {
    if (item.href) navigate(item.href);
  };

  return (
    <AppLayout sidebarItems={NAV_ITEMS} onNavigate={handleNavigate} workspaceName="Conversation Engine">
      <div className="space-y-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="md"><div className="h-24 bg-[var(--color-neutral-50)] animate-pulse rounded" /></Card>
            ))}
          </div>
        ) : (
          <>
            {/* Section 1: Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="elevated" padding="md">
                <CardContent>
                  <p className="text-xs text-[var(--color-neutral-500)] uppercase tracking-wider font-medium">Total Citations Cited</p>
                  <p className="text-2xl font-bold text-[var(--color-neutral-900)] mt-1">{overview?.totalCitations ?? 0}</p>
                  <p className="text-xs text-[var(--color-neutral-400)] mt-1">Across all conversations</p>
                </CardContent>
              </Card>
              <Card variant="elevated" padding="md">
                <CardContent>
                  <p className="text-xs text-[var(--color-neutral-500)] uppercase tracking-wider font-medium">Unique Documents Referenced</p>
                  <p className="text-2xl font-bold text-[var(--color-neutral-900)] mt-1">{overview?.uniqueDocuments ?? 0}</p>
                  <p className="text-xs text-[var(--color-neutral-400)] mt-1">Knowledge sources cited</p>
                </CardContent>
              </Card>
              <Card variant="elevated" padding="md">
                <CardContent>
                  <p className="text-xs text-[var(--color-neutral-500)] uppercase tracking-wider font-medium">Average Citation Confidence</p>
                  <p className="text-2xl font-bold text-[var(--color-neutral-900)] mt-1">{overview?.averageConfidence ?? 0}%</p>
                  <Progress value={overview?.averageConfidence ?? 0} variant={confidenceVariant(overview?.averageConfidence ?? 0)} size="sm" showLabel className="mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* Section 2: Confidence Distribution */}
            <Card variant="elevated" padding="md">
              <CardHeader>
                <CardTitle>Confidence Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {distribution.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[var(--color-neutral-400)]">
                    <p>No citation data available</p>
                    <p className="text-xs mt-1">Distribution will appear once citations are recorded.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {CONFIDENCE_LABELS.map(label => {
                      const bucket = distribution.find(d => d.range === label);
                      const count = bucket?.count ?? 0;
                      const pct = bucket?.percentage ?? 0;
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium text-[var(--color-neutral-700)]">{label}</span>
                            <span className="text-[var(--color-neutral-500)]">{count} citations ({pct}%)</span>
                          </div>
                          <Progress
                            value={pct}
                            max={100}
                            variant={confidenceVariant(parseInt(label))}
                            size="md"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 3: Top Cited Documents */}
            <Card variant="elevated" padding="md">
              <CardHeader>
                <CardTitle>Top Cited Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {topDocs.length === 0 ? (
                  <div className="py-6 text-center text-sm text-[var(--color-neutral-400)]">
                    <p>No documents cited yet</p>
                    <p className="text-xs mt-1">Documents will appear here as citations are recorded in conversations.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-neutral-200)]">
                          <th className="text-left py-2 pr-4 font-medium text-[var(--color-neutral-500)]">Document</th>
                          <th className="text-right py-2 px-4 font-medium text-[var(--color-neutral-500)]">Citations</th>
                          <th className="text-right py-2 px-4 font-medium text-[var(--color-neutral-500)]">Avg Confidence</th>
                          <th className="text-right py-2 pl-4 font-medium text-[var(--color-neutral-500)]">Last Cited</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topDocs.map((doc, i) => (
                          <tr key={i} className="border-b border-[var(--color-neutral-100)] hover:bg-[var(--color-neutral-50)] transition-colors">
                            <td className="py-3 pr-4 font-medium text-[var(--color-neutral-900)]">{doc.documentName}</td>
                            <td className="py-3 px-4 text-right">
                              <Badge variant="primary" size="sm">{doc.citationCount}</Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`font-semibold ${confidenceVariant(doc.avgConfidence) === 'danger' ? 'text-[var(--color-error-600)]' : confidenceVariant(doc.avgConfidence) === 'warning' ? 'text-[var(--color-warning-600)]' : 'text-[var(--color-success-600)]'}`}>
                                {doc.avgConfidence}%
                              </span>
                            </td>
                            <td className="py-3 pl-4 text-right text-[var(--color-neutral-500)]">{formatDate(doc.lastCited)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
