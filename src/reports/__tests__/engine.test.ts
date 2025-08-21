import { describe, it, expect } from 'vitest';
import { ZReportEngine } from '../engine';
import type { Event } from '../../events/types';

describe('ZReportEngine', () => {
  const engine = new ZReportEngine();
  
  // Sample events for testing
  const sampleEvents: Event[] = [
    {
      id: 'evt_1',
      seq: 1,
      type: 'sale.recorded',
      at: new Date('2024-01-01T10:00:00.000Z').getTime(),
      aggregate: { id: 'T-001', type: 'ticket' },
      payload: {
        ticketId: 'T-001',
        lines: [
          { name: 'Classic Burger', qty: 1, price: 12.99, taxRate: 0.15 },
          { name: 'French Fries', qty: 1, price: 4.99, taxRate: 0.15 }
        ],
        totals: {
          subtotal: 17.98,
          discount: 0,
          tax: 2.70,
          total: 20.68
        }
      }
    },
    {
      id: 'evt_2',
      seq: 2,
      type: 'sale.recorded',
      at: new Date('2024-01-01T14:30:00.000Z').getTime(),
      aggregate: { id: 'T-002', type: 'ticket' },
      payload: {
        ticketId: 'T-002',
        lines: [
          { name: 'Coffee', qty: 2, price: 3.99, taxRate: 0.10 }
        ],
        totals: {
          subtotal: 7.98,
          discount: 1.00,
          tax: 0.70,
          total: 7.68
        }
      }
    },
    {
      id: 'evt_3',
      seq: 3,
      type: 'payment.succeeded',
      at: new Date('2024-01-01T10:05:00.000Z').getTime(),
      aggregate: { id: 'T-001', type: 'ticket' },
      payload: {
        ticketId: 'T-001',
        provider: 'stripe',
        amount: 20.68,
        currency: 'USD'
      }
    },
    {
      id: 'evt_4',
      seq: 4,
      type: 'payment.succeeded',
      at: new Date('2024-01-01T14:35:00.000Z').getTime(),
      aggregate: { id: 'T-002', type: 'ticket' },
      payload: {
        ticketId: 'T-002',
        provider: 'cash',
        amount: 7.68,
        currency: 'USD'
      }
    }
  ];
  
  it('should generate a complete Z-report', () => {
    const report = engine.generateZReport(sampleEvents, {
      businessDate: '2024-01-01',
      operatorId: 'user-123',
      operatorName: 'Test Operator'
    }, 0);
    
    expect(report.reportId).toBe('Z001-2024-01-01');
    expect(report.reportNumber).toBe(1);
    expect(report.businessDate).toBe('2024-01-01');
    expect(report.operatorId).toBe('user-123');
    expect(report.operatorName).toBe('Test Operator');
    expect(report.status).toBe('draft');
  });
  
  it('should calculate sales summary correctly', () => {
    const report = engine.generateZReport(sampleEvents, {
      businessDate: '2024-01-01',
      operatorId: 'user-123',
      operatorName: 'Test Operator'
    }, 0);
    
    expect(report.salesSummary.grossSales).toBe(25.96); // 17.98 + 7.98
    expect(report.salesSummary.totalDiscounts).toBe(1.00);
    expect(report.salesSummary.netSales).toBe(24.96); // 25.96 - 1.00
    expect(report.salesSummary.totalTax).toBe(3.40); // 2.70 + 0.70
    expect(report.salesSummary.finalTotal).toBe(28.36); // 24.96 + 3.40
    expect(report.salesSummary.transactionCount).toBe(2);
    expect(report.salesSummary.itemCount).toBe(4); // 1 + 1 + 2
    expect(report.salesSummary.averageTicket).toBe(14.18); // 28.36 / 2
  });
  
  it('should calculate payment summary correctly', () => {
    const report = engine.generateZReport(sampleEvents, {
      businessDate: '2024-01-01',
      operatorId: 'user-123',
      operatorName: 'Test Operator'
    }, 0);
    
    expect(report.paymentSummary.cash.count).toBe(1);
    expect(report.paymentSummary.cash.amount).toBe(7.68);
    expect(report.paymentSummary.card.count).toBe(1);
    expect(report.paymentSummary.card.amount).toBe(20.68);
    expect(report.paymentSummary.total.count).toBe(2);
    expect(report.paymentSummary.total.amount).toBe(28.36);
  });
  
  it('should calculate tax summary by rate', () => {
    const report = engine.generateZReport(sampleEvents, {
      businessDate: '2024-01-01',
      operatorId: 'user-123',
      operatorName: 'Test Operator'
    }, 0);
    
    expect(report.taxSummary).toHaveLength(2);
    
    const tax15 = report.taxSummary.find(t => t.rate === 0.15);
    expect(tax15).toBeDefined();
    expect(tax15?.taxableAmount).toBe(17.98);
    expect(tax15?.taxAmount).toBe(2.70); // Approximately 17.98 * 0.15
    
    const tax10 = report.taxSummary.find(t => t.rate === 0.10);
    expect(tax10).toBeDefined();
    expect(tax10?.taxableAmount).toBe(7.98);
    expect(tax10?.taxAmount).toBe(0.80); // Approximately 7.98 * 0.10
  });
  
  it('should calculate top items correctly', () => {
    const report = engine.generateZReport(sampleEvents, {
      businessDate: '2024-01-01',
      operatorId: 'user-123',
      operatorName: 'Test Operator'
    }, 0);
    
    expect(report.topItems).toHaveLength(3);
    
    const burger = report.topItems.find(item => item.name === 'Classic Burger');
    expect(burger).toEqual({
      name: 'Classic Burger',
      quantity: 1,
      revenue: 12.99
    });
    
    const coffee = report.topItems.find(item => item.name === 'Coffee');
    expect(coffee).toEqual({
      name: 'Coffee',
      quantity: 2,
      revenue: 7.98
    });
    
    const fries = report.topItems.find(item => item.name === 'French Fries');
    expect(fries).toEqual({
      name: 'French Fries',
      quantity: 1,
      revenue: 4.99
    });
  });
  
  it('should calculate discount summary correctly', () => {
    const report = engine.generateZReport(sampleEvents, {
      businessDate: '2024-01-01',
      operatorId: 'user-123',
      operatorName: 'Test Operator'
    }, 0);
    
    expect(report.discountSummary.totalDiscounts).toBe(1.00);
    expect(report.discountSummary.discountCount).toBe(1);
    expect(report.discountSummary.manualDiscounts).toBe(1.00);
    expect(report.discountSummary.loyaltyDiscounts).toBe(0);
  });
  
  it('should filter events by business date correctly', () => {
    const nextDayEvents: Event[] = [
      {
        id: 'evt_5',
        seq: 5,
        type: 'sale.recorded',
        at: new Date('2024-01-02T09:00:00.000Z').getTime(),
        aggregate: { id: 'T-003', type: 'ticket' },
        payload: {
          ticketId: 'T-003',
          lines: [{ name: 'Test Item', qty: 1, price: 10.00, taxRate: 0.15 }],
          totals: { subtotal: 10.00, discount: 0, tax: 1.50, total: 11.50 }
        }
      }
    ];
    
    const allEvents = [...sampleEvents, ...nextDayEvents];
    
    // Generate report for Jan 1st - should not include Jan 2nd events
    const jan1Report = engine.generateZReport(allEvents, {
      businessDate: '2024-01-01',
      operatorId: 'user-123',
      operatorName: 'Test Operator'
    }, 0);
    
    expect(jan1Report.salesSummary.transactionCount).toBe(2); // Only Jan 1st sales
    
    // Generate report for Jan 2nd - should only include Jan 2nd events
    const jan2Report = engine.generateZReport(allEvents, {
      businessDate: '2024-01-02',
      operatorId: 'user-123',
      operatorName: 'Test Operator'
    }, 1);
    
    expect(jan2Report.salesSummary.transactionCount).toBe(1); // Only Jan 2nd sales
    expect(jan2Report.reportNumber).toBe(2);
    expect(jan2Report.reportId).toBe('Z002-2024-01-02');
  });
});
