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
          {i > 0 && <svg className="h-4 w-4 text-[#A0A5B0]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
          {item.href ? (
            <a href={item.href} className={cn('text-[#5F6570] hover:text-[#5865F2] transition-colors', i === items.length - 1 && 'text-[#0B0C10] font-medium pointer-events-none')} aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</a>
          ) : (
            <span className={cn(i === items.length - 1 ? 'text-[#0B0C10] font-medium' : 'text-[#5F6570]')}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
