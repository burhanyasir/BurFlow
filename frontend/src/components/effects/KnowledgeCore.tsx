import { useRef, useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface KnowledgeCoreProps {
  className?: string;
}

export function KnowledgeCore({ className }: KnowledgeCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (prefersReduced) return;
    const container = containerRef.current;
    if (!container) return;

    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let rafId: number;

    const onMouse = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      targetX = ((e.clientY - cy) / rect.height) * 20;
      targetY = ((e.clientX - cx) / rect.width) * 20;
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
      setRotation({ x: currentX, y: currentY });
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMouse);
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMouse);
      cancelAnimationFrame(rafId);
    };
  }, [prefersReduced]);

  return (
    <div ref={containerRef} className={className}>
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{ perspective: '800px' }}
      >
        <div
          className="relative"
          style={{
            transform: prefersReduced ? 'none' : `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: 'transform 0.1s ease-out',
            transformStyle: 'preserve-3d'
          }}
        >
          <div
            className={`absolute rounded-full ${prefersReduced ? '' : 'animate-[coreFloat_6s_ease-in-out_infinite]'}`}
            style={{
              width: 200, height: 200,
              background: 'radial-gradient(circle at 30% 30%, rgba(88,101,242,0.15), rgba(0,240,255,0.08), transparent)',
              borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
              filter: 'blur(2px)',
              transform: 'translateZ(-20px)',
              animation: prefersReduced ? 'none' : undefined
            }}
          />
          <div
            className="absolute animate-[coreFloat_8s_ease-in-out_infinite_reverse]"
            style={{
              width: 160, height: 160,
              background: 'radial-gradient(circle at 70% 30%, rgba(88,101,242,0.2), rgba(0,240,255,0.1), transparent)',
              borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
              filter: 'blur(3px)',
              top: '20px', left: '20px',
              transform: 'translateZ(20px)'
            }}
          />
          <div
            className="absolute"
            style={{
              width: 120, height: 120,
              background: 'radial-gradient(circle at 50% 50%, rgba(88,101,242,0.3), rgba(0,240,255,0.05), transparent)',
              borderRadius: '40% 60% 60% 40% / 60% 40% 60% 40%',
              filter: 'blur(4px)',
              top: '40px', left: '40px',
              transform: 'translateZ(40px)',
              animation: prefersReduced ? 'none' : 'coreFloat 7s ease-in-out infinite'
            }}
          />
          <div
            className="absolute flex items-center justify-center"
            style={{
              width: 80, height: 80,
              top: '60px', left: '60px',
              transform: 'translateZ(60px)',
              zIndex: 2
            }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(88,101,242,0.5), rgba(0,240,255,0.15))',
                boxShadow: '0 0 40px rgba(88,101,242,0.2), 0 0 80px rgba(0,240,255,0.1)',
                animation: prefersReduced ? 'none' : 'pulse 3s ease-in-out infinite'
              }}
            />
          </div>

          <div
            className="absolute"
            style={{
              inset: -10,
              background: 'conic-gradient(from 0deg, transparent, rgba(88,101,242,0.08), transparent, rgba(0,240,255,0.08), transparent)',
              borderRadius: '50%',
              filter: 'blur(8px)',
              animation: prefersReduced ? 'none' : 'spin 12s linear infinite',
              transform: 'translateZ(-10px)'
            }}
          />
          <div
            className="absolute"
            style={{
              inset: -20,
              background: 'conic-gradient(from 180deg, transparent, rgba(88,101,242,0.05), transparent, rgba(0,240,255,0.05), transparent)',
              borderRadius: '50%',
              filter: 'blur(12px)',
              animation: prefersReduced ? 'none' : 'spin 20s linear infinite reverse',
              transform: 'translateZ(-30px)'
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes coreFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-10px) scale(1.02); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
