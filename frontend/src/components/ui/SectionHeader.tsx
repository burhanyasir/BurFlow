import { cn } from '../../utils/cn';

interface SectionHeaderProps {
  tag?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeader({
  tag,
  title,
  description,
  align = 'center',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('max-w-3xl', align === 'center' ? 'mx-auto text-center' : 'text-left', className)}>
      {tag && (
        <p className="text-xs font-mono tracking-widest text-[#C94F72] uppercase mb-3">
          // {tag}
        </p>
      )}
      <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base sm:text-lg text-white/60 leading-relaxed font-normal">
          {description}
        </p>
      )}
    </div>
  );
}
