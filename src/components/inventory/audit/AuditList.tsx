import { useState } from 'react';
import { Button } from '../../Button';
import { Input } from '../../Input';
import { Select } from '../../Select';
import { EmptyState } from '../../EmptyState';
import { Skeleton } from '../../Skeleton';
import { DropdownMenu, DropdownMenuItem } from '../../DropdownMenu';
import { AuditStatusBadge } from './AuditStatusBadge';
import { VarianceIndicator } from './VarianceIndicator';
import type { InventoryCount, CountQuery } from '../../../inventory/audit/types';

interface AuditListProps {
  data: InventoryCount[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
  onFilterChange: (filters: Partial<CountQuery>) => void;
  onViewAudit: (audit: InventoryCount) => void;
  onResumeAudit: (audit: InventoryCount) => void;
  onExportAudit: (audit: InventoryCount) => void;
  onCreateNewAudit?: () => void; // Added for empty state action
  className?: string;
}

export function AuditList({
  data,
  total,
  page,
  pageSize,
  loading = false,
  onPageChange,
  onPageSizeChange,
  onFilterChange,
  onViewAudit,
  onResumeAudit,
  onExportAudit,
  onCreateNewAudit,
  className = ''
}: AuditListProps) {
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
        title="No inventory audits found"
        description="Start your first inventory audit to reconcile stock levels."
        {...(onCreateNewAudit && {
          action: {
            label: "Create New Audit",
            onClick: onCreateNewAudit
          }
        })}
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
            placeholder="Search audits..."
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
          onValueChange={(value) => onFilterChange(value ? { branchId: value } : {})}
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

      {/* Audits List */}
      <div className="bg-surface rounded-lg border border-border">
        {/* Table Header */}
        <div className="border-b border-border px-4 py-3 bg-surface-secondary/50">
          <div className="grid grid-cols-7 gap-4 text-sm font-medium text-text-secondary">
            <div>Audit</div>
            <div>Branch</div>
            <div>Created</div>
            <div>Status</div>
            <div>Progress</div>
            <div>Variance</div>
            <div>Actions</div>
          </div>
        </div>

        {/* Audit Items */}
        <div className="divide-y divide-border">
          {data.map((audit, index) => (
            <div key={`audit-${audit.id}-${index}`} className="px-4 py-4 hover:bg-surface-secondary/30 transition-colors">
              <div className="grid grid-cols-7 gap-4 items-center">
                {/* Audit ID */}
                <div>
                  <code className="text-sm font-mono text-text-secondary">
                    {audit.id.split('_')[1]?.substring(0, 8) || audit.id}
                  </code>
                </div>

                {/* Branch */}
                <div>
                  <span className="font-medium text-text-primary">
                    {audit.branchId}
                  </span>
                </div>

                {/* Created Info */}
                <div>
                  <div className="text-sm text-text-primary">
                    {new Date(audit.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-text-muted">
                    by {audit.createdBy}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <AuditStatusBadge status={audit.status} />
                </div>

                {/* Progress */}
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {audit.totals.itemsCountedCount}/{audit.totals.totalItemsCount}
                  </div>
                  <div className="w-full bg-surface-secondary rounded-full h-2 mt-1">
                    <div 
                      className="bg-brand h-2 rounded-full transition-all w-[--progress-width]"
                      style={{ ['--progress-width' as any]: `${(audit.totals.itemsCountedCount / audit.totals.totalItemsCount) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Variance */}
                <div>
                  {audit.totals.varianceValue !== 0 ? (
                    <div className="space-y-1">
                      <div className={
                        audit.totals.varianceValue > 0 
                          ? 'text-sm font-medium text-success' 
                          : 'text-sm font-medium text-error'
                      }>
                        {audit.totals.varianceValue.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'EGP',
                          signDisplay: 'always'
                        })}
                      </div>
                      <VarianceIndicator
                        varianceQty={audit.totals.varianceQty}
                        varianceValue={audit.totals.varianceValue}
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
                    <DropdownMenuItem onClick={() => onViewAudit(audit)}>
                      View Details
                    </DropdownMenuItem>
                    {(audit.status === 'draft' || audit.status === 'open') && (
                      <DropdownMenuItem onClick={() => onResumeAudit(audit)}>
                        Resume Auditing
                      </DropdownMenuItem>
                    )}
                    {audit.status === 'closed' && (
                      <DropdownMenuItem onClick={() => onExportAudit(audit)}>
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
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} audits
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
