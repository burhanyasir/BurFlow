import { type HTMLAttributes, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../utils/cn';

export interface SidebarItem {
  icon?: React.ReactNode;
  label: string;
  href?: string;
  active?: boolean;
  badge?: string | number;
  items?: SidebarItem[];
}

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  items: SidebarItem[];
  onNavigate?: (item: SidebarItem) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  workspaceName?: string;
  upgradeBanner?: React.ReactNode;
}

export function Sidebar({ items, onNavigate, collapsed, onToggleCollapse, workspaceName, upgradeBanner, className }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-16 border-b border-[var(--color-neutral-200)]">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-[var(--color-accent-600)] flex items-center justify-center text-white text-xs font-bold shrink-0">CE</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-neutral-900)] truncate">{workspaceName || 'Workspace'}</p>
            </div>
          </div>
        )}
        <button onClick={onToggleCollapse} className="p-1.5 rounded-md text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-50)] transition-colors hidden lg:flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <svg className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => onNavigate?.(item)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-left',
              item.active ? 'bg-[var(--color-accent-200)] text-[var(--color-accent-600)] font-medium' : 'text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-50)] hover:text-[var(--color-neutral-900)]'
            )}
          >
            {item.icon && <span className="h-5 w-5 shrink-0">{item.icon}</span>}
            {!collapsed && <span className="truncate flex-1">{item.label}</span>}
            {!collapsed && item.badge && (
              <span className="h-5 px-1.5 flex items-center text-xs font-medium rounded-full bg-[var(--color-accent-200)] text-[var(--color-accent-600)]">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>
      {!collapsed && upgradeBanner && <div className="p-2">{upgradeBanner}</div>}
    </div>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)} className="lg:hidden fixed bottom-4 left-4 z-40 h-10 w-10 rounded-full bg-[var(--color-accent-600)] text-white shadow-lg flex items-center justify-center" aria-label="Open sidebar">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <aside className={cn('hidden lg:flex flex-col bg-white border-r border-[var(--color-neutral-200)] transition-all duration-200', collapsed ? 'w-[4.5rem]' : 'w-64', className)}>
        {sidebarContent}
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="fixed inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed left-0 top-0 bottom-0 w-72 bg-white shadow-xl" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              <div className="flex justify-end p-2"><button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-50)]" aria-label="Close sidebar"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
