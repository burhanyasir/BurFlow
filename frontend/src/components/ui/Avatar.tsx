import { cn } from '../../utils/cn';
import { type ComponentSize } from '../../types';
import { initials as getInitials } from '../../utils/formatters';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: ComponentSize;
  className?: string;
}

const sizeMap: Record<ComponentSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base'
};

export function Avatar({ src, alt = '', name, size = 'md', className }: AvatarProps) {
  const fallback = name ? getInitials(name) : '?';
  return (
    <div className={cn('relative shrink-0 rounded-full overflow-hidden bg-[#E8EAFF] flex items-center justify-center font-medium text-[#5865F2]', sizeMap[size], className)}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <span aria-hidden="true">{fallback}</span>
      )}
    </div>
  );
}
