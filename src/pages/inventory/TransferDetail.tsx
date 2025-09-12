import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
// Import namespace to allow test-time mutation of exports via vi.mock/vi.doMock
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { TransferStatusBadge } from '../../components/inventory/transfers/TransferStatusBadge';
import CompleteTransferDrawer from '../../components/inventory/transfers/CompleteTransferDrawer';
import type { 
  Transfer, 
  Location, 
  CompleteTransferRequest,
  CancelTransferRequest 
} from '../../inventory/transfers/types';
import { TransferUtils } from '../../inventory/transfers/types';
import { transferApiService } from '../../inventory/transfers/api';

export default function TransferDetail() {
  const { transferId } = useParams<{ transferId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // State
  const [showCompleteDrawer, setShowCompleteDrawer] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data fetching
  const { data: transfer, loading, error, refetch } = useApi<Transfer>(
    transferId ? `/api/inventory/transfers/${transferId}` : null
  );
  const { data: locations = [] } = useApi<Location[]>('/api/inventory/locations');

  // Handlers
  const handleBack = () => {
    navigate('/inventory/transfers');
  };

  const handleEdit = () => {
    if (transfer && TransferUtils.canEdit(transfer)) {
      navigate(`/inventory/transfers/${transfer.id}/edit`);
    }
  };

  const handleComplete = () => {
    if (transfer && TransferUtils.canComplete(transfer)) {
      setShowCompleteDrawer(true);
    }
  };

  const handleCompleteConfirm = async (request: CompleteTransferRequest) => {
    if (!transfer) return;
    
    setIsSubmitting(true);
    try {
      await transferApiService.completeTransfer(transfer.id, request);
      
      showToast({
        title: 'Transfer Completed',
        description: 'Stock has been moved successfully.',
        variant: 'success'
      });
      
      setShowCompleteDrawer(false);
      refetch();
    } catch (error) {
      showToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete transfer',
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (transfer && TransferUtils.canCancel(transfer)) {
      setShowCancelConfirm(true);
    }
  };

  const handleCancelConfirm = async () => {
    if (!transfer) return;
    
    setIsSubmitting(true);
    try {
      await transferApiService.cancelTransfer(transfer.id, { 
        reason: 'Cancelled by user' 
      });
      
      showToast({
        title: 'Transfer Cancelled',
        description: 'The transfer has been cancelled successfully.',
        variant: 'success'
      });
      
      setShowCancelConfirm(false);
      refetch();
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to cancel transfer',
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!transfer || !TransferUtils.canDelete(transfer)) return;
    
    if (!confirm('Are you sure you want to delete this transfer?')) {
      return;
    }

    try {
      await transferApiService.deleteTransfer(transfer.id);
      
      showToast({
        title: 'Transfer Deleted',
        description: 'The transfer has been deleted successfully.',
        variant: 'success'
      });
      
      navigate('/inventory/transfers');
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to delete transfer',
        variant: 'error'
      });
    }
  };

  // Helper functions
  const getLocationName = (locationId: string) => {
    return (locations || []).find(l => l.id === locationId)?.name || locationId;
  };

  const getSummary = () => {
    if (!transfer) return null;
    return TransferUtils.calculateSummary(transfer.lines);
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" data-testid="skeleton" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" data-testid="skeleton" />
                <Skeleton className="h-4 w-full" data-testid="skeleton" />
                <Skeleton className="h-4 w-3/4" data-testid="skeleton" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error || (!loading && !transfer)) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <EmptyState
          title="Transfer Not Found"
          description="The requested transfer could not be found."
          action={{
            label: "Back to Transfers",
            onClick: handleBack
          }}
        />
      </div>
    );
  }

  const summary = getSummary();

  const overlayOpen = showCompleteDrawer || showCancelConfirm;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6" aria-hidden={overlayOpen}>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
          >
            ← Back to Transfers
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Transfer {transfer.code}
            </h1>
            <p className="text-text-muted">
              {getLocationName(transfer.sourceLocationId)} → {getLocationName(transfer.destinationLocationId)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TransferStatusBadge status={transfer.status} />
          
          {TransferUtils.canEdit(transfer) && (
            <Button
              variant="outline"
              onClick={handleEdit}
            >
              Edit
            </Button>
          )}
          
          {TransferUtils.canComplete(transfer) && (
            <Button
              variant="primary"
              onClick={handleComplete}
            >
              Complete Transfer
            </Button>
          )}
          
          {TransferUtils.canCancel(transfer) && (
            <Button
              variant="destructive"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
          
          {TransferUtils.canDelete(transfer) && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive/10"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-hidden={overlayOpen}>
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transfer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Transfer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">Source Location</h3>
                  <p className="text-text-primary">{getLocationName(transfer.sourceLocationId)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">Destination Location</h3>
                  <p className="text-text-primary">{getLocationName(transfer.destinationLocationId)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">Status</h3>
                  <TransferStatusBadge status={transfer.status} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">Created By</h3>
                  <p className="text-text-primary">{transfer.createdBy}</p>
                </div>
                {transfer.completedBy && (
                  <div>
                    <h3 className="text-sm font-medium text-text-secondary mb-2">Completed By</h3>
                    <p className="text-text-primary">{transfer.completedBy}</p>
                  </div>
                )}
                {transfer.cancelledBy && (
                  <div>
                    <h3 className="text-sm font-medium text-text-secondary mb-2">Cancelled By</h3>
                    <p className="text-text-primary">{transfer.cancelledBy}</p>
                  </div>
                )}
              </div>
              
              {transfer.notes && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-medium text-text-secondary mb-2">Notes</h3>
                  <p className="text-text-primary">{transfer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items ({transfer.lines.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-secondary/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-text-secondary">Item</th>
                      <th className="px-6 py-3 text-center text-sm font-medium text-text-secondary">Planned</th>
                      {transfer.status === 'COMPLETED' && (
                        <th className="px-6 py-3 text-center text-sm font-medium text-text-secondary">Final</th>
                      )}
                      <th className="px-6 py-3 text-center text-sm font-medium text-text-secondary">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transfer.lines.map((line, index) => (
                      <tr key={line.itemId} className={index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/20'}>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-text-primary">{line.name}</div>
                            <div className="text-sm text-text-muted">{line.sku}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-medium">{line.qtyPlanned}</span>
                        </td>
                        {transfer.status === 'COMPLETED' && (
                          <td className="px-6 py-4 text-center">
                            <span className="font-medium">{line.qtyFinal || line.qtyPlanned}</span>
                          </td>
                        )}
                        <td className="px-6 py-4 text-center text-sm text-text-muted">
                          {line.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total Items:</span>
                  <span className="font-medium text-text-primary">{summary?.totalLines || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total Planned:</span>
                  <span className="font-medium text-text-primary">{summary?.totalQtyPlanned || 0}</span>
                </div>
                {transfer.status === 'COMPLETED' && (
                  <div className="flex justify-between pt-3 border-t border-border">
                    <span className="text-text-secondary">Total Transferred:</span>
                    <span className="font-medium text-text-primary">{summary?.totalQtyFinal || 0}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {transfer.status === 'DRAFT' && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleEdit}
                >
                  Edit Transfer
                </Button>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleComplete}
                >
                  Finish Transfer
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleCancel}
                >
                  Cancel Draft
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      {transfer && (
        <CompleteTransferDrawer
          isOpen={showCompleteDrawer}
          onClose={() => setShowCompleteDrawer(false)}
          transfer={transfer}
          onConfirm={handleCompleteConfirm}
          isSubmitting={isSubmitting}
        />
      )}

      <Modal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Cancel Transfer"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to cancel transfer <strong>{transfer.code}</strong>?
            This action cannot be undone.
          </p>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCancelConfirm(false)}
              disabled={isSubmitting}
            >
              Keep Draft
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              loading={isSubmitting}
            >
              Confirm Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
