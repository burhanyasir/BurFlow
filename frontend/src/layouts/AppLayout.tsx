import { type ReactNode } from 'react';
import { DashShell } from '../components/dash/shell';
import type { SidebarItem } from './Sidebar';

export interface AppLayoutProps {
  children: ReactNode;
  sidebarItems: unknown[];
  onNavigate: (item: SidebarItem) => void;
  breadcrumb?: ReactNode;
  userMenu?: ReactNode;
  workspaceName?: string;
  upgradeBanner?: ReactNode;
  className?: string;
}

export function AppLayout({ children, className }: AppLayoutProps) {
  return <DashShell className={className}>{children}</DashShell>;
}
