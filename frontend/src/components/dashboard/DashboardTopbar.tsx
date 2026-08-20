import { Search, Bell } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils/cn';

export interface DashboardTopbarProps {
  breadcrumb?: React.ReactNode;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  notificationCount?: number;
  onNotificationsClick?: () => void;
  userName?: string;
  className?: string;
  workspaceSwitcher?: React.ReactNode;
}

export function DashboardTopbar({
  breadcrumb, searchPlaceholder = 'Search conversations, documents...', onSearch, notificationCount, onNotificationsClick, className, workspaceSwitcher,
}: DashboardTopbarProps) {
  const [searchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  return (
    <header className={cn('sticky top-0 z-30 flex h-16 items-center justify-between border-b border-hairline bg-background/80 px-4 backdrop-blur-2xl lg:px-6', className)}>
      <div className="flex items-center gap-4 min-w-0">
        {workspaceSwitcher}
        {breadcrumb && <div className="min-w-0">{breadcrumb}</div>}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className={cn('hidden items-center lg:flex', searchOpen && 'flex')}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchValue}
              onChange={(e) => { setSearchValue(e.target.value); onSearch?.(e.target.value); }}
              placeholder={searchPlaceholder}
              className="h-9 w-56 rounded-xl border border-hairline bg-white/[0.03] pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition focus:w-72 focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-hairline bg-white/[0.04] px-1.5 text-[10px] text-muted-foreground/60 lg:inline">/</kbd>
          </div>
        </div>

        {/* Notifications */}
        <button
          onClick={onNotificationsClick}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {notificationCount && notificationCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-wine px-1 text-[9px] font-semibold text-white">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
}
