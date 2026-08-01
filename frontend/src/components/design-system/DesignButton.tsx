import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface DesignButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'wine' | 'glass' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const variantStyles = {
  wine: 'btn-wine',
  glass: 'glass inline-flex items-center justify-center text-foreground/90 hover:bg-white/[0.06] transition',
  ghost: 'text-muted-foreground hover:text-foreground transition',
};

const sizeStyles = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-sm rounded-xl gap-2',
};

export const DesignButton = forwardRef<HTMLButtonElement, DesignButtonProps>(
  ({ className, variant = 'glass', size = 'md', fullWidth = false, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium transition',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
DesignButton.displayName = 'DesignButton';
