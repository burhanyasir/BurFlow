import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyState?: ReactNode;
  className?: string;
}

export function Table<T>({ data, columns, keyExtractor, onRowClick, loading, emptyState, className }: TableProps<T>) {
  if (loading) {
    return (
      <div className={cn('overflow-x-auto', className)}>
        <table className="w-full">
          <thead>
            <tr>{columns.map(col => <th key={col.key} className={cn('px-4 py-3 text-left text-xs font-medium text-[var(--color-neutral-500)] uppercase tracking-wider', col.headerClassName)}>{col.header}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3"><div className="h-4 bg-[var(--color-neutral-50)] rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-neutral-200)]">
            {columns.map(col => (
              <th key={col.key} className={cn('px-4 py-3 text-left text-xs font-medium text-[var(--color-neutral-500)] uppercase tracking-wider', col.headerClassName)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-neutral-200)]">
          {data.map(item => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={cn('transition-colors', onRowClick && 'cursor-pointer hover:bg-[var(--color-neutral-0)]')}
            >
              {columns.map(col => (
                <td key={col.key} className={cn('px-4 py-3 text-sm text-[var(--color-neutral-900)]', col.className)}>
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
