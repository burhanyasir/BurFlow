import { cn } from '../../utils/cn';
import { type FeedbackVariant } from '../../types';

export interface AlertProps {
  children: React.ReactNode;
  variant?: FeedbackVariant;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const alertVariants: Record<FeedbackVariant, string> = {
  success: 'bg-[#D1FAE5] border-[#A7F3D0] text-[#065F46]',
  warning: 'bg-[#FFF8E0] border-[#FFE580] text-[#92400E]',
  error: 'bg-[#FEE2E2] border-[#FECACA] text-[#991B1B]',
  info: 'bg-[#DBEAFE] border-[#93C5FD] text-[#1E40AF]'
};

const icons: Record<FeedbackVariant, string> = {
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
};

export function Alert({ children, variant = 'info', title, dismissible, onDismiss, className }: AlertProps) {
  return (
    <div role="alert" className={cn('flex gap-3 rounded-lg border p-4', alertVariants[variant], className)}>
      <svg className="h-5 w-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[variant]} />
      </svg>
      <div className="flex-1">
        {title && <p className="font-medium mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
      {dismissible && onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );
}
