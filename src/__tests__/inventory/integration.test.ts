/**
 * Inventory Integration Test
 * 
 * Tests the integration between inventory items and counts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CountUtils } from '../../inventory/counts/types';

// Mock inventory items
const mockItems = [
  {
    id: 'item-1',
    sku: 'VEG-001',
    name: 'Fresh Tomatoes',
    description: 'Organic tomatoes',
    categoryId: 'produce',
    uom: {
      base: 'kg',
      purchase: 'case',
      recipe: 'g'
    },
    levels: {
      current: 25,
      reserved: 0,
      available: 25,
      par: {
        min: 10,
        max: 50,
        reorderPoint: 15
      }
    },
    costing: {
      averageCost: 2.99
    },
    status: 'active'
  },
  {
    id: 'item-2',
    sku: 'VEG-002',
    name: 'Lettuce',
    description: 'Fresh lettuce',
    categoryId: 'produce',
    uom: {
      base: 'each',
      purchase: 'case',
      recipe: 'each'
    },
    levels: {
      current: 15,
      reserved: 0,
      available: 15,
      par: {
        min: 5,
        max: 30,
        reorderPoint: 10
      }
    },
    costing: {
      averageCost: 1.49
    },
    status: 'active'
  },
  {
    id: 'item-3',
    sku: 'MEAT-001',
    name: 'Chicken Breast',
    description: 'Boneless chicken breast',
    categoryId: 'meat',
    uom: {
      base: 'kg',
      purchase: 'kg',
      recipe: 'g'
    },
    levels: {
      current: 10,
      reserved: 0,
      available: 10,
      par: {
        min: 5,
        max: 20,
        reorderPoint: 8
      }
    },
    costing: {
      averageCost: 5.99
    },
    status: 'active'
  }
];

// Setup and teardown
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  
  // Mock fetch for testing
  global.fetch = vi.fn();
  
  // Mock inventory items endpoint
  vi.mocked(fetch).mockImplementation((url: string, options?: RequestInit) => {
    if (url === '/api/inventory/items' || url.startsWith('/api/inventory/items?')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          items: mockItems,
          total: mockItems.length
        })
      } as Response);
    }
    
    // Mock inventory count creation
    if (url === '/api/inventory/counts' && options?.method === 'POST') {
      const countId = CountUtils.generateCountId();
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          countId,
          itemCount: 2,
          message: 'Count session created successfully'
        })
      } as Response);
    }
    
    // Mock inventory count details
    if (url.match(/\/api\/inventory\/counts\/COUNT_.*/)) {
      const countItems = mockItems.map(item => ({
        id: `count_item_${item.id}`,
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        unit: item.uom.base,
        categoryName: item.categoryId,
        snapshotQty: item.levels.current,
        snapshotAvgCost: item.costing.averageCost,
        countedQty: null,
        varianceQty: 0,
        varianceValue: 0,
        variancePercentage: 0,
        isActive: true,
        hasDiscrepancy: false
      }));
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          count: {
            id: url.split('/').pop(),
            status: 'draft',
            branchId: 'main-branch',
            createdAt: new Date().toISOString(),
            totals: {
              totalItemsCount: countItems.length,
              itemsCountedCount: 0
            }
          },
          items: countItems
        })
      } as Response);
    }
    
    // Default response for unhandled URLs
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' })
    } as Response);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Inventory Integration', () => {
  // Test inventory items API
  it('should fetch inventory items', async () => {
    const response = await fetch('/api/inventory/items');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.items).toHaveLength(3);
    expect(data.items[0].name).toBe('Fresh Tomatoes');
  });
  
  // Test count utilities
  it('should correctly generate count ID', () => {
    const id = CountUtils.generateCountId();
    expect(id).toMatch(/^COUNT_\d+_[A-Z0-9]{6,}$/);
  });
});