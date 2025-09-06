import { useMemo } from 'react';
import type { BadgeData } from '../config/nav.config';

// Mock data hooks - these would connect to actual data stores in production
// For now, using realistic mock data that demonstrates the badge system

/**
 * Hook to get orders count for navigation badge
 */
export const useOrdersCount = (): BadgeData => {
  // In production, this would connect to orders store/API
  // For demo purposes, using mock data that changes over time
  const mockActiveOrders = useMemo(() => {
    const baseCount = 8;
    const variation = Math.floor(Math.sin(Date.now() / 30000) * 3); // Changes every 30s
    return Math.max(0, baseCount + variation);
  }, []);

  return {
    count: mockActiveOrders,
    variant: mockActiveOrders > 10 ? 'danger' : mockActiveOrders > 5 ? 'warning' : 'default',
  };
};

/**
 * Hook to get low stock alerts count for navigation badge
 */
export const useLowStockCount = (): BadgeData => {
  // In production, this would connect to inventory service
  // Mock implementation using realistic inventory alert counts
  const mockLowStockItems = useMemo(() => {
    const baseLowStock = 3;
    const variation = Math.floor(Math.sin(Date.now() / 45000) * 2); // Changes every 45s
    return Math.max(0, baseLowStock + variation);
  }, []);

  return {
    count: mockLowStockItems,
    variant: mockLowStockItems > 5 ? 'danger' : mockLowStockItems > 2 ? 'warning' : 'default',
  };
};

/**
 * Hook to get expiring items count for navigation badge
 */
export const useExpiringItemsCount = (): BadgeData => {
  // Mock implementation for expiring items alerts
  const mockExpiringItems = useMemo(() => {
    const baseExpiring = 2;
    const variation = Math.floor(Math.sin(Date.now() / 60000) * 1); // Changes every minute
    return Math.max(0, baseExpiring + variation);
  }, []);

  return {
    count: mockExpiringItems,
    variant: mockExpiringItems > 3 ? 'danger' : mockExpiringItems > 0 ? 'warning' : 'default',
  };
};

/**
 * Hook to get out of stock items count for navigation badge  
 */
export const useOutOfStockCount = (): BadgeData => {
  // Mock implementation for out of stock alerts
  const mockOutOfStock = useMemo(() => {
    const baseOutOfStock = 1;
    const variation = Math.floor(Math.sin(Date.now() / 75000) * 1); // Changes every 75s
    return Math.max(0, baseOutOfStock + variation);
  }, []);

  return {
    count: mockOutOfStock,
    variant: mockOutOfStock > 0 ? 'danger' : 'default',
  };
};

/**
 * Master hook to get badge data by ID
 */
export const useBadgeData = (badgeId: string): BadgeData | null => {
  const ordersData = useOrdersCount();
  const lowStockData = useLowStockCount();
  const expiringData = useExpiringItemsCount();
  const outOfStockData = useOutOfStockCount();

  switch (badgeId) {
    case 'ordersCount':
      return ordersData;
    case 'lowStock':
      return lowStockData;
    case 'expiringItems':
      return expiringData;
    case 'outOfStock':
      return outOfStockData;
    default:
      return null;
  }
};

// Integration helpers for when connecting to real data stores

/**
 * Future hook to connect to actual orders store
 * Example implementation pattern for real integration:
 * 
 * export const useOrdersCount = (): BadgeData => {
 *   const { data: orders } = useQuery(['orders', 'active'], getActiveOrders);
 *   const activeCount = orders?.filter(o => ['new', 'preparing', 'ready'].includes(o.status)).length || 0;
 *   
 *   return {
 *     count: activeCount,
 *     variant: activeCount > 10 ? 'danger' : activeCount > 5 ? 'warning' : 'default',
 *   };
 * };
 */

/**
 * Future hook to connect to inventory service
 * Example implementation pattern for real integration:
 * 
 * export const useLowStockCount = (): BadgeData => {
 *   const inventoryService = useInventoryService();
 *   const { data: alerts } = useQuery(['inventory', 'alerts'], () => 
 *     inventoryService.getReorderAlerts()
 *   );
 *   
 *   const lowStockCount = alerts?.filter(a => 
 *     a.alertType === 'below_reorder' && !a.isResolved
 *   ).length || 0;
 *   
 *   return {
 *     count: lowStockCount,
 *     variant: lowStockCount > 5 ? 'danger' : lowStockCount > 2 ? 'warning' : 'default',
 *   };
 * };
 */
