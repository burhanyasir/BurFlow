import { useEffect, useState, type ReactNode, type ComponentType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  ChevronLeft,
  Clock,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MessageCircle,
  MessageSquare,
  Quote,
  Rocket,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import { Logo } from '../landing/primitives';
import { useAuth } from '../../lib/auth-context';
import { isAdmin } from '../../lib/rbac';
import { fetchWithAuth } from '../../lib/api-client';

interface DashNavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  admin?: boolean;
}

const NAV: DashNavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/dashboard/conversations', label: 'Conversations', icon: MessageSquare },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/knowledge', label: 'Knowledge', icon: BookOpen },
  { to: '/dashboard/widget', label: 'Widget', icon: MessageCircle },
  { to: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { to: '/dashboard/onboarding', label: 'Onboarding', icon: Rocket },
];

const NAV_MORE: DashNavItem[] = [
  { to: '/dashboard/leads', label: 'Leads', icon: Users },
  { to: '/agent', label: 'Agent inbox', icon: Bot },
  { to: '/dashboard/insights', label: 'Insights', icon: Lightbulb, admin: true },
  { to: '/dashboard/unanswered', label: 'Unanswered', icon: HelpCircle, admin: true },
  { to: '/dashboard/citations', label: 'Citations', icon: Quote, admin: true },
  { to: '/dashboard/followups', label: 'Follow-ups', icon: Clock, admin: true },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings, admin: true },
];

function isActive(item: DashNavItem, pathname: string) {
  return item.exact ? pathname === item.to : pathname.startsWith(item.to);
}

export function DashShell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const [billing, setBilling] = useState<{
    planName?: string;
    usageThisMonth?: number;
    usageLimit?: number;
    companyName?: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetchWithAuth('/api/billing/current')
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (active) setBilling(b || null);
      })
      .catch(() => {
        if (active) setBilling(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleNav = [...NAV, ...NAV_MORE].filter((n) => !n.admin || isAdmin(user));
  const mainNav = visibleNav.filter((n) => !n.admin);
  const moreNav = visibleNav.filter((n) => n.admin);
  const planName = billing?.planName || 'Free';
  const usageThisMonth = billing?.usageThisMonth ?? 0;
  const usageLimit = billing?.usageLimit ?? 100;
  const usagePercent = usageLimit > 0 ? Math.min(Math.round((usageThisMonth / usageLimit) * 100), 100) : 0;
  const email = user?.email || '';
  const displayName = user?.name || email.split('@')[0] || 'User';

  const NavLink = ({ item, compact }: { item: DashNavItem; compact?: boolean }) => {
    const active = isActive(item, pathname);
    return (
      <Link
        to={item.to}
        title={item.label}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          active
            ? 'bg-accent text-accent-foreground shadow-soft'
            : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
        }`}
      >
        <item.icon className={`size-4 shrink-0 ${active ? 'text-primary' : ''}`} />
        {!compact && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* ─── Sidebar (desktop) ─────────────────────────────────── */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-hairline bg-surface md:flex ${
          collapsed ? 'w-[74px]' : 'w-64'
        } transition-[width] duration-300`}
      >
        <div className="relative flex h-16 items-center px-4">
          {collapsed ? (
            <Link to="/" className="mx-auto">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                B
              </span>
            </Link>
          ) : (
            <Link to="/" aria-label="BurFlow home">
              <Logo />
            </Link>
          )}
          <button
            aria-label="Toggle sidebar"
            onClick={() => setCollapsed((c) => !c)}
            className={`grid size-7 place-items-center rounded-lg border border-hairline bg-surface text-muted-foreground transition hover:text-foreground ${
              collapsed ? 'absolute right-[-14px] top-5 z-10 shadow-soft' : ''
            }`}
          >
            <ChevronLeft className={`size-4 transition ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {mainNav.map((item) => (
            <NavLink key={item.to} item={item} compact={collapsed} />
          ))}
          {moreNav.length > 0 && (
            <>
              <div className="my-3 h-px bg-hairline" />
              {moreNav.map((item) => (
                <NavLink key={item.to} item={item} compact={collapsed} />
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-hairline p-3">
          {!collapsed && (
            <div className="mb-3 rounded-xl bg-ember-soft p-3">
              <p className="text-xs font-semibold text-foreground">{planName} plan</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {usageThisMonth} / {usageLimit} conversations this month
              </p>
              <Link
                to="/dashboard/billing"
                className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
              >
                Upgrade plan →
              </Link>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {displayName.charAt(0).toUpperCase()}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{email}</p>
                <p className="text-[11px] text-muted-foreground">{planName} workspace</p>
              </div>
            )}
            {!collapsed && (
              <button
                aria-label="Log out"
                onClick={logout}
                className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Content column ────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-background/85 px-4 backdrop-blur-md md:px-8">
          <div className="md:hidden">
            <Link to="/" aria-label="BurFlow home">
              <Logo />
            </Link>
          </div>
          <div className="relative ml-auto hidden w-full max-w-sm sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search conversations, documents…"
              className="h-10 w-full rounded-full border border-hairline bg-surface pl-9 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:shadow-glow"
            />
          </div>
          <button
            aria-label="Notifications"
            className="relative grid size-10 shrink-0 place-items-center rounded-full border border-hairline bg-surface text-muted-foreground transition hover:text-foreground"
          >
            <Bell className="size-4" />
            <span className="live-dot absolute right-2.5 top-2.5 size-2 rounded-full bg-success" />
          </button>
          <button
            aria-label="Log out"
            onClick={logout}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-hairline bg-surface text-muted-foreground transition hover:text-foreground md:hidden"
          >
            <LogOut className="size-4" />
          </button>
        </header>

        <main
          className={`flex-1 px-4 py-8 md:px-8 md:py-10 ${
            className ? className.replace('p-0', 'p-0') : ''
          }`}
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        {/* ─── Mobile bottom nav ───────────────────────────────── */}
        <nav className="sticky bottom-0 z-30 flex items-center gap-1 overflow-x-auto border-t border-hairline bg-background/95 px-2 py-2 backdrop-blur md:hidden">
          {mainNav.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex shrink-0 flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
