/**
 * Advanced Inventory Management Service
 * 
 * Orchestrates reorder management, supplier integration, batch tracking,
 * and multi-location inventory for comprehensive inventory control
 */

import type { EventStore } from '../events/types';
import { ReorderManager, createReorderManager } from './reorderManager';
import { SupplierManager, createSupplierManager } from './supplierManager';
import { BatchTracker, createBatchTracker } from './batchTracker';
import type {
  ReorderAlert,
  ExpirationAlert,
  InventoryAnalytics,
  StockTransfer,
  Location
} from './types';

export interface AdvancedInventoryStatus {
  totalItems: number;
  totalValue: number;
  activeReorderAlerts: number;
  expirationAlerts: number;
  lowStockItems: number;
  overStockItems: number;
  activePurchaseOrders: number;
  pendingTransfers: number;
  wasteValue: number;
  turnoverRate: number;
}

export interface InventoryDashboard {
  status: AdvancedInventoryStatus;
  reorderAlerts: ReorderAlert[];
  expirationAlerts: ExpirationAlert[];
  recentTransactions: Array<{
    type: 'received' | 'consumed' | 'transferred' | 'wasted';
    sku: string;
    quantity: number;
    timestamp: string;
    reference?: string;
  }>;
  supplierPerformance: Array<{
    supplierId: string;
    name: string;
    performance: number;
    reliability: string;
    activeOrders: number;
  }>;
}

