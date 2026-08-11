import type { ReactNode } from 'react';

export function PageHead({
  title,
  sub,
  actions,
}: {
  title: string;
  sub: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{sub}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function DashButton({
  children,
  variant = 'primary',
  onClick,
  className = '',
  disabled = false,
}: {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const styles =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:shadow-lift'
      : 'border border-hairline bg-surface text-foreground hover:border-foreground/25';
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={`inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all duration-200 ${styles} ${
        disabled ? 'pointer-events-none cursor-not-allowed opacity-60' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-hairline bg-surface p-6 shadow-soft md:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
      <span className="grid size-9 place-items-center rounded-xl bg-ember-soft text-primary">
        {icon}
      </span>
      <p className="mt-4 font-display text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  actions,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <div className="aurora relative overflow-hidden rounded-3xl border border-hairline bg-surface px-6 py-16 text-center shadow-soft">
      <div className="aurora-layer opacity-60" />
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-ember-soft text-primary">
        {icon}
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {actions ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}
