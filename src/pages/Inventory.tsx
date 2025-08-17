import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../components';
import { useApi, apiPatch } from '../hooks/useApi';

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
            Track stock levels and manage inventory
          </p>
        </div>
        <Button>Add Item</Button>
      </div>
      
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
                {filteredInventory.map(item => (
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