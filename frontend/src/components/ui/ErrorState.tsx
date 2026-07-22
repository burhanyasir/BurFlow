import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  fullPage?: boolean;
  className?: string;
}

export function ErrorState({ title = 'Something went wrong', description = 'An unexpected error occurred. Please try again.', onRetry, fullPage, className }: ErrorStateProps) {
  const container = fullPage ? 'min-h-[60vh]' : 'py-12';
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-4', container, className)}>
      <div className="h-14 w-14 rounded-full bg-[var(--color-error-500)] flex items-center justify-center mb-4">
        <svg className="h-7 w-7 text-[var(--color-neutral-0)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-neutral-900)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--color-neutral-500)] max-w-sm mb-4">{description}</p>
      {onRetry && <Button onClick={onRetry} variant="secondary" size="sm">Retry</Button>}
    </div>
  );
}
