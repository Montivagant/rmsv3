/**
 * Reorder Management System
 * 
 * Handles automatic reorder point detection, alert generation,
 * and purchase order recommendations
 */

import type { EventStore } from '../events/types';
import type {
  InventoryItem,
  ReorderAlert,
  UrgencyLevel,
  PurchaseOrder
} from './types';

export class ReorderManager {
  private eventStore: EventStore;
  private checkIntervalMs: number;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(eventStore: EventStore, checkIntervalMs: number = 60000) { // Check every minute
    this.eventStore = eventStore;
    this.checkIntervalMs = checkIntervalMs;
  }

  /**
   * Start automatic reorder monitoring
   */
  startMonitoring(): void {
    if (this.intervalId) {
      this.stopMonitoring();
    }

    console.log('🔄 Starting reorder monitoring...');
    this.intervalId = setInterval(() => {
      this.checkReorderPoints().catch(error => {
        console.error('Error in reorder monitoring:', error);
      });
    }, this.checkIntervalMs);

    // Run initial check
    this.checkReorderPoints().catch(error => {
      console.error('Error in initial reorder check:', error);
    });
  }

  /**
   * Stop automatic reorder monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Stopped reorder monitoring');
    }
  }

  /**
   * Check all inventory items for reorder points
   */
  async checkReorderPoints(): Promise<ReorderAlert[]> {
    const newAlerts: ReorderAlert[] = [];
    
    try {
      // Get current inventory from events
      const inventory = this.getCurrentInventory();
      const existingAlerts = this.getActiveReorderAlerts();
      
      for (const item of inventory) {
        if (!item.reorderPoint || !item.reorderQuantity) {
          continue; // Skip items without reorder configuration
        }

        // Check if already has active alert
        const hasActiveAlert = existingAlerts.some(alert => 
          alert.sku === item.sku && alert.status === 'active'
        );

        if (hasActiveAlert) {
          continue; // Skip if already alerted
        }

        // Check if below reorder point
        if (item.qty <= item.reorderPoint) {
          const alert = this.createReorderAlert(item);
          newAlerts.push(alert);

          // Log the alert event
          await this.logReorderAlert(alert, true);
        }
      }

      if (newAlerts.length > 0) {
        console.log(`📢 Generated ${newAlerts.length} new reorder alerts`);
      }

      return newAlerts;
    } catch (error) {
      console.error('Error checking reorder points:', error);
      return [];
    }
  }

  /**
   * Create a reorder alert for an inventory item
   */
  private createReorderAlert(item: InventoryItem): ReorderAlert {
    const urgencyLevel = this.calculateUrgencyLevel(item);
    
    return {
      id: this.generateAlertId(),
      sku: item.sku,
      itemName: item.name,
      currentQuantity: item.qty,
      reorderPoint: item.reorderPoint!,
      reorderQuantity: item.reorderQuantity!,
      locationId: 'main', // TODO: Get from inventory location context
      status: 'active',
      createdDate: new Date().toISOString(),
      urgencyLevel
    };
  }

  /**
   * Calculate urgency level based on how far below reorder point
   */
  private calculateUrgencyLevel(item: InventoryItem): UrgencyLevel {
    const currentQty = item.qty;
    const reorderPoint = item.reorderPoint!;
    const percentBelow = ((reorderPoint - currentQty) / reorderPoint) * 100;

    if (currentQty <= 0) {
      return 'critical'; // Out of stock
    } else if (percentBelow >= 75) {
      return 'high'; // Very low stock
    } else if (percentBelow >= 50) {
      return 'medium'; // Moderately low
    } else {
      return 'low'; // Just below reorder point
    }
  }

  /**
   * Acknowledge a reorder alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    try {
      const alerts = this.getActiveReorderAlerts();
      const alert = alerts.find(a => a.id === alertId);
      
      if (!alert) {
        return false;
      }

      // Log acknowledgment event
      await this.eventStore.append('inventory.reorder_alert.acknowledged', {
        alertId,
        acknowledgedBy,
        acknowledgedDate: new Date().toISOString()
      }, {
        key: `reorder-alert-ack-${alertId}`,
        params: { alertId },
        aggregate: { id: alertId, type: 'reorder-alert' }
      });

      return true;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return false;
    }
  }

  /**
   * Dismiss a reorder alert
   */
  async dismissAlert(alertId: string, dismissedBy: string, reason: string): Promise<boolean> {
    try {
      await this.eventStore.append('inventory.reorder_alert.dismissed', {
        alertId,
        dismissedBy,
        reason,
        dismissedDate: new Date().toISOString()
      }, {
        key: `reorder-alert-dismiss-${alertId}`,
        params: { alertId },
        aggregate: { id: alertId, type: 'reorder-alert' }
      });

      return true;
    } catch (error) {
      console.error('Error dismissing alert:', error);
      return false;
    }
  }

  /**
   * Generate automatic purchase order from reorder alert
   */
  async generatePurchaseOrder(
    alertId: string,
    supplierId: string,
    locationId: string,
    createdBy: string,
    notes?: string
  ): Promise<string | null> {
    try {
      const alerts = this.getActiveReorderAlerts();
      const alert = alerts.find(a => a.id === alertId);
      
      if (!alert) {
        throw new Error(`Reorder alert ${alertId} not found`);
      }

      const inventory = this.getCurrentInventory();
      const item = inventory.find(i => i.sku === alert.sku);
      
      if (!item) {
        throw new Error(`Inventory item ${alert.sku} not found`);
      }

      // Calculate estimated cost (would typically come from supplier pricing)
      const estimatedUnitCost = item.lastOrderCost || item.costPerUnit || 0;
      const totalCost = estimatedUnitCost * alert.reorderQuantity;

      const purchaseOrder: PurchaseOrder = {
        id: this.generatePurchaseOrderId(),
        supplierId,
        locationId,
        status: 'draft',
        orderDate: new Date().toISOString(),
        subtotal: totalCost,
        totalAmount: totalCost, // TODO: Add tax calculation
        items: [{
          sku: item.sku,
          name: item.name,
          quantityOrdered: alert.reorderQuantity,
          unitCost: estimatedUnitCost,
          totalCost,
          unit: item.unit || 'each'
        }],
        notes: notes || `Auto-generated from reorder alert ${alertId}`,
        createdBy
      };

      // Log purchase order creation
      await this.logPurchaseOrderCreated(purchaseOrder, alertId);

      // Mark alert as resolved
      await this.resolveAlert(alertId, createdBy);

      return purchaseOrder.id;
    } catch (error) {
      console.error('Error generating purchase order:', error);
      return null;
    }
  }

