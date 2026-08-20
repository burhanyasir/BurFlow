import { ChevronLeft, ChevronDown, LogOut, Settings, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';

export interface NavItem {
  icon?: React.ReactNode;
  label: string;
  href?: string;
  active?: boolean;
  badge?: string | number;
  items?: NavItem[];
}

export interface DashboardSidebarProps {
  items: NavItem[];
  onNavigate?: (item: NavItem) => void;
  workspaceName?: string;
  planName?: string;
  userName?: string;
  userEmail?: string;
  usageLabel?: string;
  usagePercent?: number;
  onUpgrade?: () => void;
  onLogout?: () => void;
  onSettings?: () => void;
  className?: string;
}

function SidebarUserMenu({ userName, userEmail, onLogout, onSettings }: {
  userName?: string; userEmail?: string; onLogout?: () => void; onSettings?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.04]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg wine-gradient text-[11px] font-semibold text-white">
          {userName ? userName.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{userName || 'User'}</div>
          <div className="truncate text-[11px] text-muted-foreground">{userEmail || ''}</div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-xl border border-hairline glass-strong">
            <button onClick={() => { setOpen(false); onSettings?.(); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-foreground/80 transition hover:bg-white/[0.04]">
              <Settings className="h-4 w-4 text-muted-foreground" /> Settings
            </button>
            <button onClick={() => { setOpen(false); onLogout?.(); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-foreground/80 transition hover:bg-white/[0.04]">
              <LogOut className="h-4 w-4 text-muted-foreground" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function DashboardSidebar({
  items, onNavigate, workspaceName, planName, userName, userEmail, usageLabel, usagePercent = 0, onUpgrade, onLogout, onSettings, className,
}: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const getIsActive = (item: NavItem) => item.active ?? (item.href ? location.pathname === item.href || location.pathname.startsWith(`${item.href}/`) : false);

  return (
    <>
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full wine-gradient text-white shadow-lg lg:hidden"
        aria-label="Open sidebar"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <aside className={cn(
        'flex flex-col border-r border-hairline bg-background transition-all duration-300',
        collapsed ? 'w-[4.5rem]' : 'w-64',
        'hidden lg:flex',
        className,
      )}>
        {/* Logo + workspace */}
        <div className="flex items-center justify-between border-b border-hairline px-4 py-4">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg wine-gradient text-xs font-semibold text-white">
                {workspaceName ? workspaceName.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{workspaceName || 'Workspace'}</div>
                {planName && <div className="text-[10px] uppercase tracking-wider text-gold">{planName}</div>}
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={cn('h-4 w-4 transition', collapsed && 'rotate-180')} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {items.map((item, i) => {
            const isActive = getIsActive(item);
            return (
              <button
                key={i}
                onClick={() => onNavigate?.(item)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition text-left',
                  isActive
                    ? 'wine-gradient text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                )}
              >
              {item.icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>}
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className={cn(
                  'inline-flex h-5 items-center rounded-full px-1.5 text-[10px] font-medium',
                  isActive ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-muted-foreground',
                )}>
                  {item.badge}
                </span>
              )}
              </button>
            );
          })}
        </nav>

        {/* Usage bar */}
        {!collapsed && usagePercent > 0 && (
          <div className="border-t border-hairline px-4 py-3">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{usageLabel || 'Usage'}</span>
              <span className="text-muted-foreground">{usagePercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full wine-gradient transition-all duration-500"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Upgrade CTA */}
        {!collapsed && onUpgrade && (
          <div className="border-t border-hairline px-3 py-3">
            <button onClick={onUpgrade} className="w-full rounded-xl border border-gold/30 bg-gold/[0.06] px-3 py-2.5 text-center text-xs font-medium text-gold transition hover:bg-gold/[0.12]">
              Upgrade plan
            </button>
          </div>
        )}

        {/* User menu */}
        <div className="border-t border-hairline p-2">
          <SidebarUserMenu userName={userName} userEmail={userEmail} onLogout={onLogout} onSettings={onSettings} />
        </div>
      </aside>

      {/* Mobile overlay */}
      {!collapsed && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setCollapsed(true)} />
          <aside className={cn(
            'fixed left-0 top-0 bottom-0 z-50 flex w-72 flex-col border-r border-hairline bg-background shadow-2xl lg:hidden',
          )}>
            <div className="flex items-center justify-between border-b border-hairline px-4 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg wine-gradient text-xs font-semibold text-white">
                  {workspaceName ? workspaceName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{workspaceName || 'Workspace'}</div>
                  {planName && <div className="text-[10px] uppercase tracking-wider text-gold">{planName}</div>}
                </div>
              </div>
              <button onClick={() => setCollapsed(true)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[0.04]">
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
              {items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => { onNavigate?.(item); setCollapsed(true); }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition text-left',
                    getIsActive(item) ? 'wine-gradient text-white' : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                  )}
                >
                  {item.icon && <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className={cn('inline-flex h-5 items-center rounded-full px-1.5 text-[10px] font-medium', getIsActive(item) ? 'bg-white/20 text-white' : 'bg-white/[0.06]')}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <div className="border-t border-hairline p-2">
              <SidebarUserMenu userName={userName} userEmail={userEmail} onLogout={onLogout} onSettings={onSettings} />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
