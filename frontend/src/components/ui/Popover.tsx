import { useState, useRef, useId, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useClickOutside } from '../../hooks/useClickOutside';
import { type Position } from '../../types';
import { scaleIn } from '../../utils/motion';

export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  position?: Position;
  align?: 'start' | 'center' | 'end';
  className?: string;
  contentClassName?: string;
}

const positionStyles: Record<Position, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2'
};

export function Popover({ trigger, children, position = 'bottom', className, contentClassName }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={id}
        className="inline-flex"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={id}
            role="menu"
            className={cn('absolute z-40 min-w-[12rem] bg-white rounded-lg shadow-lg border border-[#D0D5DD] p-1', positionStyles[position], contentClassName)}
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PopoverItem({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn('w-full text-left px-3 py-2 text-sm text-[#0B0C10] rounded-md hover:bg-[#F0F1F3] transition-colors', className)}
    >
      {children}
    </button>
  );
}
