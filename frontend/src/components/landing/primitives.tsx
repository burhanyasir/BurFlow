import type { ReactNode } from 'react';
import { track } from '../../lib/analytics';

export function Section({ id, children, className = '', style }: { id?: string; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <section id={id} style={style} className={`px-6 py-24 md:py-32 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-sm text-muted-foreground">
      {children}
    </span>
  );
}

export function Check({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`size-4 shrink-0 ${className}`}>
      <path
        d="M4 10.5l4 4 8-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CTA({
  children,
  variant = 'primary',
  href = '#scan',
}: {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  href?: string;
}) {
  const base =
    'inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold transition-all duration-200';
  const styles =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:shadow-lift'
      : 'border border-hairline bg-surface text-foreground hover:border-foreground/30';
  return (
    <a
      href={href}
      className={`${base} ${styles}`}
      onClick={() =>
        track('cta_click', { label: typeof children === 'string' ? children : 'cta', variant })
      }
    >
      {children}
    </a>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 160 160" aria-hidden className="size-8">
        <rect width="160" height="160" rx="32" fill="var(--lp-primary)" />
        <path
          d="M28 62 C 46 40, 64 84, 82 62 C 100 40, 118 84, 136 62"
          fill="none"
          stroke="var(--lp-primary-foreground)"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M28 96 C 46 74, 64 118, 82 96 C 96 79, 108 100, 118 96"
          fill="none"
          stroke="var(--lp-success)"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.85"
        />
        <circle cx="128" cy="108" r="9" fill="var(--lp-primary-foreground)" />
      </svg>
      <span className="font-display text-lg font-bold tracking-tight">BurFlow</span>
    </span>
  );
}