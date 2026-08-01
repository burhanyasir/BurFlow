import { type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface DashboardMetricGridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: 2 | 3 | 4 | 5 | 6;
}

const colClasses = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
  6: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
};

export function DashboardMetricGrid({ columns = 4, children, className, ...props }: DashboardMetricGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-3', colClasses[columns], className)} {...props}>
      {children}
    </div>
  );
}
