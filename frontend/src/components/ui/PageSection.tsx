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
  titleAs?: 'h1' | 'h2';
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
  titleAs = 'h2',
  id
}: PageSectionProps) {
  const TitleTag = titleAs;
  return (
    <section className={cn('py-12 md:py-20', className)} id={id}>
      <Container className={containerClassName}>
        {(title || description) && (
          <div className={cn(
            'mb-10 md:mb-14 max-w-2xl',
            align === 'center' && 'mx-auto text-center'
          )}>
            {title && (
              <TitleTag className={cn(
                'font-bold text-[var(--color-neutral-900)] tracking-tight',
                titleSizeStyles[size]
              )}>
                {title}
              </TitleTag>
            )}
            {description && (
              <p className={cn(
                'mt-4 text-[var(--color-neutral-500)] leading-relaxed',
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
