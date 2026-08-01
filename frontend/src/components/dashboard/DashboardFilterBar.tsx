import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDef {
  key: string;
  label: string;
  options: FilterOption[];
  current?: string;
}

export interface DashboardFilterBarProps {
  filters: FilterDef[];
  onChange: (key: string, value: string | undefined) => void;
  onClearAll?: () => void;
  className?: string;
  children?: ReactNode;
}

function FilterChip({ label, current, options, onSelect }: { label: string; current?: string; options: FilterOption[]; onSelect: (val: string | undefined) => void }) {
  const activeLabel = options.find((o) => o.value === current)?.label;

  return (
    <div className="relative group">
      <select
        value={current || ''}
        onChange={(e) => onSelect(e.target.value || undefined)}
        className={cn(
          'appearance-none rounded-xl border px-3 py-1.5 pr-8 text-xs transition focus:outline-none focus:ring-1 focus:ring-ring',
          current
            ? 'border-border-strong bg-white/[0.04] text-foreground'
            : 'border-hairline bg-transparent text-muted-foreground hover:border-border hover:text-foreground',
        )}
        aria-label={label}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
      {current && (
        <button
          onClick={() => onSelect(undefined)}
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-background border border-hairline text-muted-foreground transition hover:text-foreground"
          aria-label={`Clear ${label} filter`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

export function DashboardFilterBar({ filters, onChange, onClearAll, children, className }: DashboardFilterBarProps) {
  const hasActive = filters.some((f) => f.current);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {filters.map((f) => (
        <FilterChip
          key={f.key}
          label={f.label}
          current={f.current}
          options={f.options}
          onSelect={(val) => onChange(f.key, val)}
        />
      ))}
      {children}
      {hasActive && onClearAll && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground transition hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
