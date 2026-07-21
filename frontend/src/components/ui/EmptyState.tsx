import { cn } from '../../utils/cn';
import { type ComponentSize } from '../../types';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  size?: ComponentSize;
  className?: string;
}

const sizeStyles = { sm: 'py-8', md: 'py-12', lg: 'py-16' };
const iconSizes = { sm: 'h-8 w-8', md: 'h-12 w-12', lg: 'h-16 w-16' };

export function EmptyState({ icon, title, description, action, size = 'md', className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-4', sizeStyles[size], className)}>
      {icon ? (
        <div className={cn('mb-4 text-[#A0A5B0]', iconSizes[size])}>{icon}</div>
      ) : (
        <svg className={cn('mb-4 text-[#A0A5B0]', iconSizes[size])} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )}
      <h3 className="text-lg font-semibold text-[#0B0C10] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#5F6570] max-w-sm mb-4">{description}</p>}
      {action && <Button onClick={action.onClick} size="sm">{action.label}</Button>}
    </div>
  );
}
