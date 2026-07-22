import { cn } from '../../utils/cn';

export interface GroundingAnswerCardProps {
  question?: string;
  answer?: string;
  className?: string;
}

export function GroundingAnswerCard({
  question = '"What is your return policy?"',
  answer = 'Items must be returned within 30 days of delivery in original condition. Refunds are processed within 5–7 business days after we receive the return.',
  className
}: GroundingAnswerCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--color-accent-200)] bg-[var(--color-neutral-0)] p-7 shadow-[0_4px_24px_-4px_rgba(122,32,56,0.12)] max-w-lg relative overflow-hidden',
        className
      )}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--color-accent-400)] via-[var(--color-accent-600)] to-[var(--color-accent-400)]" />
      <p className="text-[11px] font-semibold text-[var(--color-accent-600)] mb-3 tracking-widest uppercase">
        Grounded Answer
      </p>
      <p className="text-sm font-semibold text-[var(--color-neutral-900)] mb-3 leading-snug">
        {question}
      </p>
      <p className="text-[15px] leading-relaxed text-[var(--color-neutral-600)]">
        {answer}
      </p>
    </div>
  );
}
