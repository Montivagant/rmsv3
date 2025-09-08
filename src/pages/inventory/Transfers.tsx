import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import Tabs from '../../components/Tabs';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { TransfersList } from '../../components/inventory/transfers/TransfersList';
import NewTransferModal from '../../components/inventory/transfers/NewTransferModal';
import CompleteTransferDrawer from '../../components/inventory/transfers/CompleteTransferDrawer';
import type { 
  Transfer, 
  TransferQuery,
  TransfersResponse,
  TransferStatus,
  Location,
  CompleteTransferRequest,
  CancelTransferRequest
} from '../../inventory/transfers/types';
import { TransferUtils } from '../../inventory/transfers/types';

export default function Transfers() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'completed' | 'cancelled'>('all');
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showCompleteDrawer, setShowCompleteDrawer] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Transfer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queryParams, setQueryParams] = useState<TransferQuery>({
    page: 1,
    pageSize: 25,
    sortBy: 'code',
    sortOrder: 'desc'
  });

  // Data fetching
  const { data: transfersResponse, loading, error, refetch } = useApi<TransfersResponse>('/api/inventory/transfers', {
    params: queryParams
  });

  const { data: locations = [] } = useApi<Location[]>('/api/inventory/locations');

  const transfers = transfersResponse?.data || [];
  const total = transfersResponse?.total || 0;

  // Filter transfers by active tab
  const filteredTransfers = useMemo(() => {
    switch (activeTab) {
      case 'draft':
        return transfers.filter(t => t.status === 'DRAFT');
      case 'completed':
        return transfers.filter(t => t.status === 'COMPLETED');
      case 'cancelled':
        return transfers.filter(t => t.status === 'CANCELLED');
      case 'all':
      default:
        return transfers;
    }
  }, [transfers, activeTab]);

  // Tab counts for badges
  const tabCounts = useMemo(() => {
    return {
      all: transfers.length,
      draft: transfers.filter(t => t.status === 'DRAFT').length,
      completed: transfers.filter(t => t.status === 'COMPLETED').length,
      cancelled: transfers.filter(t => t.status === 'CANCELLED').length
    };
  }, [transfers]);

  // Event handlers
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as typeof activeTab);
    // Reset to first page when changing tabs
    setQueryParams(prev => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setQueryParams(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setQueryParams(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const handleSortChange = useCallback((field: string, direction: 'asc' | 'desc') => {
    setQueryParams(prev => ({ 
      ...prev, 
      sortBy: field as any,
      sortOrder: direction,
      page: 1
    }));
  }, []);

  const handleFilterChange = useCallback((filters: Partial<TransferQuery>) => {
    setQueryParams(prev => ({ ...prev, ...filters, page: 1 }));
  }, []);

  const handleCreateSuccess = useCallback(() => {
    setIsNewTransferOpen(false);
    refetch();
    showToast({
      title: 'Transfer Created',
      description: 'The transfer has been created successfully.',
      variant: 'success'
    });
  }, [refetch, showToast]);

  const handleViewTransfer = useCallback((transfer: Transfer) => {
    navigate(`/inventory/transfers/${transfer.id}`);
  }, [navigate]);

  const handleEditTransfer = useCallback((transfer: Transfer) => {
    if (!TransferUtils.canEdit(transfer)) {
      showToast({
        title: 'Cannot Edit',
        description: 'Only draft transfers can be edited.',
        variant: 'error'
      });
      return;
    }
    navigate(`/inventory/transfers/${transfer.id}/edit`);
  }, [navigate, showToast]);

  const handleCompleteTransfer = useCallback((transfer: Transfer) => {
    if (!TransferUtils.canComplete(transfer)) {
      showToast({
        title: 'Cannot Complete',
        description: 'Only draft transfers with items can be completed.',
        variant: 'error'
      });
      return;
    }
    setSelectedTransfer(transfer);
    setShowCompleteDrawer(true);
  }, [showToast]);

  const handleCompleteConfirm = useCallback(async (request: CompleteTransferRequest) => {
    if (!selectedTransfer) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/inventory/transfers/${selectedTransfer.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details?.join('\n') || error.error || 'Failed to complete transfer');
      }

      showToast({
        title: 'Transfer Completed',
        description: 'Stock has been moved successfully.',
        variant: 'success'
      });
      
      setShowCompleteDrawer(false);
      setSelectedTransfer(null);
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
  }, [selectedTransfer, refetch, showToast]);

  const handleCancelTransfer = useCallback((transfer: Transfer) => {
    if (!TransferUtils.canCancel(transfer)) {
      showToast({
        title: 'Cannot Cancel',
        description: 'Only draft transfers can be cancelled.',
        variant: 'error'
      });
      return;
    }
    setSelectedTransfer(transfer);
    setShowCancelConfirm(true);
  }, [showToast]);

  const handleCancelConfirm = useCallback(async () => {
    if (!selectedTransfer) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/inventory/transfers/${selectedTransfer.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by user' })
      });

      if (!response.ok) {
        throw new Error('Failed to cancel transfer');
      }

      showToast({
        title: 'Transfer Cancelled',
        description: 'The transfer has been cancelled successfully.',
        variant: 'success'
      });
      
      setShowCancelConfirm(false);
      setSelectedTransfer(null);
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
  }, [selectedTransfer, refetch, showToast]);

  const handleDeleteTransfer = useCallback(async (transfer: Transfer) => {
    if (!TransferUtils.canDelete(transfer)) {
      showToast({
        title: 'Cannot Delete',
        description: 'Only empty draft transfers can be deleted.',
        variant: 'error'
      });
      return;
    }
    setPendingDelete(transfer);
    setShowDeleteConfirm(true);
  }, [showToast]);

  // Tab configuration
  const tabs = useMemo(() => [
    {
      id: 'all',
      label: `All (${tabCounts.all})`,
      content: (
        <TransfersList
          data={filteredTransfers}
          total={total}
          page={queryParams.page || 1}
          pageSize={queryParams.pageSize || 25}
          loading={loading}
          locations={locations}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
          onViewTransfer={handleViewTransfer}
          onEditTransfer={handleEditTransfer}
          onCompleteTransfer={handleCompleteTransfer}
          onCancelTransfer={handleCancelTransfer}
          onDeleteTransfer={handleDeleteTransfer}
        />
      )
    },
    {
      id: 'draft',
      label: `Drafts (${tabCounts.draft})`,
      content: (
        <TransfersList
          data={filteredTransfers}
          total={tabCounts.draft}
          page={queryParams.page || 1}
          pageSize={queryParams.pageSize || 25}
          loading={loading}
          locations={locations}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
          onViewTransfer={handleViewTransfer}
          onEditTransfer={handleEditTransfer}
          onCompleteTransfer={handleCompleteTransfer}
          onCancelTransfer={handleCancelTransfer}
          onDeleteTransfer={handleDeleteTransfer}
        />
      )
    },
    {
      id: 'completed',
      label: `Completed (${tabCounts.completed})`,
      content: (
        <TransfersList
          data={filteredTransfers}
          total={tabCounts.completed}
          page={queryParams.page || 1}
          pageSize={queryParams.pageSize || 25}
          loading={loading}
          locations={locations}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
          onViewTransfer={handleViewTransfer}
          onEditTransfer={handleEditTransfer}
          onCompleteTransfer={handleCompleteTransfer}
          onCancelTransfer={handleCancelTransfer}
          onDeleteTransfer={handleDeleteTransfer}
        />
      )
    },
    {
      id: 'cancelled',
      label: `Cancelled (${tabCounts.cancelled})`,
      content: (
        <TransfersList
          data={filteredTransfers}
          total={tabCounts.cancelled}
          page={queryParams.page || 1}
          pageSize={queryParams.pageSize || 25}
          loading={loading}
          locations={locations}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
          onViewTransfer={handleViewTransfer}
          onEditTransfer={handleEditTransfer}
          onCompleteTransfer={handleCompleteTransfer}
          onCancelTransfer={handleCancelTransfer}
          onDeleteTransfer={handleDeleteTransfer}
        />
      )
    }
  ], [
    tabCounts,
    filteredTransfers,
    total,
    queryParams,
    loading,
    locations,
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,
    handleFilterChange,
    handleViewTransfer,
    handleEditTransfer,
    handleCompleteTransfer,
    handleCancelTransfer,
    handleDeleteTransfer
  ]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Inventory Transfers</h1>
          <p className="text-text-muted mt-1">Move inventory between branches</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsNewTransferOpen(true)}
        >
          Create Transfer
        </Button>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-0">
          <Tabs
            tabs={tabs}
            initialId={activeTab}
            onChange={handleTabChange}
            ariaLabel="Transfer status filters"
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <NewTransferModal
        isOpen={isNewTransferOpen}
        onClose={() => setIsNewTransferOpen(false)}
        onSuccess={handleCreateSuccess}
        locations={locations}
      />

      {selectedTransfer && (
        <CompleteTransferDrawer
          isOpen={showCompleteDrawer}
          onClose={() => {
            setShowCompleteDrawer(false);
            setSelectedTransfer(null);
          }}
          transfer={selectedTransfer}
          onConfirm={handleCompleteConfirm}
          isSubmitting={isSubmitting}
        />
      )}

      <Modal
        isOpen={showCancelConfirm}
        onClose={() => {
          setShowCancelConfirm(false);
          setSelectedTransfer(null);
        }}
        title="Cancel Transfer"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to cancel transfer <strong>{selectedTransfer?.code}</strong>?
            This action cannot be undone.
          </p>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelConfirm(false);
                setSelectedTransfer(null);
              }}
              disabled={isSubmitting}
            >
              Keep Draft
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              loading={isSubmitting}
            >
              Cancel Transfer
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPendingDelete(null);
        }}
        title="Delete Transfer"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to delete transfer <strong>{pendingDelete?.code}</strong>?
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setPendingDelete(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={isSubmitting}
              onClick={async () => {
                if (!pendingDelete) return;
                setIsSubmitting(true);
                try {
                  const response = await fetch(`/api/inventory/transfers/${pendingDelete.id}`, {
                    method: 'DELETE'
                  });
                  if (!response.ok) {
                    throw new Error('Failed to delete transfer');
                  }
                  showToast({
                    title: 'Transfer Deleted',
                    description: 'The transfer has been deleted successfully.',
                    variant: 'success'
                  });
                  setShowDeleteConfirm(false);
                  setPendingDelete(null);
                  refetch();
                } catch (error) {
                  showToast({
                    title: 'Error',
                    description: 'Failed to delete transfer',
                    variant: 'error'
                  });
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              Delete Transfer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
