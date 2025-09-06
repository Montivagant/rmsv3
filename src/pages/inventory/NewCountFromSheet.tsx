import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Label } from '../../components/Label';
import { Checkbox } from '../../components/Checkbox';
import { Tooltip } from '../../components/ui/Tooltip';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import type { 
  CountSheet,
  CountSheetPreview 
} from '../../inventory/count-sheets/types';
import { CountSheetUtils } from '../../inventory/count-sheets/types';
import { countSheetsApiService } from '../../inventory/count-sheets/api';
import type { CreateCountRequest } from '../../inventory/counts/types';

export default function NewCountFromSheet() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const sheetId = searchParams.get('sheetId');
  const shouldFreeze = searchParams.get('freeze') === 'true';
  const defaultDuration = parseInt(searchParams.get('duration') || '60');
  
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState(defaultDuration || 60);
  const [freezeInventory, setFreezeInventory] = useState(shouldFreeze);
  const [showUnfreezeWarning, setShowUnfreezeWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data fetching
  const { data: countSheet, loading: sheetLoading } = useApi<CountSheet>(
    sheetId ? `/api/inventory/count-sheets/${sheetId}` : null
  );

  const [preview, setPreview] = useState<CountSheetPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Mock branches data
  const branches = [
    { id: 'main-restaurant', name: 'Main Restaurant', type: 'restaurant' },
    { id: 'downtown-branch', name: 'Downtown Branch', type: 'restaurant' },
    { id: 'central-warehouse', name: 'Central Warehouse', type: 'warehouse' }
  ];

  // Mock categories, suppliers and storage areas data
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

  // Timer for remaining time (when frozen)
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  // Set initial branch based on count sheet scope
  useEffect(() => {
    if (countSheet && countSheet.branchScope.type === 'specific') {
      setSelectedBranchId(countSheet.branchScope.branchId);
    }
  }, [countSheet]);

  // Load preview when branch is selected
  useEffect(() => {
    if (countSheet && selectedBranchId) {
      loadPreview();
    }
  }, [countSheet, selectedBranchId]);

  // Start countdown timer if freezing inventory
  useEffect(() => {
    if (freezeInventory && !remainingTime) {
      setRemainingTime(estimatedDuration * 60); // Convert minutes to seconds
    }

    if (freezeInventory && remainingTime) {
      const timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev && prev > 0) return prev - 1;
          return 0;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [freezeInventory, remainingTime, estimatedDuration]);

  // Format remaining time as MM:SS
  const formatRemainingTime = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const loadPreview = async () => {
    if (!countSheet || !selectedBranchId) return;
    
    setPreviewLoading(true);
    try {
      const previewData = await countSheetsApiService.previewCountSheet(
        countSheet.id,
        { branchId: selectedBranchId }
      );
      setPreview(previewData);
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to load item preview',
        variant: 'error'
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle freeze inventory toggle
  const handleFreezeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    
    if (freezeInventory && !checked) {
      setShowUnfreezeWarning(true);
    } else {
      setFreezeInventory(checked);
      if (checked) {
        setRemainingTime(estimatedDuration * 60);
      } else {
        setRemainingTime(null);
      }
    }
  };

  // Handle unfreeze confirmation
  const handleUnfreezeConfirm = () => {
    setFreezeInventory(false);
    setRemainingTime(null);
    setShowUnfreezeWarning(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!countSheet || !selectedBranchId || !preview) {
      showToast({
        title: 'Error',
        description: 'Missing required data to create count',
        variant: 'error'
      });
      return;
    }

    if (preview.totalItems === 0) {
      showToast({
        title: 'Error',
        description: 'This count sheet contains no items for the selected branch',
        variant: 'error'
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create count request using resolved items from count sheet
      const request: CreateCountRequest = {
        branchId: selectedBranchId,
        scope: {
          // Pass resolved item IDs to create focused scope
          filters: {
            // Convert preview items to filter criteria  
            // In real implementation, this would use specific item IDs
            categoryIds: preview.items.map(item => item.categoryName).filter(Boolean) as string[]
          }
        },
        notes: notes.trim() || `Count from sheet: ${countSheet.name}`,
        estimatedDurationMinutes: estimatedDuration,
        freezeInventory: freezeInventory
      };

      const response = await fetch('/api/inventory/counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Failed to create count from sheet');
      }

      const result = await response.json();
      
      // Record count sheet usage
      try {
        await countSheetsApiService.archiveCountSheet(
          countSheet.id, 
          false, 
          `Used in count ${result.countId} at ${new Date().toISOString()}`
        );
      } catch (e) {
        console.log('Failed to update count sheet usage, but count was created', e);
      }

      showToast({
        title: 'Count Started',
        description: `Created count session from "${countSheet.name}" with ${preview.totalItems} items.`,
        variant: 'success'
      });
      
      navigate(`/inventory/counts/${result.countId}/entry`);
    } catch (error) {
      showToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create count',
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/inventory/counts');
  };

  // Loading state
  if (sheetLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (!countSheet) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <EmptyState
          title="Count Sheet Not Found"
          description="The requested count sheet could not be found or you don't have permission to access it."
          action={{
            label: "Back to Count Sheets",
            onClick: () => navigate('/inventory/count-sheets')
          }}
        />
      </div>
    );
  }

  const availableBranches = countSheet.branchScope.type === 'all' 
    ? branches 
    : branches.filter(b => b.id === countSheet.branchScope.branchId);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={handleBack}
        >
          ← Back to Counts
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Start Count from Sheet
          </h1>
          <p className="text-text-muted">
            Using count sheet: <strong>{countSheet.name}</strong>
          </p>
        </div>
        
        {freezeInventory && (
          <div className="ml-auto flex flex-col items-center rounded-md px-3 py-1.5 bg-warning/10 border border-warning">
            <div className="text-xs text-warning uppercase font-semibold mb-0.5">Inventory Frozen</div>
            <div className="text-lg font-mono font-bold text-warning">{formatRemainingTime(remainingTime)}</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Count Sheet Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Count Sheet Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-text-secondary">Sheet Name:</span>{' '}
                  <span className="font-medium text-text-primary">{countSheet.name}</span>
                </div>
                
                <div>
                  <span className="text-sm text-text-secondary">Branch Scope:</span>{' '}
                  <span className="text-text-primary">
                    {CountSheetUtils.formatBranchScope(countSheet.branchScope, branches)}
                  </span>
                </div>

                <div>
                  <span className="text-sm text-text-secondary">Item Criteria:</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CountSheetUtils.formatScopeSummary(countSheet.criteria, {
                      categories,
                      suppliers,
                      storageAreas
                    }).map((item, index) => (
                      <Badge key={index} variant="secondary" size="sm">
                        {item.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Count Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Count Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Branch Selection */}
              <div>
                <Label htmlFor="branch" required>
                  Count Branch
                </Label>
                <Select
                  id="branch"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  disabled={countSheet.branchScope.type === 'specific'}
                >
                  <option value="">Select branch to count</option>
                  {availableBranches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </Select>
                {countSheet.branchScope.type === 'specific' && (
                  <p className="text-xs text-text-muted mt-1">
                    Branch is fixed by count sheet scope
                  </p>
                )}
              </div>
              
              {/* Inventory Freeze */}
              <div className="bg-surface-secondary/30 p-4 rounded-md border border-border">
                <div className="flex items-center">
                  <Checkbox
                    id="freeze-inventory"
                    checked={freezeInventory}
                    onChange={handleFreezeChange}
                  />
                  <Label htmlFor="freeze-inventory" className="ml-2 cursor-pointer">
                    Freeze Inventory During Count
                    <Tooltip content="Prevents inventory adjustments while counting to maintain accuracy" side="right">
                      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-secondary text-text-muted text-xs">?</span>
                    </Tooltip>
                  </Label>
                </div>
                
                {freezeInventory && (
                  <div className="mt-4 ml-6 space-y-2">
                    <Label htmlFor="duration" required>
                      Duration Limit (minutes)
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      value={estimatedDuration}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 60;
                        setEstimatedDuration(value);
                        // Also update timer
                        setRemainingTime(value * 60);
                      }}
                      min={15}
                      max={480}
                      className="w-32"
                    />
                    
                    <div className="text-xs text-text-muted mt-1 bg-info/10 p-2 rounded border border-info/20">
                      <p>While frozen, inventory transactions will be queued and applied after the count completes or when manually unfrozen by an admin.</p>
                    </div>
                  </div>
                )}
                
                {showUnfreezeWarning && (
                  <div className="mt-4 ml-6 p-3 bg-warning/10 border border-warning/20 rounded-md">
                    <h4 className="text-sm font-medium text-warning">Confirm Unfreeze</h4>
                    <p className="text-xs text-warning/80 mt-1">
                      Unfreezing inventory will allow transactions to process immediately. 
                      This may affect count accuracy. Are you sure?
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowUnfreezeWarning(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleUnfreezeConfirm}
                      >
                        Confirm Unfreeze
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">
                  Count Notes (Optional)
                </Label>
                <Input
                  id="notes"
                  type="text"
                  placeholder="Add any special instructions or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Item Preview */}
          {selectedBranchId && (
            <Card>
              <CardHeader>
                <CardTitle>Items to Count</CardTitle>
              </CardHeader>
              <CardContent>
                {previewLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : preview ? (
                  <div>
                    {preview.totalItems > 0 ? (
                      <>
                        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                          <p className="text-sm font-medium text-primary">
                            Ready to count {preview.totalItems} items from this sheet
                          </p>
                        </div>
                        
                        <div className="space-y-2 max-h-60 overflow-auto pb-2">
                          {preview.items.slice(0, 10).map(item => (
                            <div key={item.itemId} className="flex justify-between items-center p-2 bg-surface-secondary/50 rounded">
                              <div>
                                <div className="font-medium text-sm text-text-primary">{item.name}</div>
                                <div className="text-xs text-text-muted">{item.sku} · {item.unit}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">Stock: {item.currentStock}</div>
                                <div className="text-xs text-text-muted">{item.categoryName}</div>
                              </div>
                            </div>
                          ))}
                          {preview.totalItems > 10 && (
                            <div className="text-center p-2 text-text-muted text-sm">
                              ... and {preview.totalItems - 10} more items
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-center bg-error/10 border border-error/20 rounded-lg">
                        <p className="text-error">This count sheet contains no items for the selected branch.</p>
                        <Button 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => navigate('/inventory/count-sheets')}
                        >
                          Create Different Sheet
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-text-muted">Select a branch to preview items</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={
                !selectedBranchId || 
                !preview || 
                preview.totalItems === 0 || 
                isSubmitting
              }
            >
              Start Count ({preview?.totalItems || 0} items)
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}