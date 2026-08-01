import { cn } from '../../utils/cn';

export interface DesignSparklineProps {
  points: number[];
  positive?: boolean;
  className?: string;
  height?: number;
}

export function DesignSparkline({ points, positive = true, className, height = 30 }: DesignSparklineProps) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const h = height - 2;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = h - ((p - min) / (max - min || 1)) * (h - 4);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  const id = `sp-${points.join('')}-${positive}`;

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className={cn('w-full', className)} style={{ height }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? 'var(--color-primary-soft)' : 'var(--color-subtle)'} stopOpacity="0.35" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L100,${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path
        d={path}
        fill="none"
        stroke={positive ? 'var(--color-primary-soft)' : 'var(--color-subtle)'}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
    </svg>
  );
}
