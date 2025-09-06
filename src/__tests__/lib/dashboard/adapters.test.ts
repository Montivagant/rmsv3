import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPercentage,
  formatCount,
  calculateTrend,
  generateSparkline,
  formatRelativeTime,
  ordersAdapter,
  salesAdapter,
  branchHealthAdapter,
  inventoryAlertsAdapter
} from '../../../lib/dashboard/adapters';

describe('Dashboard Adapters', () => {
  describe('Utility Functions', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('EGP 1,235');
      expect(formatCurrency(0)).toBe('EGP 0');
      expect(formatCurrency(1234.56, 'USD')).toBe('US$1,235');
    });

    it('should format percentage correctly', () => {
      expect(formatPercentage(12.345)).toBe('+12.3%');
      expect(formatPercentage(-5.67)).toBe('-5.7%');
      expect(formatPercentage(0)).toBe('+0.0%');
    });

    it('should format count with proper pluralization', () => {
      expect(formatCount(1, 'order')).toBe('1 order');
      expect(formatCount(5, 'order')).toBe('5 orders');
      expect(formatCount(0, 'item')).toBe('0 items');
    });

    it('should calculate trend percentage', () => {
      expect(calculateTrend(120, 100)).toBe(20);
      expect(calculateTrend(80, 100)).toBe(-20);
      expect(calculateTrend(100, 0)).toBe(100);
      expect(calculateTrend(0, 0)).toBe(0);
    });

    it('should generate sparkline data', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const sparkline = generateSparkline(data, 5);
      expect(sparkline).toHaveLength(5);
      expect(sparkline[0]).toBe(1);
      expect(sparkline[sparkline.length - 1]).toBe(10);
    });

    it('should format relative time correctly', () => {
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      
      expect(formatRelativeTime(twoMinutesAgo.toISOString())).toBe('2m ago');
      expect(formatRelativeTime(twoHoursAgo.toISOString())).toBe('2h ago');
    });
  });

  describe('Data Adapters', () => {
    it('should transform order data correctly', () => {
      const mockOrderData = {
        count: 25,
        amount: 5000,
        trend: 15.5
      };

      const result = ordersAdapter.transform(mockOrderData);

      expect(result.title).toBe('Orders');
      expect(result.value).toBe('25');
      expect(result.subtitle).toBe('25 completed orders');
      expect(result.trend).toEqual({
        value: 15.5,
        isPositive: true
      });
      expect(result.link).toBe('/orders/active');
    });

    it('should transform sales data to multiple KPIs', () => {
      const mockSalesData = {
        netSales: 10000,
        netPayments: 9500,
        returns: 300,
        discounts: 500
      };

      const result = salesAdapter.transform(mockSalesData);

      expect(result).toHaveLength(4);
      expect(result[0].title).toBe('Net Sales');
      expect(result[0].value).toContain('10,000');
      expect(result[1].title).toBe('Net Payments');
      expect(result[2].title).toBe('Returns Amount');
      expect(result[3].title).toBe('Discounts Amount');
    });

    it('should transform branch health data', () => {
      const mockBranchData = [
        {
          id: 'main',
          name: 'Main Branch',
          activeOrders: 10,
          activeOrdersAmount: 2500,
          occupiedTables: 8,
          offlineCashiers: 0,
          openTills: 3,
          lastSync: new Date().toISOString(),
          lastOrder: new Date().toISOString(),
          status: 'online'
        }
      ];

      const result = branchHealthAdapter.transform(mockBranchData);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('main');
      expect(result[0].name).toBe('Main Branch');
      expect(result[0].status).toBe('online');
    });

    it('should transform inventory alerts', () => {
      const mockInventoryData = [
        {
          id: 'alert-1',
          type: 'low_stock',
          itemName: 'Burger Buns',
          currentLevel: 5,
          minimumLevel: 20,
          location: 'Kitchen',
          severity: 'high',
          createdAt: new Date().toISOString()
        }
      ];

      const result = inventoryAlertsAdapter.transform(mockInventoryData);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('low_stock');
      expect(result[0].itemName).toBe('Burger Buns');
      expect(result[0].severity).toBe('high');
    });

  });

  describe('Error Handling', () => {
    it('should handle adapter errors gracefully', () => {
      const error = new Error('API Error');
      
      expect(ordersAdapter.transformError(error)).toBe('Failed to load orders data: API Error');
      expect(salesAdapter.transformError('Unknown error')).toBe('Failed to load sales data: Unknown error');
      expect(branchHealthAdapter.transformError(error)).toBe('Failed to load branch data: API Error');
    });
  });
});
