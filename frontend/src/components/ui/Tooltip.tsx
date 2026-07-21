import { useState, useId, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { type Position } from '../../types';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: Position;
  className?: string;
}

export function Tooltip({ content, children, position = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const positions: Record<Position, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };
  return (
    <div className={cn('relative inline-flex', className)} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)} onFocus={() => setVisible(true)} onBlur={() => setVisible(false)}>
      <div aria-describedby={id}>{children}</div>
      {visible && (
        <div id={id} role="tooltip" className={cn('absolute z-50 px-2 py-1 text-xs font-medium text-white bg-[#0B0C10] rounded-md shadow-sm whitespace-nowrap pointer-events-none', positions[position])}>
          {content}
        </div>
      )}
    </div>
  );
}
