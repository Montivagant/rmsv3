import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';

interface Column<T> {
  key: string;
  header: string;
  accessor: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyState?: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  loading?: boolean;
  className?: string;
  stickyHeader?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyState,
  loading = false,
  className,
  stickyHeader = false,
  striped = true,
  hoverable = true,
  compact = false,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    const column = columns.find(col => col.key === sortColumn);
    if (!column) return data;

    return [...data].sort((a, b) => {
      const aValue = column.accessor(a);
      const bValue = column.accessor(b);

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, columns, sortColumn, sortDirection]);

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  if (loading) {
    return (
      <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted animate-pulse mb-4">
            <div className="w-6 h-6 bg-muted-foreground/20 rounded" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
        <div className="p-8 text-center">
          {emptyState.icon && (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              {emptyState.icon}
            </div>
          )}
          <h3 className="text-lg font-semibold text-foreground mb-2">{emptyState.title}</h3>
          {emptyState.description && (
            <p className="text-sm text-muted-foreground mb-4">{emptyState.description}</p>
          )}
          {emptyState.action && (
            <button
              onClick={emptyState.action.onClick}
              className={cn(
                'px-4 py-2 rounded-lg',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90',
                'transition-colors duration-200',
                'text-sm font-medium'
              )}
            >
              {emptyState.action.label}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead
            className={cn(
              'bg-muted/50 border-b border-border',
              stickyHeader && 'sticky top-0 z-10'
            )}
          >
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={cn(
                    compact ? 'px-4 py-2' : 'px-6 py-3',
                    'text-xs font-medium uppercase tracking-wider',
                    'text-muted-foreground',
                    alignClasses[column.align || 'left'],
                    column.sortable && 'cursor-pointer select-none hover:text-foreground',
                    column.width
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div
                    className={cn(
                      'inline-flex items-center gap-1',
                      column.align === 'center' && 'justify-center',
                      column.align === 'right' && 'justify-end'
                    )}
                  >
                    <span>{column.header}</span>
                    {column.sortable && (
                      <span className="inline-flex flex-col">
                        <svg
                          className={cn(
                            'w-3 h-3 -mb-1',
                            sortColumn === column.key && sortDirection === 'asc'
                              ? 'text-foreground'
                              : 'text-muted-foreground/30'
                          )}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M7 14l5-5 5 5H7z" />
                        </svg>
                        <svg
                          className={cn(
                            'w-3 h-3 -mt-1',
                            sortColumn === column.key && sortDirection === 'desc'
                              ? 'text-foreground'
                              : 'text-muted-foreground/30'
                          )}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M7 10l5 5 5-5H7z" />
                        </svg>
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {sortedData.map((item, index) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  striped && index % 2 === 1 && 'bg-muted/20',
                  hoverable && 'hover:bg-muted/30 transition-colors duration-150',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map(column => (
                  <td
                    key={column.key}
                    className={cn(
                      compact ? 'px-4 py-2' : 'px-6 py-4',
                      'text-sm text-foreground',
                      alignClasses[column.align || 'left'],
                      column.width
                    )}
                  >
                    {column.accessor(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
