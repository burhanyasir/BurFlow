import React from 'react';
import { cn } from '../../utils/cn';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  glow?: boolean;
  variant?: 'flat' | 'default' | 'bordered' | 'elevated';
  className?: string;
}

export function GlassPanel({
  children,
  interactive = false,
  glow = false,
  className,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border transition-all duration-300',
        interactive
          ? 'glass-card-interactive'
          : 'glass-panel-luxury',
        glow && 'border-[#C94F72]/40 shadow-[0_16px_48px_rgba(138,21,56,0.2)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
