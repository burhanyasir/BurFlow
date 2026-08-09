import { Badge } from '../../dashboard';
import { cn } from '../../../utils/cn';
import { Globe, RefreshCw, Clock } from 'lucide-react';
import type { WebsiteScan } from './types';

interface ScanProgressCardProps {
  scan: WebsiteScan | null;
  onRefresh?: () => void;
  onScheduleChange?: (schedule: WebsiteScan['schedule']) => void;
  className?: string;
}

const STATUS_VARIANT: Record<WebsiteScan['status'], 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  queued: 'warning',
  crawling: 'info',
  completed: 'success',
  failed: 'error',
  cancelled: 'neutral',
};

function formatWhen(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const COUNT_ITEMS: { key: keyof Pick<WebsiteScan, 'pagesDiscovered' | 'pagesScanned' | 'pagesIndexed' | 'pagesAdded' | 'pagesUpdated' | 'pagesUnchanged' | 'pagesDeleted'>; label: string; accent?: boolean }[] = [
  { key: 'pagesDiscovered', label: 'Discovered' },
  { key: 'pagesScanned', label: 'Scanned' },
  { key: 'pagesIndexed', label: 'Indexed', accent: true },
  { key: 'pagesAdded', label: 'Added', accent: true },
  { key: 'pagesUpdated', label: 'Updated' },
  { key: 'pagesUnchanged', label: 'Unchanged' },
  { key: 'pagesDeleted', label: 'Deleted' },
];

export function ScanProgressCard({ scan, onRefresh, onScheduleChange, className }: ScanProgressCardProps) {
  if (!scan) return null;

  const active = scan.status === 'queued' || scan.status === 'crawling';
  const progress = scan.pagesDiscovered > 0 ? Math.round((scan.pagesScanned / scan.pagesDiscovered) * 100) : 0;

  return (
    <div className={cn('glass rounded-2xl p-5', className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wine/[0.12] shrink-0">
            <Globe className={cn('h-4 w-4 text-wine', active && 'animate-pulse')} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">{scan.rootUrl}</p>
              <Badge variant={STATUS_VARIANT[scan.status]} size="sm" dot>{scan.status}</Badge>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {active ? `Started ${formatWhen(scan.startedAt)}` : `Finished ${formatWhen(scan.completedAt)}`}
              {scan.schedule !== 'manual' && <span>· Auto {scan.schedule}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={scan.schedule}
            onChange={(e) => onScheduleChange?.(e.target.value as WebsiteScan['schedule'])}
            className="rounded-lg border border-hairline bg-white/[0.02] px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-wine/30"
            aria-label="Scan schedule"
          >
            <option value="manual">Manual</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-hairline text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition"
              aria-label="Refresh scan status"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', active && 'animate-spin')} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Crawl progress</span>
          <span className="text-xs font-medium text-foreground tabular-nums">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn('h-full rounded-full transition-all duration-500', active ? 'bg-wine animate-pulse' : 'bg-success/70')} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {COUNT_ITEMS.map(item => (
          <div key={item.key} className="rounded-xl border border-hairline bg-white/[0.02] px-2 py-2 text-center">
            <p className={cn('text-sm font-bold tabular-nums', item.accent ? 'text-wine' : 'text-foreground')}>{scan[item.key]}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{item.label}</p>
          </div>
        ))}
      </div>

      {scan.lastError && (
        <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-xs text-destructive">
          {scan.lastError}
        </p>
      )}
    </div>
  );
}
