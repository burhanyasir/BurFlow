import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useKeyboard } from '../../hooks/useKeyboard';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };
const sideVariants = {
  left: { hidden: { x: '-100%' }, visible: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }, exit: { x: '-100%', transition: { duration: 0.2 } } },
  right: { hidden: { x: '100%' }, visible: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }, exit: { x: '100%', transition: { duration: 0.2 } } }
};

export function Drawer({ open, onClose, title, children, side = 'right', size = 'md', className }: DrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  useFocusTrap(contentRef, open);
  useKeyboard('Escape', onClose, open);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleBackdropClick} />
          <motion.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'relative h-full w-full bg-white shadow-xl overflow-y-auto',
              side === 'right' ? 'ml-auto' : 'mr-auto',
              sizeStyles[size],
              className
            )}
            variants={sideVariants[side]}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D0D5DD]">
              {title && <h2 className="text-lg font-semibold text-[#0B0C10]">{title}</h2>}
              <button onClick={onClose} className="p-1 rounded-md text-[#5F6570] hover:text-[#0B0C10] hover:bg-[#F0F1F3] transition-colors" aria-label="Close drawer">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
