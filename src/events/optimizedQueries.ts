/**
 * Optimized Query Utilities
 * 
 * High-performance query functions that leverage indexing and caching
 * for common business operations
 */

import type { OptimizedEventStore } from './optimizedStore';
import type { LoyaltyAccruedEvent, LoyaltyRedeemedEvent, PaymentSucceededEvent, SaleRecordedEvent } from './types';
import { isSaleRecorded, isPaymentSucceeded, isLoyaltyAccrued, isLoyaltyRedeemed } from './guards';

export interface LoyaltyBalance {
  customerId: string;
  balance: number;
  totalAccrued: number;
  totalRedeemed: number;
  lastUpdate: number;
}

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
export class LoyaltyQueries {
  constructor(private store: OptimizedEventStore) {}

  /**
   * Get loyalty balance for customer (cached)
   */
  getBalance(customerId: string): LoyaltyBalance {
    const events = this.store.getEventsForAggregate(customerId);
    
    let totalAccrued = 0;
    let totalRedeemed = 0;
    let lastUpdate = 0;

    for (const event of events) {
      if (isLoyaltyAccrued(event)) {
        totalAccrued += event.payload.points;
        lastUpdate = Math.max(lastUpdate, event.at);
      } else if (isLoyaltyRedeemed(event)) {
        totalRedeemed += event.payload.points;
        lastUpdate = Math.max(lastUpdate, event.at);
      }
    }

    return {
      customerId,
      balance: Math.max(0, totalAccrued - totalRedeemed),
      totalAccrued,
      totalRedeemed,
      lastUpdate
    };
  }

  /**
   * Get loyalty transactions for customer
   */
  getTransactions(customerId: string): (LoyaltyAccruedEvent | LoyaltyRedeemedEvent)[] {
    const events = this.store.getEventsForAggregate(customerId);
    return events.filter(event => 
      isLoyaltyAccrued(event) || isLoyaltyRedeemed(event)
    ) as (LoyaltyAccruedEvent | LoyaltyRedeemedEvent)[];
  }

  /**
   * Get top customers by loyalty points
   */
  getTopCustomers(limit: number = 10): LoyaltyBalance[] {
    const accruedEvents = this.store.getEventsByType('loyalty.accrued');
    const redeemedEvents = this.store.getEventsByType('loyalty.redeemed');

    const customerMap = new Map<string, LoyaltyBalance>();

    // Process accrued events
    for (const event of accruedEvents) {
      const customerId = event.payload.customerId;
      const existing = customerMap.get(customerId) || {
        customerId,
        balance: 0,
        totalAccrued: 0,
        totalRedeemed: 0,
        lastUpdate: 0
      };

      existing.totalAccrued += event.payload.points;
      existing.lastUpdate = Math.max(existing.lastUpdate, event.at);
      customerMap.set(customerId, existing);
    }

    // Process redeemed events
    for (const event of redeemedEvents) {
      const customerId = event.payload.customerId;
      const existing = customerMap.get(customerId);
      if (existing) {
        existing.totalRedeemed += event.payload.points;
        existing.lastUpdate = Math.max(existing.lastUpdate, event.at);
      }
    }

    // Calculate final balances and sort
    const customers = Array.from(customerMap.values());
    customers.forEach(customer => {
      customer.balance = Math.max(0, customer.totalAccrued - customer.totalRedeemed);
    });

    return customers
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);
  }
}

/**
 * Optimized Payment Queries
 */
export class PaymentQueries {
  constructor(private store: OptimizedEventStore) {}

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
      const method = event.payload.method;
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
  constructor(private store: OptimizedEventStore) {}

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
      totalRevenue += event.payload.amount;
      totalItems += event.payload.items.reduce((sum, item) => sum + item.quantity, 0);
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
      for (const item of event.payload.items) {
        const existing = itemMap.get(item.id) || { quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        itemMap.set(item.id, existing);
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
      
      existing.revenue += event.payload.amount;
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
  private loyaltyQueries: LoyaltyQueries;
  private paymentQueries: PaymentQueries;
  private salesQueries: SalesQueries;

  constructor(private store: OptimizedEventStore) {
    this.loyaltyQueries = new LoyaltyQueries(store);
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
  get loyalty() { return this.loyaltyQueries; }
  get payments() { return this.paymentQueries; }
  get sales() { return this.salesQueries; }
}

/**
 * Create optimized query utilities
 */
export function createOptimizedQueries(store: OptimizedEventStore): ReportingQueries {
  return new ReportingQueries(store);
}
