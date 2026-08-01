import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface DashboardRightRailProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
  width?: 'narrow' | 'wide';
}

export function DashboardRightRail({ title, children, width = 'narrow', className, ...props }: DashboardRightRailProps) {
  return (
    <aside className={cn(
      'hidden border-l border-hairline bg-background/50 xl:flex xl:flex-col',
      width === 'narrow' ? 'xl:w-72 2xl:w-80' : 'xl:w-80 2xl:w-96',
      className,
    )} {...props}>
      {title && (
        <div className="border-b border-hairline px-5 py-4">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </aside>
  );
}
