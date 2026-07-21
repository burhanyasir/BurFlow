import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import { pageTransition } from '../utils/motion';
import { Sidebar, type SidebarItem } from './Sidebar';

export interface AppLayoutProps {
  children: ReactNode;
  sidebarItems: SidebarItem[];
  onNavigate: (item: SidebarItem) => void;
  breadcrumb?: ReactNode;
  userMenu?: ReactNode;
  workspaceName?: string;
  upgradeBanner?: React.ReactNode;
  className?: string;
}

export function AppLayout({ children, sidebarItems, onNavigate, breadcrumb, userMenu, workspaceName, upgradeBanner, className }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#F8F9FA]">
      <Sidebar
        items={sidebarItems}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        workspaceName={workspaceName}
        upgradeBanner={upgradeBanner}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 border-b border-[#D0D5DD] bg-white flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">{breadcrumb}</div>
          <div className="flex items-center gap-3">{userMenu}</div>
        </header>
        <motion.main
          variants={pageTransition}
          initial="initial"
          animate="enter"
          exit="exit"
          className={cn('flex-1 overflow-auto p-4 lg:p-6', className)}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
