import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type RowSelectionState,
  type ColumnOrderState,
  type VisibilityState,
  type ColumnSizingState,
  createColumnHelper,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '../components';
import type { Customer } from './types';
import { StatusPill } from './StatusPill';

interface Props {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
  sort: string; // "column:dir"
  onSortChange: (next: string) => void;
  onPageChange: (next: number) => void;
  onPageSizeChange: (next: number) => void;
  onRowClick: (c: Customer) => void;
  loading?: boolean;
  onSelectionChange?: (selected: Customer[]) => void;
  clearSelectionSignal?: number;
}

const columnHelper = createColumnHelper<Customer>();

// Storage keys for column persistence
const STORAGE_KEYS = {
  columnOrder: 'rms.customers.table.columnOrder',
  columnVisibility: 'rms.customers.table.columnVisibility',
  columnSizing: 'rms.customers.table.columnSizing'
} as const;

// Default column sizing
const DEFAULT_COLUMN_SIZING = {
  select: 50,
  name: 180,
  contact: 200,
  totalSpent: 120,
  orders: 80,
  lastVisit: 140,
  status: 160,
  actions: 100
};

// Hook for column persistence
function useColumnPersistence() {
  const loadStoredState = useCallback((key: string, defaultValue: any) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }, []);

  const saveState = useCallback((key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Silently fail if localStorage is not available
    }
  }, []);

  return { loadStoredState, saveState };
}

