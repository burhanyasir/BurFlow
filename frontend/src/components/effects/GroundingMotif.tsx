import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContentFragmentCard } from './ContentFragmentCard';
import { GroundingAnswerCard } from '../ui/GroundingAnswerCard';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../utils/cn';


const INITIAL_POSITIONS = [
  { x: -240, y: 110, rotate: -8 },
  { x: 240, y: -90, rotate: 7 },
  { x: -200, y: -120, rotate: -5 },
  { x: 220, y: 100, rotate: 6 },
  { x: -110, y: -155, rotate: -3 },
  { x: 130, y: 130, rotate: 4 }
];

export interface GroundingMotifProps {
  className?: string;
  onComplete?: () => void;
}

export function GroundingMotif({ className, onComplete }: GroundingMotifProps) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [converged, setConverged] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hasAnimated = useRef(false);
  const animFrame = useRef<number>(0);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0]?.isIntersecting && !hasAnimated.current) {
      hasAnimated.current = true;
      setVisible(true);
      setTimeout(() => {
        setConverged(true);
        onComplete?.();
      }, 1600);
    }
  }, [onComplete]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersection, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersection]);

  useEffect(() => {
    if (!converged || reduced) return;
    const handleMouse = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
      animFrame.current = requestAnimationFrame(() => {
        setMousePos({
          x: (e.clientX - cx) / rect.width,
          y: (e.clientY - cy) / rect.height
        });
      });
    };
    window.addEventListener('mousemove', handleMouse, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, [converged, reduced]);

  if (reduced) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <GroundingAnswerCard />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-center justify-center', className)}
      style={{ minHeight: 280 }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[60%] rounded-full bg-[var(--color-accent-200)]/15 blur-3xl" />
      </div>
      <AnimatePresence>
        {visible && !converged && INITIAL_POSITIONS.map((pos, i) => (
          <ContentFragmentCard
            key={`fragment-${i}`}
            index={i}
            className="absolute"
            initial={{ opacity: 0, x: pos.x, y: pos.y, rotate: pos.rotate, scale: 0.85 }}
            animate={{
              opacity: 1,
              x: 0,
              y: 0,
              rotate: 0,
              scale: 1,
              transition: { duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }
            }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {converged && (
          <motion.div
            key="answer-card"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }
            }}
            style={{
              x: mousePos.x * 8,
              y: mousePos.y * 8
            }}
          >
            <GroundingAnswerCard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
