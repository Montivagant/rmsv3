import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryCountService } from '../../inventory/counts/service';
import { CountUtils } from '../../inventory/counts/types';
import type { 
  CreateCountRequest, 
  CountItem, 
  InventoryCount 
} from '../../inventory/counts/types';
import type { EventStore } from '../../events/types';

// Mock event store
const mockEventStore: EventStore = {
  append: vi.fn(),
  query: vi.fn(),
  getAll: vi.fn(),
  reset: vi.fn()
};

describe('InventoryCountService', () => {
  let service: InventoryCountService;

  beforeEach(() => {
    service = new InventoryCountService(mockEventStore);
    vi.clearAllMocks();
  });

  describe('CountUtils', () => {
    describe('calculateVariancePercentage', () => {
      it('should calculate positive variance correctly', () => {
        const result = CountUtils.calculateVariancePercentage(110, 100);
        expect(result).toBe(10);
      });

      it('should calculate negative variance correctly', () => {
        const result = CountUtils.calculateVariancePercentage(90, 100);
        expect(result).toBe(-10);
      });

      it('should handle zero theoretical quantity', () => {
        const result = CountUtils.calculateVariancePercentage(5, 0);
        expect(result).toBe(100);
      });

      it('should handle zero counted when theoretical is zero', () => {
        const result = CountUtils.calculateVariancePercentage(0, 0);
        expect(result).toBe(0);
      });
    });

    describe('getVarianceSeverity', () => {
      it('should classify low variance correctly', () => {
        const result = CountUtils.getVarianceSeverity(3);
        expect(result).toBe('low');
      });

      it('should classify medium variance correctly', () => {
        const result = CountUtils.getVarianceSeverity(12);
        expect(result).toBe('medium');
      });

      it('should classify high variance correctly', () => {
        const result = CountUtils.getVarianceSeverity(25);
        expect(result).toBe('high');
      });

      it('should handle negative variances', () => {
        const result = CountUtils.getVarianceSeverity(-18);
        expect(result).toBe('high');
      });
    });

    describe('formatVariance', () => {
      it('should format positive variance with sign', () => {
        const result = CountUtils.formatVariance(1234.56, true);
        expect(result).toBe('+1,234.56');
      });

      it('should format negative variance with sign', () => {
        const result = CountUtils.formatVariance(-1234.56, true);
        expect(result).toBe('-1,234.56');
      });

      it('should format without sign when requested', () => {
        const result = CountUtils.formatVariance(-1234.56, false);
        expect(result).toBe('1,234.56');
      });
    });

    describe('formatVarianceValue', () => {
      it('should format positive currency variance', () => {
        const result = CountUtils.formatVarianceValue(123.45);
        expect(result).toBe('+$123.45');
      });

      it('should format negative currency variance', () => {
        const result = CountUtils.formatVarianceValue(-123.45);
        expect(result).toBe('-$123.45');
      });
    });

    describe('validateCountScope', () => {
      it('should validate all items scope', () => {
        const result = CountUtils.validateCountScope({ all: true });
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate filtered scope with categories', () => {
        const result = CountUtils.validateCountScope({
          filters: { categoryIds: ['produce', 'meat'] }
        });
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty filtered scope', () => {
        const result = CountUtils.validateCountScope({
          filters: {}
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('At least one filter must be specified when using filtered scope');
      });

      it('should reject invalid scope', () => {
        const result = CountUtils.validateCountScope({});
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Must specify count scope: all items, filters, or import');
      });
    });

    describe('generateCountId', () => {
      it('should generate valid count ID format', () => {
        const id = CountUtils.generateCountId();
        expect(id).toMatch(/^COUNT_\d+_[A-Z0-9]{6}$/);
      });

      it('should generate unique IDs', () => {
        const id1 = CountUtils.generateCountId();
        const id2 = CountUtils.generateCountId();
        expect(id1).not.toBe(id2);
      });
    });
  });

  describe('InventoryCountService', () => {
    describe('calculateItemVariance', () => {
      it('should calculate variance correctly for counted item', () => {
        const item = {
          id: 'test',
          itemId: 'item1',
          sku: 'TEST001',
          name: 'Test Item',
          unit: 'pieces',
          snapshotQty: 100,
          snapshotAvgCost: 5.00,
          snapshotTimestamp: '2024-01-01T00:00:00Z',
          countedQty: 95,
          isActive: true
        };

        const result = CountUtils.calculateItemVariance(item);
        
        expect(result.varianceQty).toBe(-5);
        expect(result.varianceValue).toBe(-25.00);
        expect(result.variancePercentage).toBe(-5);
        expect(result.hasDiscrepancy).toBe(false); // Below 10% threshold
      });

      it('should identify significant discrepancies', () => {
        const item = {
          id: 'test',
          itemId: 'item1', 
          sku: 'TEST001',
          name: 'Test Item',
          unit: 'pieces',
          snapshotQty: 100,
          snapshotAvgCost: 5.00,
          snapshotTimestamp: '2024-01-01T00:00:00Z',
          countedQty: 80, // 20% variance
          isActive: true
        };

        const result = CountUtils.calculateItemVariance(item);
        
        expect(result.varianceQty).toBe(-20);
        expect(result.varianceValue).toBe(-100.00);
        expect(result.variancePercentage).toBe(-20);
        expect(result.hasDiscrepancy).toBe(true); // Above 10% threshold
      });

      it('should handle uncounted items', () => {
        const item = {
          id: 'test',
          itemId: 'item1',
          sku: 'TEST001', 
          name: 'Test Item',
          unit: 'pieces',
          snapshotQty: 100,
          snapshotAvgCost: 5.00,
          snapshotTimestamp: '2024-01-01T00:00:00Z',
          countedQty: null,
          isActive: true
        };

        const result = CountUtils.calculateItemVariance(item);
        
        expect(result.varianceQty).toBe(0);
        expect(result.varianceValue).toBe(0);
        expect(result.variancePercentage).toBe(0);
        expect(result.hasDiscrepancy).toBe(false);
      });
    });

    describe('calculateCountTotals', () => {
      it('should calculate totals correctly', () => {
        const items: CountItem[] = [
          {
            id: '1', itemId: 'item1', sku: 'TEST001', name: 'Item 1', unit: 'pieces',
            snapshotQty: 100, snapshotAvgCost: 5.00, snapshotTimestamp: '2024-01-01T00:00:00Z',
            countedQty: 95, varianceQty: -5, varianceValue: -25.00, variancePercentage: -5,
            isActive: true, hasDiscrepancy: false
          },
          {
            id: '2', itemId: 'item2', sku: 'TEST002', name: 'Item 2', unit: 'kg',
            snapshotQty: 50, snapshotAvgCost: 10.00, snapshotTimestamp: '2024-01-01T00:00:00Z',
            countedQty: 55, varianceQty: 5, varianceValue: 50.00, variancePercentage: 10,
            isActive: true, hasDiscrepancy: false
          },
          {
            id: '3', itemId: 'item3', sku: 'TEST003', name: 'Item 3', unit: 'pieces',
            snapshotQty: 75, snapshotAvgCost: 2.00, snapshotTimestamp: '2024-01-01T00:00:00Z',
            countedQty: null, varianceQty: 0, varianceValue: 0, variancePercentage: 0,
            isActive: true, hasDiscrepancy: false
          }
        ];

        const totals = service.calculateCountTotals(items);

        expect(totals.varianceQty).toBe(0); // -5 + 5 + 0
        expect(totals.varianceValue).toBe(25.00); // -25 + 50 + 0  
        expect(totals.itemsCountedCount).toBe(2);
        expect(totals.totalItemsCount).toBe(3);
        expect(totals.positiveVarianceValue).toBe(50.00);
        expect(totals.negativeVarianceValue).toBe(25.00);
      });
    });

    describe('validateCountSubmission', () => {
      it('should validate successful submission requirements', () => {
        const count: InventoryCount = {
          id: 'test-count',
          branchId: 'branch1',
          status: 'draft',
          createdBy: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
          scope: { all: true },
          totals: {
            varianceQty: 0,
            varianceValue: 0,
            itemsCountedCount: 2,
            totalItemsCount: 5,
            positiveVarianceValue: 0,
            negativeVarianceValue: 0
          },
          metadata: {}
        };

        const items: CountItem[] = [
          {
            id: '1', itemId: 'item1', sku: 'TEST001', name: 'Item 1', unit: 'pieces',
            snapshotQty: 100, snapshotAvgCost: 5.00, snapshotTimestamp: '2024-01-01T00:00:00Z',
            countedQty: 95, varianceQty: -5, varianceValue: -25.00, variancePercentage: -5,
            isActive: true, hasDiscrepancy: false
          },
          {
            id: '2', itemId: 'item2', sku: 'TEST002', name: 'Item 2', unit: 'kg',
            snapshotQty: 50, snapshotAvgCost: 10.00, snapshotTimestamp: '2024-01-01T00:00:00Z',
            countedQty: 55, varianceQty: 5, varianceValue: 50.00, variancePercentage: 10,
            isActive: true, hasDiscrepancy: false
          }
        ];

        const result = service.validateCountSubmission(count, items);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject submission with no counted items', () => {
        const count: InventoryCount = {
          id: 'test-count',
          branchId: 'branch1', 
          status: 'draft',
          createdBy: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
          scope: { all: true },
          totals: {
            varianceQty: 0,
            varianceValue: 0,
            itemsCountedCount: 0,
            totalItemsCount: 5,
            positiveVarianceValue: 0,
            negativeVarianceValue: 0
          },
          metadata: {}
        };

        const items: CountItem[] = [
          {
            id: '1', itemId: 'item1', sku: 'TEST001', name: 'Item 1', unit: 'pieces',
            snapshotQty: 100, snapshotAvgCost: 5.00, snapshotTimestamp: '2024-01-01T00:00:00Z',
            countedQty: null, varianceQty: 0, varianceValue: 0, variancePercentage: 0,
            isActive: true, hasDiscrepancy: false
          }
        ];

        const result = service.validateCountSubmission(count, items);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('At least one item must be counted before submission');
      });

      it('should reject submission of closed count', () => {
        const count: InventoryCount = {
          id: 'test-count',
          branchId: 'branch1',
          status: 'closed', // Already closed
          createdBy: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
          scope: { all: true },
          totals: {
            varianceQty: 0,
            varianceValue: 0,
            itemsCountedCount: 1,
            totalItemsCount: 1,
            positiveVarianceValue: 0,
            negativeVarianceValue: 0
          },
          metadata: {}
        };

        const items: CountItem[] = []; // Empty for this test

        const result = service.validateCountSubmission(count, items);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Count must be in draft or open status to submit');
      });

      it('should warn about large variances', () => {
        const count: InventoryCount = {
          id: 'test-count',
          branchId: 'branch1',
          status: 'draft',
          createdBy: 'user1',
          createdAt: '2024-01-01T00:00:00Z',
          scope: { all: true },
          totals: {
            varianceQty: 0,
            varianceValue: 0,
            itemsCountedCount: 1,
            totalItemsCount: 1,
            positiveVarianceValue: 0,
            negativeVarianceValue: 0
          },
          metadata: {}
        };

        const items: CountItem[] = [
          {
            id: '1', itemId: 'item1', sku: 'TEST001', name: 'Item 1', unit: 'pieces',
            snapshotQty: 100, snapshotAvgCost: 5.00, snapshotTimestamp: '2024-01-01T00:00:00Z',
            countedQty: 75, varianceQty: -25, varianceValue: -125.00, variancePercentage: -25, // 25% variance
            isActive: true, hasDiscrepancy: true
          }
        ];

        const result = service.validateCountSubmission(count, items);

        expect(result.isValid).toBe(true); // Valid but with warnings
        expect(result.warnings).toContain('1 items have variances exceeding 10%');
      });
    });
  });

  describe('Variance Calculation Integration', () => {
    it('should maintain precision in variance calculations', () => {
      const item = {
        id: 'precision-test',
        itemId: 'item1',
        sku: 'PRECISION001',
        name: 'Precision Test Item',
        unit: 'kg',
        snapshotQty: 33.33,
        snapshotAvgCost: 7.77,
        snapshotTimestamp: '2024-01-01T00:00:00Z',
        countedQty: 31.11,
        isActive: true
      };

      const result = service.calculateItemVariance(item);
      
      // Verify precision is maintained
      expect(result.varianceQty).toBe(-2.22);
      expect(result.varianceValue).toBe(-17.25); // -2.22 * 7.77, rounded
      expect(result.variancePercentage).toBe(-6.66); // (-2.22 / 33.33) * 100, rounded
    });

    it('should handle edge case of zero cost items', () => {
      const item = {
        id: 'zero-cost-test',
        itemId: 'item1',
        sku: 'ZERO001',
        name: 'Zero Cost Item',
        unit: 'pieces',
        snapshotQty: 100,
        snapshotAvgCost: 0, // Zero cost
        snapshotTimestamp: '2024-01-01T00:00:00Z',
        countedQty: 90,
        isActive: true
      };

      const result = service.calculateItemVariance(item);
      
      expect(result.varianceQty).toBe(-10);
      expect(result.varianceValue).toBe(-0); // JavaScript -0 vs 0 quirk
      expect(result.variancePercentage).toBe(-10);
    });
  });
});
