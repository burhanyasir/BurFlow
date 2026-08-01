import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import { DashboardChartCard } from '../DashboardChartCard';
import { DashboardEmptyState } from '../DashboardEmptyState';
import { Book, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

export interface KnowledgeSource {
  name: string;
  citationCount: number;
  status: 'indexed' | 'failed' | 'processing';
}

export interface DashboardKnowledgeHealthSectionProps extends HTMLAttributes<HTMLDivElement> {
  sources: KnowledgeSource[];
  totalDocs: number;
  indexedDocs: number;
  failedDocs?: number;
  coverage: number;
  loading?: boolean;
  empty?: boolean;
  onSourceClick?: (source: KnowledgeSource) => void;
}

const statusMeta = {
  indexed: { icon: CheckCircle, color: 'text-success', label: 'Indexed' },
  failed: { icon: XCircle, color: 'text-destructive', label: 'Failed' },
  processing: { icon: Clock, color: 'text-warning', label: 'Processing' },
};

export function DashboardKnowledgeHealthSection({
  sources, totalDocs, indexedDocs, failedDocs = 0, coverage, loading, empty, onSourceClick, className, ...props
}: DashboardKnowledgeHealthSectionProps) {
  return (
    <DashboardChartCard title="Knowledge Health" subtitle={`${coverage}% coverage`} loading={loading} empty={empty} className={cn('h-full', className)} {...props}>
      {totalDocs === 0 ? (
        <DashboardEmptyState
          title="No documents yet"
          description="Upload documents to start building your knowledge base."
          icon={<Book className="h-6 w-6 text-muted-foreground" />}
        />
      ) : (
        <div className="space-y-3">
          {/* Coverage bar */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Indexing progress</span>
              <span className={cn('font-medium tabular-nums', coverage >= 80 ? 'text-success' : coverage >= 50 ? 'text-warning' : 'text-destructive')}>
                {indexedDocs}/{totalDocs} docs
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  coverage >= 80 ? 'bg-success' : coverage >= 50 ? 'bg-warning' : 'bg-destructive',
                )}
                style={{ width: `${Math.min(coverage, 100)}%` }}
              />
            </div>
          </div>

          {/* Source list */}
          <div className="space-y-1">
            {sources.map((s, i) => {
              const meta = statusMeta[s.status];
              const Icon = meta.icon;
              return (
                <div
                  key={`${s.name}-${i}`}
                  onClick={() => onSourceClick?.(s)}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-3 py-2 transition',
                    onSourceClick && 'cursor-pointer hover:bg-white/[0.03]',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn('h-3.5 w-3.5 shrink-0', meta.color)} />
                    <span className="text-sm text-foreground/80 truncate">{s.name}</span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{s.citationCount} citations</span>
                </div>
              );
            })}
          </div>

          {failedDocs > 0 && (
            <p className="text-xs text-destructive/80">{failedDocs} document{failedDocs !== 1 ? 's' : ''} failed to index</p>
          )}
        </div>
      )}
    </DashboardChartCard>
  );
}