  /**
   * Get current inventory from event store
   */
  private getCurrentInventory(): InventoryItem[] {
    // This would typically reconstruct inventory from events
    // For now, returning mock data - would integrate with actual inventory engine
    
    // Simplified inventory reconstruction
    const inventory: InventoryItem[] = [
      {
        sku: 'BEEF_PATTY',
        name: 'Beef Patty (1/4 lb)',
        qty: 15, // Below reorder point
        unit: 'pieces',
        reorderPoint: 20,
        reorderQuantity: 100,
        costPerUnit: 2.50,
        lastOrderCost: 2.45,
        primarySupplierId: 'SUPPLIER_001',
        category: 'food_perishable'
      },
      {
        sku: 'BURGER_BUNS',
        name: 'Hamburger Buns',
        qty: 8, // Critical - very low
        unit: 'pieces',
        reorderPoint: 25,
        reorderQuantity: 200,
        costPerUnit: 0.35,
        lastOrderCost: 0.33,
        primarySupplierId: 'SUPPLIER_002',
        category: 'food_perishable'
      },
      {
        sku: 'FRIES_FROZEN',
        name: 'Frozen French Fries',
        qty: 45, // Above reorder point
        unit: 'lbs',
        reorderPoint: 30,
        reorderQuantity: 150,
        costPerUnit: 1.25,
        primarySupplierId: 'SUPPLIER_001',
        category: 'food_non_perishable'
      }
    ];

    return inventory;
  }

  /**
   * Get active reorder alerts from event store
   */
  private getActiveReorderAlerts(): ReorderAlert[] {
    const events = this.eventStore.getAll();
    const alertEvents = events.filter(e => e.type === 'inventory.reorder_alert.created');
    
    // Reconstruct alerts from events (simplified)
    return alertEvents.map(event => (event as any).payload.alert)
      .filter(alert => alert.status === 'active');
  }

  /**
   * Log reorder alert creation event
   */
  private async logReorderAlert(alert: ReorderAlert, automaticallyGenerated: boolean): Promise<void> {
    await this.eventStore.append('inventory.reorder_alert.created', {
      alert,
      automaticallyGenerated
    }, {
      key: `reorder-alert-${alert.id}`,
      params: { alertId: alert.id, sku: alert.sku },
      aggregate: { id: alert.sku, type: 'inventory_item' }
    });
  }

  /**
   * Log purchase order creation event
   */
  private async logPurchaseOrderCreated(purchaseOrder: PurchaseOrder, triggeredByReorderAlert?: string): Promise<void> {
    await this.eventStore.append('inventory.purchase_order.created', {
      purchaseOrder,
      triggeredByReorderAlert
    }, {
      key: `purchase-order-${purchaseOrder.id}`,
      params: { purchaseOrderId: purchaseOrder.id },
      aggregate: { id: purchaseOrder.id, type: 'purchase_order' }
    });
  }

  /**
   * Resolve a reorder alert
   */
  private async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    await this.eventStore.append('inventory.reorder_alert.resolved', {
      alertId,
      resolvedBy,
      resolvedDate: new Date().toISOString()
    }, {
      key: `reorder-alert-resolve-${alertId}`,
      params: { alertId },
      aggregate: { id: alertId, type: 'reorder-alert' }
    });
  }

  /**
   * Get reorder recommendations for all items
   */
  getReorderRecommendations(): Array<{
    sku: string;
    itemName: string;
    currentQty: number;
    reorderPoint: number;
    recommendedOrderQty: number;
    urgencyLevel: UrgencyLevel;
    estimatedCost: number;
    primarySupplier?: string;
  }> {
    const inventory = this.getCurrentInventory();
    
    return inventory
      .filter(item => item.reorderPoint && item.qty <= item.reorderPoint)
      .map(item => {
        const recommendation: {
          sku: string;
          itemName: string;
          currentQty: number;
          reorderPoint: number;
          recommendedOrderQty: number;
          urgencyLevel: UrgencyLevel;
          estimatedCost: number;
          primarySupplier?: string;
        } = {
          sku: item.sku,
          itemName: item.name,
          currentQty: item.qty,
          reorderPoint: item.reorderPoint!,
          recommendedOrderQty: item.reorderQuantity!,
          urgencyLevel: this.calculateUrgencyLevel(item),
          estimatedCost: (item.lastOrderCost || item.costPerUnit || 0) * item.reorderQuantity!,
        };
        if (item.primarySupplierId) {
          recommendation.primarySupplier = item.primarySupplierId;
        }
        return recommendation;
      })
      .sort((a, b) => {
        // Sort by urgency level (critical first)
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel];
      });
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique purchase order ID
   */
  private generatePurchaseOrderId(): string {
    return `PO_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
}

/**
 * Create reorder manager instance
 */
export function createReorderManager(eventStore: EventStore): ReorderManager {
  return new ReorderManager(eventStore);
}
