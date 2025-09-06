/**
 * Inventory Count Service
 * Core business logic for inventory count operations
 */

import type { EventStore } from '../../events/types';
import { generateEventId } from '../../events/hash';
import { getCurrentUser } from '../../rbac/roles';
import type { InventoryItem } from '../items/types';
import type {
  InventoryCount,
  CountItem,
  CountQuery,
  CountsResponse,
  CreateCountRequest,
  UpdateCountItemRequest,
  BulkUpdateCountItemsRequest,
  SubmitCountRequest,
  SubmitCountResponse,
  CancelCountRequest,
  CountScope,
  VarianceAnalysis,
  InventoryCountCreatedEvent,
  InventoryCountUpdatedEvent,
  InventoryCountSubmittedEvent,
  InventoryCountCancelledEvent,
  CountValidationError,
  CountConcurrencyError,
  CountSubmissionError
} from './types';
import { CountUtils, COUNT_CONFIG } from './types';

export class InventoryCountService {
  private eventStore: EventStore;
  
  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
  }

  /**
   * Create a new inventory count session
   */
  async createCount(request: CreateCountRequest): Promise<InventoryCount> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to create counts');
    }

    // Validate count scope
    const scopeValidation = CountUtils.validateCountScope(request.scope);
    if (!scopeValidation.isValid) {
      throw new CountValidationError(
        scopeValidation.errors.map(error => ({ code: 'INVALID_SCOPE', message: error }))
      );
    }

    // Check for existing active counts at this branch
    const existingCounts = await this.getActiveCounts(request.branchId);
    if (existingCounts.length > 0) {
      // For now, allow multiple counts but warn about overlapping scope
      console.warn('Multiple active counts detected for branch:', request.branchId);
    }

    // Generate count ID and timestamps
    const countId = CountUtils.generateCountId();
    const now = new Date().toISOString();

    // Get items based on scope to create snapshot
    const items = await this.getItemsForScope(request.branchId, request.scope);
    
    if (items.length === 0) {
      throw new CountValidationError([
        { code: 'NO_ITEMS', message: 'No items match the specified scope' }
      ]);
    }

    if (items.length > COUNT_CONFIG.MAX_ITEMS_PER_COUNT) {
      throw new CountValidationError([
        { code: 'TOO_MANY_ITEMS', message: `Count scope includes ${items.length} items. Maximum allowed: ${COUNT_CONFIG.MAX_ITEMS_PER_COUNT}` }
      ]);
    }

    // Create count items with snapshots
    const countItems = items.map(item => this.createCountItemSnapshot(item, countId));

    // Calculate initial totals (all zeros since nothing counted yet)
    const totals = {
      varianceQty: 0,
      varianceValue: 0,
      itemsCountedCount: 0,
      totalItemsCount: items.length,
      positiveVarianceValue: 0,
      negativeVarianceValue: 0
    };

    // Create count session
    const count: InventoryCount = {
      id: countId,
      branchId: request.branchId,
      status: 'draft',
      createdBy: currentUser.id,
      createdAt: now,
      scope: request.scope,
      totals,
      metadata: {
        lastSavedAt: now,
        notes: request.notes,
        estimatedDurationMinutes: request.estimatedDurationMinutes
      }
    };

    // Record count creation event
    const event: InventoryCountCreatedEvent = {
      type: 'inventory.count.created',
      payload: {
        countId,
        branchId: request.branchId,
        scope: request.scope,
        itemCount: items.length,
        createdBy: currentUser.id
      },
      timestamp: now,
      aggregateId: countId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: countId, type: 'inventory-count' }
    });

    return count;
  }

  /**
   * Get count session details with items
   */
  async getCount(countId: string): Promise<{ count: InventoryCount; items: CountItem[] }> {
    // Implementation would query from event store or database
    // For now, return mock structure
    throw new Error('Implementation pending - requires event store query logic');
  }

  /**
   * Update counted quantities for items
   */
  async updateCountItems(
    countId: string, 
    updates: UpdateCountItemRequest[]
  ): Promise<{ success: boolean; errors?: any[] }> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to update counts');
    }

    // Validate count exists and is editable
    const count = await this.validateCountEditable(countId);
    
    // Process updates
    const processedUpdates = updates.map(update => ({
      ...update,
      countedBy: currentUser.id,
      countedAt: new Date().toISOString()
    }));

    // Record update event
    const event: InventoryCountUpdatedEvent = {
      type: 'inventory.count.updated',
      payload: {
        countId,
        itemsUpdated: processedUpdates.map(u => ({
          itemId: u.itemId,
          countedQty: u.countedQty,
          previousCountedQty: null // Would need to get previous value
        })),
        updatedBy: currentUser.id
      },
      timestamp: new Date().toISOString(),
      aggregateId: countId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: countId, type: 'inventory-count' }
    });

    return { success: true };
  }

  /**
   * Submit count and create inventory adjustments
   */
  async submitCount(countId: string, request: SubmitCountRequest): Promise<SubmitCountResponse> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to submit counts');
    }

    // Validate count and get items
    const { count, items } = await this.getCount(countId);
    
    if (count.status !== 'draft' && count.status !== 'open') {
      throw new CountSubmissionError('Count must be in draft or open status to submit', []);
    }

    // Validate at least one item is counted
    const countedItems = items.filter(item => item.countedQty !== null);
    if (countedItems.length === 0) {
      throw new CountValidationError([
        { code: 'NO_ITEMS_COUNTED', message: 'At least one item must be counted before submission' }
      ]);
    }

    // Validate large variances if threshold specified
    if (request.varianceThreshold) {
      const largeVariances = countedItems.filter(item => 
        Math.abs(item.variancePercentage) > request.varianceThreshold!
      );
      
      if (largeVariances.length > 0 && !request.confirmation) {
        throw new CountSubmissionError(
          `${largeVariances.length} items have variances exceeding ${request.varianceThreshold}%`, 
          largeVariances
        );
      }
    }

    // Generate adjustment batch ID
    const adjustmentBatchId = `COUNTADJ_${countId}_${Date.now()}`;
    const now = new Date().toISOString();

    // Create adjustments for items with variances
    const adjustments = await this.createCountAdjustments(
      countedItems.filter(item => item.varianceQty !== 0),
      adjustmentBatchId
    );

    // Update count status to closed
    const submittedCount: InventoryCount = {
      ...count,
      status: 'closed',
      closedBy: currentUser.id,
      closedAt: now,
      metadata: {
        ...count.metadata,
        submittedAt: now,
        adjustmentBatchId,
        actualDurationMinutes: this.calculateDuration(count.createdAt, now)
      }
    };

    // Record submission event
    const event: InventoryCountSubmittedEvent = {
      type: 'inventory.count.submitted',
      payload: {
        countId,
        branchId: count.branchId,
        adjustmentBatchId,
        totalVarianceValue: count.totals.varianceValue,
        adjustmentCount: adjustments.length,
        submittedBy: currentUser.id
      },
      timestamp: now,
      aggregateId: countId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: countId, type: 'inventory-count' }
    });

    // Prepare response
    return {
      adjustmentBatchId,
      adjustments: adjustments.map(adj => ({
        itemId: adj.itemId,
        sku: adj.sku,
        name: adj.name,
        adjustmentQty: adj.adjustmentQty,
        adjustmentValue: adj.adjustmentValue,
        newStockLevel: adj.newStockLevel
      })),
      summary: {
        totalAdjustments: adjustments.length,
        totalVarianceValue: count.totals.varianceValue,
        positiveAdjustments: adjustments.filter(a => a.adjustmentQty > 0).length,
        negativeAdjustments: adjustments.filter(a => a.adjustmentQty < 0).length
      }
    };
  }

  /**
   * Cancel a count session
   */
  async cancelCount(countId: string, request: CancelCountRequest): Promise<void> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to cancel counts');
    }

    // Validate count can be cancelled
    const count = await this.validateCountEditable(countId);
    
    // Record cancellation event
    const event: InventoryCountCancelledEvent = {
      type: 'inventory.count.cancelled',
      payload: {
        countId,
        reason: request.reason,
        cancelledBy: currentUser.id
      },
      timestamp: new Date().toISOString(),
      aggregateId: countId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: countId, type: 'inventory-count' }
    });
  }

  /**
   * Get variance analysis for a count
   */
  async getVarianceAnalysis(countId: string): Promise<VarianceAnalysis> {
    const { count, items } = await this.getCount(countId);
    const countedItems = items.filter(item => item.countedQty !== null);
    
    if (countedItems.length === 0) {
      return this.getEmptyVarianceAnalysis();
    }

    const positiveVariances = countedItems.filter(item => item.varianceValue > 0);
    const negativeVariances = countedItems.filter(item => item.varianceValue < 0);

    return {
      totalVarianceValue: countedItems.reduce((sum, item) => sum + item.varianceValue, 0),
      totalVarianceQty: countedItems.reduce((sum, item) => sum + item.varianceQty, 0),
      averageVariancePercentage: countedItems.reduce((sum, item) => sum + Math.abs(item.variancePercentage), 0) / countedItems.length,
      itemsWithVariance: countedItems.filter(item => item.varianceQty !== 0).length,
      
      positiveVariances: {
        count: positiveVariances.length,
        totalValue: positiveVariances.reduce((sum, item) => sum + item.varianceValue, 0),
        averageValue: positiveVariances.length > 0 ? positiveVariances.reduce((sum, item) => sum + item.varianceValue, 0) / positiveVariances.length : 0
      },
      
      negativeVariances: {
        count: negativeVariances.length,
        totalValue: Math.abs(negativeVariances.reduce((sum, item) => sum + item.varianceValue, 0)),
        averageValue: negativeVariances.length > 0 ? Math.abs(negativeVariances.reduce((sum, item) => sum + item.varianceValue, 0)) / negativeVariances.length : 0
      },

      largestVariances: countedItems
        .sort((a, b) => Math.abs(b.varianceValue) - Math.abs(a.varianceValue))
        .slice(0, 10)
        .map(item => ({
          itemId: item.itemId,
          sku: item.sku,
          name: item.name,
          varianceQty: item.varianceQty,
          varianceValue: item.varianceValue,
          variancePercentage: item.variancePercentage
        })),

      categoryVariances: [] // Would implement category grouping
    };
  }

  // Private helper methods

  private createCountItemSnapshot(item: InventoryItem, countId: string): CountItem {
    const now = new Date().toISOString();
    
    return {
      id: `${countId}_${item.id}`,
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      unit: item.uom.base,
      categoryName: '', // Would populate from category lookup
      
      // Immutable snapshot
      snapshotQty: item.levels.current,
      snapshotAvgCost: item.costing.averageCost,
      snapshotTimestamp: now,
      
      // Empty count entry (to be filled)
      countedQty: null,
      
      // Calculated fields (initial zeros)
      varianceQty: 0,
      varianceValue: 0,
      variancePercentage: 0,
      
      isActive: item.status === 'active',
      hasDiscrepancy: false
    };
  }

  private async getItemsForScope(branchId: string, scope: CountScope): Promise<InventoryItem[]> {
    // Implementation would query inventory items based on scope
    // For now, return empty array
    return [];
  }

  private async getActiveCounts(branchId: string): Promise<InventoryCount[]> {
    // Implementation would query for counts with status 'draft' or 'open'
    return [];
  }

  private async validateCountEditable(countId: string): Promise<InventoryCount> {
    // Implementation would validate count exists and is in editable state
    throw new Error('Implementation pending');
  }

  private async createCountAdjustments(
    items: CountItem[], 
    batchId: string
  ): Promise<Array<{
    itemId: string;
    sku: string;
    name: string;
    adjustmentQty: number;
    adjustmentValue: number;
    newStockLevel: number;
  }>> {
    // Implementation would create adjustment records using existing adjustment API
    return [];
  }

  private calculateDuration(startTime: string, endTime: string): number {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.round((end - start) / (1000 * 60)); // Minutes
  }

  private getEmptyVarianceAnalysis(): VarianceAnalysis {
    return {
      totalVarianceValue: 0,
      totalVarianceQty: 0,
      averageVariancePercentage: 0,
      itemsWithVariance: 0,
      positiveVariances: { count: 0, totalValue: 0, averageValue: 0 },
      negativeVariances: { count: 0, totalValue: 0, averageValue: 0 },
      largestVariances: [],
      categoryVariances: []
    };
  }

  /**
   * Calculate real-time totals for a count session
   */
  calculateCountTotals(items: CountItem[]): InventoryCount['totals'] {
    const countedItems = items.filter(item => item.countedQty !== null);
    const itemsWithVariance = items.filter(item => item.varianceQty !== 0);
    const positiveVariances = items.filter(item => item.varianceValue > 0);
    const negativeVariances = items.filter(item => item.varianceValue < 0);

    return {
      varianceQty: items.reduce((sum, item) => sum + item.varianceQty, 0),
      varianceValue: items.reduce((sum, item) => sum + item.varianceValue, 0),
      itemsCountedCount: countedItems.length,
      totalItemsCount: items.length,
      positiveVarianceValue: positiveVariances.reduce((sum, item) => sum + item.varianceValue, 0),
      negativeVarianceValue: Math.abs(negativeVariances.reduce((sum, item) => sum + item.varianceValue, 0))
    };
  }

  /**
   * Calculate variance for a single count item
   */
  calculateItemVariance(item: Omit<CountItem, 'varianceQty' | 'varianceValue' | 'variancePercentage'>): {
    varianceQty: number;
    varianceValue: number;
    variancePercentage: number;
    hasDiscrepancy: boolean;
  } {
    if (item.countedQty === null) {
      return {
        varianceQty: 0,
        varianceValue: 0,
        variancePercentage: 0,
        hasDiscrepancy: false
      };
    }

    const varianceQty = item.countedQty - item.snapshotQty;
    const varianceValue = varianceQty * item.snapshotAvgCost;
    const variancePercentage = CountUtils.calculateVariancePercentage(item.countedQty, item.snapshotQty);
    
    // Determine if this is a significant discrepancy
    const hasDiscrepancy = Math.abs(variancePercentage) > COUNT_CONFIG.DEFAULT_VARIANCE_THRESHOLD;

    return {
      varianceQty: Math.round(varianceQty * 100) / 100, // Round to 2 decimal places
      varianceValue: Math.round(varianceValue * 100) / 100, // Round currency
      variancePercentage: Math.round(variancePercentage * 100) / 100,
      hasDiscrepancy
    };
  }

  /**
   * Validate count submission requirements
   */
  validateCountSubmission(count: InventoryCount, items: CountItem[]): { 
    isValid: boolean; 
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic requirements
    if (count.status !== 'draft' && count.status !== 'open') {
      errors.push('Count must be in draft or open status to submit');
    }

    const countedItems = items.filter(item => item.countedQty !== null);
    if (countedItems.length === 0) {
      errors.push('At least one item must be counted before submission');
    }

    // Check for large variances
    const largeVariances = countedItems.filter(item => 
      Math.abs(item.variancePercentage) > COUNT_CONFIG.DEFAULT_VARIANCE_THRESHOLD
    );
    
    if (largeVariances.length > 0) {
      warnings.push(`${largeVariances.length} items have variances exceeding ${COUNT_CONFIG.DEFAULT_VARIANCE_THRESHOLD}%`);
    }

    // Check for high-value variances
    const highValueVariances = countedItems.filter(item => 
      Math.abs(item.varianceValue) > COUNT_CONFIG.VALUE_THRESHOLDS.AUTO_APPROVE
    );
    
    if (highValueVariances.length > 0) {
      warnings.push(`${highValueVariances.length} items have variances exceeding $${COUNT_CONFIG.VALUE_THRESHOLDS.AUTO_APPROVE}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Factory function for service creation
export function createInventoryCountService(eventStore: EventStore): InventoryCountService {
  return new InventoryCountService(eventStore);
}

// Singleton instance (following existing patterns)
let countService: InventoryCountService | null = null;

export function getInventoryCountService(): InventoryCountService {
  if (!countService) {
    throw new Error('Inventory count service not initialized. Call createInventoryCountService first.');
  }
  return countService;
}

export function initializeInventoryCountService(eventStore: EventStore): InventoryCountService {
  if (countService) {
    return countService;
  }
  
  countService = createInventoryCountService(eventStore);
  return countService;
}
