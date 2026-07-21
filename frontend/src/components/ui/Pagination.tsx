import { cn } from '../../utils/cn';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages: (number | 'ellipsis')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }
  return (
    <nav aria-label="Pagination" className={cn('flex items-center gap-1', className)}>
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className="h-8 w-8 flex items-center justify-center rounded-md text-sm text-[#5F6570] hover:bg-[#F0F1F3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Previous page">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      {pages.map((p, i) => p === 'ellipsis' ? (
        <span key={`e-${i}`} className="h-8 w-8 flex items-center justify-center text-sm text-[#5F6570]">…</span>
      ) : (
        <button key={p} onClick={() => onPageChange(p)} className={cn('h-8 w-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors', p === currentPage ? 'bg-[#5865F2] text-white' : 'text-[#5F6570] hover:bg-[#F0F1F3]')} aria-current={p === currentPage ? 'page' : undefined} aria-label={`Page ${p}`}>{p}</button>
      ))}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="h-8 w-8 flex items-center justify-center rounded-md text-sm text-[#5F6570] hover:bg-[#F0F1F3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" aria-label="Next page">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </nav>
  );
}
