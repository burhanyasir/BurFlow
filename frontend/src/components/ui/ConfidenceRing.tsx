import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

type RingSize = 20 | 32 | 48 | 72;

interface ConfidenceRingProps {
  value: number; // 0–100
  size?: RingSize;
  className?: string;
  animated?: boolean;
  showTooltip?: boolean;
  label?: string;
}

function getRampColor(value: number): { stroke: string; text: string } {
  if (value >= 85) return { stroke: '#1F9D6B', text: '#136B47' };
  if (value >= 60) return { stroke: '#C77E1F', text: '#7A5714' };
  return { stroke: '#C93B3B', text: '#8A1F1A' };
}

function useCountUp(target: number, duration = 900, animated = true) {
  const [current, setCurrent] = useState(animated ? 0 : target);
  const frameRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!animated) { setCurrent(target); return; }
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setCurrent(target); return; }

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // expo-out
      const eased = 1 - Math.pow(2, -10 * progress);
      setCurrent(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration, animated]);

  return current;
}

const SIZES: Record<RingSize, { viewBox: number; r: number; stroke: number; fontSize: number }> = {
  20: { viewBox: 20, r: 8,  stroke: 2.5, fontSize: 7  },
  32: { viewBox: 32, r: 13, stroke: 3,   fontSize: 10 },
  48: { viewBox: 48, r: 20, stroke: 3,   fontSize: 13 },
  72: { viewBox: 72, r: 30, stroke: 3,   fontSize: 18 },
};

export function ConfidenceRing({
  value,
  size = 32,
  className,
  animated = true,
  showTooltip = true,
  label,
}: ConfidenceRingProps) {
  const { viewBox, r, stroke, fontSize } = SIZES[size];
  const { stroke: rampStroke, text: rampText } = getRampColor(value);
  const circumference = 2 * Math.PI * r;
  const center = viewBox / 2;

  const [drawn, setDrawn] = useState(false);
  const current = useCountUp(value, 700, animated && drawn);

  const ringRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setDrawn(true); return; }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setDrawn(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const dashOffset = drawn
    ? circumference * (1 - value / 100)
    : circumference;

  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <div
      ref={ringRef}
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
      aria-label={label || `Confidence ${value}%`}
      role="img"
    >
      <svg
        width={viewBox}
        height={viewBox}
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        fill="none"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={r}
          stroke={rampStroke}
          strokeWidth={stroke}
          opacity={0.12}
        />
        {/* Value arc */}
        <circle
          cx={center}
          cy={center}
          r={r}
          stroke={rampStroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            transition: drawn ? `stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)` : 'none',
          }}
        />
        {/* Center numeral (only for size ≥ 32) */}
        {size >= 32 && (
          <text
            x={center}
            y={center + fontSize * 0.35}
            textAnchor="middle"
            fontSize={fontSize}
            fontWeight="500"
            fontFamily="'JetBrains Mono', monospace"
            fill={rampText}
            style={{ fontFeatureSettings: '"tnum"' }}
          >
            {current}
          </text>
        )}
      </svg>

      {/* Tooltip */}
      {showTooltip && tooltipVisible && size >= 32 && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          role="tooltip"
        >
          <div
            className="rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap"
            style={{
              background: 'rgba(13,13,16,0.92)',
              backdropFilter: 'blur(8px)',
              color: '#F5F5F7',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              animation: 'fadeInUp 150ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            Confidence {value}% — grounded in knowledge
          </div>
        </div>
      )}
    </div>
  );
}
