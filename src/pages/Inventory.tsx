import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../components';
import { useApi, apiPatch, apiPost } from '../hooks/useApi';
import { InventoryDashboard } from '../inventory';

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
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    quantity: 0,
    unit: 'pieces',
    lowStock: 10,
    category: '',
    cost: 0
  });
  
  const updateStock = async (itemId: string, newQuantity: number) => {
    try {
      setUpdatingItem(itemId);
      await apiPatch(`/api/inventory/${itemId}`, { quantity: newQuantity });
      refetch();
    } catch (error) {
      console.error('Failed to update stock:', error);
    } finally {
      setUpdatingItem(null);
    }
  };

  const addItem = async () => {
    try {
      setIsAddingItem(true);
      await apiPost('/api/inventory', newItem);
      setNewItem({
        name: '',
        sku: '',
        quantity: 0,
        unit: 'pieces',
        lowStock: 10,
        category: '',
        cost: 0
      });
      setShowAddForm(false);
      refetch();
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsAddingItem(false);
    }
  };
  
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

      {/* Add Item Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Inventory Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Item Name</label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  placeholder="Enter item name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">SKU</label>
                <Input
                  value={newItem.sku}
                  onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                  placeholder="Enter SKU"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <Input
                  value={newItem.category}
                  onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                  placeholder="Enter category"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Unit</label>
                <Input
                  value={newItem.unit}
                  onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                  placeholder="e.g., pieces, lbs, gallons"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Initial Quantity</label>
                <Input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Low Stock Alert</label>
                <Input
                  type="number"
                  value={newItem.lowStock}
                  onChange={(e) => setNewItem({...newItem, lowStock: parseInt(e.target.value) || 0})}
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cost per Unit ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.cost}
                  onChange={(e) => setNewItem({...newItem, cost: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button 
                onClick={addItem} 
                disabled={isAddingItem || !newItem.name || !newItem.sku}
              >
                {isAddingItem ? 'Adding...' : 'Add Item'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAddForm(false)}
                disabled={isAddingItem}
              >
                Cancel
              </Button>
            </div>
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