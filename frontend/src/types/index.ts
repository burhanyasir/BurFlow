export type Theme = 'light' | 'dark';

export type ComponentSize = 'sm' | 'md' | 'lg';

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type FeedbackVariant = 'success' | 'warning' | 'error' | 'info';

export type Position = 'top' | 'bottom' | 'left' | 'right';

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  'data-testid'?: string;
}

export interface AsChildProps {
  asChild?: boolean;
}
