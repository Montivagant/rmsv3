import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  KpiCard, 
  DataTable, 
  DataToolbar, 
  StatusPill, 
  EmptyState 
} from '../components/inventory';
import { 
  Modal, 
  FormField, 
  Label, 
  Input, 
  Select, 
  Textarea, 
  Button,
  useNotifications 
} from '../components';
import { InventoryOperationForm } from '../components/InventoryOperationForm';
import InventoryItemCreateModal from '../components/inventory/InventoryItemCreateModal';
import { useApi } from '../hooks/useApi';
import { cn } from '../lib/utils';

// Types
interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  quantity: number;
  unit: string;
  reorderPoint: number;
  parLevel: number;
  cost: number;
  price: number;
  location?: string;
  supplier?: string;
  lastReceived?: string;
  expiryDate?: string;
  lotNumber?: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired';
}

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentTerms?: string;
  leadTimeDays?: number;
  minimumOrderAmount?: number;
  deliveryDays?: string[];
  notes?: string;
  isActive: boolean;
  rating?: number;
  averageLeadTime?: number;
  onTimeDeliveryRate?: number;
  qualityRating?: number;
  lastOrderDate?: string;
  totalOrdersCount?: number;
  totalOrderValue?: number;
}

interface Category {
  id: string;
  name: string;
  itemCount: number;
}

// Tab definitions for Information Architecture
const INVENTORY_TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'catalog', label: 'Catalog', icon: '📦' },
  { id: 'stock', label: 'Stock Levels', icon: '📈' },
  { id: 'operations', label: 'Operations', icon: '🔄' },
  { id: 'recipes', label: 'Recipes & BOM', icon: '🍳' },
  { id: 'suppliers', label: 'Suppliers', icon: '🚚' },
  { id: 'alerts', label: 'Alerts & Reports', icon: '🔔' },
];

