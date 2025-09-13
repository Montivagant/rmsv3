import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../hooks/useToast';
import { useApi } from '../../hooks/useApi';
import { CountStatusBadge } from '../../components/inventory/counts/CountStatusBadge';
import { VarianceIndicator } from '../../components/inventory/counts/VarianceIndicator';
import type { 
  InventoryCount, 
  CountItem, 
  UpdateCountItemRequest,
  SubmitCountRequest 
} from '../../inventory/counts/types';
import { CountUtils } from '../../inventory/counts/types';
import { useVirtualizer } from '@tanstack/react-virtual';

export default function CountSession() {
  const { countId } = useParams<{ countId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(new Map<string, UpdateCountItemRequest>());
  
  // Data fetching
  const { data: countData, loading, error, refetch } = useApi<{
    count: InventoryCount;
    items: CountItem[];
  }>(`/api/inventory/counts/${countId}`);

  const count = countData?.count;
  const items = countData?.items || [];

  // Auto-save pending changes every 30 seconds
  useEffect(() => {
    if (unsavedChanges.size === 0) return;

    const timer = setTimeout(async () => {
      await handleSaveChanges();
    }, 30000);

    return () => clearTimeout(timer);
  }, [unsavedChanges]);

  // Filter and search items
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    
    const search = searchTerm.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(search) ||
      item.sku.toLowerCase().includes(search) ||
      (item.categoryName && item.categoryName.toLowerCase().includes(search))
    );
  }, [items, searchTerm]);

  // Virtualization for items list
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 8,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Handle quantity changes
  const handleQuantityChange = useCallback((itemId: string, value: string) => {
    const numericValue = value === '' ? null : parseFloat(value);
    
    if (numericValue !== null && (numericValue < 0 || isNaN(numericValue))) {
      return; // Ignore invalid input
    }

    const update: UpdateCountItemRequest = {
      itemId,
      countedQty: numericValue || 0,
      notes: undefined
    };

    setUnsavedChanges(prev => new Map(prev.set(itemId, update)));
  }, []);

  // Save pending changes
  const handleSaveChanges = useCallback(async () => {
    if (unsavedChanges.size === 0) return;

    setIsSaving(true);
    try {
      const updates = Array.from(unsavedChanges.values());
      
      const response = await fetch(`/api/inventory/counts/${countId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) {
        throw new Error('Failed to save changes');
      }

      setUnsavedChanges(new Map());
      refetch();
      showToast(`Saved ${updates.length} item counts`, 'success');
      
    } catch (error) {
      console.error('Save error:', error);
      showToast('Failed to save changes', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [unsavedChanges, countId, refetch, showToast]);

  // Submit count and create adjustments
  const handleSubmitCount = useCallback(async () => {
    if (!count) return;

    setIsSubmitting(true);
    try {
      const request: SubmitCountRequest = {
        confirmation: true,
        submissionNotes: 'Count submitted via UI'
      };

      const response = await fetch(`/api/inventory/counts/${countId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Failed to submit count');
      }

      const result = await response.json();
      // Show movement summary if available
      if (result.movementsDuringAudit && result.movementsDuringAudit.hasMovements) {
        showToast(result.summary.totalAdjustments + ' adjustments created. ' + result.movementsDuringAudit.message, 'success');
      } else {
        showToast('Audit submitted successfully. ' + result.summary.totalAdjustments + ' adjustments created.', 'success');
      }
      
      navigate('/inventory/counts');
      
    } catch (error) {
      console.error('Submit error:', error);
      showToast('Failed to submit count', 'error');
    } finally {
      setIsSubmitting(false);
      setShowConfirmSubmit(false);
    }
  }, [count, countId, navigate, showToast]);

  // Calculate current totals
  const currentTotals = useMemo(() => {
    if (!count) return null;

    const countedItems = items.filter(item => item.countedQty !== null);
    const totalVarianceValue = items.reduce((sum, item) => sum + item.varianceValue, 0);
    const totalVarianceQty = items.reduce((sum, item) => sum + item.varianceQty, 0);

    return {
      itemsCountedCount: countedItems.length,
      totalItemsCount: items.length,
      varianceValue: totalVarianceValue,
      varianceQty: totalVarianceQty,
      hasVariances: items.some(item => item.varianceQty !== 0)
    };
  }, [count, items, unsavedChanges]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !count) {
    return (
      <div className="p-6 text-center">
        <div className="text-error">Failed to load Inventory Audit Session</div>
        <Button onClick={() => navigate('/inventory/counts')} className="mt-4">
          Return to Counts
        </Button>
      </div>
    );
  }

  const canEdit = count.status === 'draft' || count.status === 'open';
  const canSubmit = canEdit && (currentTotals?.itemsCountedCount || 0) > 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/inventory/counts')}
            className="p-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Inventory Audit Session
            </h1>
            <p className="text-text-secondary">
              {count.branchId} • Created {new Date(count.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          <CountStatusBadge status={count.status} />
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSaveChanges}
              disabled={unsavedChanges.size === 0 || isSaving}
            >
              {isSaving ? 'Saving...' : `Save (${unsavedChanges.size})`}
            </Button>
            
            <Button
              variant="primary"
              onClick={() => setShowConfirmSubmit(true)}
              disabled={!canSubmit || isSubmitting}
            >
              Submit & Close
            </Button>
          </div>
        )}
      </div>

      {/* Count Summary */}
      {currentTotals && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-text-secondary">Progress</p>
                <p className="text-2xl font-bold text-text-primary">
                  {currentTotals.itemsCountedCount}/{currentTotals.totalItemsCount}
                </p>
                <p className="text-xs text-text-muted">
                  {Math.round((currentTotals.itemsCountedCount / currentTotals.totalItemsCount) * 100)}% complete
                </p>
              </div>
              
              <div>
                <p className="text-sm text-text-secondary">Total Variance</p>
                <p className={
                  currentTotals.varianceValue > 0 ? 'text-2xl font-bold text-success' : 
                  currentTotals.varianceValue < 0 ? 'text-2xl font-bold text-error' : 'text-2xl font-bold text-text-primary'
                }>
                  {currentTotals.varianceValue.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    signDisplay: 'always'
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm text-text-secondary">Quantity Variance</p>
                <p className="text-2xl font-bold text-text-primary">
                  {CountUtils.formatVariance(currentTotals.varianceQty, true)}
                </p>
              </div>

              <div>
                <p className="text-sm text-text-secondary">Unsaved Changes</p>
                <p className="text-2xl font-bold text-warning">
                  {unsavedChanges.size}
                </p>
                {unsavedChanges.size > 0 && (
                  <p className="text-xs text-warning">Click save to persist</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Count Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Count Items ({filteredItems.length})</CardTitle>
            
            <div className="flex gap-2">
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Items List */}
          <div className="max-h-[480px] overflow-auto">
            <div className="relative divide-y divide-border virtual-container" style={{ ['--virtual-total-height' as any]: `${totalSize}px` }}>
              {virtualItems.map((vi) => { const item = filteredItems[vi.index];
                const pendingUpdate = unsavedChanges.get(item.itemId);
                const currentCountedQty = pendingUpdate?.countedQty ?? item.countedQty;
                const hasChanges = pendingUpdate !== undefined;
                
                // Calculate real-time variance
                const variance = currentCountedQty !== null 
                  ? CountUtils.calculateItemVariance({
                      ...item,
                      countedQty: currentCountedQty
                    })
                  : { varianceQty: 0, varianceValue: 0, variancePercentage: 0, hasDiscrepancy: false };

                return (
                  <div
                    key={`count-item-${item.id}-${item.itemId}` }
                    className={
                      hasChanges 
                        ? 'p-4 bg-warning/5 border-l-4 border-warning'
                        : 'p-4 hover:bg-surface-secondary/30'
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      {/* Item Info */}
                      <div className="md:col-span-2">
                        <div className="font-medium text-text-primary">
                          {item.name}
                        </div>
                        <div className="text-sm text-text-secondary">
                          SKU: {item.sku} � {item.unit}
                        </div>
                        {item.categoryName && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.categoryName}
                          </Badge>
                        )}
                      </div>

                      {/* Theoretical Quantity */}
                      <div className="text-center">
                        <div className="text-sm text-text-secondary">Theoretical</div>
                        <div className="font-medium text-text-primary">
                          {item.snapshotQty.toLocaleString()} {item.unit}
                        </div>
                      </div>

                      {/* Counted Quantity */}
                      <div className="text-center">
                        <div className="text-sm text-text-secondary mb-2">Counted</div>
                        {canEdit ? (
                          <Input
                            type="number"
                            value={currentCountedQty?.toString() || ''}
                            onChange={(e) => handleQuantityChange(item.itemId, e.target.value)}
                            placeholder="Enter count"
                            min="0"
                            step="0.01"
                            className={
                              hasChanges 
                                ? 'text-center border-warning bg-warning/5'
                                : 'text-center'
                            }
                            disabled={!canEdit}
                          />
                        ) : (
                          <div className="font-medium text-text-primary">
                            {currentCountedQty?.toLocaleString() || '—'}
                          </div>
                        )}
                        {hasChanges && (
                          <div className="text-xs text-warning mt-1">Unsaved</div>
                        )}
                      </div>

                      {/* Variance */}
                      <div className="text-center">
                        <div className="text-sm text-text-secondary mb-2">Variance</div>
                        {currentCountedQty !== null ? (
                          <VarianceIndicator
                            varianceQty={variance.varianceQty}
                            varianceValue={variance.varianceValue}
                            variancePercentage={variance.variancePercentage}
                            unit={item.unit}
                            showValue={false}
                            size="sm"
                          />
                        ) : (
                          <span className="text-text-muted">�</span>
                        )}
                      </div>

                      {/* Value Impact */}
                      <div className="text-center">
                        <div className="text-sm text-text-secondary mb-2">Value Impact</div>
                        {variance.varianceValue !== 0 ? (
                          <div className={
                            variance.varianceValue > 0 
                              ? 'font-medium text-success' 
                              : 'font-medium text-error'
                          }>
                            {CountUtils.formatVarianceValue(variance.varianceValue)}
                          </div>
                        ) : (
                          <span className="text-text-muted">�</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showConfirmSubmit}
        onClose={() => setShowConfirmSubmit(false)}
        title="Submit Inventory Count"
        size="md"
      >
        <div className="space-y-4 p-6">
          <p className="text-text-primary">
            Are you sure you want to submit this count? This will create inventory adjustments
            and close the Inventory Audit Session.
          </p>
          
          {currentTotals && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Items Counted:</span>
                  <span className="font-medium">{currentTotals.itemsCountedCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Variance:</span>
                  <span className={
                    currentTotals.varianceValue > 0 
                      ? 'font-medium text-success' 
                      : 'font-medium text-error'
                  }>
                    {CountUtils.formatVarianceValue(currentTotals.varianceValue)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowConfirmSubmit(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitCount}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Count'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}



