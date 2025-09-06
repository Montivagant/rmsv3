import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { inventoryCountApiHandlers, countApiService } from '../../inventory/counts/api';
import type { CreateCountRequest } from '../../inventory/counts/types';

// Setup MSW server with count handlers
const server = setupServer(...inventoryCountApiHandlers);

describe('Inventory Count API', () => {
  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('Count Creation', () => {
    it('should create count session successfully', async () => {
      const request: CreateCountRequest = {
        branchId: 'main-restaurant',
        scope: { all: true },
        notes: 'Test count session',
        estimatedDurationMinutes: 90
      };

      const result = await countApiService.createCount(request);
      
      expect(result.countId).toMatch(/^COUNT_\d+_[A-Z0-9]{6}$/);
      expect(result.itemCount).toBeGreaterThan(0);
    });

    it('should reject count creation without branch', async () => {
      const request: CreateCountRequest = {
        branchId: '', // Invalid
        scope: { all: true }
      };

      await expect(countApiService.createCount(request)).rejects.toThrow('branchId is required');
    });

    it('should create filtered count session', async () => {
      const request: CreateCountRequest = {
        branchId: 'main-restaurant',
        scope: {
          filters: {
            categoryIds: ['produce', 'meat'],
            includeInactive: false
          }
        },
        estimatedDurationMinutes: 60
      };

      const result = await countApiService.createCount(request);
      
      expect(result.countId).toBeDefined();
      expect(result.itemCount).toBeGreaterThan(0);
      expect(result.itemCount).toBeLessThan(500); // Should be filtered subset
    });
  });

  describe('Count Data Management', () => {
    it('should retrieve count session details', async () => {
      // First create a count
      const createRequest: CreateCountRequest = {
        branchId: 'main-restaurant',
        scope: { all: true }
      };

      const created = await countApiService.createCount(createRequest);
      
      // Then retrieve it
      const result = await countApiService.getCount(created.countId);
      
      expect(result.count.id).toBe(created.countId);
      expect(result.count.branchId).toBe('main-restaurant');
      expect(result.count.status).toBe('draft');
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBe(created.itemCount);
    });

    it('should update count item quantities', async () => {
      // Create count session
      const created = await countApiService.createCount({
        branchId: 'main-restaurant',
        scope: { all: true }
      });

      // Get initial count data
      const initial = await countApiService.getCount(created.countId);
      const firstItem = initial.items[0];

      // Update count quantities
      const updates = [
        {
          itemId: firstItem.itemId,
          countedQty: firstItem.snapshotQty + 5, // Add 5 to create variance
          notes: 'Found extra inventory'
        }
      ];

      const updateResult = await countApiService.updateCountItems(created.countId, updates);
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.updatedCount).toBe(1);
      expect(updateResult.totals).toBeDefined();
      expect(updateResult.totals.itemsCountedCount).toBe(1);
    });

    it('should calculate variances correctly after updates', async () => {
      // Create and update count
      const created = await countApiService.createCount({
        branchId: 'main-restaurant',
        scope: { all: true }
      });

      const initial = await countApiService.getCount(created.countId);
      const testItem = initial.items[0];

      // Update with known variance
      await countApiService.updateCountItems(created.countId, [
        {
          itemId: testItem.itemId,
          countedQty: testItem.snapshotQty - 10, // Create -10 variance
          notes: 'Missing inventory'
        }
      ]);

      // Get updated data and verify variance calculation
      const updated = await countApiService.getCount(created.countId);
      const updatedItem = updated.items.find(item => item.itemId === testItem.itemId)!;
      
      expect(updatedItem.countedQty).toBe(testItem.snapshotQty - 10);
      expect(updatedItem.varianceQty).toBe(-10);
      expect(updatedItem.varianceValue).toBe(-10 * testItem.snapshotAvgCost);
      expect(updatedItem.countedBy).toBe('current-user');
      expect(updatedItem.countedAt).toBeDefined();
    });
  });

  describe('Count Submission', () => {
    it('should submit count and create adjustments', async () => {
      // Create count and add some counted items
      const created = await countApiService.createCount({
        branchId: 'main-restaurant',
        scope: { all: true }
      });

      const initial = await countApiService.getCount(created.countId);
      
      // Update a few items with variances
      await countApiService.updateCountItems(created.countId, [
        {
          itemId: initial.items[0].itemId,
          countedQty: initial.items[0].snapshotQty + 5,
          notes: 'Found extra'
        },
        {
          itemId: initial.items[1].itemId,
          countedQty: initial.items[1].snapshotQty - 3,
          notes: 'Missing items'
        }
      ]);

      // Submit the count
      const submitResult = await countApiService.submitCount(created.countId, {
        confirmation: true,
        submissionNotes: 'Test submission'
      });

      expect(submitResult.adjustmentBatchId).toMatch(/^COUNTADJ_/);
      expect(submitResult.adjustments).toHaveLength(2);
      expect(submitResult.summary.totalAdjustments).toBe(2);
      expect(submitResult.summary.positiveAdjustments).toBe(1);
      expect(submitResult.summary.negativeAdjustments).toBe(1);
    });

    it('should reject submission with no counted items', async () => {
      const created = await countApiService.createCount({
        branchId: 'main-restaurant',
        scope: { all: true }
      });

      await expect(
        countApiService.submitCount(created.countId, { confirmation: true })
      ).rejects.toThrow('At least one item must be counted before submission');
    });

    it('should handle count cancellation', async () => {
      const created = await countApiService.createCount({
        branchId: 'main-restaurant',
        scope: { all: true }
      });

      await expect(
        countApiService.cancelCount(created.countId, {
          reason: 'Test cancellation',
          notes: 'Testing cancel functionality'
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Count Export', () => {
    it('should export count results as CSV', async () => {
      // Create and submit count
      const created = await countApiService.createCount({
        branchId: 'main-restaurant',
        scope: { all: true }
      });

      // Export the results
      const response = await fetch(`/api/inventory/counts/${created.countId}/export?format=csv`);
      
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toBe('text/csv');
      
      const csvContent = await response.text();
      expect(csvContent).toContain('SKU,Item Name,Unit,Theoretical Qty');
    });
  });

  describe('Count Filtering and Pagination', () => {
    it('should filter counts by status', async () => {
      const response = await fetch('/api/inventory/counts?status=draft');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.data).toBeInstanceOf(Array);
      // All returned counts should have draft status
      data.data.forEach((count: any) => {
        expect(count.status).toBe('draft');
      });
    });

    it('should filter counts by branch', async () => {
      const response = await fetch('/api/inventory/counts?branchId=main-restaurant');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.data).toBeInstanceOf(Array);
      data.data.forEach((count: any) => {
        expect(count.branchId).toBe('main-restaurant');
      });
    });

    it('should support pagination', async () => {
      const response = await fetch('/api/inventory/counts?page=1&pageSize=10');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(10);
      expect(data.data.length).toBeLessThanOrEqual(10);
    });

    it('should support search functionality', async () => {
      const response = await fetch('/api/inventory/counts?search=beverage');
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.data).toBeInstanceOf(Array);
    });
  });
});
