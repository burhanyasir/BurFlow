import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { DashShell } from '../dash/shell';
import type { NavItem } from './DashboardSidebar';

export interface DashboardLayoutProps {
  sidebarItems?: unknown[];
  onNavigate?: (item: NavItem) => void;
  breadcrumb?: ReactNode;
  rightRail?: ReactNode;
  workspaceName?: string;
  planName?: string;
  userName?: string;
  userEmail?: string;
  usageLabel?: string;
  usagePercent?: number;
  notificationCount?: number;
  onNotificationsClick?: () => void;
  onUpgrade?: () => void;
  onLogout?: () => void;
  onSettings?: () => void;
  children?: ReactNode;
  className?: string;
}

export function DashboardLayout({
  rightRail,
  children,
  className,
}: DashboardLayoutProps) {
  return (
    <DashShell className={className}>
      <div className={cn('flex w-full', rightRail ? 'flex-row' : 'flex-col')}>
        <div className="min-w-0 flex-1">{children}</div>
        {rightRail}
      </div>
    </DashShell>
  );
}
