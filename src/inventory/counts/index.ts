/**
 * Inventory Count Module - Exports
 * Complete cycle count functionality with clean architecture
 */

// Core service and business logic
export { InventoryCountService, createInventoryCountService, getInventoryCountService, initializeInventoryCountService } from './service';

// API layer and MSW handlers
export { inventoryCountApiHandlers, countApiService } from './api';

// TypeScript types and utilities  
export type {
  InventoryCount,
  CountItem,
  CountStatus,
  CountScope,
  CountQuery,
  CountsResponse,
  CreateCountRequest,
  UpdateCountItemRequest,
  BulkUpdateCountItemsRequest,
  SubmitCountRequest,
  SubmitCountResponse,
  CancelCountRequest,
  CountExportOptions,
  VarianceAnalysis,
  InventoryCountCreatedEvent,
  InventoryCountUpdatedEvent,
  InventoryCountSubmittedEvent,
  InventoryCountCancelledEvent,
  CountValidationError,
  CountConcurrencyError,
  CountSubmissionError
} from './types';

export { CountUtils, COUNT_CONFIG } from './types';

// React components
export { CountStatusBadge } from '../../components/inventory/counts/CountStatusBadge';
export { VarianceIndicator } from '../../components/inventory/counts/VarianceIndicator';
export { CountsList } from '../../components/inventory/counts/CountsList';
export { default as NewCountWizard } from '../../components/inventory/counts/NewCountWizard';

// Page components
export { default as CountsPage } from '../../pages/inventory/Counts';
export { default as CountSessionPage } from '../../pages/inventory/CountSession';

// Utility functions
export const InventoryCountUtils = {
  /**
   * Calculate total variance for a set of count items
   */
  calculateTotalVariance(items: CountItem[]): {
    totalQty: number;
    totalValue: number;
    positiveValue: number;
    negativeValue: number;
  } {
    const totalQty = items.reduce((sum, item) => sum + item.varianceQty, 0);
    const totalValue = items.reduce((sum, item) => sum + item.varianceValue, 0);
    const positiveValue = items
      .filter(item => item.varianceValue > 0)
      .reduce((sum, item) => sum + item.varianceValue, 0);
    const negativeValue = Math.abs(items
      .filter(item => item.varianceValue < 0)
      .reduce((sum, item) => sum + item.varianceValue, 0));

    return { totalQty, totalValue, positiveValue, negativeValue };
  },

  /**
   * Group count items by category
   */
  groupItemsByCategory(items: CountItem[]): Record<string, CountItem[]> {
    return items.reduce((groups, item) => {
      const category = item.categoryName || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {} as Record<string, CountItem[]>);
  },

  /**
   * Calculate count completion percentage
   */
  calculateCompletionPercentage(items: CountItem[]): number {
    if (items.length === 0) return 0;
    const countedItems = items.filter(item => item.countedQty !== null);
    return Math.round((countedItems.length / items.length) * 100);
  },

  /**
   * Find items with significant variances
   */
  findSignificantVariances(items: CountItem[], thresholdPercentage: number = 10): CountItem[] {
    return items.filter(item => 
      item.countedQty !== null && 
      Math.abs(item.variancePercentage) > thresholdPercentage
    );
  },

  /**
   * Generate count summary statistics
   */
  generateCountSummary(count: InventoryCount, items: CountItem[]) {
    const countedItems = items.filter(item => item.countedQty !== null);
    const variance = this.calculateTotalVariance(countedItems);
    const completion = this.calculateCompletionPercentage(items);
    const significantVariances = this.findSignificantVariances(countedItems);

    return {
      count,
      items: {
        total: items.length,
        counted: countedItems.length,
        remaining: items.length - countedItems.length,
        withVariance: countedItems.filter(item => item.varianceQty !== 0).length
      },
      completion,
      variance,
      significantVariances: {
        count: significantVariances.length,
        items: significantVariances
      },
      duration: count.metadata.actualDurationMinutes || 
        (count.closedAt && count.createdAt ? 
          Math.floor((new Date(count.closedAt).getTime() - new Date(count.createdAt).getTime()) / (1000 * 60)) : 
          null)
    };
  }
};
