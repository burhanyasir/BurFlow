import { useState, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface AccordionItem {
  id: string;
  trigger: ReactNode;
  content: ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  className?: string;
  allowMultiple?: boolean;
}

function AccordionPanel({ isOpen, content, id }: { isOpen: boolean; content: ReactNode; id: string }) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          id={`accordion-panel-${id}`}
          role="region"
          key="panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: contentRef.current?.scrollHeight || 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div ref={contentRef} className="px-5 pb-4 text-sm text-[#5F6570] leading-relaxed">
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Accordion({ items, className, allowMultiple = false }: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else { if (!allowMultiple) next.clear(); next.add(id); }
      return next;
    });
  };

  return (
    <div className={cn('divide-y divide-[#D0D5DD] border border-[#D0D5DD] rounded-xl overflow-hidden', className)}>
      {items.map(item => {
        const isOpen = openIds.has(item.id);
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-[#0B0C10] hover:bg-[#F8F9FA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] focus-visible:ring-inset"
              aria-expanded={isOpen}
              aria-controls={`accordion-panel-${item.id}`}
            >
              {item.trigger}
              <svg
                className={cn('h-4 w-4 shrink-0 text-[#5F6570] transition-transform duration-200', isOpen && 'rotate-180')}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <AccordionPanel isOpen={isOpen} content={item.content} id={item.id} />
          </div>
        );
      })}
    </div>
  );
}
