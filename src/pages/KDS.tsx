import { useState } from 'react';
import { Card, Button } from '../components';
import { useApi, apiPatch } from '../hooks/useApi';

interface OrderItem {
  id: string;
  quantity: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  status: 'preparing' | 'ready' | 'served';
  timestamp: string;
  total: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

const statusConfig = {
  preparing: { label: 'Preparing', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', next: 'ready' },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', next: 'served' },
  served: { label: 'Served', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', next: null },
};

function KDS() {
  const { data: orders, loading, error, refetch } = useApi<Order[]>('/api/orders');
  const { data: menuItems } = useApi<MenuItem[]>('/api/menu');
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  
  const getItemName = (itemId: string): string => {
    const menuItem = menuItems?.find(item => item.id === itemId);
    return menuItem?.name || `Item ${itemId}`;
  };
  
  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    setUpdatingOrder(orderId);
    try {
      await apiPatch(`/api/orders/${orderId}`, { status: newStatus });
      await refetch();
    } catch (error) {
      alert('Failed to update order status');
    } finally {
       setUpdatingOrder(null);
     }
   };
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    return `${minutes}m ago`;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error loading orders: {error}</p>
        <Button onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }
  
  const ordersByStatus = (orders || []).reduce((acc, order) => {
    if (!acc[order.status]) acc[order.status] = [];
    acc[order.status].push(order);
    return acc;
  }, {} as Record<Order['status'], Order[]>);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Kitchen Display System
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage order preparation and status
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(statusConfig).map(([status, config]) => (
          <div key={status} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{config.label}</h2>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                {ordersByStatus[status as Order['status']]?.length || 0}
              </span>
            </div>
            
            <div className="space-y-3">
              {ordersByStatus[status as Order['status']]?.map(order => (
                <Card key={order.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">Order #{order.id}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Total: ${order.total.toFixed(2)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTime(order.timestamp)}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {order.items.map((item, index) => (
                        <div key={index} className="text-sm flex justify-between">
                          <span>• {getItemName(item.id)}</span>
                          <span className="text-gray-500">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    
                    {statusConfig[order.status].next && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => updateOrderStatus(order.id, statusConfig[order.status].next as Order['status'])}
                        disabled={updatingOrder === order.id}
                      >
                        {updatingOrder === order.id ? 'Updating...' : `Mark as ${statusConfig[statusConfig[order.status].next as Order['status']].label}`}
                      </Button>
                    )}
                  </div>
                </Card>
              )) || (
                <div className="text-center py-8 text-gray-500">
                  No orders
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default KDS;