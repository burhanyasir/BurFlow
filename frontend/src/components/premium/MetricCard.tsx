import { cn } from '../../utils/cn';
import { PremiumCard, PremiumCardContent } from './PremiumCard';

export interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' };
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
  onClick?: () => void;
}

const variantColors = {
  default: { icon: 'bg-[rgba(168,36,75,0.15)] text-[rgba(255,255,255,0.85)]' },
  success: { icon: 'bg-[rgba(31,157,107,0.15)] text-[#3DDC97]' },
  warning: { icon: 'bg-[rgba(199,126,31,0.15)] text-[#F5B454]' },
  error: { icon: 'bg-[rgba(201,59,59,0.15)] text-[#F26D6D]' },
};

export function MetricCard({ icon, label, value, trend, variant = 'default', className, onClick }: MetricCardProps) {
  const colors = variantColors[variant];
  return (
    <PremiumCard variant="elevated" padding="md" hoverable={!!onClick} className={cn(className)} onClick={onClick}>
      <PremiumCardContent>
        <div className="flex items-start justify-between mb-2">
          <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center text-base', colors.icon)}>{icon}</div>
          {trend && (
            <span className={cn(
              'text-xs font-medium flex items-center gap-0.5',
              trend.direction === 'up' && trend.value > 0 ? 'text-[#3DDC97]' :
              trend.direction === 'down' && trend.value > 0 ? 'text-[#F26D6D]' : 'text-[rgba(255,255,255,0.4)]'
            )}>
              {trend.direction === 'up' && '↑'} {trend.direction === 'down' && '↓'} {trend.value}%
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-white tabular tabular-nums">{value}</p>
        <p className="text-xs text-[rgba(255,255,255,0.5)] mt-0.5">{label}</p>
      </PremiumCardContent>
    </PremiumCard>
  );
}
