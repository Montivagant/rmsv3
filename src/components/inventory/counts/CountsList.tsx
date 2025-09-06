import React, { useState } from 'react';
import { Button } from '../../Button';
import { Input } from '../../Input';
import { Select } from '../../Select';
import { EmptyState } from '../../EmptyState';
import { Skeleton } from '../../Skeleton';
import { DropdownMenu, DropdownMenuItem } from '../../DropdownMenu';
import { CountStatusBadge } from './CountStatusBadge';
import { VarianceIndicator } from './VarianceIndicator';
import type { InventoryCount, CountQuery } from '../../../inventory/counts/types';

interface CountsListProps {
  data: InventoryCount[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
  onFilterChange: (filters: Partial<CountQuery>) => void;
  onViewCount: (count: InventoryCount) => void;
  onResumeCount: (count: InventoryCount) => void;
  onExportCount: (count: InventoryCount) => void;
  className?: string;
}

export function CountsList({
  data,
  total,
  page,
  pageSize,
  loading = false,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onFilterChange,
  onViewCount,
  onResumeCount,
  onExportCount,
  className = ''
}: CountsListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Loading state
  if (loading && data.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0 && !loading) {
    return (
      <EmptyState
        title="No inventory counts found"
        description="Start your first inventory count to reconcile stock levels."
        action={{
          label: "Create New Count",
          onClick: () => {} // Will be handled by parent
        }}
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Search counts..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              onFilterChange({ search: e.target.value });
            }}
            className="w-full"
          />
        </div>
        
        <Select
          placeholder="All Branches"
          onValueChange={(value) => onFilterChange({ branchId: value || undefined })}
          options={[
            { value: '', label: 'All Branches' },
            { value: 'main-restaurant', label: 'Main Restaurant' },
            { value: 'downtown-location', label: 'Downtown Location' }
          ]}
        />
        
        <Select
          placeholder="All Status"
          onValueChange={(value) => onFilterChange({ status: value as any || undefined })}
          options={[
            { value: '', label: 'All Status' },
            { value: 'draft', label: 'Draft' },
            { value: 'open', label: 'In Progress' },
            { value: 'closed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' }
          ]}
        />
      </div>

      {/* Counts List */}
      <div className="bg-surface rounded-lg border border-border">
        {/* Table Header */}
        <div className="border-b border-border px-4 py-3 bg-surface-secondary/50">
          <div className="grid grid-cols-7 gap-4 text-sm font-medium text-text-secondary">
            <div>Count</div>
            <div>Branch</div>
            <div>Created</div>
            <div>Status</div>
            <div>Progress</div>
            <div>Variance</div>
            <div>Actions</div>
          </div>
        </div>

        {/* Count Items */}
        <div className="divide-y divide-border">
          {data.map((count, index) => (
            <div key={`count-${count.id}-${index}`} className="px-4 py-4 hover:bg-surface-secondary/30 transition-colors">
              <div className="grid grid-cols-7 gap-4 items-center">
                {/* Count ID */}
                <div>
                  <code className="text-sm font-mono text-text-secondary">
                    {count.id.split('_')[1]?.substring(0, 8) || count.id}
                  </code>
                </div>

                {/* Branch */}
                <div>
                  <span className="font-medium text-text-primary">
                    {count.branchId}
                  </span>
                </div>

                {/* Created Info */}
                <div>
                  <div className="text-sm text-text-primary">
                    {new Date(count.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-text-muted">
                    by {count.createdBy}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <CountStatusBadge status={count.status} />
                </div>

                {/* Progress */}
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {count.totals.itemsCountedCount}/{count.totals.totalItemsCount}
                  </div>
                                      <div className="w-full bg-surface-secondary rounded-full h-2 mt-1">
                      <div 
                        className="bg-brand h-2 rounded-full transition-all"
                        style={{ 
                          '--progress-width': `${(count.totals.itemsCountedCount / count.totals.totalItemsCount) * 100}%`,
                          width: 'var(--progress-width)'
                        } as React.CSSProperties}
                      />
                    </div>
                </div>

                {/* Variance */}
                <div>
                  {count.totals.varianceValue !== 0 ? (
                    <div className="space-y-1">
                      <div className={
                        count.totals.varianceValue > 0 
                          ? 'text-sm font-medium text-success' 
                          : 'text-sm font-medium text-error'
                      }>
                        {count.totals.varianceValue.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          signDisplay: 'always'
                        })}
                      </div>
                      <VarianceIndicator
                        varianceQty={count.totals.varianceQty}
                        varianceValue={count.totals.varianceValue}
                        variancePercentage={0}
                        showValue={false}
                        size="sm"
                      />
                    </div>
                  ) : (
                    <span className="text-text-muted">No variance</span>
                  )}
                </div>

                {/* Actions */}
                <div className="text-right">
                  <DropdownMenu
                    trigger={
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </Button>
                    }
                  >
                    <DropdownMenuItem onClick={() => onViewCount(count)}>
                      View Details
                    </DropdownMenuItem>
                    {(count.status === 'draft' || count.status === 'open') && (
                      <DropdownMenuItem onClick={() => onResumeCount(count)}>
                        Resume Counting
                      </DropdownMenuItem>
                    )}
                    {count.status === 'closed' && (
                      <DropdownMenuItem onClick={() => onExportCount(count)}>
                        Export Results
                      </DropdownMenuItem>
                    )}
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-border bg-surface-secondary/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-muted">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} counts
            </div>
            
            <div className="flex items-center space-x-2">
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => onPageSizeChange(parseInt(value))}
                options={[
                  { value: '25', label: '25 per page' },
                  { value: '50', label: '50 per page' },
                  { value: '100', label: '100 per page' }
                ]}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              
              <span className="text-sm text-text-muted">
                Page {page} of {Math.ceil(total / pageSize)}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}