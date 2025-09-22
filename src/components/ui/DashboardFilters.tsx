import React, { useState, useRef } from 'react';
import { cn } from '../../lib/utils';
import { useDismissableLayer } from '../../hooks/useDismissableLayer';
import { Button } from '../Button';

interface DashboardFiltersProps {
  period: 'day' | 'week' | 'month' | 'custom';
  onPeriodChange: (period: 'day' | 'week' | 'month' | 'custom') => void;
  startDate: string | undefined;
  endDate: string | undefined;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  branches: string[];
  onBranchesChange: (branches: string[]) => void;
  compare: boolean;
  onCompareToggle: () => void;
  periodLabel: string;
  branchesLabel: string;
  className?: string;
}

/**
 * Dashboard filters component with period picker, branch selector, and compare toggle
 * Uses dismissible layers for dropdowns and proper accessibility
 */
export function DashboardFilters({
  period,
  onPeriodChange,
  startDate,
  endDate,
  onDateRangeChange,
  branches,
  onBranchesChange,
  compare,
  onCompareToggle,
  periodLabel,
  branchesLabel,
  className
}: DashboardFiltersProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {/* Period Picker */}
      <PeriodPicker
        period={period}
        onPeriodChange={onPeriodChange}
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={onDateRangeChange}
        periodLabel={periodLabel}
      />
      
      {/* Branch Selector */}
      <BranchSelector
        branches={branches}
        onBranchesChange={onBranchesChange}
        branchesLabel={branchesLabel}
      />
      
      {/* Compare Toggle */}
      <Button
        variant={compare ? 'primary' : 'outline'}
        size="sm"
        onClick={onCompareToggle}
        className="flex items-center space-x-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span>Compare</span>
      </Button>
    </div>
  );
}

/**
 * Period picker component with custom date range support
 */
function PeriodPicker({
  period,
  onPeriodChange,
  startDate,
  endDate,
  onDateRangeChange,
  periodLabel
}: {
  period: 'day' | 'week' | 'month' | 'custom';
  onPeriodChange: (period: 'day' | 'week' | 'month' | 'custom') => void;
  startDate: string | undefined;
  endDate: string | undefined;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  periodLabel: string;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { layerRef } = useDismissableLayer({
    isOpen: showDropdown || showDatePicker,
    onDismiss: () => {
      setShowDropdown(false);
      setShowDatePicker(false);
    },
    closeOnOutside: true,
    closeOnEscape: true,
    closeOnRouteChange: true,
    triggerRef: triggerRef,
    id: 'dashboard-period-picker'
  });

  const periods = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'Last 7 days' },
    { value: 'month', label: 'This month' },
    { value: 'custom', label: 'Custom range' }
  ] as const;

  const handlePeriodSelect = (selectedPeriod: typeof period) => {
    if (selectedPeriod === 'custom') {
      setShowDropdown(false);
      setShowDatePicker(true);
    } else {
      onPeriodChange(selectedPeriod);
      setShowDropdown(false);
    }
  };

  const handleDateRangeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const start = formData.get('startDate') as string;
    const end = formData.get('endDate') as string;
    
    if (start && end) {
      onDateRangeChange(start, end);
      setShowDatePicker(false);
    }
  };

  return (
    <div ref={layerRef as React.RefObject<HTMLDivElement>} className="relative">
      <Button
        ref={triggerRef}
        variant="outline"
        size="sm"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{periodLabel}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {/* Period Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-2 w-48 bg-surface border border-border-primary rounded-lg shadow-lg z-50"
          role="listbox"
        >
          {periods.map((p) => (
            <button
              key={p.value}
              className={cn(
                'w-full text-left px-4 py-2 text-sm hover:bg-surface-secondary transition-colors first:rounded-t-lg last:rounded-b-lg',
                period === p.value && 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
              )}
              onClick={() => handlePeriodSelect(p.value)}
              role="option"
              aria-selected={period === p.value}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Custom Date Range Picker */}
      {showDatePicker && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-surface border border-border-primary rounded-lg shadow-lg z-50 min-w-[300px]">
          <form onSubmit={handleDateRangeSubmit} className="space-y-4">
            <h3 className="font-medium text-text-primary">Custom Date Range</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1" htmlFor="startDate">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  defaultValue={startDate}
                  className="w-full px-3 py-2 border border-border-primary rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1" htmlFor="endDate">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  defaultValue={endDate}
                  className="w-full px-3 py-2 border border-border-primary rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDatePicker(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Apply
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * Branch selector component with multi-select support
 */
function BranchSelector({
  branches,
  onBranchesChange,
  branchesLabel
}: {
  branches: string[];
  onBranchesChange: (branches: string[]) => void;
  branchesLabel: string;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { layerRef } = useDismissableLayer({
    isOpen: showDropdown,
    onDismiss: () => setShowDropdown(false),
    closeOnOutside: true,
    closeOnEscape: true,
    closeOnRouteChange: true,
    triggerRef: triggerRef,
    id: 'dashboard-branch-selector'
  });

  // Mock branch data - TODO: Replace with actual branch data
  const availableBranches = [
    { id: 'main', name: 'Main Branch' },
    { id: 'downtown', name: 'Downtown' },
    { id: 'mall', name: 'Shopping Mall' },
    { id: 'airport', name: 'Airport Terminal' }
  ];

  const handleBranchToggle = (branchId: string) => {
    if (branches.includes(branchId)) {
      onBranchesChange(branches.filter(id => id !== branchId));
    } else {
      onBranchesChange([...branches, branchId]);
    }
  };

  const handleSelectAll = () => {
    if (branches.length === availableBranches.length) {
      onBranchesChange([]);
    } else {
      onBranchesChange(availableBranches.map(b => b.id));
    }
  };

  return (
    <div ref={layerRef as React.RefObject<HTMLDivElement>} className="relative">
      <Button
        ref={triggerRef}
        variant="outline"
        size="sm"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span>{branchesLabel}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-2 w-56 bg-surface border border-border-primary rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
          role="listbox"
        >
          <div className="p-2">
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-surface-secondary transition-colors rounded-md font-medium"
              onClick={handleSelectAll}
            >
              {branches.length === availableBranches.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="border-t border-border-secondary">
            {availableBranches.map((branch) => (
              <label
                key={branch.id}
                className="flex items-center px-4 py-2 text-sm hover:bg-surface-secondary transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={branches.includes(branch.id)}
                  onChange={() => handleBranchToggle(branch.id)}
                  className="mr-3 rounded border-border-primary text-brand-600 focus:ring-brand-500"
                />
                <span>{branch.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardFilters;