export class AdvancedInventoryService {
  private eventStore: EventStore;
  private reorderManager: ReorderManager;
  private supplierManager: SupplierManager;
  private batchTracker: BatchTracker;
  private locations: Map<string, Location> = new Map();

  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
    this.reorderManager = createReorderManager(eventStore);
    this.supplierManager = createSupplierManager(eventStore);
    this.batchTracker = createBatchTracker(eventStore);
    this.initializeDefaultLocations();
  }

  /**
   * Start all monitoring services
   */
  startAdvancedTracking(): void {
    console.log('🚀 Starting advanced inventory management...');
    this.reorderManager.startMonitoring();
    this.batchTracker.startExpirationMonitoring();
    console.log('✅ Advanced inventory management active');
  }

  /**
   * Stop all monitoring services
   */
  stopAdvancedTracking(): void {
    console.log('⏹️ Stopping advanced inventory management...');
    this.reorderManager.stopMonitoring();
    this.batchTracker.stopExpirationMonitoring();
    console.log('✅ Advanced inventory management stopped');
  }

  /**
   * Get comprehensive inventory dashboard
   */
  async getInventoryDashboard(): Promise<InventoryDashboard> {
    const [reorderAlerts, expirationAlerts] = await Promise.all([
      this.reorderManager.checkReorderPoints(),
      this.batchTracker.checkExpirations()
    ]);

    const activeReorderAlerts = this.getActiveReorderAlerts();
    const activeExpirationAlerts = this.getActiveExpirationAlerts();
    const supplierPerformance = this.getSupplierPerformanceSummary();

    // Calculate inventory status
    const status = this.calculateInventoryStatus();

    // Get recent transactions (simplified)
    const recentTransactions = this.getRecentTransactions();

    return {
      status,
      reorderAlerts: activeReorderAlerts,
      expirationAlerts: activeExpirationAlerts,
      recentTransactions,
      supplierPerformance
    };
  }

  /**
   * Get comprehensive inventory analytics
   */
  getInventoryAnalytics(locationId?: string): InventoryAnalytics[] {
    // This would calculate detailed analytics for each inventory item
    // For now, returning mock analytics
    return [
      {
        sku: 'BEEF_PATTY',
        itemName: 'Beef Patty (1/4 lb)',
        locationId: locationId || 'main',
        turnoverRate: 12.5, // times per year
        daysInInventory: 29,
        averageDailyUsage: 8.5,
        averageWeeklyUsage: 59.5,
        averageMonthlyUsage: 255,
        totalInventoryValue: 122.50,
        averageCostPerUnit: 2.45,
        lastPurchaseCost: 2.45,
        stockoutDays: 2,
        overstockDays: 0,
        wasteAmount: 3,
        wasteValue: 7.35,
        predictedUsage30Days: 255,
        predictedUsage90Days: 765,
        recommendedReorderPoint: 25,
        recommendedReorderQuantity: 120
      }
    ];
  }

  /**
   * Process inventory receipt from purchase order
   */
  async processInventoryReceipt(
    purchaseOrderId: string,
    receivedItems: Array<{
      sku: string;
      quantityReceived: number;
      unitCost: number;
      expirationDate?: string;
      condition: 'good' | 'damaged' | 'expired';
      notes?: string;
    }>,
    receivedBy: string,
    locationId: string = 'main'
  ): Promise<boolean> {
    try {
      const batchPromises = receivedItems.map(async (item) => {
        if (item.condition === 'good' && item.quantityReceived > 0) {
          // Create batch for received inventory
          const batchId = await this.batchTracker.addBatch(item.sku, {
            quantity: item.quantityReceived,
            expirationDate: item.expirationDate,
            receivedDate: new Date().toISOString(),
            supplierId: 'SUPPLIER_001', // Would be from PO
            costPerUnit: item.unitCost,
            notes: item.notes
          }, locationId);

          console.log(`📦 Created batch ${batchId} for ${item.sku}`);
        }
      });

      await Promise.all(batchPromises);

      // Record delivery with supplier manager
      await this.supplierManager.recordDelivery(
        purchaseOrderId,
        receivedItems.map(item => ({
          sku: item.sku,
          quantityReceived: item.quantityReceived,
          condition: item.condition,
          notes: item.notes
        })),
        receivedBy
      );

      // Log inventory received event
      await this.eventStore.append('inventory.received', {
        purchaseOrderId,
        items: receivedItems.map(item => ({
          sku: item.sku,
          quantityReceived: item.quantityReceived,
          costPerUnit: item.unitCost
        })),
        receivedBy,
        locationId
      }, {
        key: `inventory-received-${purchaseOrderId}`,
        params: { purchaseOrderId, locationId }
      });

      console.log(`✅ Processed inventory receipt for PO ${purchaseOrderId}`);
      return true;
    } catch (error) {
      console.error('Error processing inventory receipt:', error);
      return false;
    }
  }

  /**
   * Create and send purchase order to supplier
   */
  async createAndSendPurchaseOrder(
    supplierId: string,
    items: Array<{
      sku: string;
      quantity: number;
      estimatedUnitCost: number;
    }>,
    locationId: string,
    createdBy: string,
    notes?: string,
    expectedDeliveryDate?: string
  ): Promise<string | null> {
    try {
      const supplier = this.supplierManager.getSupplier(supplierId);
      if (!supplier) {
        throw new Error(`Supplier ${supplierId} not found`);
      }

      const subtotal = items.reduce((sum, item) => 
        sum + (item.quantity * item.estimatedUnitCost), 0
      );

      const purchaseOrderId = await this.supplierManager.createPurchaseOrder({
        supplierId,
        locationId,
        totalAmount: subtotal,
        subtotal,
        items: items.map(item => ({
          sku: item.sku,
          name: `Item ${item.sku}`, // Would be looked up
          quantityOrdered: item.quantity,
          unitCost: item.estimatedUnitCost,
          totalCost: item.quantity * item.estimatedUnitCost,
          unit: 'each' // Would be looked up
        })),
        notes,
        createdBy,
        expectedDeliveryDate
      });

      // Update PO status to sent
      await this.supplierManager.updatePurchaseOrderStatus(
        purchaseOrderId,
        'sent_to_supplier',
        createdBy,
        'Purchase order sent to supplier'
      );

      console.log(`📝 Created and sent PO ${purchaseOrderId} to ${supplier.name}`);
      return purchaseOrderId;
    } catch (error) {
      console.error('Error creating purchase order:', error);
      return null;
    }
  }

  /**
   * Initiate stock transfer between locations
   */
  async initiateStockTransfer(
    fromLocationId: string,
    toLocationId: string,
    items: Array<{
      sku: string;
      quantity: number;
      batchId?: string;
    }>,
    createdBy: string,
    notes?: string
  ): Promise<string | null> {
    try {
      const transferId = this.generateTransferId();
      
      const transfer: StockTransfer = {
        id: transferId,
        fromLocationId,
        toLocationId,
        status: 'draft',
        transferDate: new Date().toISOString(),
        items: items.map(item => ({
          sku: item.sku,
          name: `Item ${item.sku}`, // Would be looked up
          quantityTransferred: item.quantity,
          unit: 'each', // Would be looked up
          batchId: item.batchId,
          notes: undefined
        })),
        notes,
        createdBy
      };

      // Log transfer initiation
      await this.eventStore.append('inventory.transfer.initiated', {
        transfer
      }, {
        key: `transfer-${transferId}`,
        params: { transferId, fromLocationId, toLocationId },
        aggregate: { id: transferId, type: 'stock_transfer' }
      });

      console.log(`🚚 Initiated stock transfer ${transferId} from ${fromLocationId} to ${toLocationId}`);
      return transferId;
    } catch (error) {
      console.error('Error initiating stock transfer:', error);
      return null;
    }
  }

  /**
   * Process automatic reorder for critical items
   */
  async processAutomaticReorders(): Promise<Array<{ alertId: string; purchaseOrderId: string | null }>> {
    const results: Array<{ alertId: string; purchaseOrderId: string | null }> = [];
    
    try {
      const recommendations = this.reorderManager.getReorderRecommendations();
      const criticalItems = recommendations.filter(rec => rec.urgencyLevel === 'critical');

      for (const item of criticalItems) {
        if (item.primarySupplier) {
          // Find best supplier for the item
          const supplierRecommendation = this.supplierManager.findBestSupplierForItem(
            item.sku,
            item.recommendedOrderQty
          );

          if (supplierRecommendation) {
            const purchaseOrderId = await this.createAndSendPurchaseOrder(
              supplierRecommendation.supplier.id,
              [{
                sku: item.sku,
                quantity: item.recommendedOrderQty,
                estimatedUnitCost: supplierRecommendation.estimatedCost / item.recommendedOrderQty
              }],
              'main', // Default location
              'system', // Automated system
              `Auto-generated for critical stock level: ${item.currentQty} remaining`
            );

            results.push({
              alertId: 'auto', // Would be actual alert ID
              purchaseOrderId
            });

            console.log(`🤖 Auto-created PO ${purchaseOrderId} for critical item ${item.sku}`);
          }
        }
      }

      if (results.length > 0) {
        console.log(`✅ Processed ${results.length} automatic reorders`);
      }

      return results;
    } catch (error) {
      console.error('Error processing automatic reorders:', error);
      return [];
    }
  }

  /**
   * Get cost analysis for inventory
   */
  getCostAnalysis(locationId?: string): {
    totalInventoryValue: number;
    totalWasteValue: number;
    averageCostPerUnit: Record<string, number>;
    costTrends: Array<{
      sku: string;
      itemName: string;
      currentCost: number;
      averageCost: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      variancePercentage: number;
    }>;
  } {
    // This would calculate comprehensive cost analysis
    // For now, returning mock data
    return {
      totalInventoryValue: 12450.75,
      totalWasteValue: 245.30,
      averageCostPerUnit: {
        'BEEF_PATTY': 2.45,
        'BURGER_BUNS': 0.33,
        'FRIES_FROZEN': 1.25
      },
      costTrends: [
        {
          sku: 'BEEF_PATTY',
          itemName: 'Beef Patty (1/4 lb)',
          currentCost: 2.45,
          averageCost: 2.38,
          trend: 'increasing',
          variancePercentage: 2.9
        },
        {
          sku: 'BURGER_BUNS',
          itemName: 'Hamburger Buns',
          currentCost: 0.33,
          averageCost: 0.35,
          trend: 'decreasing',
          variancePercentage: -5.7
        }
      ]
    };
  }

  /**
   * Optimize inventory levels based on analytics
   */
  getInventoryOptimizationRecommendations(): Array<{
    sku: string;
    itemName: string;
    currentReorderPoint: number;
    recommendedReorderPoint: number;
    currentReorderQuantity: number;
    recommendedReorderQuantity: number;
    reasoning: string;
    potentialSavings: number;
  }> {
    // This would analyze usage patterns and optimize reorder parameters
    return [
      {
        sku: 'BEEF_PATTY',
        itemName: 'Beef Patty (1/4 lb)',
        currentReorderPoint: 20,
        recommendedReorderPoint: 25,
        currentReorderQuantity: 100,
        recommendedReorderQuantity: 120,
        reasoning: 'High usage variance requires higher safety stock',
        potentialSavings: 45.50
      }
    ];
  }

  /**
   * Helper methods for dashboard calculations
   */
  private calculateInventoryStatus(): AdvancedInventoryStatus {
    // This would calculate real status from events and current state
    return {
      totalItems: 45,
      totalValue: 12450.75,
      activeReorderAlerts: 3,
      expirationAlerts: 2,
      lowStockItems: 5,
      overStockItems: 1,
      activePurchaseOrders: 2,
      pendingTransfers: 1,
      wasteValue: 245.30,
      turnoverRate: 8.5
    };
  }

  private getActiveReorderAlerts(): ReorderAlert[] {
    // Would get from reorder manager
    return [];
  }

  private getActiveExpirationAlerts(): ExpirationAlert[] {
    // Would get from batch tracker
    return this.batchTracker.getBatchesExpiringSoon().map(batch => ({
      id: `exp_${batch.batchId}`,
      sku: 'BEEF_PATTY', // Would be looked up
      itemName: 'Beef Patty (1/4 lb)',
      batchId: batch.batchId,
      quantity: batch.quantity,
      expirationDate: batch.expirationDate!,
      daysUntilExpiration: Math.ceil(
        (new Date(batch.expirationDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ),
      locationId: 'main',
      status: 'active' as const,
      createdDate: new Date().toISOString(),
      urgencyLevel: 'high' as const
    }));
  }

  private getSupplierPerformanceSummary() {
    return this.supplierManager.getActiveSuppliers().map(supplier => ({
      supplierId: supplier.id,
      name: supplier.name,
      performance: supplier.onTimeDeliveryRate || 0,
      reliability: supplier.onTimeDeliveryRate && supplier.onTimeDeliveryRate >= 90 ? 'excellent' :
                   supplier.onTimeDeliveryRate && supplier.onTimeDeliveryRate >= 75 ? 'good' : 'fair',
      activeOrders: 0 // Would be calculated from active POs
    }));
  }

  private getRecentTransactions() {
    // Would reconstruct from events
    return [
      {
        type: 'received' as const,
        sku: 'BEEF_PATTY',
        quantity: 100,
        timestamp: new Date().toISOString(),
        reference: 'PO12345'
      }
    ];
  }

  private initializeDefaultLocations(): void {
    const defaultLocations: Location[] = [
      {
        id: 'main',
        name: 'Main Restaurant',
        type: 'restaurant',
        isActive: true,
        address: {
          street: '123 Main St',
          city: 'Food City',
          state: 'CA',
          zipCode: '90210',
          country: 'US'
        },
        managerName: 'John Manager',
        phone: '(555) 123-4567'
      }
    ];

    defaultLocations.forEach(location => {
      this.locations.set(location.id, location);
    });
  }

  private generateTransferId(): string {
    return `TXF_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  // Getters for individual managers
  get reorder(): ReorderManager { return this.reorderManager; }
  get suppliers(): SupplierManager { return this.supplierManager; }
  get batches(): BatchTracker { return this.batchTracker; }
}

/**
 * Create advanced inventory service instance
 */
export function createAdvancedInventoryService(eventStore: EventStore): AdvancedInventoryService {
  return new AdvancedInventoryService(eventStore);
}
