import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface ContentFragmentCardProps extends HTMLMotionProps<'div'> {
  text?: string;
  width?: string;
  index?: number;
}

const FRAGMENT_TEXTS = [
  '"Return policy for EU customers"',
  '"API rate limits per plan"',
  '"Shipping to Alaska & Hawaii"',
  '"Bulk import CSV format"',
  '"SSO/SAML configuration"',
  '"Data retention & deletion policies"'
];

export function ContentFragmentCard({ text, width, index = 0, className, ...props }: ContentFragmentCardProps) {
  return (
    <motion.div
      className={cn(
        'absolute h-10 rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 flex items-center shadow-sm',
        'text-xs leading-none text-[var(--color-neutral-500)] font-medium tracking-tight select-none',
        className
      )}
      style={{ width: width || `${150 + (index % 3) * 28}px` }}
      {...props}
    >
      {text || FRAGMENT_TEXTS[index % FRAGMENT_TEXTS.length]}
    </motion.div>
  );
}
