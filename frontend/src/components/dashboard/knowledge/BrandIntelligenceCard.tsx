import { cn } from '../../../utils/cn';
import { Sparkles, Percent } from 'lucide-react';
import type { WebsiteScan } from './types';

interface BrandIntelligenceCardProps {
  scan: WebsiteScan | null;
  className?: string;
}

export function BrandIntelligenceCard({ scan, className }: BrandIntelligenceCardProps) {
  if (!scan || !scan.brandTone) return null;

  const confidence = Math.round((scan.confidenceScore || 0) * 100);

  return (
    <div className={cn('glass rounded-2xl p-5', className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/[0.12] shrink-0">
          <Sparkles className="h-4 w-4 text-success" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Brand Intelligence</p>
          <p className="text-xs text-muted-foreground">Detected from the latest website scan</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Brand tone</span>
          <span className="rounded-lg bg-success/[0.1] px-2.5 py-1 text-xs font-medium text-success">{scan.brandTone}</span>
        </div>

        {scan.primaryCtas.length > 0 && (
          <div className="flex items-start justify-between gap-4">
            <span className="text-xs text-muted-foreground pt-1">Primary CTAs</span>
            <div className="flex flex-wrap justify-end gap-1.5">
              {scan.primaryCtas.map(cta => (
                <span key={cta} className="rounded-lg border border-hairline bg-white/[0.03] px-2.5 py-1 text-xs text-foreground">
                  {cta}
                </span>
              ))}
            </div>
          </div>
        )}

        {typeof scan.confidenceScore === 'number' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Percent className="h-3 w-3" />
                Confidence
              </span>
              <span className="text-xs font-medium text-foreground tabular-nums">{confidence}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden" role="progressbar" aria-valuenow={confidence} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-success/70 transition-all duration-500" style={{ width: `${confidence}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
