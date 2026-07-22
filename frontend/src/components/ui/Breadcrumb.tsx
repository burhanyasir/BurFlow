import { cn } from '../../utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-sm', className)}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <svg className="h-4 w-4 text-[var(--color-neutral-300)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
          {item.href ? (
            <a href={item.href} className={cn('text-[var(--color-neutral-500)] hover:text-[var(--color-accent-600)] transition-colors', i === items.length - 1 && 'text-[var(--color-neutral-900)] font-medium pointer-events-none')} aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</a>
          ) : (
            <span className={cn(i === items.length - 1 ? 'text-[var(--color-neutral-900)] font-medium' : 'text-[var(--color-neutral-500)]')}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
