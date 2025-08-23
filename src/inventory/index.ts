/**
 * Advanced Inventory Management Module
 * 
 * Comprehensive inventory system with reorder management,
 * supplier integration, batch tracking, and multi-location support
 */

// Core Services
export { AdvancedInventoryService, createAdvancedInventoryService } from './advancedInventoryService';
export { ReorderManager, createReorderManager } from './reorderManager';
export { SupplierManager, createSupplierManager } from './supplierManager';
export { BatchTracker, createBatchTracker } from './batchTracker';

// React Components
export { InventoryDashboard } from './components/InventoryDashboard';

// Legacy Components (maintain compatibility)
export { inventoryEngine } from './engine';
export { getOversellPolicy, setOversellPolicy } from './policy';
export * from './recipes';

// Types
export type {
  // Enhanced Inventory Types
  InventoryItem,
  InventoryCategory,
  BatchInfo,
  Location,
  LocationType,
  LocationAddress,
  OperatingHours,
  TimeRange,
  
  // Supplier Management
  Supplier,
  PaymentTerms,
  DayOfWeek,
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrderItem,
  
  // Stock Transfer
  StockTransfer,
  TransferStatus,
  TransferItem,
  
  // Alert System
  ReorderAlert,
  ExpirationAlert,
  AlertStatus,
  UrgencyLevel,
  
  // Analytics & Reporting
  InventoryAnalytics,
  InventoryCount,
  CountStatus,
  CountType,
  InventoryCountItem,
  InventoryDiscrepancy,
  DiscrepancyReason,
  
  // Service Types
  AdvancedInventoryStatus,
  InventoryDashboard as InventoryDashboardData,
  
  // Event Types
  ReorderAlertCreatedEvent,
  PurchaseOrderCreatedEvent,
  InventoryReceivedEvent,
  StockTransferInitiatedEvent,
  ExpirationAlertCreatedEvent,
  BatchCreatedEvent,
  BatchConsumedEvent,
  BatchExpiredEvent,
  BatchWastedEvent,
  SupplierCreatedEvent,
  SupplierUpdatedEvent,
  DeliveryReceivedEvent,
  
  // Legacy Types (maintain compatibility)
  ComponentRequirement,
  InventoryAdjustmentReport,
  OversellPolicy
} from './types';

export { OversellError } from './types';

/**
 * Inventory Management Utilities
 */
export const InventoryUtils = {
  /**
   * Calculate inventory turnover rate
   */
  calculateTurnoverRate(cost: number, averageInventoryValue: number): number {
    if (averageInventoryValue === 0) return 0;
    return cost / averageInventoryValue;
  },

  /**
   * Calculate days in inventory
   */
  calculateDaysInInventory(averageInventoryValue: number, dailyCost: number): number {
    if (dailyCost === 0) return 0;
    return averageInventoryValue / dailyCost;
  },

  /**
   * Format inventory value as currency
   */
  formatInventoryValue(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  },

  /**
   * Calculate reorder point using formula: (average daily usage × lead time) + safety stock
   */
  calculateReorderPoint(
    averageDailyUsage: number,
    leadTimeDays: number,
    safetyStockDays: number = 3
  ): number {
    return Math.ceil(averageDailyUsage * (leadTimeDays + safetyStockDays));
  },

  /**
   * Calculate economic order quantity (EOQ)
   */
  calculateEOQ(
    annualDemand: number,
    orderingCost: number,
    holdingCostPerUnit: number
  ): number {
    if (holdingCostPerUnit === 0) return 0;
    return Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
  },

  /**
   * Calculate ABC classification for inventory items
   */
  classifyABC(items: Array<{ sku: string; value: number }>): Array<{
    sku: string;
    value: number;
    classification: 'A' | 'B' | 'C';
    cumulativePercentage: number;
  }> {
    // Sort by value descending
    const sortedItems = [...items].sort((a, b) => b.value - a.value);
    const totalValue = sortedItems.reduce((sum, item) => sum + item.value, 0);
    
    let cumulativeValue = 0;
    return sortedItems.map(item => {
      cumulativeValue += item.value;
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;
      
      let classification: 'A' | 'B' | 'C';
      if (cumulativePercentage <= 80) {
        classification = 'A'; // Top 80% of value
      } else if (cumulativePercentage <= 95) {
        classification = 'B'; // Next 15% of value
      } else {
        classification = 'C'; // Bottom 5% of value
      }
      
      return {
        sku: item.sku,
        value: item.value,
        classification,
        cumulativePercentage
      };
    });
  },

  /**
   * Validate SKU format
   */
  validateSKU(sku: string): boolean {
    // Simple SKU validation - alphanumeric with underscores/hyphens
    return /^[A-Z0-9_-]+$/i.test(sku) && sku.length >= 3 && sku.length <= 20;
  },

  /**
   * Generate suggested SKU based on item name
   */
  generateSKU(itemName: string, category?: string): string {
    const cleanName = itemName
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(' ')
      .filter(word => word.length > 0)
      .slice(0, 3) // Take first 3 words
      .map(word => word.slice(0, 4)) // Take first 4 characters of each word
      .join('_');
    
    const categoryPrefix = category ? category.slice(0, 3).toUpperCase() + '_' : '';
    const timestamp = Date.now().toString().slice(-4);
    
    return `${categoryPrefix}${cleanName}_${timestamp}`;
  }
};

/**
 * Initialize advanced inventory management
 */
export function initializeAdvancedInventory(eventStore: any) {
  const inventoryService = createAdvancedInventoryService(eventStore);
  
  // Start monitoring services
  inventoryService.startAdvancedTracking();
  
  console.log('🚀 Advanced inventory management initialized');
  
  return inventoryService;
}
