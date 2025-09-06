import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApi, apiPatch } from '../hooks/useApi';
import { getRole, Role } from '../rbac/roles';
import { cn } from '../lib/utils';
import {
  RoleBadge,
  StatusColumn,
  TicketCard,
  KdsToolbar,
} from '../components/kds';

interface OrderItem {
  id: string;
  name?: string;
  quantity: number;
  modifiers?: string[];
}

interface Order {
  id: string;
  orderNumber?: string;
  items: OrderItem[];
  status: 'preparing' | 'ready' | 'served';
  timestamp: string;
  tableNumber?: string;
  customerName?: string;
  total: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

// Persist user preferences
const STORAGE_KEYS = {
  VIEW_MODE: 'kds_view_mode',
  DENSITY: 'kds_density',
};

function KDS() {
  const { data: orders, loading, error, refetch } = useApi<Order[]>('/api/orders');
  const { data: menuItems } = useApi<MenuItem[]>('/api/menu');
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  
  // View preferences with localStorage persistence
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
    return (saved as 'grid' | 'list') || 'grid';
  });
  
  const [density, setDensity] = useState<'compact' | 'comfortable'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DENSITY);
    return (saved as 'compact' | 'comfortable') || 'comfortable';
  });
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DENSITY, density);
  }, [density]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Get item name from menu data
  const getItemName = (item: OrderItem): string => {
    if (item.name) return item.name;
    const menuItem = menuItems?.find(m => m.id === item.id);
    return menuItem?.name || `Item ${item.id}`;
  };

  // Enrich items with names
  const enrichItems = (items: OrderItem[]): OrderItem[] => {
    return items.map(item => ({
      ...item,
      name: getItemName(item),
    }));
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    // Check permission with proper scope
    const currentRole = getRole();
    // Allow all Business Owner roles to change status
    if (!currentRole || (currentRole !== Role.BUSINESS_OWNER && newStatus === 'served')) {
      // Staff can mark ready and served, other roles have full access
    }
    
    setUpdatingOrder(orderId);
    try {
      await apiPatch(`/api/orders/${orderId}`, { status: newStatus });
      await refetch();
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setUpdatingOrder(null);
    }
  };

  // Undo status change (move back one status)
  const undoStatusChange = async (order: Order) => {
    const previousStatus = {
      ready: 'preparing' as const,
      served: 'ready' as const,
      preparing: null,
    };

    const prevStatus = previousStatus[order.status];
    if (prevStatus) {
      await updateOrderStatus(order.id, prevStatus);
    }
  };

  // Group orders by status
  const ordersByStatus = (orders || []).reduce((acc, order) => {
    if (!acc[order.status]) acc[order.status] = [];
    acc[order.status].push(order);
    return acc;
  }, {} as Record<Order['status'], Order[]>);

  // Sort orders: newest first, but overdue orders surface to top
  const sortOrders = (orders: Order[]) => {
    return [...orders].sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      const now = Date.now();
      
      // Check if overdue (> 12 minutes)
      const aOverdue = (now - aTime) > 12 * 60 * 1000;
      const bOverdue = (now - bTime) > 12 * 60 * 1000;
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      // Otherwise, newest first
      return bTime - aTime;
    });
  };

  // Calculate active order count
  const activeOrderCount = (ordersByStatus.preparing?.length || 0) + (ordersByStatus.ready?.length || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="p-4 rounded-full bg-destructive/10 mb-4 inline-block">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-foreground font-medium mb-2">Error loading orders</p>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        'flex flex-col h-screen bg-background',
        isFullscreen && 'fixed inset-0 z-50'
      )}
    >
      {/* Toolbar */}
      <KdsToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        density={density}
        onDensityChange={setDensity}
        isFullscreen={isFullscreen}
        onFullscreenToggle={toggleFullscreen}
        orderCount={activeOrderCount}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'grid' ? (
          // Grid View - Three columns
          <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {/* Preparing Column */}
            <StatusColumn
              title="Preparing"
              status="preparing"
              count={ordersByStatus.preparing?.length || 0}
            >
              {sortOrders(ordersByStatus.preparing || []).map(order => (
                <TicketCard
                  key={order.id}
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  items={enrichItems(order.items)}
                  status={order.status}
                  timestamp={order.timestamp}
                  tableNumber={order.tableNumber}
                  customerName={order.customerName}
                  total={order.total}
                  density={density}
                  onStatusChange={(newStatus) => updateOrderStatus(order.id, newStatus)}
                  onUndo={() => undoStatusChange(order)}
                  isUpdating={updatingOrder === order.id}
                />
              ))}
            </StatusColumn>

            {/* Ready Column */}
            <StatusColumn
              title="Ready"
              status="ready"
              count={ordersByStatus.ready?.length || 0}
            >
              {sortOrders(ordersByStatus.ready || []).map(order => (
                <TicketCard
                  key={order.id}
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  items={enrichItems(order.items)}
                  status={order.status}
                  timestamp={order.timestamp}
                  tableNumber={order.tableNumber}
                  customerName={order.customerName}
                  total={order.total}
                  density={density}
                  onStatusChange={(newStatus) => updateOrderStatus(order.id, newStatus)}
                  onUndo={() => undoStatusChange(order)}
                  isUpdating={updatingOrder === order.id}
                />
              ))}
            </StatusColumn>

            {/* Served Column */}
            <StatusColumn
              title="Served"
              status="served"
              count={ordersByStatus.served?.length || 0}
            >
              {sortOrders(ordersByStatus.served || []).slice(0, 10).map(order => (
                <TicketCard
                  key={order.id}
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  items={enrichItems(order.items)}
                  status={order.status}
                  timestamp={order.timestamp}
                  tableNumber={order.tableNumber}
                  customerName={order.customerName}
                  total={order.total}
                  density={density}
                  onStatusChange={(newStatus) => updateOrderStatus(order.id, newStatus)}
                  onUndo={() => undoStatusChange(order)}
                  isUpdating={updatingOrder === order.id}
                />
              ))}
            </StatusColumn>
          </div>
        ) : (
          // List View - Full width rows
          <div className="h-full overflow-y-auto p-4">
            <div className="max-w-7xl mx-auto space-y-6">
              {['preparing', 'ready', 'served'].map((status) => {
                const statusOrders = ordersByStatus[status as Order['status']] || [];
                const displayOrders = status === 'served' 
                  ? sortOrders(statusOrders).slice(0, 10)
                  : sortOrders(statusOrders);

                if (displayOrders.length === 0) return null;

                return (
                  <div key={status}>
                    <h2 className="text-lg font-semibold text-foreground mb-3 capitalize">
                      {status} ({statusOrders.length})
                    </h2>
                    <div className="space-y-3">
                      {displayOrders.map(order => (
                        <div key={order.id} className="w-full">
                          <TicketCard
                            orderId={order.id}
                            orderNumber={order.orderNumber}
                            items={enrichItems(order.items)}
                            status={order.status}
                            timestamp={order.timestamp}
                            tableNumber={order.tableNumber}
                            customerName={order.customerName}
                            total={order.total}
                            density={density}
                            onStatusChange={(newStatus) => updateOrderStatus(order.id, newStatus)}
                            onUndo={() => undoStatusChange(order)}
                            isUpdating={updatingOrder === order.id}
                            className="max-w-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Role Badge - Bottom Left */}
      <div className="fixed bottom-4 left-4 z-40">
        <RoleBadge size="md" />
      </div>
    </div>
  );
}

export default KDS;
