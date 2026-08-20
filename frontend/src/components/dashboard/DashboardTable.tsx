import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string | ReactNode;
  cell: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  hideOnMobile?: boolean;
}

export interface DashboardTableProps<T> extends HTMLAttributes<HTMLDivElement> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  empty?: boolean;
  error?: string | null;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (item: T, index: number) => void;
  onRetry?: () => void;
  emptyState?: ReactNode;
  errorState?: ReactNode;
  skeleton?: ReactNode;
  rowKey: (item: T, index: number) => string | number;
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 text-muted-foreground/50" />;
  return dir === 'asc'
    ? <ChevronUp className="ml-1 h-3 w-3 shrink-0 text-foreground" />
    : <ChevronDown className="ml-1 h-3 w-3 shrink-0 text-foreground" />;
}

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <div className="divide-y divide-hairline">
      {Array.from({ length: 5 }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="skeleton h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardTable<T>({
  columns, data, loading, empty, error, sortKey, sortDir, onSort, onRowClick,
  onRetry, emptyState, errorState, skeleton, rowKey, className, ...props
}: DashboardTableProps<T>) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-hairline', className)} {...props}>
      {loading ? (
        skeleton || <TableSkeleton columns={columns.length} />
      ) : error ? (
        errorState || (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <p className="mb-1 text-sm font-medium text-foreground">Failed to load data</p>
            <p className="mb-4 text-xs text-muted-foreground">{error}</p>
            {onRetry && (
              <button onClick={onRetry} className="rounded-lg border border-hairline px-3 py-1.5 text-xs text-foreground transition hover:bg-white/[0.04]">
                Retry
              </button>
            )}
          </div>
        )
      ) : empty ? (
        emptyState || (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <p className="text-sm text-muted-foreground">No data</p>
          </div>
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground',
                      col.sortable && 'cursor-pointer select-none hover:text-foreground',
                      col.hideOnMobile && 'hidden sm:table-cell',
                      col.headerClassName,
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                    aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <span className="inline-flex items-center">
                      {col.header}
                      {col.sortable && <SortIcon active={sortKey === col.key} dir={sortKey === col.key ? (sortDir || 'asc') : 'asc'} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {data.map((item, i) => (
                <tr
                  key={rowKey(item, i)}
                  onClick={() => onRowClick?.(item, i)}
                  className={cn(
                    'transition',
                    onRowClick ? 'cursor-pointer hover:bg-white/[0.02]' : '',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-sm text-foreground/90',
                        col.hideOnMobile && 'hidden sm:table-cell',
                        col.className,
                      )}
                    >
                      {col.cell(item, i)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
