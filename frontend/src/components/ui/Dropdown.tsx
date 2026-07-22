import { useState, useRef, useId, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useClickOutside } from '../../hooks/useClickOutside';
import { scaleIn } from '../../utils/motion';

export interface DropdownItem {
  label: string;
  value?: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  variant?: 'default' | 'danger';
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'end';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'start', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true" aria-controls={id} className="inline-flex">{trigger}</button>
      <AnimatePresence>
        {open && (
          <motion.div id={id} role="menu" className={cn('absolute z-40 top-full mt-1 min-w-[12rem] bg-white rounded-lg shadow-lg border border-[var(--color-neutral-200)] p-1', align === 'end' ? 'right-0' : 'left-0')} variants={scaleIn} initial="hidden" animate="visible" exit="hidden">
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => { item.onClick?.(); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                  item.variant === 'danger' ? 'text-[var(--color-error-500)] hover:bg-[var(--color-neutral-50)]' : 'text-[var(--color-neutral-900)] hover:bg-[var(--color-neutral-50)]',
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {item.icon && <span className="h-4 w-4">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
