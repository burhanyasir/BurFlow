import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: boolean;
}

const gapClasses = { none: 'gap-0', sm: 'gap-2', md: 'gap-4', lg: 'gap-6', xl: 'gap-8' };

const colClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  12: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12'
};

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 1, gap = 'lg', responsive = true, children, ...props }, ref) => {
    const colsClass = responsive ? colClasses[cols] : `grid-cols-${cols}`;
    return (
      <div ref={ref} className={cn('grid', colsClass, gapClasses[gap], className)} {...props}>
        {children}
      </div>
    );
  }
);
Grid.displayName = 'Grid';
