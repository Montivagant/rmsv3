import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, SmartForm, LoadingOverlay, SkeletonTable, useNotifications } from '../components';
import type { FormField } from '../components';
import { useApi, apiPatch, apiPost } from '../hooks/useApi';
import { InventoryDashboard } from '../inventory';
import type { ValidationResult } from '../utils/validation';
import { validateSKU, validateCurrency, validateQuantity, validateName } from '../utils/validation';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  lowStock: number;
  category: string;
  cost: number;
}

function Inventory() {
  const { data: inventory, loading, error, refetch } = useApi<InventoryItem[]>('/api/inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('advanced');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const { showSuccess, showError, showLoading, removeNotification } = useNotifications();
  
  const updateStock = async (itemId: string, newQuantity: number) => {
    const item = inventory?.find(i => i.id === itemId);
    const loadingId = showLoading(
      'Updating Stock', 
      `Updating ${item?.name || 'item'} quantity...`
    );
    
    try {
      setUpdatingItem(itemId);
      await apiPatch(`/api/inventory/${itemId}`, { quantity: newQuantity });
      refetch();
      
      removeNotification(loadingId);
      showSuccess(
        'Stock Updated',
        `${item?.name || 'Item'} quantity updated to ${newQuantity} ${item?.unit || 'units'}`
      );
    } catch (error) {
      removeNotification(loadingId);
      showError(
        'Update Failed',
        `Failed to update ${item?.name || 'item'} stock. Please try again.`,
        [
          {
            label: 'Retry',
            action: () => updateStock(itemId, newQuantity),
            style: 'primary'
          }
        ]
      );
      console.error('Failed to update stock:', error);
    } finally {
      setUpdatingItem(null);
    }
  };

  // Get existing SKUs for validation
  const existingSKUs = inventory?.map(item => item.sku.toUpperCase()) || [];

  // Enhanced add item function
  const addItem = async (values: Record<string, any>) => {
    const loadingId = showLoading(
      'Adding Item',
      `Creating inventory item "${values.name}"...`
    );
    
    setIsAddingItem(true);
    try {
      await apiPost('/api/inventory', values);
      setShowAddForm(false);
      refetch();
      
      removeNotification(loadingId);
      showSuccess(
        'Item Added Successfully',
        `${values.name} (${values.sku}) has been added to inventory with ${values.quantity} ${values.unit}`,
        [
          {
            label: 'Add Another',
            action: () => setShowAddForm(true),
            style: 'secondary'
          }
        ]
      );
    } catch (error) {
      removeNotification(loadingId);
      showError(
        'Failed to Add Item',
        `Could not add "${values.name}" to inventory. Please check your connection and try again.`,
        [
          {
            label: 'Try Again',
            action: () => addItem(values),
            style: 'primary'
          }
        ]
      );
      console.error('Error adding item:', error);
      throw error; // Let SmartForm handle the error display
    } finally {
      setIsAddingItem(false);
    }
  };

  // Form fields configuration with enhanced validation
  const inventoryFormFields: FormField[] = [
    {
      name: 'name',
      label: 'Item Name',
      type: 'text',
      required: true,
      placeholder: 'Enter item name',
      helpText: 'A descriptive name for the inventory item',
      validation: (value: string) => validateName(value)
    },
    {
      name: 'sku',
      label: 'SKU (Stock Keeping Unit)',
      type: 'text',
      required: true,
      placeholder: 'BEEF-001, CHKN_BREAST',
      helpText: 'Unique identifier (letters, numbers, underscore, hyphen only)',
      validation: (value: string) => validateSKU(value, existingSKUs)
    },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      required: true,
      helpText: 'Product category for organization',
      options: [
        { value: 'Food - Perishable', label: 'Food - Perishable' },
        { value: 'Food - Non-Perishable', label: 'Food - Non-Perishable' },
        { value: 'Beverages', label: 'Beverages' },
        { value: 'Condiments', label: 'Condiments' },
        { value: 'Cooking Supplies', label: 'Cooking Supplies' },
        { value: 'Packaging', label: 'Packaging' },
        { value: 'Cleaning Supplies', label: 'Cleaning Supplies' },
        { value: 'Other', label: 'Other' }
      ]
    },
    {
      name: 'unit',
      label: 'Unit of Measurement',
      type: 'select',
      required: true,
      helpText: 'How this item is measured/counted',
      options: [
        { value: 'pieces', label: 'Pieces' },
        { value: 'lbs', label: 'Pounds (lbs)' },
        { value: 'kg', label: 'Kilograms (kg)' },
        { value: 'gallons', label: 'Gallons' },
        { value: 'liters', label: 'Liters' },
        { value: 'boxes', label: 'Boxes' },
        { value: 'cases', label: 'Cases' },
        { value: 'bottles', label: 'Bottles' }
      ]
    },
    {
      name: 'quantity',
      label: 'Initial Quantity',
      type: 'number',
      required: true,
      placeholder: '0',
      helpText: 'Starting inventory count',
      validation: (value: string) => validateQuantity(value, { maxStock: 10000 })
    },
    {
      name: 'lowStock',
      label: 'Low Stock Alert Level',
      type: 'number',
      required: true,
      placeholder: '10',
      helpText: 'Alert when inventory falls below this level',
      validation: (value: string, allValues: Record<string, any>) => {
        const result = validateQuantity(value, { maxStock: 1000 });
        if (!result.isValid) return result;

        const quantity = parseInt(allValues.quantity || '0');
        const lowStock = parseInt(value || '0');
        
        if (lowStock >= quantity && quantity > 0) {
          return {
            isValid: false,
            message: 'Low stock alert should be less than initial quantity',
            suggestions: [`Try: ${Math.floor(quantity * 0.2)} (20% of initial quantity)`]
          };
        }
        
        return { isValid: true };
      }
    },
    {
      name: 'cost',
      label: 'Cost per Unit',
      type: 'currency',
      required: true,
      placeholder: '0.00',
      helpText: 'Cost to purchase this item (for profit calculations)',
      validation: (value: string) => validateCurrency(value)
    }
  ];
  
  const filteredInventory = inventory?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const lowStockItems = filteredInventory.filter(item => item.quantity <= item.lowStock);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error loading inventory: {error}</p>
        <Button onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Inventory Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced inventory tracking with reorder alerts and batch management
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>Add Item</Button>
      </div>

      {/* Enhanced Add Item Form */}
      {showAddForm && (
        <Card>
          <CardContent className="p-6">
            <SmartForm
              fields={inventoryFormFields}
              onSubmit={addItem}
              onCancel={() => setShowAddForm(false)}
              title="Add New Inventory Item"
              description="Create a new inventory item with comprehensive validation and business rules"
              submitLabel="Add Item"
              cancelLabel="Cancel"
              autoSave={true}
              autoSaveKey="inventory-add-item"
              disabled={isAddingItem}
              initialValues={{
                unit: 'pieces',
                lowStock: 10,
                quantity: 0,
                cost: 0
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <Card>
        <CardContent className="p-0">
          <div>
            <div role="tablist" className="border-b border-gray-200 dark:border-gray-700">
              <button
                role="tab"
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'advanced' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                aria-selected={activeTab === 'advanced'}
                onClick={() => setActiveTab('advanced')}
              >
                Advanced Dashboard
              </button>
              <button
                role="tab"
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'basic' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                aria-selected={activeTab === 'basic'}
                onClick={() => setActiveTab('basic')}
              >
                Basic Inventory
              </button>
            </div>
            
            {/* Tab Content */}
            <div role="tabpanel" className="p-0">
              {activeTab === 'advanced' ? (
                <div className="p-6">
                  <InventoryDashboard />
                </div>
              ) : (
                <div className="p-6">
                  <BasicInventoryView 
                    inventory={filteredInventory}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    updateStock={updateStock}
                    updatingItem={updatingItem}
                    lowStockItems={lowStockItems}
                    loading={loading}
                    error={error}
                    refetch={refetch}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Basic Inventory View Component (extracted from original component)
function BasicInventoryView({
  inventory,
  searchTerm,
  setSearchTerm,
  updateStock,
  updatingItem,
  lowStockItems,
  loading,
  error,
  refetch
}: {
  inventory: InventoryItem[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  updateStock: (itemId: string, newQuantity: number) => Promise<void>;
  updatingItem: string | null;
  lowStockItems: InventoryItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading search bar */}
        <div className="flex gap-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex-1 animate-pulse"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
        </div>
        
        {/* Loading table */}
        <SkeletonTable rows={8} columns={6} />
        
        {/* Loading indicator */}
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size="md" className="mr-2" />
          <span className="text-gray-600 dark:text-gray-400">Loading inventory...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error loading inventory: {error}</p>
        <div className="flex gap-2 justify-center mt-4">
          <Button onClick={refetch}>Retry</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          💡 Try the <strong>Advanced Dashboard</strong> tab above for full inventory management features
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {lowStockItems.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Low Stock Alert</h3>
          <p className="text-yellow-700 dark:text-yellow-300">
            {lowStockItems.length} item(s) are running low on stock
          </p>
        </div>
      )}
      
      <div className="flex gap-4">
        <Input 
          placeholder="Search inventory..." 
          className="max-w-md" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button variant="outline">Filter</Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Current Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Item</th>
                  <th className="text-left py-2">SKU</th>
                  <th className="text-left py-2">Quantity</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.category}</div>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{item.sku}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStock(item.id, Math.max(0, item.quantity - 1))}
                          disabled={updatingItem === item.id || item.quantity <= 0}
                        >
                          -
                        </Button>
                        <span className="min-w-[60px] text-center">
                          {item.quantity} {item.unit}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStock(item.id, item.quantity + 1)}
                          disabled={updatingItem === item.id}
                        >
                          +
                        </Button>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.quantity <= item.lowStock
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {item.quantity <= item.lowStock ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-1">
                        <div className="text-sm font-medium">${item.cost.toFixed(2)}</div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={updatingItem === item.id}
                          >
                            {updatingItem === item.id ? '...' : 'Edit'}
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Inventory;