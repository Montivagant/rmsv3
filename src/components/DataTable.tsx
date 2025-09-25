import { useState, useMemo } from 'react';
import { cn } from '../lib/utils';

interface Column<T> {
  id?: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  header: string | ((props: { column: Column<T> }) => React.ReactNode);
  cell?: (props: { row: { original: T }; getValue: () => any }) => React.ReactNode;
  enableSorting?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey?: (row: T, index: number) => string;
  className?: string;
  emptyState?: {
    title: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  loading?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  className,
  emptyState,
  loading = false
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const getRowKey = rowKey ? rowKey : (_: T, index: number) => String(index);

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    const column = columns.find(col => col.id === sortColumn || String(col.accessorKey) === sortColumn);
    if (!column) return data;

    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (column.accessorKey) {
        aValue = (a as any)[column.accessorKey];
        bValue = (b as any)[column.accessorKey];
      } else if (column.accessorFn) {
        aValue = column.accessorFn(a);
        bValue = column.accessorFn(b);
      } else {
        return 0;
      }

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

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-surface-secondary animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className={cn("text-center py-8", className)}>
        <h3 className="text-lg font-semibold text-text-primary mb-2">{emptyState.title}</h3>
        {emptyState.description && (
          <p className="text-text-muted mb-4">{emptyState.description}</p>
        )}
        {emptyState.action && (
          <button
            onClick={emptyState.action.onClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {emptyState.action.label}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-secondary">
            <tr>
              {columns.map((column, columnIndex) => {
                const columnId = column.id ?? (column.accessorKey ? String(column.accessorKey) : `column-${columnIndex}`);
                const isSortable = column.enableSorting !== false;
                const isSorted = sortColumn === columnId;
                
                return (
                  <th
                    key={columnId}
                    className={cn(
                      "px-4 py-3 text-left text-sm font-medium text-text-secondary",
                      isSortable && "cursor-pointer hover:text-text-primary"
                    )}
                    onClick={isSortable ? () => handleSort(columnId) : undefined}
                  >
                    <div className="flex items-center gap-2">
                      {typeof column.header === 'function' 
                        ? column.header({ column })
                        : column.header
                      }
                      {isSortable && (
                        <div className="flex flex-col">
                          <svg 
                            className={cn(
                              "h-3 w-3 transition-colors",
                              isSorted && sortDirection === 'asc' 
                                ? "text-primary" 
                                : "text-text-muted"
                            )} 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.map((row, rowIndex) => (
              <tr key={getRowKey(row, rowIndex)} className="hover:bg-surface-secondary/50 transition-colors">
                {columns.map((column, columnIndex) => {
                  const columnId = column.id ?? (column.accessorKey ? String(column.accessorKey) : `column-${columnIndex}`);
                  
                  return (
                    <td key={columnId} className="px-4 py-3 text-sm">
                      {column.cell 
                        ? column.cell({ row: { original: row }, getValue: () => {
                            if (column.accessorKey) {
                              return (row as any)[column.accessorKey];
                            } else if (column.accessorFn) {
                              return column.accessorFn(row);
                            }
                            return null;
                          } })
                        : column.accessorKey
                          ? String((row as any)[column.accessorKey] || '')
                          : column.accessorFn
                            ? String(column.accessorFn(row) || '')
                            : ''
                      }
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
