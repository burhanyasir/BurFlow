import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface DesignSectionHeadProps {
  eyebrow?: string;
  title: ReactNode;
  sub?: string;
  className?: string;
  align?: 'center' | 'left';
}

export function DesignSectionHead({ eyebrow, title, sub, className, align = 'center' }: DesignSectionHeadProps) {
  return (
    <div className={cn(
      'mx-auto max-w-3xl',
      align === 'center' ? 'text-center' : 'text-left',
      className,
    )}>
      {eyebrow && (
        <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</div>
      )}
      <h2 className={cn(
        'mt-4 font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl',
        align === 'center' ? '' : '',
      )}>
        {title}
      </h2>
      {sub && (
        <p className={cn(
          'mx-auto mt-5 text-[15px] text-muted-foreground',
          align === 'center' ? 'max-w-xl' : 'max-w-2xl',
        )}>{sub}</p>
      )}
    </div>
  );
}
