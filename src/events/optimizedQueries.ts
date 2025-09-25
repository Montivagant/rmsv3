/**
 * Optimized Query Utilities
 * 
 * High-performance query functions that leverage indexing and caching
 * for common business operations
 */

import type { OptimizedEventStore } from './optimizedStore';
import type { PaymentSucceededEvent, SaleRecordedEvent } from './types';
import { isSaleRecorded, isPaymentSucceeded } from './guards';

// Loyalty removed

export interface PaymentSummary {
  total: number;
  methods: Record<string, number>;
  count: number;
}

export interface SalesSummary {
  totalRevenue: number;
  totalItems: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface ReportingData {
  sales: SalesSummary;
  payments: PaymentSummary;
  topItems: Array<{ itemId: string; quantity: number; revenue: number }>;
  hourlySales: Array<{ hour: string; revenue: number; orders: number }>;
}

/**
 * Optimized Loyalty Queries
 */
// Loyalty queries removed

/**
 * Optimized Payment Queries
 */
export class PaymentQueries {
  private store: OptimizedEventStore;
  
  constructor(store: OptimizedEventStore) {
    this.store = store;
  }

  /**
   * Get payment status for ticket
   */
  getPaymentStatus(ticketId: string): 'none' | 'pending' | 'paid' | 'failed' {
    const events = this.store.getEventsForAggregate(ticketId);
    
    let hasPaymentSucceeded = false;
    let hasPaymentFailed = false;
    let hasPaymentPending = false;

    for (const event of events) {
      switch (event.type) {
        case 'payment.succeeded':
          hasPaymentSucceeded = true;
          break;
        case 'payment.failed':
          hasPaymentFailed = true;
          break;
        case 'payment.pending':
          hasPaymentPending = true;
          break;
      }
    }

    if (hasPaymentSucceeded) return 'paid';
    if (hasPaymentFailed) return 'failed';
    if (hasPaymentPending) return 'pending';
    return 'none';
  }

  /**
   * Get payment summary for date range
   */
  getPaymentSummary(startDate: Date, endDate: Date): PaymentSummary {
    const events = this.store.getEventsByDateRange(startDate, endDate);
    const paymentEvents = events.filter(isPaymentSucceeded) as PaymentSucceededEvent[];

    let total = 0;
    const methods: Record<string, number> = {};

    for (const event of paymentEvents) {
      total += event.payload.amount;
      const method = event.payload.provider;
      methods[method] = (methods[method] || 0) + event.payload.amount;
    }

    return {
      total,
      methods,
      count: paymentEvents.length
    };
  }
}

/**
 * Optimized Sales Queries
 */
export class SalesQueries {
  private store: OptimizedEventStore;
  
  constructor(store: OptimizedEventStore) {
    this.store = store;
  }

  /**
   * Get sales summary for date range
   */
  getSalesSummary(startDate: Date, endDate: Date): SalesSummary {
    const events = this.store.getEventsByDateRange(startDate, endDate);
    const saleEvents = events.filter(isSaleRecorded) as SaleRecordedEvent[];

    let totalRevenue = 0;
    let totalItems = 0;
    const uniqueOrders = new Set<string>();

    for (const event of saleEvents) {
      totalRevenue += event.payload.totals.total;
      totalItems += event.payload.lines.reduce((sum: number, item: any) => sum + item.qty, 0);
      if (event.aggregate?.id) {
        uniqueOrders.add(event.aggregate.id);
      }
    }

    const totalOrders = uniqueOrders.size;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalItems,
      totalOrders,
      averageOrderValue
    };
  }

  /**
   * Get top selling items
   */
  getTopItems(startDate: Date, endDate: Date, limit: number = 10) {
    const events = this.store.getEventsByDateRange(startDate, endDate);
    const saleEvents = events.filter(isSaleRecorded) as SaleRecordedEvent[];

    const itemMap = new Map<string, { quantity: number; revenue: number }>();

    for (const event of saleEvents) {
      for (const item of event.payload.lines) {
        const itemId = item.sku || item.name;
        const existing = itemMap.get(itemId) || { quantity: 0, revenue: 0 };
        existing.quantity += item.qty;
        existing.revenue += item.price * item.qty;
        itemMap.set(itemId, existing);
      }
    }

    return Array.from(itemMap.entries())
      .map(([itemId, stats]) => ({ itemId, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  /**
   * Get hourly sales breakdown
   */
  getHourlySales(businessDate: string): Array<{ hour: string; revenue: number; orders: number }> {
    const events = this.store.getEventsForBusinessDate(businessDate);
    const saleEvents = events.filter(isSaleRecorded) as SaleRecordedEvent[];

    const hourlyMap = new Map<string, { revenue: number; orders: Set<string> }>();

    for (const event of saleEvents) {
      const hour = new Date(event.at).getHours().toString().padStart(2, '0');
      const existing = hourlyMap.get(hour) || { revenue: 0, orders: new Set() };
      
      existing.revenue += event.payload.totals.total;
      if (event.aggregate?.id) {
        existing.orders.add(event.aggregate.id);
      }
      
      hourlyMap.set(hour, existing);
    }

    const result = [];
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      const data = hourlyMap.get(hour) || { revenue: 0, orders: new Set() };
      result.push({
        hour: `${hour}:00`,
        revenue: data.revenue,
        orders: data.orders.size
      });
    }

    return result;
  }
}

/**
 * Optimized Reporting Queries
 */
export class ReportingQueries {
  private paymentQueries: PaymentQueries;
  private salesQueries: SalesQueries;

  private store: OptimizedEventStore;
  
  constructor(store: OptimizedEventStore) {
    this.store = store;
    this.paymentQueries = new PaymentQueries(store);
    this.salesQueries = new SalesQueries(store);
  }

  /**
   * Get comprehensive reporting data for business date
   */
  getBusinessDateReport(businessDate: string): ReportingData {
    const startOfDay = new Date(`${businessDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${businessDate}T23:59:59.999Z`);

    return {
      sales: this.salesQueries.getSalesSummary(startOfDay, endOfDay),
      payments: this.paymentQueries.getPaymentSummary(startOfDay, endOfDay),
      topItems: this.salesQueries.getTopItems(startOfDay, endOfDay),
      hourlySales: this.salesQueries.getHourlySales(businessDate)
    };
  }

  /**
   * Get performance metrics from the store
   */
  getPerformanceMetrics() {
    return this.store.getMetrics();
  }

  // Expose individual query engines
  // loyalty removed
  get payments() { return this.paymentQueries; }
  get sales() { return this.salesQueries; }
}

/**
 * Create optimized query utilities
 */
export function createOptimizedQueries(store: OptimizedEventStore): ReportingQueries {
  return new ReportingQueries(store);
}
