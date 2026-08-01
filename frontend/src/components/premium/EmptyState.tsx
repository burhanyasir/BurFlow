import { cn } from '../../utils/cn';
import { PremiumCard, PremiumCardContent } from './PremiumCard';
import { Button } from '../ui/Button';

export interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon, title, description, primaryAction, secondaryAction, className }: EmptyStateProps) {
  return (
    <PremiumCard variant="glass" padding="lg" className={cn('text-center', className)}>
      <PremiumCardContent>
        <div className="w-16 h-16 rounded-2xl bg-[rgba(168,36,75,0.12)] flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">{icon}</span>
        </div>
        <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-[rgba(255,255,255,0.5)] max-w-md mx-auto mb-5">{description}</p>
        <div className="flex items-center justify-center gap-3">
          {primaryAction && (
            <Button size="sm" onClick={primaryAction.onClick}>{primaryAction.label}</Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="secondary" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>
          )}
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}