export default function Inventory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // API calls - The inventory API returns { items: [], total, offset, limit }
  const { data: itemsResponse, loading, error, refetch } = useApi<{ items: InventoryItem[], total: number }>('/api/inventory/items');
  const { data: categories = [] } = useApi<Category[]>('/api/inventory/categories');
  const { data: units = [] } = useApi<Array<{ id: string; name: string; abbreviation: string }>>('/api/inventory/units');
  
  // Ensure items is always an array - extract from response object
  const safeItems = Array.isArray(itemsResponse) ? itemsResponse : (itemsResponse?.items || []);
  
  // Get existing SKUs for uniqueness check
  const existingSKUs = safeItems.map(item => item.sku);
  
  // Map complex items to simpler structure if needed
  const mappedItems = useMemo(() => {
    return safeItems.map((item: any) => {
      // If item has the complex structure from the API
      if (item.levels && item.costing) {
        // Determine simple status based on stock levels
        let simpleStatus: 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired' = 'in-stock';
        if (item.levels.current === 0) {
          simpleStatus = 'out-of-stock';
        } else if (item.levels.current <= item.levels.par?.reorderPoint) {
          simpleStatus = 'low-stock';
        }
        
        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          description: item.description,
          category: item.categoryId,
          quantity: item.levels.current,
          unit: item.uom?.base || 'pieces',
          reorderPoint: item.levels.par?.reorderPoint || 10,
          parLevel: item.levels.par?.max || 50,
          cost: item.costing.averageCost || 0,
          price: item.costing.averageCost * 2 || 0, // Default markup
          status: simpleStatus
        };
      }
      // Already in simple format
      return item;
    });
  }, [safeItems]);
  
  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalItems = mappedItems.length;
    const lowStock = mappedItems.filter(item => item.quantity <= item.reorderPoint).length;
    const belowPar = mappedItems.filter(item => item.quantity < item.parLevel).length;
    const stockValue = mappedItems.reduce((sum: number, item: any) => sum + (item.quantity * item.cost), 0);
    const outOfStock = mappedItems.filter(item => item.quantity === 0).length;
    const expiringSoon = safeItems.filter(item => {
      if (!item.expiryDate) return false;
      const daysUntilExpiry = Math.floor((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    }).length;
    
    return { totalItems, lowStock, belowPar, stockValue, outOfStock, expiringSoon };
  }, [safeItems]);
  
  // Filter items
  const filteredItems = useMemo(() => {
    return mappedItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [mappedItems, searchTerm, selectedCategory, selectedStatus]);
  
  // Tab change handler
  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };
  
  const { showSuccess, showError } = useNotifications();

  // Form handlers
  // Legacy function - keeping for compatibility with other components
  const handleAddItem = async (data: any) => {
    try {
      // TODO: Implement API call
      refetch();
      showSuccess('Item Added', `${data.name} has been added to inventory successfully.`);
    } catch (error) {
      showError('Failed to Add Item', 'Could not add the inventory item. Please try again.');
    }
  };
  
  const handleEditItem = async (data: any) => {
    try {
      // TODO: Implement API call
      setIsEditDrawerOpen(false);
      setSelectedItem(null);
      refetch();
      showSuccess('Item Updated', `${data.name} has been updated successfully.`);
    } catch (error) {
      showError('Failed to Update Item', 'Could not update the inventory item. Please try again.');
    }
  };
  
  const handleDeleteItem = async (item: InventoryItem) => {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      // TODO: Implement API call
      refetch();
    }
  };
  
  // Handle successful item creation
  const handleItemCreated = (itemId: string) => {
    refetch(); // Refresh the item list
    setIsCreateModalOpen(false);
  };
  
  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab kpis={kpis} items={safeItems} />;
      case 'catalog':
        return (
          <CatalogTab
            items={filteredItems}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            categories={categories}
            onAddItem={() => setIsCreateModalOpen(true)}
            onEditItem={(item) => {
              setSelectedItem(item);
              setIsEditDrawerOpen(true);
            }}
            onDeleteItem={handleDeleteItem}
            loading={loading}
          />
        );
      case 'stock':
        return <StockTab items={safeItems} />;
      case 'operations':
        return <OperationsTab />;
      case 'recipes':
        return <RecipesTab />;
      case 'suppliers':
        return <SuppliersTab />;
      case 'alerts':
        return <AlertsTab items={safeItems} />;
      default:
        return <OverviewTab kpis={kpis} items={safeItems} />;
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
              <p className="text-sm text-muted-foreground mt-1">Track stock levels, manage suppliers, and monitor costs</p>
            </div>
            <button
              onClick={() => setIsAddDrawerOpen(true)}
              className={cn(
                'px-4 py-2 rounded-lg',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90',
                'transition-colors duration-200',
                'text-sm font-medium',
                'flex items-center gap-2'
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto py-1" role="tablist">
            {INVENTORY_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg',
                  'transition-all duration-200 whitespace-nowrap',
                  'hover:bg-muted',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="container mx-auto px-4 py-6">
        {error ? (
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Error loading inventory"
            description={error}
            action={{
              label: 'Retry',
              onClick: refetch,
            }}
          />
        ) : (
          renderTabContent()
        )}
      </div>
      
      {/* Legacy Add Item Modal - kept for other tab compatibility */}
      <Modal
        isOpen={false}
        onClose={() => {}}
        title="Legacy Add Modal"
        description="Replaced by simplified modal"
        size="lg"
      >
        <div>This modal has been replaced by the simplified version</div>
      </Modal>
      
      {/* Edit Item Modal */}
      <Modal
        isOpen={isEditDrawerOpen}
        onClose={() => {
          setIsEditDrawerOpen(false);
          setSelectedItem(null);
        }}
        title="Edit Inventory Item"
        description="Update item details and stock levels"
        size="lg"
      >
        <InventoryForm 
          item={selectedItem} 
          onSubmit={handleEditItem} 
          onCancel={() => {
            setIsEditDrawerOpen(false);
            setSelectedItem(null);
          }} 
        />
      </Modal>

      {/* Simplified Inventory Item Create Modal */}
      <InventoryItemCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleItemCreated}
        categories={categories}
        units={units}
        existingSKUs={existingSKUs}
        isLoading={loading}
      />
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ kpis, items }: { kpis: any; items: InventoryItem[] }) {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Items"
          value={kpis.totalItems}
          subtitle="Active inventory items"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          linkTo="/inventory?tab=catalog"
          linkLabel="View catalog"
        />
        
        <KpiCard
          title="Low Stock"
          value={kpis.lowStock}
          subtitle="Items below reorder point"
          variant={kpis.lowStock > 0 ? 'warning' : 'default'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          linkTo="/inventory?tab=alerts"
          linkLabel="View alerts"
        />
        
        <KpiCard
          title="Below Par"
          value={kpis.belowPar}
          subtitle="Items below par level"
          variant={kpis.belowPar > 0 ? 'danger' : 'default'}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          }
          linkTo="/inventory?tab=stock"
          linkLabel="View stock levels"
        />
        
        <KpiCard
          title="Stock Value"
          value={`$${kpis.stockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Total inventory value"
          variant="success"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          linkTo="/inventory?tab=alerts"
          linkLabel="View valuation report"
        />
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/inventory?tab=operations')}
          className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-left"
        >
          <h3 className="font-semibold text-foreground mb-1">Receive Stock</h3>
          <p className="text-sm text-muted-foreground">Process incoming shipments</p>
        </button>
        
        <button
          onClick={() => navigate('/inventory/counts')}
          className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-left"
        >
          <h3 className="font-semibold text-foreground mb-1">Stock Count</h3>
          <p className="text-sm text-muted-foreground">Perform inventory counts</p>
        </button>
        
        <button
          onClick={() => navigate('/inventory/count-sheets')}
          className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-left"
        >
          <h3 className="font-semibold text-foreground mb-1">Count Sheets</h3>
          <p className="text-sm text-muted-foreground">Saved count templates</p>
        </button>
        
        <button
          onClick={() => navigate('/inventory?tab=operations')}
          className="p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors text-left"
        >
          <h3 className="font-semibold text-foreground mb-1">Adjust Stock</h3>
          <p className="text-sm text-muted-foreground">Record waste or adjustments</p>
        </button>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium text-foreground">Stock received: Ground Beef</p>
              <p className="text-xs text-muted-foreground">50 lbs added • 2 hours ago</p>
            </div>
            <StatusPill status="success" label="Received" size="sm" />
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium text-foreground">Low stock alert: Tomatoes</p>
              <p className="text-xs text-muted-foreground">5 units remaining • 3 hours ago</p>
            </div>
            <StatusPill status="warning" label="Low Stock" size="sm" />
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium text-foreground">Waste recorded: Lettuce</p>
              <p className="text-xs text-muted-foreground">2 units expired • 5 hours ago</p>
            </div>
            <StatusPill status="danger" label="Waste" size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Catalog Tab Component
function CatalogTab({
  items,
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  categories,
  onAddItem,
  onEditItem,
  onDeleteItem,
  loading,
}: any) {
  const columns = [
    {
      key: 'name',
      header: 'Item',
      accessor: (item: InventoryItem) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'category',
      header: 'Category',
      accessor: (item: InventoryItem) => item.category,
      sortable: true,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      accessor: (item: InventoryItem) => (
        <div>
          <p className="font-medium">{item.quantity} {item.unit}</p>
          {item.quantity <= item.reorderPoint && (
            <p className="text-xs text-amber-600">Below reorder point</p>
          )}
        </div>
      ),
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
        };
        const { status, label } = statusMap[item.status];
        return <StatusPill status={status} label={label} size="sm" />;
      },
    },
    {
      key: 'cost',
      header: 'Cost',
      accessor: (item: InventoryItem) => `$${item.cost.toFixed(2)}`,
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
              onEditItem(item);
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
              onDeleteItem(item);
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
  
  return (
    <div className="space-y-4">
      <DataToolbar
        searchValue={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search items by name, SKU, or description..."
        filters={[
          {
            key: 'category',
            label: 'Category',
            value: selectedCategory,
            onChange: onCategoryChange,
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
            onChange: onStatusChange,
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
          <button
            onClick={onAddItem}
            className={cn(
              'px-4 py-2 rounded-lg',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90',
              'transition-colors duration-200',
              'text-sm font-medium',
              'flex items-center gap-2'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        }
      />
      
      <DataTable
        data={items}
        columns={columns}
        keyExtractor={(item) => item.id}
        onRowClick={onEditItem}
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
            onClick: onAddItem,
          },
        }}
      />
    </div>
  );
}

// Stock Tab Component (functional implementation)
function StockTab({ items }: { items: InventoryItem[] }) {
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedView, setSelectedView] = useState<'levels' | 'movements' | 'locations'>('levels');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock locations data
  const locations = [
    { id: 'MAIN_KITCHEN', name: 'Main Kitchen', type: 'Kitchen' },
    { id: 'COLD_STORAGE', name: 'Cold Storage', type: 'Refrigerated' },
    { id: 'DRY_STORAGE', name: 'Dry Storage', type: 'Dry Goods' },
    { id: 'BAR_AREA', name: 'Bar Area', type: 'Beverages' }
  ];

  // Mock stock levels by location
  const getStockLevels = () => {
    return items.map(item => {
      const locationStocks = locations.map(location => ({
        locationId: location.id,
        locationName: location.name,
        quantity: Math.floor(Math.random() * item.quantity * 0.4) + Math.floor(item.quantity * 0.2),
        reserved: Math.floor(Math.random() * 5),
        lastMovement: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        movementType: ['received', 'consumed', 'transferred'][Math.floor(Math.random() * 3)] as 'received' | 'consumed' | 'transferred'
      }));
      
      return {
        ...item,
        locations: locationStocks,
        totalQuantity: locationStocks.reduce((sum, loc) => sum + loc.quantity, 0)
      };
    });
  };

  const stockLevels = useMemo(() => getStockLevels(), [items]);

  // Filter items based on search and location
  const filteredItems = useMemo(() => {
    return stockLevels.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLocation = selectedLocation === 'all' || 
        item.locations.some(loc => loc.locationId === selectedLocation && loc.quantity > 0);
      
      return matchesSearch && matchesLocation;
    });
  }, [stockLevels, searchTerm, selectedLocation]);

  const getStatusColor = (current: number, reorderPoint: number, parLevel: number) => {
    if (current === 0) return 'text-error bg-error';
    if (current <= reorderPoint) return 'text-warning bg-warning';
    if (current >= parLevel) return 'text-brand bg-surface-secondary';
    return 'text-success bg-success';
  };

  const getStatusLabel = (current: number, reorderPoint: number, parLevel: number) => {
    if (current === 0) return 'Out of Stock';
    if (current <= reorderPoint) return 'Low Stock';
    if (current >= parLevel) return 'Overstocked';
    return 'In Stock';
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'received':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case 'consumed':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        );
      case 'transferred':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getLocationSummary = () => {
    return locations.map(location => {
      const locationItems = stockLevels.filter(item => 
        item.locations.some(loc => loc.locationId === location.id && loc.quantity > 0)
      );
      const totalValue = locationItems.reduce((sum, item) => {
        const locationStock = item.locations.find(loc => loc.locationId === location.id);
        return sum + (locationStock ? locationStock.quantity * item.cost : 0);
      }, 0);
      
      return {
        ...location,
        itemCount: locationItems.length,
        totalValue,
        lowStockCount: locationItems.filter(item => {
          const locationStock = item.locations.find(loc => loc.locationId === location.id);
          return locationStock && locationStock.quantity <= item.reorderPoint;
        }).length
      };
    });
  };

  if (selectedView === 'locations') {
    const locationSummary = getLocationSummary();
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Storage Locations</h2>
            <p className="text-muted-foreground">Overview of inventory across all storage locations</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant='outline'
              size="sm"
              onClick={() => setSelectedView('levels')}
            >
              Stock Levels
            </Button>
            <Button 
              variant='outline'
              size="sm"
              onClick={() => setSelectedView('movements')}
            >
              Movements
            </Button>
            <Button 
              variant='primary'
              size="sm"
              onClick={() => setSelectedView('locations')}
            >
              Locations
            </Button>
          </div>
        </div>

        {/* Location cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {locationSummary.map((location) => (
            <div key={location.id} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">{location.name}</h3>
                  <p className="text-sm text-muted-foreground">{location.type}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Items Stored:</span>
                  <span className="font-medium">{location.itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Value:</span>
                  <span className="font-medium">${location.totalValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Low Stock Items:</span>
                  <span className={cn('font-medium', location.lowStockCount > 0 ? 'text-yellow-600' : 'text-green-600')}>
                    {location.lowStockCount}
                  </span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => {
                  setSelectedLocation(location.id);
                  setSelectedView('levels');
                }}
              >
                View Details
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {selectedView === 'levels' ? 'Stock Levels' : selectedView === 'movements' ? 'Stock Movements' : 'Storage Locations'}
          </h2>
          <p className="text-muted-foreground">
            {selectedView === 'levels' 
              ? 'View and manage stock levels by location, lots, and expiration dates'
              : selectedView === 'movements'
              ? 'Track inventory movements and transfers'
              : 'Overview of inventory across all storage locations'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={selectedView === 'levels' ? 'primary' : 'outline'} 
            size="sm"
            onClick={() => setSelectedView('levels')}
          >
            Stock Levels
          </Button>
          <Button 
            variant={selectedView === 'movements' ? 'primary' : 'outline'} 
            size="sm"
            onClick={() => setSelectedView('movements')}
          >
            Movements
          </Button>
          <Button 
            variant='outline'
            size="sm"
            onClick={() => setSelectedView('locations')}
          >
            Locations
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          options={[
            { value: 'all', label: 'All Locations' },
            ...locations.map(loc => ({ value: loc.id, label: loc.name }))
          ]}
        />
      </div>

      {/* Content */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          title="No stock data found"
          description={searchTerm ? 'Try adjusting your search criteria' : 'Stock levels will appear here once items are added'}
        />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold">Stock by Location</h3>
          </div>
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <div key={item.id} className="p-6">
                {/* Item header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Stock</p>
                      <p className="font-semibold">{item.totalQuantity} {item.unit}</p>
                    </div>
                    <span className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      getStatusColor(item.totalQuantity, item.reorderPoint, item.parLevel)
                    )}>
                      {getStatusLabel(item.totalQuantity, item.reorderPoint, item.parLevel)}
                    </span>
                  </div>
                </div>
                
                {/* Location breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {item.locations.filter(loc => selectedLocation === 'all' || loc.locationId === selectedLocation).map((location) => (
                    <div key={location.locationId} className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">{location.locationName}</h5>
                        {getMovementIcon(location.movementType)}
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Available:</span>
                          <span className="font-medium">{location.quantity} {item.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Reserved:</span>
                          <span>{location.reserved} {item.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Movement:</span>
                          <span>{new Date(location.lastMovement).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Value:</span>
                          <span>${(location.quantity * item.cost).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Quick actions */}
                <div className="flex items-center gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    Transfer Stock
                  </Button>
                  <Button variant="outline" size="sm">
                    Adjust Levels
                  </Button>
                  <Button variant="outline" size="sm">
                    View History
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Operations Tab Component (functional implementation)
function OperationsTab() {
  const [activeOperation, setActiveOperation] = useState<'receive' | 'adjust' | 'count' | null>(null);
  const [operationData, setOperationData] = useState<any>({});
  const [recentOperations, setRecentOperations] = useState<any[]>([]);
  const [loadingOperations, setLoadingOperations] = useState(true);
  const { showSuccess, showError } = useNotifications();

  // Load recent operations on component mount
  useEffect(() => {
    const loadRecentOperations = async () => {
      try {
        setLoadingOperations(true);
        const response = await fetch('/api/inventory/operations');
        if (response.ok) {
          const operations = await response.json();
          setRecentOperations(operations);
        }
      } catch (error) {
        console.error('Failed to load recent operations:', error);
      } finally {
        setLoadingOperations(false);
      }
    };

    loadRecentOperations();
  }, []);

  const operations = [
    {
      id: 'receive',
      title: 'Receive Stock',
      description: 'Record incoming inventory deliveries',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
        </svg>
      ),
      color: 'bg-success-50 border-success-200 hover:bg-success-100'
    },
    {
      id: 'adjust',
      title: 'Adjust Inventory',
      description: 'Record waste, damage, or corrections',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      color: 'bg-warning-50 border-warning-200 hover:bg-warning-100'
    },
    {
      id: 'count',
      title: 'Stock Count',
      description: 'Perform physical inventory counts',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      color: 'bg-surface-secondary border-border hover:bg-surface-tertiary'
    }
  ];

  const handleOperationSubmit = async (data: any) => {
    try {
      console.log(`${activeOperation} operation:`, data);
      
      // Call the appropriate API endpoint based on operation type
      const endpoints = {
        receive: '/api/inventory/operations/receive',
        adjust: '/api/inventory/operations/adjust',
        count: '/api/inventory/operations/count'
      };
      
      const endpoint = endpoints[activeOperation as keyof typeof endpoints];
      if (!endpoint) {
        throw new Error(`Unknown operation type: ${activeOperation}`);
      }
      
      // Make API call to process the operation
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Operation result:', result);
      
      const operationLabels = {
        receive: 'Stock Received',
        adjust: 'Inventory Adjusted', 
        count: 'Count Completed'
      };
      
      showSuccess(
        operationLabels[activeOperation as keyof typeof operationLabels],
        `Operation ${result.id} completed successfully for ${data.items?.length || 1} item(s).`
      );
      
      // Operations track their own state changes via the operations history
      // No need to refetch parent inventory data
      
      // Reload recent operations
      const response2 = await fetch('/api/inventory/operations');
      if (response2.ok) {
        const operations = await response2.json();
        setRecentOperations(operations);
      }
      
      setActiveOperation(null);
      setOperationData({});
    } catch (error: any) {
      console.error('Operation failed:', error);
      showError('Operation Failed', error.message || 'Could not complete the inventory operation. Please try again.');
    }
  };

  if (activeOperation) {
    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveOperation(null)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-semibold">
              {operations.find(op => op.id === activeOperation)?.title}
            </h2>
            <p className="text-muted-foreground">
              {operations.find(op => op.id === activeOperation)?.description}
            </p>
          </div>
        </div>

        {/* Operation Form */}
        <InventoryOperationForm
          operation={activeOperation}
          onSubmit={handleOperationSubmit}
          onCancel={() => setActiveOperation(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Inventory Operations</h2>
        <p className="text-muted-foreground">
          Manage your inventory with receiving, adjustments, and stock counts
        </p>
      </div>

      {/* Operation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {operations.map((operation) => (
          <button
            key={operation.id}
            onClick={() => setActiveOperation(operation.id as any)}
            className={cn(
              'p-6 border-2 rounded-lg text-left transition-all duration-200',
              'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              operation.color
            )}
          >
            <div className="flex items-center gap-4">
              <div className="text-muted-foreground">
                {operation.icon}
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">{operation.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{operation.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Recent Operations */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Operations</h3>
        {loadingOperations ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : recentOperations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent operations found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOperations.map((operation) => {
              const operationConfig = {
                receive: { label: 'Received', status: 'success' as const, icon: '📦' },
                adjust: { label: 'Adjusted', status: 'warning' as const, icon: '✏️' },
                count: { label: 'Counted', status: 'default' as const, icon: '📋' }
              };
              
              const config = operationConfig[operation.type as keyof typeof operationConfig] || 
                           { label: operation.type, status: 'default' as const, icon: '📝' };
              
              const timeAgo = new Date(operation.timestamp);
              const now = new Date();
              const diffMs = now.getTime() - timeAgo.getTime();
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffDays = Math.floor(diffHours / 24);
              
              let timeDisplay;
              if (diffHours < 1) {
                timeDisplay = 'Just now';
              } else if (diffHours < 24) {
                timeDisplay = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
              } else {
                timeDisplay = `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
              }
              
              return (
                <div key={operation.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">
                      {config.icon} {config.label}: {operation.reference || operation.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {operation.items?.length || 0} item(s) • {timeAgo.toLocaleDateString()} • {timeDisplay}
                      {operation.notes && ` • ${operation.notes}`}
                    </p>
                  </div>
                  <StatusPill status={config.status} label={config.label} size="sm" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Recipes Tab Component (placeholder)
function RecipesTab() {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      }
      title="Recipes & Bill of Materials"
      description="Manage ingredient mappings and auto-depletion rules"
      action={{
        label: 'Coming Soon',
        onClick: () => {},
        variant: 'outline',
      }}
    />
  );
}

// Suppliers Tab Component (functional implementation)
function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Fetch suppliers on component mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        // Simulate API call - replace with actual API when available
        const mockSuppliers: Supplier[] = [
          {
            id: 'SUPPLIER_001',
            name: 'Premium Meat Supply Co.',
            contactPerson: 'John Smith',
            email: 'orders@premiummeat.com',
            phone: '(555) 123-4567',
            address: {
              street: '123 Industrial Way',
              city: 'Food City',
              state: 'CA',
              zipCode: '90210',
              country: 'US'
            },
            paymentTerms: 'net_30',
            leadTimeDays: 2,
            minimumOrderAmount: 200,
            deliveryDays: ['monday', 'wednesday', 'friday'],
            isActive: true,
            rating: 4.5,
            onTimeDeliveryRate: 95,
            qualityRating: 4.8,
            averageLeadTime: 1.8,
            totalOrdersCount: 45,
            totalOrderValue: 12500
          },
          {
            id: 'SUPPLIER_002',
            name: 'Fresh Bakery Supplies',
            contactPerson: 'Maria Garcia',
            email: 'sales@freshbakery.com',
            phone: '(555) 234-5678',
            address: {
              street: '456 Bakery Lane',
              city: 'Bread Town',
              state: 'CA',
              zipCode: '90211',
              country: 'US'
            },
            paymentTerms: 'net_15',
            leadTimeDays: 1,
            minimumOrderAmount: 100,
            deliveryDays: ['tuesday', 'thursday', 'saturday'],
            isActive: true,
            rating: 4.3,
            onTimeDeliveryRate: 88,
            qualityRating: 4.5,
            averageLeadTime: 1.2,
            totalOrdersCount: 32,
            totalOrderValue: 5600
          },
          {
            id: 'SUPPLIER_003',
            name: 'Valley Fresh Produce',
            contactPerson: 'David Wong',
            email: 'david@valleyfresh.com',
            phone: '(555) 345-6789',
            address: {
              street: '789 Farm Road',
              city: 'Green Valley',
              state: 'CA',
              zipCode: '90212',
              country: 'US'
            },
            paymentTerms: 'cash_on_delivery',
            leadTimeDays: 1,
            minimumOrderAmount: 50,
            deliveryDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            isActive: true,
            rating: 4.0,
            onTimeDeliveryRate: 78,
            qualityRating: 4.2,
            averageLeadTime: 1.5,
            totalOrdersCount: 28,
            totalOrderValue: 3200
          }
        ];
        setSuppliers(mockSuppliers);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  // Filter suppliers based on search and status
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = !searchTerm || 
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus === 'all' || 
        (selectedStatus === 'active' && supplier.isActive) ||
        (selectedStatus === 'inactive' && !supplier.isActive);
      
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchTerm, selectedStatus]);

  const getPaymentTermsLabel = (terms: string) => {
    const labels: Record<string, string> = {
      'cash_on_delivery': 'Cash on Delivery',
      'net_15': 'Net 15 Days',
      'net_30': 'Net 30 Days',
      'net_60': 'Net 60 Days',
      'prepaid': 'Prepaid',
      'credit_terms': 'Credit Terms'
    };
    return labels[terms] || terms;
  };

  const getDeliveryDaysLabel = (days: string[]) => {
    if (!days || days.length === 0) return 'Not specified';
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) return 'Weekdays';
    return days.map(day => day.charAt(0).toUpperCase() + day.slice(1, 3)).join(', ');
  };

  const getReliabilityColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600 bg-green-100';
    if (rate >= 85) return 'text-brand-600 bg-brand-100';
    if (rate >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => {
      const filled = i < Math.floor(rating);
      const halfFilled = i === Math.floor(rating) && rating % 1 >= 0.5;
      return (
        <svg key={i} className={`w-4 h-4 ${filled || halfFilled ? 'text-warning-600' : 'text-text-muted'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Supplier Management</h2>
          <p className="text-muted-foreground">Manage vendors, track performance, and monitor delivery schedules</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supplier
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as any)}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]}
        />
      </div>

      {/* Suppliers grid */}
      {filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          }
          title="No suppliers found"
          description={searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first supplier'}
          action={{
            label: 'Add Supplier',
            onClick: () => setIsAddModalOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{supplier.name}</h3>
                  <p className="text-sm text-muted-foreground">{supplier.contactPerson}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    supplier.isActive ? 'bg-success-100 text-success-700' : 'bg-surface-secondary text-text-secondary'
                  )}>
                    {supplier.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center">
                  {getRatingStars(supplier.rating || 0)}
                </div>
                <span className="text-sm text-muted-foreground">({supplier.rating?.toFixed(1) || 'N/A'})</span>
              </div>

              {/* Contact info */}
              <div className="space-y-2 mb-4">
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-muted-foreground">{supplier.email}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-muted-foreground">{supplier.phone}</span>
                  </div>
                )}
              </div>

              {/* Performance metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">On-time Delivery</p>
                  <div className="flex items-center gap-1">
                    <span className={cn('text-sm font-medium px-2 py-1 rounded', getReliabilityColor(supplier.onTimeDeliveryRate || 0))}>
                      {supplier.onTimeDeliveryRate || 0}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lead Time</p>
                  <p className="text-sm font-medium">{supplier.averageLeadTime || supplier.leadTimeDays || 'N/A'} days</p>
                </div>
              </div>

              {/* Order info */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min Order:</span>
                  <span>${supplier.minimumOrderAmount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment:</span>
                  <span>{getPaymentTermsLabel(supplier.paymentTerms || '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery:</span>
                  <span>{getDeliveryDaysLabel(supplier.deliveryDays || [])}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSelectedSupplier(supplier);
                    setIsEditModalOpen(true);
                  }}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Order
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modals would go here */}
      {/* TODO: Implement SupplierFormModal component */}
    </div>
  );
}

// Alerts Tab Component (functional implementation)
function AlertsTab({ items }: { items: InventoryItem[] }) {
  const [selectedAlert, setSelectedAlert] = useState<'low-stock' | 'expiring' | 'out-of-stock' | 'all'>('all');

  // Calculate alerts
  const alerts = useMemo(() => {
    const lowStockItems = items.filter(item => 
      typeof item.quantity === 'number' && 
      typeof item.reorderPoint === 'number' && 
      item.quantity <= item.reorderPoint && 
      item.quantity > 0
    );
    
    const outOfStockItems = items.filter(item => 
      typeof item.quantity === 'number' && item.quantity === 0
    );
    
    const expiringItems = items.filter(item => {
      if (!item.expiryDate) return false;
      const daysUntilExpiry = Math.floor((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    });

    return {
      lowStock: lowStockItems,
      outOfStock: outOfStockItems,
      expiring: expiringItems,
      all: [...lowStockItems, ...outOfStockItems, ...expiringItems]
    };
  }, [items]);

  const alertTypes = [
    { id: 'all', label: 'All Alerts', count: alerts.all.length, color: 'text-text-secondary' },
    { id: 'out-of-stock', label: 'Out of Stock', count: alerts.outOfStock.length, color: 'text-red-600' },
    { id: 'low-stock', label: 'Low Stock', count: alerts.lowStock.length, color: 'text-amber-600' },
    { id: 'expiring', label: 'Expiring Soon', count: alerts.expiring.length, color: 'text-orange-600' }
  ];

  const getAlertPriority = (item: any) => {
    if (item.quantity === 0) return { level: 'critical', label: 'Out of Stock', color: 'text-red-600 bg-red-50' };
    if (item.quantity <= item.reorderPoint) return { level: 'high', label: 'Low Stock', color: 'text-amber-600 bg-amber-50' };
    if (item.expiryDate) {
      const daysUntilExpiry = Math.floor((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        return { level: 'medium', label: `Expires in ${daysUntilExpiry} days`, color: 'text-orange-600 bg-orange-50' };
      }
    }
    return { level: 'low', label: 'Normal', color: 'text-green-600 bg-green-50' };
  };

  const filteredItems = selectedAlert === 'all' ? alerts.all : alerts[selectedAlert as keyof typeof alerts] || [];

  return (
    <div className="space-y-6">
      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {alertTypes.map(type => (
          <button
            key={type.id}
            onClick={() => setSelectedAlert(type.id as any)}
            className={cn(
              'p-4 border-2 rounded-lg text-left transition-all duration-200',
              'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              selectedAlert === type.id
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/50'
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{type.label}</p>
                <p className={cn('text-2xl font-bold', type.color)}>{type.count}</p>
              </div>
              <div className={cn('text-sm px-2 py-1 rounded', type.color, 'bg-current/10')}>
                {type.count > 0 ? 'Action Needed' : 'Good'}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Alert Details */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {alertTypes.find(t => t.id === selectedAlert)?.label} 
              ({filteredItems.length})
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Export Report
              </Button>
              <Button variant="outline" size="sm">
                Mark All Reviewed
              </Button>
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-green-600 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-green-600 mb-1">All Good!</h4>
            <p className="text-muted-foreground">
              No {selectedAlert === 'all' ? 'alerts' : alertTypes.find(t => t.id === selectedAlert)?.label.toLowerCase()} at this time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item, index) => {
              const alert = getAlertPriority(item);
              return (
                <div key={item.id || index} className="p-4 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        </div>
                        <div className={cn('px-2 py-1 rounded-full text-xs font-medium', alert.color)}>
                          {alert.label}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current Stock: </span>
                          <span className="font-medium">{item.quantity} {item.unit}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reorder Point: </span>
                          <span className="font-medium">{item.reorderPoint} {item.unit}</span>
                        </div>
                        {item.expiryDate && (
                          <div>
                            <span className="text-muted-foreground">Expires: </span>
                            <span className="font-medium">{new Date(item.expiryDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Order Now
                      </Button>
                      <Button variant="ghost" size="sm">
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alert Settings */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Alert Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Low Stock Threshold</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Alert when items fall below their reorder point
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm">Alert </span>
              <Input type="number" defaultValue="7" className="w-20" />
              <span className="text-sm">days before reaching reorder point</span>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Expiry Notifications</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Alert when items are approaching expiry
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm">Alert </span>
              <Input type="number" defaultValue="7" className="w-20" />
              <span className="text-sm">days before expiry</span>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <Button>Save Alert Settings</Button>
        </div>
      </div>
    </div>
  );
}

// Enhanced Inventory Form Component with proper validation and accessibility
interface InventoryFormProps {
  item?: InventoryItem | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

function InventoryForm({ item, onSubmit, onCancel }: InventoryFormProps) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    sku: item?.sku || '',
    description: item?.description || '',
    category: item?.category || '',
    quantity: item?.quantity || 0,
    unit: item?.unit || 'pieces',
    reorderPoint: item?.reorderPoint || 10,
    parLevel: item?.parLevel || 50,
    cost: item?.cost || 0,
    price: item?.price || 0,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation function
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Item name is required';
    }
    
    if (!formData.sku.trim()) {
      errors.sku = 'SKU is required';
    }
    
    if (!formData.category) {
      errors.category = 'Category is required';
    }
    
    if (formData.quantity < 0) {
      errors.quantity = 'Quantity cannot be negative';
    }
    
    if (formData.reorderPoint < 0) {
      errors.reorderPoint = 'Reorder point cannot be negative';
    }
    
    if (formData.parLevel < 0) {
      errors.parLevel = 'Par level cannot be negative';
    }
    
    if (formData.parLevel <= formData.reorderPoint) {
      errors.parLevel = 'Par level must be greater than reorder point';
    }
    
    if (formData.cost < 0) {
      errors.cost = 'Cost cannot be negative';
    }
    
    if (formData.price < 0) {
      errors.price = 'Price cannot be negative';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['quantity', 'reorderPoint', 'parLevel', 'cost', 'price'].includes(name)
        ? parseFloat(value) || 0
        : value
    }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const categoryOptions = [
    { value: '', label: 'Select category' },
    { value: 'produce', label: 'Produce' },
    { value: 'meat', label: 'Meat & Seafood' },
    { value: 'dairy', label: 'Dairy & Eggs' },
    { value: 'beverages', label: 'Beverages' },
    { value: 'dry-goods', label: 'Dry Goods' },
    { value: 'frozen', label: 'Frozen Items' },
    { value: 'supplies', label: 'Supplies' },
  ];

  const unitOptions = [
    { value: 'pieces', label: 'Pieces' },
    { value: 'lbs', label: 'Pounds (lbs)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'oz', label: 'Ounces (oz)' },
    { value: 'liters', label: 'Liters' },
    { value: 'gallons', label: 'Gallons' },
    { value: 'cases', label: 'Cases' },
    { value: 'boxes', label: 'Boxes' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-form">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-form">
        <FormField error={formErrors.name} helpText="Descriptive name for the inventory item" required>
          <Label htmlFor="item-name" required>Item Name</Label>
          <Input
            id="item-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Fresh Tomatoes"
            error={formErrors.name}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField error={formErrors.sku} helpText="Unique identifier for tracking" required>
          <Label htmlFor="item-sku" required>SKU</Label>
          <Input
            id="item-sku"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            placeholder="Example: TOMATO-001"
            error={formErrors.sku}
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      <FormField error={formErrors.description} helpText="Additional details about the item (optional)">
        <Label htmlFor="item-description">Description</Label>
        <Textarea
          id="item-description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter item description..."
          rows={3}
          disabled={isSubmitting}
        />
      </FormField>

      <FormField error={formErrors.category} helpText="Product category for organization" required>
        <Label htmlFor="item-category" required>Category</Label>
        <Select
          id="item-category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          options={categoryOptions}
          error={formErrors.category}
          disabled={isSubmitting}
        />
      </FormField>

      {/* Quantity & Units */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-form">
        <FormField error={formErrors.quantity} helpText="Current stock quantity" required>
          <Label htmlFor="item-quantity" required>Current Quantity</Label>
          <Input
            id="item-quantity"
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={handleChange}
            placeholder="0"
            min="0"
            step="1"
            error={formErrors.quantity}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField error={formErrors.unit} helpText="Unit of measurement" required>
          <Label htmlFor="item-unit" required>Unit</Label>
          <Select
            id="item-unit"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            options={unitOptions}
            error={formErrors.unit}
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      {/* Stock Levels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-form">
        <FormField error={formErrors.reorderPoint} helpText="Minimum quantity before reordering" required>
          <Label htmlFor="item-reorder" required>Reorder Point</Label>
          <Input
            id="item-reorder"
            name="reorderPoint"
            type="number"
            value={formData.reorderPoint}
            onChange={handleChange}
            placeholder="10"
            min="0"
            step="1"
            error={formErrors.reorderPoint}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField error={formErrors.parLevel} helpText="Maximum stock level to maintain" required>
          <Label htmlFor="item-par" required>Par Level</Label>
          <Input
            id="item-par"
            name="parLevel"
            type="number"
            value={formData.parLevel}
            onChange={handleChange}
            placeholder="50"
            min="0"
            step="1"
            error={formErrors.parLevel}
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-form">
        <FormField error={formErrors.cost} helpText="Cost per unit from supplier" required>
          <Label htmlFor="item-cost" required>Cost per Unit ($)</Label>
          <Input
            id="item-cost"
            name="cost"
            type="number"
            value={formData.cost}
            onChange={handleChange}
            placeholder="0.00"
            min="0"
            step="0.01"
            error={formErrors.cost}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField error={formErrors.price} helpText="Selling price per unit (optional)">
          <Label htmlFor="item-price">Selling Price ($)</Label>
          <Input
            id="item-price"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleChange}
            placeholder="0.00"
            min="0"
            step="0.01"
            error={formErrors.price}
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!validateForm() || isSubmitting}
        >
          {isSubmitting ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
        </Button>
      </div>
    </form>
  );
}
