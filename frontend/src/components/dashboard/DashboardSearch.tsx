import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { Search, X } from 'lucide-react';

export interface DashboardSearchProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function DashboardSearch({ value: externalValue, onChange, placeholder = 'Search...', debounceMs = 300, className }: DashboardSearchProps) {
  const [internalValue, setInternalValue] = useState(externalValue || '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleChange = useCallback((val: string) => {
    setInternalValue(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange?.(val), debounceMs);
  }, [onChange, debounceMs]);

  useEffect(() => {
    setInternalValue(externalValue || '');
  }, [externalValue]);

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={internalValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-xl border border-hairline bg-white/[0.03] pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {internalValue && (
        <button
          onClick={() => handleChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
