import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, duration = 1100, decimals = 0) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration]);

  return value.toFixed(decimals);
}

export interface DesignCountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function DesignCountUp({ value, decimals = 0, prefix = '', suffix = '', className = '' }: DesignCountUpProps) {
  const n = useCountUp(value, 1100, decimals);
  const formatted = decimals === 0 ? Number(n).toLocaleString('en-US') : n;
  return (
    <span className={`text-tabular ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
