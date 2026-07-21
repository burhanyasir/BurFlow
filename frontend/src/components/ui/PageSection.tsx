import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Container } from '../../layouts/Container';

export interface PageSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  containerClassName?: string;
  align?: 'center' | 'left';
  size?: 'sm' | 'md' | 'lg';
  id?: string;
}

const titleSizeStyles = {
  sm: 'text-xl md:text-2xl',
  md: 'text-2xl md:text-3xl',
  lg: 'text-3xl md:text-4xl'
};

const descriptionSizeStyles = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
};

export function PageSection({
  title,
  description,
  children,
  className,
  containerClassName,
  align = 'center',
  size = 'md',
  id
}: PageSectionProps) {
  return (
    <section className={cn('py-12 md:py-20', className)} id={id}>
      <Container className={containerClassName}>
        {(title || description) && (
          <div className={cn(
            'mb-10 md:mb-14 max-w-2xl',
            align === 'center' && 'mx-auto text-center'
          )}>
            {title && (
              <h2 className={cn(
                'font-bold text-[#0B0C10] tracking-tight',
                titleSizeStyles[size]
              )}>
                {title}
              </h2>
            )}
            {description && (
              <p className={cn(
                'mt-4 text-[#5F6570] leading-relaxed',
                descriptionSizeStyles[size]
              )}>
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}
