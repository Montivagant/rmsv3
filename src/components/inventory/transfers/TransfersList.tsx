import React, { useState } from 'react';
import { Button } from '../../Button';
import { Input } from '../../Input';
import { Select } from '../../Select';
import { EmptyState } from '../../EmptyState';
import { Skeleton } from '../../Skeleton';
import { DropdownMenu, DropdownMenuItem } from '../../DropdownMenu';
import { TransferStatusBadge } from './TransferStatusBadge';
import type { 
  Transfer, 
  TransferQuery, 
  Location
} from '../../../inventory/transfers/types';
import { TransferUtils } from '../../../inventory/transfers/types';
// Icons as inline SVGs to match project pattern

interface TransfersListProps {
  data: Transfer[];
  total: number;
  page: number;
  pageSize: number;
  loading?: boolean;
  locations?: Location[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
  onFilterChange: (filters: Partial<TransferQuery>) => void;
  onViewTransfer: (transfer: Transfer) => void;
  onEditTransfer: (transfer: Transfer) => void;
  onCompleteTransfer: (transfer: Transfer) => void;
  onCancelTransfer: (transfer: Transfer) => void;
  onDeleteTransfer: (transfer: Transfer) => void;
  onCreateTransfer?: () => void;
  className?: string;
}

export function TransfersList({
  data,
  total,
  page,
  pageSize,
  loading = false,
  locations = [],
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onFilterChange,
  onViewTransfer,
  onEditTransfer,
  onCompleteTransfer,
  onCancelTransfer,
  onDeleteTransfer,
  onCreateTransfer,
  className = ''
}: TransfersListProps) {
  const [filters, setFilters] = useState<Partial<TransferQuery>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onFilterChange({ ...filters, search: value });
  };

  const handleFilterChange = (field: keyof TransferQuery, value: string | undefined) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const showGlobalEmpty = data.length === 0 && !Object.keys(filters).length && !searchQuery;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search by code, items, or notes..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="flex gap-3">
          <Select
            value={filters.sourceLocationId || ''}
            onChange={(e) => handleFilterChange('sourceLocationId', e.target.value || undefined)}
            className="w-48"
          >
            <option value="">All Sources</option>
            {(locations || []).map(loc => (
              <option key={loc.id} value={loc.id}>{`${loc.name} (${loc.type})`}</option>
            ))}
          </Select>

          <Select
            value={filters.destinationLocationId || ''}
            onChange={(e) => handleFilterChange('destinationLocationId', e.target.value || undefined)}
            className="w-48"
          >
            <option value="">All Destinations</option>
            {(locations || []).map(loc => (
              <option key={loc.id} value={loc.id}>{`${loc.name} (${loc.type})`}</option>
            ))}
          </Select>
        </div>
      </div>

      {showGlobalEmpty && (
        <div className="mt-6">
          <EmptyState
            title="No transfers found"
            description="Create your first transfer to move inventory between branches."
            action={onCreateTransfer ? {
              label: 'Create Transfer',
              onClick: onCreateTransfer,
            } : undefined}
          />
        </div>
      )}

      {/* Transfers Table */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        {/* Table Header */}
        <div className="bg-surface-secondary/50 px-6 py-3 border-b border-border">
          <div className="grid grid-cols-7 gap-4 text-sm font-medium text-text-secondary">
            <div>Code</div>
            <div>Source</div>
            <div>Destination</div>
            <div className="text-center">Lines</div>
            <div className="text-center">Total Qty</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>
        </div>

        {/* Transfer Rows */}
        <div className="divide-y divide-border">
          {data.map((transfer) => {
            const summary = TransferUtils.calculateSummary(transfer.lines);
            
            return (
              <div key={transfer.id} className="px-6 py-4 hover:bg-surface-secondary/30 transition-colors">
                <div className="grid grid-cols-7 gap-4 items-center">
                  {/* Code */}
                  <div>
                    <code className="text-sm font-mono text-text-primary">
                      {transfer.code}
                    </code>
                  </div>

                  {/* Source */}
                  <div className="text-sm text-text-primary">
                    {(locations || []).find(l => l.id === transfer.sourceLocationId)?.name || transfer.sourceLocationId}
                  </div>

                  {/* Destination */}
                  <div className="text-sm text-text-primary">
                    {(locations || []).find(l => l.id === transfer.destinationLocationId)?.name || transfer.destinationLocationId}
                  </div>

                  {/* Lines */}
                  <div className="text-center">
                    <span className="text-sm font-medium">{summary.totalLines}</span>
                  </div>

                  {/* Total Quantity */}
                  <div className="text-center">
                    <span className="text-sm font-medium">
                      {transfer.status === 'COMPLETED' 
                        ? summary.totalQtyFinal 
                        : summary.totalQtyPlanned}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <TransferStatusBadge status={transfer.status} />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <DropdownMenu
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          aria-label="More actions"
                        >
                          <span className="sr-only">Open menu</span>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </Button>
                      }
                    >
                      <DropdownMenuItem onClick={() => onViewTransfer(transfer)}>
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </DropdownMenuItem>

                      {TransferUtils.canEdit(transfer) && (
                        <DropdownMenuItem onClick={() => onEditTransfer(transfer)}>
                          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </DropdownMenuItem>
                      )}

                      {TransferUtils.canComplete(transfer) && (
                        <DropdownMenuItem onClick={() => onCompleteTransfer(transfer)}>
                          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Complete
                        </DropdownMenuItem>
                      )}

                      {TransferUtils.canCancel(transfer) && (
                        <DropdownMenuItem onClick={() => onCancelTransfer(transfer)}>
                          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Cancel
                        </DropdownMenuItem>
                      )}

                      {TransferUtils.canDelete(transfer) && (
                        <>
                          <div className="border-t border-border my-1" />
                          <DropdownMenuItem 
                            onClick={() => onDeleteTransfer(transfer)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenu>
                  </div>
                </div>

                {/* Additional Info */}
                {transfer.notes && (
                  <div className="mt-2 text-sm text-text-muted">
                    {transfer.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State for filtered results */}
        {data.length === 0 && (Object.keys(filters).length > 0 || searchQuery) && (
          <div className="p-8 text-center">
            <p className="text-text-muted">No transfers match your filters.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({});
                setSearchQuery('');
                onFilterChange({});
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(((page - 1) * pageSize) + data.length, total)} of {total} transfers
            </span>
            
            <Select
              value={pageSize.toString()}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
              className="w-20"
              label="Show"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            
            <span className="flex items-center px-3 text-sm">
              Page {page} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}