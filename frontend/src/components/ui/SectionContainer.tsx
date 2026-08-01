import React from 'react';
import { cn } from '../../utils/cn';

interface SectionContainerProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  id?: string;
  className?: string;
  containerClassName?: string;
}

export function SectionContainer({
  children,
  id,
  className,
  containerClassName,
  ...props
}: SectionContainerProps) {
  return (
    <section
      id={id}
      className={cn('relative py-24 bg-obsidian text-white border-t border-white/10 overflow-hidden', className)}
      {...props}
    >
      <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10', containerClassName)}>
        {children}
      </div>
    </section>
  );
}
