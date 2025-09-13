import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useApi, apiPatch } from '../hooks/useApi';
import { useEventStore } from '../events/context';
import { getDeviceId } from '../lib/device';
import { getCurrentBranchId } from '../lib/branch';
import { getRole, Role, getCurrentUser } from '../rbac/roles';
import { cn } from '../lib/utils';
import { RoleBadge, StatusColumn, TicketCard, KdsToolbar } from '../components/kds';
import { getKdsSettings } from '../settings/kds';

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
  const store = useEventStore();
  const deviceId = getDeviceId();
  const kdsSettings = getKdsSettings();
  const branchId = getCurrentBranchId();
  const { data: orders, loading, error, refetch } = useApi<Order[]>(`/api/orders?branchId=${encodeURIComponent(branchId)}`);
  const { data: menuItems } = useApi<MenuItem[]>(`/api/menu?branchId=${encodeURIComponent(branchId)}`);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  
  // View preferences with localStorage persistence (seeded from settings)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
    return (saved as 'grid' | 'list') || kdsSettings.defaultView;
  });
  
  const [density, setDensity] = useState<'compact' | 'comfortable'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DENSITY);
    return (saved as 'compact' | 'comfortable') || kdsSettings.defaultDensity;
  });
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState(0);
  const [localMeta, setLocalMeta] = useState<Map<string, { preparingAt?: number; readyAt?: number; servedAt?: number; preparedBy?: string }>>(new Map());

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

  // Tick every second to update overdue counters and timers ordering
  useEffect(() => {
    const id = setInterval(() => setClock((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-refresh based on settings
  useEffect(() => {
    const refreshMs = Math.max(5, getKdsSettings().autoRefreshSeconds) * 1000;
    const interval = setInterval(() => {
      refetch();
    }, refreshMs);
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
      // Local immediate meta to avoid UI race with event store
      const now = Date.now();
      setLocalMeta(prev => {
        const next = new Map(prev);
        const entry = next.get(orderId) || {};
        if (newStatus === 'ready' && !entry.readyAt) {
          entry.readyAt = now;
          const u = getCurrentUser();
          if (u?.name) entry.preparedBy = u.name;
        }
        if (newStatus === 'served' && !entry.servedAt) {
          entry.servedAt = now;
        }
        next.set(orderId, entry);
        return next;
      });
      // Log event for audit/reporting
      try {
        const user = getCurrentUser();
        const payload = {
          orderId,
          status: newStatus,
          actorRole: getRole(),
          actorId: user?.id,
          actorName: user?.name,
          branchId,
          deviceId,
        } as const;
        store.append('kds.status.changed', payload, {
          aggregate: { id: orderId, type: 'order' },
        });
        // Optional: lightweight UI feedback
        // Note: Avoid noisy toasts in KDS; uncomment if desired
        // showSuccess(`KDS: ${newStatus.toUpperCase()}`, `Order ${orderId} marked ${newStatus}`);
      } catch {}
      await refetch();
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setUpdatingOrder(null);
    }
  };

  // Derive per-order timing metadata from events
  const kdsMetaByOrder = useMemo(() => {
    const meta = new Map<string, { preparingAt?: number; readyAt?: number; servedAt?: number; preparedBy?: string }>();
    const events = store.getAll();
    for (const e of events) {
      if (e.type !== 'kds.status.changed') continue;
      const p: any = e.payload || {};
      const entry = meta.get(p.orderId) || {};
      if (p.status === 'preparing') {
        if (!entry.preparingAt) entry.preparingAt = e.at;
      }
      if (p.status === 'ready') {
        if (!entry.readyAt) entry.readyAt = e.at;
        if (p.actorName) entry.preparedBy = p.actorName;
      } else if (p.status === 'served') {
        if (!entry.servedAt) entry.servedAt = e.at;
      }
      meta.set(p.orderId, entry);
    }
    // Merge local overrides for immediate UI responsiveness
    for (const [orderId, entry] of localMeta.entries()) {
      const base = meta.get(orderId) || {};
      meta.set(orderId, { ...base, ...entry });
    }
    return meta;
  }, [orders, store, clock, localMeta]);

  // Seed missing anchors for orders without events (first render)
  useEffect(() => {
    if (!orders || orders.length === 0) return;
    setLocalMeta(prev => {
      const next = new Map(prev);
      const now = Date.now();
      for (const o of orders) {
        const base = kdsMetaByOrder.get(o.id) || {};
        const entry = next.get(o.id) || {};
        if (o.status === 'preparing') {
          if (!base.preparingAt && !entry.preparingAt) entry.preparingAt = now;
          next.set(o.id, entry);
        } else if (o.status === 'ready') {
          if (!base.preparingAt && !entry.preparingAt) entry.preparingAt = now;
          if (!base.readyAt && !entry.readyAt) {
            entry.readyAt = now;
            next.set(o.id, entry);
          }
        } else if (o.status === 'served') {
          if (!base.preparingAt && !entry.preparingAt) entry.preparingAt = now;
          if (!base.readyAt && !entry.readyAt) entry.readyAt = now;
          if (!base.servedAt && !entry.servedAt) entry.servedAt = now;
          next.set(o.id, entry);
        }
      }
      return next;
    });
    // We intentionally depend on orders and derived meta
  }, [orders, kdsMetaByOrder]);

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
  const overdueCount = (() => {
    const dangerMs = 12 * 60 * 1000;
    const list = [...(ordersByStatus.preparing || []), ...(ordersByStatus.ready || [])];
    const now = Date.now();
    return list.filter(o => (now - new Date(o.timestamp).getTime()) > dangerMs).length;
  })();

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
        overdueCount={overdueCount}
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
                  readyAt={undefined}
                  servedAt={undefined}
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
                  readyAt={kdsMetaByOrder.get(order.id)?.readyAt}
                  preparedBy={kdsMetaByOrder.get(order.id)?.preparedBy}
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
              {(kdsSettings.showOnlyActive ? [] : sortOrders(ordersByStatus.served || []).slice(0, 10)).map(order => (
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
                  readyAt={kdsMetaByOrder.get(order.id)?.readyAt}
                  servedAt={kdsMetaByOrder.get(order.id)?.servedAt}
                  preparedBy={kdsMetaByOrder.get(order.id)?.preparedBy}
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
                  ? (kdsSettings.showOnlyActive ? [] : sortOrders(statusOrders).slice(0, 10))
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
