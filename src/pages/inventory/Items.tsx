import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Select } from '../../components/Select';
import { DataTable } from '../../components/inventory/DataTable';
import { DataToolbar } from '../../components/inventory/DataToolbar';
import { StatusPill } from '../../components/inventory/StatusPill';
import { EmptyState } from '../../components/inventory/EmptyState';
import InventoryItemCreateModal from '../../components/inventory/InventoryItemCreateModal';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

// Types
interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  categoryId: string;
  quantity?: number;
  unit?: string;
  reorderPoint?: number;
  parLevel?: number;
  cost?: number;
  price?: number;
  location?: string;
  lastReceived?: string;
  expiryDate?: string;
  lotNumber?: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired' | 'active' | 'inactive' | 'discontinued';
  // Advanced inventory structure
  levels?: {
    current: number;
    reserved?: number;
    available?: number;
    par?: {
      min?: number;
      max?: number;
      reorderPoint?: number;
    }
  };
  costing?: {
    averageCost?: number;
    lastCost?: number;
  };
  uom?: {
    base?: string;
  };
}

interface Category {
  id: string;
  name: string;
  itemCount: number;
}

export default function Items() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<InventoryItem | null>(null);
  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  
  // API calls
  const { data: itemsResponse, loading, error, refetch } = useApi<{ items: InventoryItem[], total: number }>('/api/inventory/items', { items: [], total: 0 });
  const { data: categories = [] } = useApi<Category[]>('/api/inventory/categories', []);
  const { data: units = [] } = useApi<Array<{ id: string; name: string; abbreviation: string }>>('/api/inventory/units', []);
  
  // Ensure items is always an array - extract from response object
  const safeItems = Array.isArray(itemsResponse) ? itemsResponse : (itemsResponse?.items || []);
  
  // Log any API errors
  useEffect(() => {
    if (error) {
      console.error('Error fetching inventory items:', error);
      showToast({
        title: 'Error',
        description: 'Failed to load inventory items. Please try again.',
        variant: 'error'
      });
    }
  }, [error, showToast]);
  
  // Get existing SKUs for uniqueness check
  const existingSKUs = safeItems.map(item => item.sku);
  
  // Reset page on filter/search change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedCategory, selectedStatus]);
  // Filter items
  const filteredItems = useMemo(() => {
    return safeItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [safeItems, searchTerm, selectedCategory, selectedStatus]);

  // Handle successful item creation
  const handleItemCreated = (itemId: string) => {
    refetch(); // Refresh the item list
    setIsCreateModalOpen(false);
    showToast({
      title: 'Item Created',
      description: 'The inventory item has been created successfully.',
      variant: 'success'
    });
  };

  // Handle edit item
  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsEditDrawerOpen(true);
  };

  // Handle delete item
  const handleDeleteItem = async (item: InventoryItem) => {
    setPendingDelete(item);
    setShowDeleteConfirm(true);
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      header: 'Item',
      accessor: (item: InventoryItem) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">SKU: {item.sku || 'N/A'}</p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'category',
      header: 'Category',
      accessor: (item: InventoryItem) => {
        // Find category name from categories list if we only have ID
        if (item.category) {
          return item.category;
        } else if (item.categoryId) {
          const category = categories.find(c => c.id === item.categoryId);
          return category ? category.name : item.categoryId;
        }
        return 'Uncategorized';
      },
      sortable: true,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      accessor: (item: InventoryItem) => {
        // Handle both legacy and new inventory structure
        const quantity = item.quantity !== undefined ? item.quantity : (item.levels?.current || 0);
        const unit = item.unit || item.uom?.base || '';
        const reorderPoint = item.reorderPoint !== undefined ? item.reorderPoint : (item.levels?.par?.reorderPoint || 0);








        return (
          <div>
            <p className="font-medium">{quantity} {unit}</p>
            {quantity <= reorderPoint && reorderPoint > 0 && (
              <p className="text-xs text-warning">Below reorder point</p>
            )}
          </div>
        );
      },
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (item: InventoryItem) => {
        const statusMap = {
          'in-stock': { status: 'success' as const, label: 'In Stock' },
          'low-stock': { status: 'warning' as const, label: 'Low Stock' },
          'out-of-stock': { status: 'danger' as const, label: 'Out of Stock' },
          'expired': { status: 'danger' as const, label: 'Expired' },
          'active': { status: 'success' as const, label: 'Active' },
          'inactive': { status: 'warning' as const, label: 'Inactive' },
          'discontinued': { status: 'danger' as const, label: 'Discontinued' },
        };
        
        // Use the status map or default to a neutral status
        const statusInfo = statusMap[item.status] || { status: 'default' as const, label: item.status || 'Unknown' };
        return <StatusPill status={statusInfo.status} label={statusInfo.label} size="sm" />;
      },
    },
    {
      key: 'cost',
      header: 'Cost',
      accessor: (item: InventoryItem) => {
        const cost = item.cost !== undefined ? item.cost : (item.costing?.averageCost || 0);
        return `$${cost.toFixed(2)}`;
      },
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (item: InventoryItem) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditItem(item);
            }}
            className="p-1 hover:bg-muted rounded"
            aria-label="Edit item"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteItem(item);
            }}
            className="p-1 hover:bg-muted rounded text-error"
            aria-label="Delete item"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
      align: 'center' as const,
    },
  ];
  // Pagination calculations
  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = filteredItems.slice(start, start + pageSize);


  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Items</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage individual inventory items, stock levels, and item details</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </Button>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <DataToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search items by name, SKU, or description..."
            filters={[
              {
                key: 'category',
                label: 'Category',
                value: selectedCategory,
                onChange: setSelectedCategory,
                options: [
                  { value: 'all', label: 'All Categories' },
                  ...(categories || []).map((cat: Category) => ({
                    value: cat.id,
                    label: cat.name,
                    count: cat.itemCount,
                  })),
                ],
              },
              {
                key: 'status',
                label: 'Status',
                value: selectedStatus,
                onChange: setSelectedStatus,
                options: [
                  { value: 'all', label: 'All Status' },
                  { value: 'in-stock', label: 'In Stock' },
                  { value: 'low-stock', label: 'Low Stock' },
                  { value: 'out-of-stock', label: 'Out of Stock' },
                  { value: 'expired', label: 'Expired' },
                ],
              },
            ]}
            actions={
              <Button
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </Button>
            }
          />
          
          <DataTable
            data={pageItems}
            columns={columns}
            keyExtractor={(item) => item.id}
            onRowClick={handleEditItem}
            loading={loading}
            emptyState={{
              icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              ),
              title: 'No items found',
              description: searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Start by adding your first inventory item',
              action: {
                label: 'Add Item',
                onClick: () => setIsCreateModalOpen(true),
              },
            }}
          />
          <div className="flex items-center justify-between px-2 py-3">
            <div className="text-sm text-text-secondary">
              Page {currentPage} of {totalPages} - {total.toLocaleString()} total
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">
                <span className="sr-only">Rows per page</span>
                <select
                  className="ml-2 border border-border rounded-md bg-surface px-2 py-1 text-sm"
                  value={pageSize}
                  onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </label>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>Next</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Item Create Modal */}
      <InventoryItemCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleItemCreated}
        categories={categories}
        units={units}
        existingSKUs={existingSKUs}
        isLoading={loading}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPendingDelete(null);
        }}
        title="Delete Item"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to delete <strong>{pendingDelete?.name}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setPendingDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!pendingDelete) return;
                try {
                  const response = await fetch(`/api/inventory/items/${pendingDelete.id}`, { method: 'DELETE' });
                  if (!response.ok) throw new Error('Failed to delete item');
                  showToast({
                    title: 'Item Deleted',
                    description: `${pendingDelete.name} has been deleted successfully.`,
                    variant: 'success'
                  });
                  setShowDeleteConfirm(false);
                  setPendingDelete(null);
                  refetch();
                } catch (error) {
                  showToast({ title: 'Error', description: 'Failed to delete item', variant: 'error' });
                }
              }}
            >
              Delete Item
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


