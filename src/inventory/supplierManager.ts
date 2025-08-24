/**
 * Supplier Management System
 * 
 * Handles supplier information, performance tracking,
 * and purchase order lifecycle management
 */

import type { EventStore } from '../events/types';
import type {
  Supplier,
  PurchaseOrder,
  PurchaseOrderStatus,
  PaymentTerms,
  DayOfWeek,
  LocationAddress,
  InventoryItem
} from './types';

export class SupplierManager {
  private eventStore: EventStore;
  private suppliers: Map<string, Supplier> = new Map();

  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
    this.initializeDefaultSuppliers();
  }

  /**
   * Create a new supplier
   */
  async createSupplier(supplierData: Omit<Supplier, 'id'>): Promise<string> {
    const supplier: Supplier = {
      id: this.generateSupplierId(),
      ...supplierData,
      totalOrdersCount: 0,
      totalOrderValue: 0,
      isActive: true
    };

    this.suppliers.set(supplier.id, supplier);

    // Log supplier creation event
    await this.eventStore.append('inventory.supplier.created', {
      supplier
    }, {
      key: `supplier-created-${supplier.id}`,
      params: { supplierId: supplier.id },
      aggregate: { id: supplier.id, type: 'supplier' }
    });

    return supplier.id;
  }

  /**
   * Update supplier information
   */
  async updateSupplier(supplierId: string, updates: Partial<Supplier>): Promise<boolean> {
    const supplier = this.suppliers.get(supplierId);
    if (!supplier) {
      return false;
    }

    const updatedSupplier = { ...supplier, ...updates };
    this.suppliers.set(supplierId, updatedSupplier);

    // Log supplier update event
    await this.eventStore.append('inventory.supplier.updated', {
      supplierId,
      updates,
      previousData: supplier
    }, {
      key: `supplier-updated-${supplierId}-${Date.now()}`,
      params: { supplierId },
      aggregate: { id: supplierId, type: 'supplier' }
    });

    return true;
  }

  /**
   * Get supplier by ID
   */
  getSupplier(supplierId: string): Supplier | null {
    return this.suppliers.get(supplierId) || null;
  }

  /**
   * Get all suppliers
   */
  getAllSuppliers(): Supplier[] {
    return Array.from(this.suppliers.values());
  }

  /**
   * Get active suppliers only
   */
  getActiveSuppliers(): Supplier[] {
    return this.getAllSuppliers().filter(supplier => supplier.isActive);
  }

  /**
   * Get suppliers by delivery day
   */
  getSuppliersByDeliveryDay(day: DayOfWeek): Supplier[] {
    return this.getActiveSuppliers().filter(supplier => 
      supplier.deliveryDays?.includes(day)
    );
  }

  /**
   * Find best supplier for an item based on cost and performance
   */
  findBestSupplierForItem(sku: string, quantity: number): {
    supplier: Supplier;
    estimatedCost: number;
    estimatedDeliveryDate: string;
    confidence: number;
  } | null {
    const suppliers = this.getActiveSuppliers();
    const candidates = suppliers.map(supplier => {
      const performance = this.calculateSupplierPerformance(supplier);
      const estimatedCost = this.estimateItemCost(supplier.id, sku, quantity);
      const estimatedDeliveryDate = this.estimateDeliveryDate(supplier);
      
      // Calculate confidence score (0-1)
      const confidence = this.calculateSupplierConfidence(supplier, performance);
      
      return {
        supplier,
        estimatedCost,
        estimatedDeliveryDate,
        confidence,
        performance
      };
    }).filter(candidate => candidate.estimatedCost > 0); // Filter out suppliers without pricing

    if (candidates.length === 0) {
      return null;
    }

    // Sort by a combination of cost, performance, and confidence
    candidates.sort((a, b) => {
      const scoreA = this.calculateSupplierScore(a);
      const scoreB = this.calculateSupplierScore(b);
      return scoreB - scoreA; // Higher score is better
    });

    const best = candidates[0];
    return {
      supplier: best.supplier,
      estimatedCost: best.estimatedCost,
      estimatedDeliveryDate: best.estimatedDeliveryDate,
      confidence: best.confidence
    };
  }

  /**
   * Create purchase order
   */
  async createPurchaseOrder(orderData: Omit<PurchaseOrder, 'id' | 'orderDate' | 'status'>): Promise<string> {
    const purchaseOrder: PurchaseOrder = {
      id: this.generatePurchaseOrderId(),
      orderDate: new Date().toISOString(),
      status: 'draft',
      ...orderData
    };

    // Update supplier metrics
    const supplier = this.suppliers.get(orderData.supplierId);
    if (supplier) {
      supplier.totalOrdersCount = (supplier.totalOrdersCount || 0) + 1;
      supplier.totalOrderValue = (supplier.totalOrderValue || 0) + orderData.totalAmount;
      supplier.lastOrderDate = purchaseOrder.orderDate;
    }

    // Log purchase order creation
    await this.eventStore.append('inventory.purchase_order.created', {
      purchaseOrder
    }, {
      key: `purchase-order-${purchaseOrder.id}`,
      params: { purchaseOrderId: purchaseOrder.id, supplierId: orderData.supplierId },
      aggregate: { id: purchaseOrder.id, type: 'purchase_order' }
    });

    return purchaseOrder.id;
  }

  /**
   * Update purchase order status
   */
  async updatePurchaseOrderStatus(
    purchaseOrderId: string,
    status: PurchaseOrderStatus,
    updatedBy: string,
    notes?: string
  ): Promise<boolean> {
    try {
      await this.eventStore.append('inventory.purchase_order.status_updated', {
        purchaseOrderId,
        status,
        updatedBy,
        updatedDate: new Date().toISOString(),
        notes
      }, {
        key: `po-status-${purchaseOrderId}-${Date.now()}`,
        params: { purchaseOrderId, status },
        aggregate: { id: purchaseOrderId, type: 'purchase_order' }
      });

      return true;
    } catch (error) {
      console.error('Error updating purchase order status:', error);
      return false;
    }
  }

  /**
   * Record delivery received
   */
  async recordDelivery(
    purchaseOrderId: string,
    receivedItems: Array<{
      sku: string;
      quantityReceived: number;
      condition: 'good' | 'damaged' | 'expired';
      notes?: string;
    }>,
    receivedBy: string
  ): Promise<boolean> {
    try {
      const actualDeliveryDate = new Date().toISOString();

      await this.eventStore.append('inventory.delivery.received', {
        purchaseOrderId,
        receivedItems,
        receivedBy,
        actualDeliveryDate
      }, {
        key: `delivery-${purchaseOrderId}-${Date.now()}`,
        params: { purchaseOrderId },
        aggregate: { id: purchaseOrderId, type: 'purchase_order' }
      });

      // Update supplier performance metrics
      await this.updateSupplierPerformanceMetrics(purchaseOrderId, actualDeliveryDate);

      return true;
    } catch (error) {
      console.error('Error recording delivery:', error);
      return false;
    }
  }

  /**
   * Get supplier performance metrics
   */
  getSupplierPerformance(supplierId: string): {
    onTimeDeliveryRate: number;
    averageLeadTime: number;
    qualityRating: number;
    totalOrders: number;
    totalValue: number;
    reliability: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const supplier = this.suppliers.get(supplierId);
    if (!supplier) {
      return {
        onTimeDeliveryRate: 0,
        averageLeadTime: 0,
        qualityRating: 0,
        totalOrders: 0,
        totalValue: 0,
        reliability: 'poor'
      };
    }

    const performance = this.calculateSupplierPerformance(supplier);
    
    return {
      onTimeDeliveryRate: supplier.onTimeDeliveryRate || 0,
      averageLeadTime: supplier.averageLeadTime || 0,
      qualityRating: supplier.qualityRating || 0,
      totalOrders: supplier.totalOrdersCount || 0,
      totalValue: supplier.totalOrderValue || 0,
      reliability: performance.reliability
    };
  }

  /**
   * Get purchase order recommendations
   */
  getPurchaseOrderRecommendations(locationId: string): Array<{
    sku: string;
    itemName: string;
    recommendedQuantity: number;
    recommendedSupplier: Supplier;
    estimatedCost: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
  }> {
    // This would integrate with reorder manager to get items needing reorder
    // For now, returning mock recommendations
    const recommendations = [
      {
        sku: 'BEEF_PATTY',
        itemName: 'Beef Patty (1/4 lb)',
        recommendedQuantity: 100,
        recommendedSupplier: this.suppliers.get('SUPPLIER_001')!,
        estimatedCost: 245.00,
        urgency: 'high' as const,
        reason: 'Below reorder point (15 remaining, reorder at 20)'
      },
      {
        sku: 'BURGER_BUNS',
        itemName: 'Hamburger Buns',
        recommendedQuantity: 200,
        recommendedSupplier: this.suppliers.get('SUPPLIER_002')!,
        estimatedCost: 66.00,
        urgency: 'critical' as const,
        reason: 'Critical stock level (8 remaining, reorder at 25)'
      }
    ];

    return recommendations.filter(rec => rec.recommendedSupplier);
  }

  /**
   * Calculate supplier performance score
   */
  private calculateSupplierPerformance(supplier: Supplier): {
    score: number;
    reliability: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const onTimeRate = supplier.onTimeDeliveryRate || 0;
    const qualityRating = supplier.qualityRating || 0;
    const totalOrders = supplier.totalOrdersCount || 0;

    // Calculate weighted score
    let score = 0;
    if (totalOrders > 0) {
      score = (onTimeRate * 0.4) + (qualityRating * 20 * 0.4) + (Math.min(totalOrders / 10, 1) * 20);
    }

    let reliability: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 85) reliability = 'excellent';
    else if (score >= 70) reliability = 'good';
    else if (score >= 50) reliability = 'fair';
    else reliability = 'poor';

    return { score, reliability };
  }

  /**
   * Calculate supplier confidence score
   */
  private calculateSupplierConfidence(supplier: Supplier, performance: { score: number }): number {
    const hasContact = supplier.contactPerson ? 0.2 : 0;
    const hasAddress = supplier.address ? 0.2 : 0;
    const hasPaymentTerms = supplier.paymentTerms ? 0.2 : 0;
    const performanceScore = performance.score / 100 * 0.4;
    
    return hasContact + hasAddress + hasPaymentTerms + performanceScore;
  }

  /**
   * Calculate overall supplier score for ranking
   */
  private calculateSupplierScore(candidate: {
    supplier: Supplier;
    estimatedCost: number;
    confidence: number;
    performance: { score: number };
  }): number {
    // Normalize cost (lower cost is better)
    const costScore = Math.max(0, 100 - (candidate.estimatedCost / 10)); // Arbitrary cost normalization
    
    // Combine metrics with weights
    return (
      candidate.performance.score * 0.4 +  // 40% performance
      costScore * 0.3 +                     // 30% cost
      candidate.confidence * 100 * 0.3      // 30% confidence
    );
  }

  /**
   * Estimate item cost from supplier
   */
  private estimateItemCost(supplierId: string, sku: string, quantity: number): number {
    // This would typically look up actual pricing from supplier catalog
    // For now, using mock pricing based on supplier
    const mockPricing: Record<string, Record<string, number>> = {
      'SUPPLIER_001': {
        'BEEF_PATTY': 2.45,
        'FRIES_FROZEN': 1.20
      },
      'SUPPLIER_002': {
        'BURGER_BUNS': 0.33,
        'TOMATOES': 0.75
      },
      'SUPPLIER_003': {
        'LETTUCE': 0.25,
        'ONIONS': 0.30
      }
    };

    const supplierPricing = mockPricing[supplierId];
    if (!supplierPricing || !supplierPricing[sku]) {
      return 0; // No pricing available
    }

    return supplierPricing[sku] * quantity;
  }

  /**
   * Estimate delivery date based on supplier lead time
   */
  private estimateDeliveryDate(supplier: Supplier): string {
    const leadTimeDays = supplier.leadTimeDays || 3; // Default 3 days
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + leadTimeDays);
    return deliveryDate.toISOString();
  }

  /**
   * Update supplier performance metrics based on delivery
   */
  private async updateSupplierPerformanceMetrics(purchaseOrderId: string, actualDeliveryDate: string): Promise<void> {
    // This would calculate actual vs expected delivery times and update metrics
    // Implementation would analyze purchase order history and delivery patterns
    console.log(`Updating performance metrics for PO ${purchaseOrderId}`);
  }

  /**
   * Initialize default suppliers
   */
  private initializeDefaultSuppliers(): void {
    const defaultSuppliers: Supplier[] = [
      {
        id: 'SUPPLIER_001',
        name: 'Premium Meat Supply Co.',
        contactPerson: 'John Smith',
        email: 'orders@premiummeat.com',
        phone: '(555) 123-4567',
        address: {
          street: '123 Industrial Way',
          city: 'Food City',
          state: 'CA',
          zipCode: '90210',
          country: 'US'
        },
        paymentTerms: 'net_30',
        leadTimeDays: 2,
        minimumOrderAmount: 200,
        deliveryDays: ['monday', 'wednesday', 'friday'],
        isActive: true,
        rating: 4.5,
        onTimeDeliveryRate: 95,
        qualityRating: 4.8,
        averageLeadTime: 1.8,
        totalOrdersCount: 45,
        totalOrderValue: 12500
      },
      {
        id: 'SUPPLIER_002',
        name: 'Fresh Bakery Supplies',
        contactPerson: 'Maria Garcia',
        email: 'sales@freshbakery.com',
        phone: '(555) 234-5678',
        address: {
          street: '456 Bakery Lane',
          city: 'Bread Town',
          state: 'CA',
          zipCode: '90211',
          country: 'US'
        },
        paymentTerms: 'net_15',
        leadTimeDays: 1,
        minimumOrderAmount: 100,
        deliveryDays: ['tuesday', 'thursday', 'saturday'],
        isActive: true,
        rating: 4.3,
        onTimeDeliveryRate: 88,
        qualityRating: 4.5,
        averageLeadTime: 1.2,
        totalOrdersCount: 32,
        totalOrderValue: 5600
      },
      {
        id: 'SUPPLIER_003',
        name: 'Valley Fresh Produce',
        contactPerson: 'David Wong',
        email: 'david@valleyfresh.com',
        phone: '(555) 345-6789',
        address: {
          street: '789 Farm Road',
          city: 'Green Valley',
          state: 'CA',
          zipCode: '90212',
          country: 'US'
        },
        paymentTerms: 'cash_on_delivery',
        leadTimeDays: 1,
        minimumOrderAmount: 50,
        deliveryDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        isActive: true,
        rating: 4.0,
        onTimeDeliveryRate: 78,
        qualityRating: 4.2,
        averageLeadTime: 1.5,
        totalOrdersCount: 28,
        totalOrderValue: 3200
      }
    ];

    defaultSuppliers.forEach(supplier => {
      this.suppliers.set(supplier.id, supplier);
    });

    console.log(`📦 Initialized ${defaultSuppliers.length} default suppliers`);
  }

  /**
   * Generate unique supplier ID
   */
  private generateSupplierId(): string {
    return `SUPPLIER_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  /**
   * Generate unique purchase order ID
   */
  private generatePurchaseOrderId(): string {
    return `PO${Date.now().toString().substr(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }
}

/**
 * Create supplier manager instance
 */
export function createSupplierManager(eventStore: EventStore): SupplierManager {
  return new SupplierManager(eventStore);
}
