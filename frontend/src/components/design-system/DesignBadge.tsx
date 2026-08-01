import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface DesignBadgeProps {
  icon?: ReactNode;
  label: string;
  tone?: 'wine' | 'gold' | 'default' | 'success' | 'warning';
  className?: string;
}

const toneStyles: Record<string, string> = {
  wine: 'text-white border border-white/10',
  gold: 'text-foreground/90 border border-hairline',
  default: 'glass text-muted-foreground border border-hairline',
  success: 'bg-success/10 text-success border border-success/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
};

const toneBg: Record<string, string | undefined> = {
  wine: 'wine-gradient',
  gold: undefined,
  default: undefined,
  success: undefined,
  warning: undefined,
};

export function DesignBadge({ icon, label, tone = 'default', className }: DesignBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
        toneStyles[tone],
        toneBg[tone] && toneBg[tone],
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}

export interface DesignConfidenceBadgeProps {
  value: number;
  className?: string;
}

export function DesignConfidenceBadge({ value, className }: DesignConfidenceBadgeProps) {
  return (
    <span className={cn('glass inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium', className)}>
      <span className="text-muted-foreground">Confidence</span>
      <span className="relative h-1 w-16 overflow-hidden rounded-full bg-white/10">
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${value}%`, background: 'var(--gradient-wine)' }}
        />
      </span>
      <span className="text-foreground">{value}%</span>
    </span>
  );
}
