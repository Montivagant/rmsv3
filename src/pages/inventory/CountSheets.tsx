import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { DropdownMenu, DropdownMenuItem } from '../../components/DropdownMenu';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import CountSheetModal from '../../components/inventory/count-sheets/CountSheetModal';
import type { 
  CountSheet,
  CountSheetQuery,
  CountSheetsResponse
} from '../../inventory/count-sheets/types';
import { CountSheetUtils } from '../../inventory/count-sheets/types';
import { countSheetsApiService } from '../../inventory/count-sheets/api';

export default function CountSheets() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // State management
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState<CountSheet | null>(null);
  const [queryParams, setQueryParams] = useState<CountSheetQuery>({
    page: 1,
    pageSize: 25,
    sortBy: 'lastUsedAt',
    sortOrder: 'desc',
    archived: false
  });

  // Data fetching
  const { data: countSheetsResponse, loading, error, refetch } = useApi<CountSheetsResponse>('/api/inventory/count-sheets', {
    params: queryParams
  });

  // Mock data for dropdowns
  const branches = [
    { id: 'main-restaurant', name: 'Main Restaurant', type: 'restaurant' },
    { id: 'downtown-branch', name: 'Downtown Branch', type: 'restaurant' },
    { id: 'central-warehouse', name: 'Central Warehouse', type: 'warehouse' }
  ];

  const categories = [
    { id: 'produce', name: 'Produce' },
    { id: 'meat', name: 'Meat & Seafood' },
    { id: 'dairy', name: 'Dairy' },
    { id: 'frozen', name: 'Frozen' },
    { id: 'beverages', name: 'Beverages' }
  ];

  const suppliers = [
    { id: 'fresh-farms', name: 'Fresh Farms Co.' },
    { id: 'premium-foods', name: 'Premium Foods Inc.' },
    { id: 'local-dairy', name: 'Local Dairy Coop' }
  ];

  const storageAreas = [
    { id: 'cooler', name: 'Walk-in Cooler' },
    { id: 'freezer', name: 'Walk-in Freezer' },
    { id: 'dry-storage', name: 'Dry Storage' },
    { id: 'prep-area', name: 'Prep Area' }
  ];

  const countSheets = countSheetsResponse?.data || [];
  const total = countSheetsResponse?.total || 0;

  // Event handlers
  const handleFilterChange = useCallback((filters: Partial<CountSheetQuery>) => {
    setQueryParams(prev => ({ ...prev, ...filters, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setQueryParams(prev => ({ ...prev, page }));
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setIsCreateOpen(false);
    refetch();
    showToast({
      title: 'Count Sheet Created',
      description: 'The count sheet has been created successfully.',
      variant: 'success'
    });
  }, [refetch, showToast]);

  const handleEditSuccess = useCallback(() => {
    setEditingSheet(null);
    refetch();
    showToast({
      title: 'Count Sheet Updated',
      description: 'The count sheet has been updated successfully.',
      variant: 'success'
    });
  }, [refetch, showToast]);

  const handleUseForCount = useCallback((sheet: CountSheet) => {
    // Navigate to count creation with sheet parameter
    navigate(`/inventory/counts/new?sheetId=${sheet.id}`);
  }, [navigate]);

  const handleEdit = useCallback((sheet: CountSheet) => {
    setEditingSheet(sheet);
  }, []);

  const handleDuplicate = useCallback(async (sheet: CountSheet) => {
    const newName = `${sheet.name} (Copy)`;
    
    try {
      await countSheetsApiService.duplicateCountSheet(sheet.id, newName);
      showToast({
        title: 'Count Sheet Duplicated',
        description: `Created "${newName}" successfully.`,
        variant: 'success'
      });
      refetch();
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to duplicate count sheet',
        variant: 'error'
      });
    }
  }, [refetch, showToast]);

  const handleArchive = useCallback(async (sheet: CountSheet) => {
    const action = sheet.isArchived ? 'unarchive' : 'archive';
    
    try {
      await countSheetsApiService.archiveCountSheet(sheet.id, !sheet.isArchived);
      showToast({
        title: `Count Sheet ${action === 'archive' ? 'Archived' : 'Unarchived'}`,
        description: `The count sheet has been ${action}d successfully.`,
        variant: 'success'
      });
      refetch();
    } catch (error) {
      showToast({
        title: 'Error',
        description: `Failed to ${action} count sheet`,
        variant: 'error'
      });
    }
  }, [refetch, showToast]);

  const handleDelete = useCallback(async (sheet: CountSheet) => {
    if (!confirm(`Are you sure you want to delete "${sheet.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await countSheetsApiService.deleteCountSheet(sheet.id);
      showToast({
        title: 'Count Sheet Deleted',
        description: 'The count sheet has been deleted successfully.',
        variant: 'success'
      });
      refetch();
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to delete count sheet',
        variant: 'error'
      });
    }
  }, [refetch, showToast]);

  const totalPages = Math.ceil(total / (queryParams.pageSize || 25));

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Count Sheets</h1>
          <p className="text-text-muted mt-1">Saved item scopes for quick inventory counts</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
        >
          Create Count Sheet
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="search"
                placeholder="Search count sheets by name..."
                value={queryParams.search || ''}
                onChange={(e) => handleFilterChange({ search: e.target.value || undefined })}
                className="w-full"
              />
            </div>
            
            <div className="flex gap-3">
              <Select
                value={queryParams.branchId || ''}
                onChange={(e) => handleFilterChange({ branchId: e.target.value || undefined })}
                className="w-48"
              >
                <option value="">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </Select>

              <Select
                value={queryParams.archived?.toString() || 'false'}
                onChange={(e) => handleFilterChange({ archived: e.target.value === 'true' })}
                className="w-32"
              >
                <option value="false">Active</option>
                <option value="true">Archived</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Count Sheets List */}
      <Card>
        <CardContent className="p-0">
          {countSheets.length === 0 ? (
            <EmptyState
              title="No count sheets found"
              description={queryParams.search || queryParams.branchId || queryParams.archived 
                ? "No count sheets match your filters."
                : "Create your first count sheet to quickly start inventory counts with predefined item scopes."
              }
              action={{
                label: "Create Count Sheet",
                onClick: () => setIsCreateOpen(true)
              }}
            />
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-surface-secondary/50 px-6 py-3 border-b border-border">
                <div className="grid grid-cols-6 gap-4 text-sm font-medium text-text-secondary">
                  <div>Name</div>
                  <div>Scope Summary</div>
                  <div>Branch Scope</div>
                  <div>Last Used</div>
                  <div>Status</div>
                  <div className="text-right">Actions</div>
                </div>
              </div>

              {/* Count Sheet Rows */}
              <div className="divide-y divide-border">
                {countSheets.map((sheet) => {
                  const scopeSummary = CountSheetUtils.formatScopeSummary(sheet.criteria, {
                    categories,
                    suppliers,
                    storageAreas
                  });
                  const branchScopeText = CountSheetUtils.formatBranchScope(sheet.branchScope, branches);
                  const lastUsedText = CountSheetUtils.formatLastUsed(sheet.lastUsedAt);

                  return (
                    <div key={sheet.id} className="px-6 py-4 hover:bg-surface-secondary/30 transition-colors">
                      <div className="grid grid-cols-6 gap-4 items-center">
                        {/* Name */}
                        <div>
                          <div className="font-medium text-text-primary">
                            {sheet.name}
                          </div>
                          {sheet.isArchived && (
                            <Badge variant="secondary" size="sm" className="mt-1">
                              Archived
                            </Badge>
                          )}
                        </div>

                        {/* Scope Summary */}
                        <div>
                          {scopeSummary.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {scopeSummary.slice(0, 2).map((item, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  size="sm"
                                  className="text-xs"
                                >
                                  {item.label}
                                </Badge>
                              ))}
                              {scopeSummary.length > 2 && (
                                <Badge
                                  variant="secondary"
                                  size="sm"
                                  className="text-xs"
                                >
                                  +{scopeSummary.length - 2} more
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-text-muted text-sm">All items</span>
                          )}
                        </div>

                        {/* Branch Scope */}
                        <div className="text-sm text-text-primary">
                          {branchScopeText}
                        </div>

                        {/* Last Used */}
                        <div className="text-sm text-text-muted">
                          {lastUsedText}
                        </div>

                        {/* Status */}
                        <div>
                          <Badge 
                            variant={sheet.isArchived ? 'secondary' : 'success'} 
                            size="sm"
                          >
                            {sheet.isArchived ? 'Archived' : 'Active'}
                          </Badge>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end">
                          <DropdownMenu
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <span className="sr-only">Open menu</span>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </Button>
                            }
                          >
                            {CountSheetUtils.canUse(sheet) && (
                              <DropdownMenuItem onClick={() => handleUseForCount(sheet)}>
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Start Count
                              </DropdownMenuItem>
                            )}

                            {CountSheetUtils.canEdit(sheet) && (
                              <DropdownMenuItem onClick={() => handleEdit(sheet)}>
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </DropdownMenuItem>
                            )}

                            {CountSheetUtils.canDuplicate(sheet) && (
                              <DropdownMenuItem onClick={() => handleDuplicate(sheet)}>
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Duplicate
                              </DropdownMenuItem>
                            )}

                            <div className="border-t border-border my-1" />

                            {(CountSheetUtils.canArchive(sheet) || CountSheetUtils.canUnarchive(sheet)) && (
                              <DropdownMenuItem onClick={() => handleArchive(sheet)}>
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M5 8l4 4 4-4" />
                                </svg>
                                {sheet.isArchived ? 'Unarchive' : 'Archive'}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem 
                              onClick={() => handleDelete(sheet)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-muted">
                      Showing {((queryParams.page || 1) - 1) * (queryParams.pageSize || 25) + 1} to{' '}
                      {Math.min((queryParams.page || 1) * (queryParams.pageSize || 25), total)} of {total} count sheets
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange((queryParams.page || 1) - 1)}
                      disabled={(queryParams.page || 1) === 1}
                    >
                      Previous
                    </Button>
                    
                    <span className="flex items-center px-3 text-sm">
                      Page {queryParams.page || 1} of {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange((queryParams.page || 1) + 1)}
                      disabled={(queryParams.page || 1) === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CountSheetModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
        branches={branches}
        categories={categories}
        suppliers={suppliers}
        storageAreas={storageAreas}
      />

      {editingSheet && (
        <CountSheetModal
          isOpen={!!editingSheet}
          onClose={() => setEditingSheet(null)}
          onSuccess={handleEditSuccess}
          editingSheet={editingSheet}
          branches={branches}
          categories={categories}
          suppliers={suppliers}
          storageAreas={storageAreas}
        />
      )}
    </div>
  );
}
