import { cn } from '../../utils/cn';

type BadgeVariant = 'grounded' | 'partial' | 'ungrounded' | 'handoff';

interface GroundedBadgeProps {
  variant?: BadgeVariant;
  className?: string;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

const config: Record<BadgeVariant, { label: string; bg: string; text: string; dot: string }> = {
  grounded: {
    label: 'Grounded',
    bg: 'rgba(31, 157, 107, 0.10)',
    text: '#136B47',
    dot: '#1F9D6B',
  },
  partial: {
    label: 'Partial',
    bg: 'rgba(199, 126, 31, 0.10)',
    text: '#7A5714',
    dot: '#C77E1F',
  },
  ungrounded: {
    label: 'Ungrounded',
    bg: 'rgba(201, 59, 59, 0.10)',
    text: '#8A1F1A',
    dot: '#C93B3B',
  },
  handoff: {
    label: 'Handoff',
    bg: 'rgba(58, 111, 240, 0.10)',
    text: '#29507A',
    dot: '#3A6FF0',
  },
};

export function GroundedBadge({
  variant = 'grounded',
  className,
  pulse = false,
  size = 'md',
}: GroundedBadgeProps) {
  const { label, bg, text, dot } = config[variant];
  const isActive = variant === 'grounded' || variant === 'partial';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        size === 'sm' ? 'h-5 px-2 text-[11px]' : 'h-6 px-2.5 text-xs',
        className
      )}
      style={{ background: bg, color: text }}
    >
      {/* Dot */}
      <span
        className="relative inline-flex shrink-0"
        style={{ width: 6, height: 6 }}
      >
        {(pulse && isActive) && (
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{
              background: dot,
              animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
            }}
          />
        )}
        <span
          className="relative inline-flex rounded-full"
          style={{ width: 6, height: 6, background: dot }}
        />
      </span>
      {label}
    </span>
  );
}
