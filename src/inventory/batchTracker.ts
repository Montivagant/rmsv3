/**
 * Batch Tracking System
 * 
 * Manages batch/lot tracking for food safety compliance,
 * expiration date monitoring, and FIFO/LIFO inventory rotation
 */

import type { EventStore } from '../events/types';
import type {
  BatchInfo,
  ExpirationAlert,
  UrgencyLevel
} from './types';

export type RotationMethod = 'FIFO' | 'LIFO' | 'FEFO'; // First In First Out, Last In First Out, First Expired First Out

export interface BatchConsumption {
  batchId: string;
  quantityConsumed: number;
  consumedDate: string;
  reason: 'sale' | 'waste' | 'transfer' | 'adjustment';
  notes?: string;
}

export interface ExpirationAnalytics {
  totalBatches: number;
  batchesExpiringSoon: number; // Within warning period
  batchesExpired: number;
  totalWasteValue: number;
  wasteByCategory: Record<string, { quantity: number; value: number }>;
  averageShelfLife: number; // Days
  rotationEfficiency: number; // Percentage (0-100)
}

export class BatchTracker {
  private eventStore: EventStore;
  private batches: Map<string, BatchInfo> = new Map();
  private itemBatches: Map<string, string[]> = new Map(); // SKU -> BatchIDs
  private expirationWarningDays: number;
  private checkIntervalMs: number;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    eventStore: EventStore, 
    expirationWarningDays: number = 7,
    checkIntervalMs: number = 3600000 // Check every hour
  ) {
    this.eventStore = eventStore;
    this.expirationWarningDays = expirationWarningDays;
    this.checkIntervalMs = checkIntervalMs;
    this.initializeMockBatches();
  }

  /**
   * Start automatic expiration monitoring
   */
  startExpirationMonitoring(): void {
    if (this.intervalId) {
      this.stopExpirationMonitoring();
    }

    console.log('🔄 Starting batch expiration monitoring...');
    this.intervalId = setInterval(() => {
      this.checkExpirations().catch(error => {
        console.error('Error in expiration monitoring:', error);
      });
    }, this.checkIntervalMs);

    // Run initial check
    this.checkExpirations().catch(error => {
      console.error('Error in initial expiration check:', error);
    });
  }

  /**
   * Stop automatic expiration monitoring
   */
  stopExpirationMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Stopped expiration monitoring');
    }
  }

  /**
   * Add new batch to tracking
   */
  async addBatch(
    sku: string,
    batchInfo: Omit<BatchInfo, 'batchId'>,
    locationId: string = 'main'
  ): Promise<string> {
    const batchId = this.generateBatchId(sku);
    
    const batch: BatchInfo = {
      ...batchInfo,
      batchId,
      isExpired: this.isBatchExpired(batchInfo.expirationDate)
    };

    this.batches.set(batchId, batch);

    // Add to item batch tracking
    const itemBatches = this.itemBatches.get(sku) || [];
    itemBatches.push(batchId);
    this.itemBatches.set(sku, itemBatches);

    // Log batch creation event
    await this.eventStore.append('inventory.batch.created', {
      batchId,
      sku,
      batchInfo: batch,
      locationId
    }, {
      key: `batch-created-${batchId}`,
      params: { batchId, sku },
      aggregate: { id: sku, type: 'inventory_item' }
    });

    console.log(`📦 Added batch ${batchId} for ${sku}: ${batch.quantity} units`);
    return batchId;
  }

  /**
   * Consume from batches using specified rotation method
   */
  async consumeFromBatches(
    sku: string,
    quantity: number,
    rotationMethod: RotationMethod = 'FIFO',
    reason: BatchConsumption['reason'] = 'sale',
    notes?: string
  ): Promise<BatchConsumption[]> {
    const consumptions: BatchConsumption[] = [];
    const itemBatches = this.getAvailableBatchesForItem(sku, rotationMethod);
    
    let remainingQuantity = quantity;

    for (const batch of itemBatches) {
      if (remainingQuantity <= 0) break;

      const consumeFromBatch = Math.min(remainingQuantity, batch.quantity);
      
      if (consumeFromBatch > 0) {
        // Update batch quantity
        batch.quantity -= consumeFromBatch;
        this.batches.set(batch.batchId, batch);

        const consumption: BatchConsumption = {
          batchId: batch.batchId,
          quantityConsumed: consumeFromBatch,
          consumedDate: new Date().toISOString(),
          reason,
          ...(notes && { notes })
        };

        consumptions.push(consumption);
        remainingQuantity -= consumeFromBatch;

        // Log consumption event
        await this.eventStore.append('inventory.batch.consumed', {
          consumption,
          sku,
          remainingBatchQuantity: batch.quantity
        }, {
          key: `batch-consumed-${batch.batchId}-${Date.now()}`,
          params: { batchId: batch.batchId, sku },
          aggregate: { id: sku, type: 'inventory_item' }
        });

        console.log(`📦 Consumed ${consumeFromBatch} from batch ${batch.batchId} (${batch.quantity} remaining)`);
      }
    }

    if (remainingQuantity > 0) {
      console.warn(`⚠️ Could not fulfill full quantity for ${sku}: ${remainingQuantity} units short`);
    }

    return consumptions;
  }

  /**
   * Get available batches for an item, sorted by rotation method
   */
  getAvailableBatchesForItem(sku: string, rotationMethod: RotationMethod = 'FIFO'): BatchInfo[] {
    const batchIds = this.itemBatches.get(sku) || [];
    const batches = batchIds
      .map(id => this.batches.get(id))
      .filter((batch): batch is BatchInfo => 
        batch !== undefined && 
        batch.quantity > 0 && 
        !batch.isExpired
      );

    return this.sortBatchesByRotationMethod(batches, rotationMethod);
  }

  /**
   * Sort batches according to rotation method
   */
  private sortBatchesByRotationMethod(batches: BatchInfo[], method: RotationMethod): BatchInfo[] {
    switch (method) {
      case 'FIFO':
        return batches.sort((a, b) => 
          new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime()
        );
      
      case 'LIFO':
        return batches.sort((a, b) => 
          new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime()
        );
      
      case 'FEFO':
        return batches.sort((a, b) => {
          // First sort by expiration date, then by received date
          if (a.expirationDate && b.expirationDate) {
            const expDiff = new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
            if (expDiff !== 0) return expDiff;
          }
          return new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime();
        });
      
      default:
        return batches;
    }
  }

  /**
   * Check for expiring batches and create alerts
   */
  async checkExpirations(): Promise<ExpirationAlert[]> {
    const alerts: ExpirationAlert[] = [];
    const today = new Date();
    const warningDate = new Date();
    warningDate.setDate(today.getDate() + this.expirationWarningDays);

    for (const batch of this.batches.values()) {
      if (!batch.expirationDate || batch.quantity <= 0) {
        continue;
      }

      const expirationDate = new Date(batch.expirationDate);
      const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Update expired status
      if (daysUntilExpiration <= 0 && !batch.isExpired) {
        batch.isExpired = true;
        this.batches.set(batch.batchId, batch);

        await this.eventStore.append('inventory.batch.expired', {
          batchId: batch.batchId,
          expiredDate: today.toISOString(),
          quantity: batch.quantity
        }, {
          key: `batch-expired-${batch.batchId}`,
          params: { batchId: batch.batchId },
          aggregate: { id: batch.batchId, type: 'batch' }
        });
      }

      // Create expiration alerts for batches expiring soon
      if (daysUntilExpiration <= this.expirationWarningDays && daysUntilExpiration >= 0) {
        
        const alert = this.createExpirationAlert(batch, daysUntilExpiration);
        alerts.push(alert);

        this.logExpirationAlert(alert).catch(err => {
          console.error(`Failed to log expiration alert for batch ${batch.batchId}:`, err);
        });
      }
    }

    if (alerts.length > 0) {
      console.log(`🚨 Generated ${alerts.length} new expiration alerts`);
    }

    return alerts;
  }

  /**
   * Create expiration alert
   */
  private createExpirationAlert(batch: BatchInfo, daysUntilExpiration: number): ExpirationAlert {
    let urgencyLevel: UrgencyLevel;
    if (daysUntilExpiration <= 1) urgencyLevel = 'critical';
    else if (daysUntilExpiration <= 2) urgencyLevel = 'high';
    else if (daysUntilExpiration <= 4) urgencyLevel = 'medium';
    else urgencyLevel = 'low';

    return {
      id: this.generateAlertId(),
      sku: this.getSkuForBatch(batch.batchId) || 'unknown',
      itemName: 'Item Name', // Would be looked up from inventory
      batchId: batch.batchId,
      quantity: batch.quantity,
      expirationDate: batch.expirationDate!,
      daysUntilExpiration,
      locationId: 'main', // Would be tracked per location
      status: 'active',
      createdDate: new Date().toISOString(),
      urgencyLevel
    };
  }

  /**
   * Get expiration analytics
   */
  getExpirationAnalytics(): ExpirationAnalytics {
    const today = new Date();
    const warningDate = new Date();
    warningDate.setDate(today.getDate() + this.expirationWarningDays);

    let totalBatches = 0;
    let batchesExpiringSoon = 0;
    let batchesExpired = 0;
    let totalWasteValue = 0;
    const wasteByCategory: Record<string, { quantity: number; value: number }> = {};
    let totalShelfLifeDays = 0;
    let batchesWithShelfLife = 0;

    for (const batch of this.batches.values()) {
      if (batch.quantity > 0) {
        totalBatches++;

        if (batch.expirationDate) {
          const expirationDate = new Date(batch.expirationDate);
          const receivedDate = new Date(batch.receivedDate);
          
          // Calculate shelf life
          const shelfLifeDays = Math.ceil((expirationDate.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
          if (shelfLifeDays > 0) {
            totalShelfLifeDays += shelfLifeDays;
            batchesWithShelfLife++;
          }

          // Check expiration status
          if (expirationDate <= today) {
            batchesExpired++;
            const wasteValue = batch.quantity * batch.costPerUnit;
            totalWasteValue += wasteValue;
            
            // Categorize waste (would use actual item categories)
            const category = 'perishable'; // Simplified
            if (!wasteByCategory[category]) {
              wasteByCategory[category] = { quantity: 0, value: 0 };
            }
            wasteByCategory[category].quantity += batch.quantity;
            wasteByCategory[category].value += wasteValue;
          } else if (expirationDate <= warningDate) {
            batchesExpiringSoon++;
          }
        }
      }
    }

    const averageShelfLife = batchesWithShelfLife > 0 ? totalShelfLifeDays / batchesWithShelfLife : 0;
    const rotationEfficiency = totalBatches > 0 ? ((totalBatches - batchesExpired) / totalBatches) * 100 : 100;

    return {
      totalBatches,
      batchesExpiringSoon,
      batchesExpired,
      totalWasteValue,
      wasteByCategory,
      averageShelfLife,
      rotationEfficiency
    };
  }

  /**
   * Get batches expiring soon
   */
  getBatchesExpiringSoon(days: number = this.expirationWarningDays): BatchInfo[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return Array.from(this.batches.values()).filter(batch => {
      if (!batch.expirationDate || batch.quantity <= 0 || batch.isExpired) {
        return false;
      }

      const expirationDate = new Date(batch.expirationDate);
      return expirationDate <= cutoffDate;
    }).sort((a, b) => {
      // Sort by expiration date (soonest first)
      return new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime();
    });
  }

  /**
   * Mark batch as waste
   */
  async markBatchAsWaste(
    batchId: string,
    quantity: number,
    reason: string,
    markedBy: string
  ): Promise<boolean> {
    const batch = this.batches.get(batchId);
    if (!batch) {
      return false;
    }

    const wasteQuantity = Math.min(quantity, batch.quantity);
    batch.quantity -= wasteQuantity;
    this.batches.set(batchId, batch);

    await this.eventStore.append('inventory.batch.wasted', {
      batchId,
      wasteQuantity,
      reason,
      markedBy,
      wasteDate: new Date().toISOString(),
      wasteValue: wasteQuantity * batch.costPerUnit
    }, {
      key: `batch-waste-${batchId}-${Date.now()}`,
      params: { batchId },
      aggregate: { id: batchId, type: 'batch' }
    });

    console.log(`🗑️ Marked ${wasteQuantity} units of batch ${batchId} as waste: ${reason}`);
    return true;
  }

  /**
   * Get batch traceability information
   */
  getBatchTraceability(batchId: string): {
    batch: BatchInfo | null;
    consumptions: BatchConsumption[];
    alerts: ExpirationAlert[];
    totalConsumed: number;
    remainingQuantity: number;
  } {
    const batch = this.batches.get(batchId);
    
    // This would reconstruct consumption history from events
    const consumptions: BatchConsumption[] = [];
    const alerts: ExpirationAlert[] = [];
    
    const totalConsumed = consumptions.reduce((sum, c) => sum + c.quantityConsumed, 0);
    const remainingQuantity = batch?.quantity || 0;

    return {
      batch: batch || null,
      consumptions,
      alerts,
      totalConsumed,
      remainingQuantity
    };
  }

  /**
   * Helper methods
   */
  private isBatchExpired(expirationDate?: string): boolean {
    if (!expirationDate) return false;
    return new Date(expirationDate) <= new Date();
  }

  private async logExpirationAlert(alert: ExpirationAlert): Promise<void> {
    await this.eventStore.append('inventory.expiration_alert.created', {
      alert,
      daysUntilExpiration: alert.daysUntilExpiration
    }, {
      key: `expiration-alert-${alert.id}`,
      params: { alertId: alert.id, batchId: alert.batchId },
      aggregate: { id: alert.sku, type: 'inventory_item' }
    });
  }

  private getSkuForBatch(batchId: string): string | null {
    for (const [sku, batchIds] of this.itemBatches.entries()) {
      if (batchIds.includes(batchId)) {
        return sku;
      }
    }
    return null;
  }

  private generateBatchId(sku: string): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${sku}_${date}_${random}`;
  }

  private generateAlertId(): string {
    return `exp_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize mock batch data for demonstration
   */
  private initializeMockBatches(): void {
    const mockBatches: Array<{ sku: string; batch: Omit<BatchInfo, 'batchId'> }> = [
      {
        sku: 'BEEF_PATTY',
        batch: {
          quantity: 50,
          expirationDate: '2024-02-15T00:00:00Z', // Expires soon
          receivedDate: '2024-02-01T10:00:00Z',
          supplierId: 'SUPPLIER_001',
          costPerUnit: 2.45,
          lotNumber: 'LOT_BEEF_240201'
        }
      },
      {
        sku: 'BURGER_BUNS',
        batch: {
          quantity: 25,
          expirationDate: '2024-02-12T00:00:00Z', // Expires very soon
          receivedDate: '2024-02-05T14:00:00Z',
          supplierId: 'SUPPLIER_002',
          costPerUnit: 0.33,
          lotNumber: 'LOT_BUNS_240205'
        }
      },
      {
        sku: 'LETTUCE',
        batch: {
          quantity: 30,
          expirationDate: '2024-02-20T00:00:00Z',
          receivedDate: '2024-02-08T09:00:00Z',
          supplierId: 'SUPPLIER_003',
          costPerUnit: 0.25,
          lotNumber: 'LOT_LETTUCE_240208'
        }
      }
    ];

    mockBatches.forEach(({ sku, batch }) => {
      const batchId = this.generateBatchId(sku);
      const fullBatch: BatchInfo = {
        ...batch,
        batchId,
        isExpired: this.isBatchExpired(batch.expirationDate)
      };

      this.batches.set(batchId, fullBatch);

      // Add to item batch tracking
      const itemBatches = this.itemBatches.get(sku) || [];
      itemBatches.push(batchId);
      this.itemBatches.set(sku, itemBatches);
    });

    console.log(`📦 Initialized ${mockBatches.length} mock batches for demonstration`);
  }
}

/**
 * Create batch tracker instance
 */
export function createBatchTracker(eventStore: EventStore): BatchTracker {
  return new BatchTracker(eventStore);
}
