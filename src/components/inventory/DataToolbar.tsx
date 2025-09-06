import React from 'react';
import { cn } from '../../lib/utils';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface DataToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    key: string;
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }[];
  actions?: React.ReactNode;
  className?: string;
}

export function DataToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  actions,
  className,
}: DataToolbarProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        {onSearchChange && (
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                'w-full pl-9 pr-3 py-2',
                'bg-background border border-input rounded-lg',
                'text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'transition-all duration-200'
              )}
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange('')}
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2',
                  'p-1 rounded hover:bg-muted',
                  'text-muted-foreground hover:text-foreground',
                  'transition-colors duration-200'
                )}
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        {filters.map((filter) => (
          <div key={filter.key} className="min-w-[150px]">
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className={cn(
                'w-full px-3 py-2',
                'bg-background border border-input rounded-lg',
                'text-sm text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'transition-all duration-200',
                'cursor-pointer'
              )}
              aria-label={filter.label}
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {option.count !== undefined && ` (${option.count})`}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
