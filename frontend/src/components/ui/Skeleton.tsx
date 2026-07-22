import { cn } from '../../utils/cn';

export interface SkeletonProps {
  variant?: 'text' | 'card' | 'table' | 'chart' | 'circle';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ variant = 'text', width, height, className }: SkeletonProps) {
  const base = 'animate-pulse bg-[var(--color-neutral-50)] rounded-md';
  const variants = {
    text: 'h-4 w-full',
    card: 'h-32 w-full rounded-xl',
    table: 'h-10 w-full',
    chart: 'h-48 w-full rounded-lg',
    circle: 'h-10 w-10 rounded-full'
  };
  return <div className={cn(base, variants[variant], className)} style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--color-neutral-200)] p-4 space-y-3">
      <Skeleton variant="circle" />
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" />
      <Skeleton variant="text" width="40%" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="table" className={i === 0 ? 'bg-[var(--color-neutral-100)]' : ''} />
      ))}
    </div>
  );
}