export function CustomerTable({
  data,
  total,
  page,
  pageSize,
  sort,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onSelectionChange,
  clearSelectionSignal,
  loading = false,
}: Props) {
  const { loadStoredState, saveState } = useColumnPersistence();
  
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  
  // Column persistence state
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => 
    loadStoredState(STORAGE_KEYS.columnOrder, [])
  );
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => 
    loadStoredState(STORAGE_KEYS.columnVisibility, {})
  );
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() => 
    loadStoredState(STORAGE_KEYS.columnSizing, DEFAULT_COLUMN_SIZING)
  );
  
  const [sortCol, sortDir] = useMemo(() => {
    const [k, d] = (sort || 'name:asc').split(':');
    return [k || 'name', d === 'desc' ? 'desc' : 'asc'] as const;
  }, [sort]);

  const sorting: SortingState = useMemo(
    () => [{ id: sortCol, desc: sortDir === 'desc' }],
    [sortCol, sortDir]
  );

  const columns = useMemo(
    () => [
      // Selection column
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select all rows"
            className="h-4 w-4"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) {
                // set indeterminate if some but not all selected
                (el as any).indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();
              }
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.original.name}`}
            className="h-4 w-4"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        enableSorting: false,
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => (
          <div className="font-medium text-foreground">{info.getValue()}</div>
        ),
      }),
      columnHelper.display({
        id: 'contact',
        header: 'Contact',
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="text-sm text-text-secondary">
              <div className="truncate" title={c.email}>{c.email}</div>
              <div className="truncate">{c.phone}</div>
            </div>
          );
        },
      }),
      columnHelper.accessor('totalSpent', {
        header: 'Total Spend',
        cell: (info) => (
          <span className="font-semibold">${info.getValue().toFixed(2)}</span>
        ),
      }),
      columnHelper.accessor('orders', {
        header: 'Orders',
        cell: (info) => <span>{info.getValue()}</span>,
      }),
      columnHelper.accessor('lastVisit', {
        header: 'Last Visit',
        cell: (info) => (
          <span className="text-sm">
            {new Date(info.getValue()).toLocaleDateString()}
          </span>
        ),
        sortingFn: (a, b, id) => {
          const av = new Date(a.getValue(id) as string).getTime();
          const bv = new Date(b.getValue(id) as string).getTime();
          return av === bv ? 0 : av < bv ? -1 : 1;
        },
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status/Tags',
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-2">
              <StatusPill status={c.status} />
              {c.tags?.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded text-xs font-medium border border-border bg-surface-secondary"
                >
                  {t}
                </span>
              ))}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => onRowClick(c)}>
                Profile
              </Button>
            </div>
          );
        },
      }),
    ],
    [onRowClick]
  );

  const table = useReactTable({
    data,
    columns,
    state: { 
      sorting, 
      rowSelection,
      columnOrder,
      columnVisibility,
      columnSizing
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    onSortingChange: (updater) => {
      const next = Array.isArray(updater) ? updater : updater(sorting);
      if (next && next[0]) {
        const s = next[0];
        onSortChange(`${s.id}:${s.desc ? 'desc' : 'asc'}`);
      }
    },
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: (updater) => {
      const newOrder = typeof updater === 'function' ? updater(columnOrder) : updater;
      setColumnOrder(newOrder);
      saveState(STORAGE_KEYS.columnOrder, newOrder);
    },
    onColumnVisibilityChange: (updater) => {
      const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater;
      setColumnVisibility(newVisibility);
      saveState(STORAGE_KEYS.columnVisibility, newVisibility);
    },
    onColumnSizingChange: (updater) => {
      const newSizing = typeof updater === 'function' ? updater(columnSizing) : updater;
      setColumnSizing(newSizing);
      saveState(STORAGE_KEYS.columnSizing, newSizing);
    },
    enableRowSelection: true,
    enableSorting: true,
    getRowId: (row) => (row as any).id,
  });

  const headerGroups = table.getHeaderGroups();

  // Reset to default column settings
  const resetColumnSettings = useCallback(() => {
    setColumnOrder([]);
    setColumnVisibility({});
    setColumnSizing(DEFAULT_COLUMN_SIZING);
    
    // Clear from localStorage
    localStorage.removeItem(STORAGE_KEYS.columnOrder);
    localStorage.removeItem(STORAGE_KEYS.columnVisibility);
    localStorage.removeItem(STORAGE_KEYS.columnSizing);
  }, []);

  // Notify parent when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selected = table.getSelectedRowModel().flatRows.map(r => r.original as Customer);
      onSelectionChange(selected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  // Clear selection when signal changes
  useEffect(() => {
    if (typeof clearSelectionSignal !== 'undefined') {
      setRowSelection({});
    }
  }, [clearSelectionSignal]);

  const rowHeight = 56; // token-driven size could be derived from density
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  
  // Generate dynamic grid template from column sizing
  const gridTemplate = table.getVisibleLeafColumns().map(column => {
    const size = columnSizing[column.id] || DEFAULT_COLUMN_SIZING[column.id as keyof typeof DEFAULT_COLUMN_SIZING] || 100;
    return `${size}px`;
  }).join(' ');

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-surface">
      {/* Column Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-secondary">
        <div className="text-sm font-medium text-text-primary">Column Settings</div>
        <div className="flex items-center gap-2">
          {/* Column Visibility Toggles */}
          <div className="flex items-center gap-2">
            {table.getAllLeafColumns().filter(col => col.id !== 'select' && col.id !== 'actions').map(column => (
              <label key={column.id} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                  className="h-3 w-3"
                />
                <span className="capitalize">
                  {column.id === 'totalSpent' ? 'Total Spend' : 
                   column.id === 'lastVisit' ? 'Last Visit' :
                   column.id}
                </span>
              </label>
            ))}
          </div>
          <div className="h-4 w-px bg-border" />
          <Button size="sm" variant="outline" onClick={resetColumnSettings}>
            Reset
          </Button>
        </div>
      </div>
      {/* Table header */}
      <div role="table" aria-rowcount={total} aria-colcount={table.getVisibleLeafColumns().length}>
        <div
          className="grid grid-cols-var px-4 py-2 border-b border-border bg-surface-secondary sticky top-0 z-10"
          role="row"
          aria-rowindex={1}
          style={{ ['--grid-template' as any]: gridTemplate }}
        >
          {headerGroups.map((hg) =>
            hg.headers.map((header) => {
              const isSortable = header.column.getCanSort();
              const current = sorting.find((s) => s.id === header.column.id);
              const ariaSort = current
                ? current.desc
                  ? 'descending'
                  : 'ascending'
                : 'none';

              // Render non-sortable headers (like selection) without button
              if (!isSortable) {
                return (
                  <div
                    key={header.id}
                    role="columnheader"
                    aria-sort={ariaSort as any}
                    className="relative text-left text-xs font-semibold uppercase tracking-wide text-text-secondary"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {/* Resize handle */}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-primary/20 active:bg-primary/40"
                        style={{ userSelect: 'none', touchAction: 'none' }}
                      />
                    )}
                  </div>
                );
              }

              return (
                <div key={header.id} className="relative">
                  <button
                    role="columnheader"
                    aria-sort={ariaSort as any}
                    className="w-full text-left text-xs font-semibold uppercase tracking-wide text-text-secondary hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded pr-2"
                    onClick={header.column.getToggleSortingHandler()}
                    disabled={!isSortable}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {current ? (current.desc ? ' ↓' : ' ↑') : ''}
                  </button>
                  {/* Resize handle */}
                  {header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-primary/20 active:bg-primary/40"
                      style={{ userSelect: 'none', touchAction: 'none' }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Virtualized rows */}
        <div
          ref={parentRef}
          role="rowgroup"
          className="max-h-[480px] overflow-y-auto"
          aria-busy={loading ? 'true' : 'false'}
        >
          {loading ? (
            <div className="p-4 text-sm text-text-secondary">Loading customers…</div>
          ) : data.length === 0 ? (
            <div className="p-6 text-sm text-text-secondary">No customers found.</div>
          ) : (
            <div
              className="relative w-full virtual-container"
              style={{ ['--virtual-total-height' as any]: `${totalSize}px` }}
            >
              {virtualItems.map((vi) => {
                const row = rows[vi.index];
                const c = row.original;
                return (
                  <div
                    key={row.id}
                    className="absolute left-0 right-0 grid grid-cols-var virtual-row items-center px-4 border-b border-border hover:bg-accent/40 focus-within:bg-accent/40 cursor-pointer"
                    role="row"
                    tabIndex={0}
                    aria-rowindex={vi.index + 2}
                    style={{
                      ['--row-y' as any]: `${vi.start}px`,
                      ['--row-h' as any]: `${vi.size}px`,
                      ['--grid-template' as any]: gridTemplate,
                    }}
                    onClick={() => onRowClick(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(c);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div key={cell.id} role="cell" className="py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-elevated">
        <div className="text-sm text-text-secondary">
          Page {page} of {totalPages} • {total.toLocaleString()} total
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">
            <span className="sr-only">Rows per page</span>
            <select
              className="border border-border rounded-md px-2 py-1 bg-background"
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
