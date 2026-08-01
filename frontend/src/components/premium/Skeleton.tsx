import { cn } from '../../utils/cn';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle' | 'chart';
  width?: string;
  height?: string;
}

export function Skeleton({ className, variant = 'text', width, height }: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 rounded',
    card: 'h-32 rounded-[var(--radius-lg)]',
    circle: 'h-10 w-10 rounded-full',
    chart: 'h-48 rounded-[var(--radius-lg)]',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-[rgba(255,255,255,0.05)]',
        variantStyles[variant],
        'before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-[rgba(255,255,255,0.08)] before:to-transparent before:animate-[shimmer_1.5s_infinite]',
        className,
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="!h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton variant="chart" className="lg:col-span-2" />
        <Skeleton variant="card" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    </div>
  );
}
