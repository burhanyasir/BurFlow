import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { DashboardSidebar, type NavItem } from './DashboardSidebar';
import { DashboardTopbar } from './DashboardTopbar';

export interface DashboardLayoutProps extends HTMLAttributes<HTMLDivElement> {
  sidebarItems: NavItem[];
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
}

export function DashboardLayout({
  sidebarItems, onNavigate, breadcrumb, rightRail, workspaceName, planName, userName, userEmail,
  usageLabel, usagePercent, notificationCount, onNotificationsClick,
  onUpgrade, onLogout, onSettings,
  children, className, ...props
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased" {...props}>
      <DashboardSidebar
        items={sidebarItems}
        onNavigate={onNavigate}
        workspaceName={workspaceName}
        planName={planName}
        userName={userName}
        userEmail={userEmail}
        usageLabel={usageLabel}
        usagePercent={usagePercent}
        onUpgrade={onUpgrade}
        onLogout={onLogout}
        onSettings={onSettings}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardTopbar
          breadcrumb={breadcrumb}
          notificationCount={notificationCount}
          onNotificationsClick={onNotificationsClick}
        />
        <div className="flex flex-1 min-h-0">
          <div className={cn('flex flex-1 flex-col', className)}>
            {children}
          </div>
          {rightRail}
        </div>
      </div>
    </div>
  );
}
