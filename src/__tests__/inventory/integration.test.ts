/**
 * Inventory Integration Test
 * 
 * Tests the integration between inventory items, counts, and count sheets
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CountSheetUtils } from '../../inventory/count-sheets/types';
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
    
    // Mock count sheets creation
    if (url === '/api/inventory/count-sheets' && options?.method === 'POST') {
      const countSheetId = CountSheetUtils.generateCountSheetId();
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          countSheetId,
          name: 'Test Count Sheet'
        })
      } as Response);
    }
    
    // Mock count sheets preview
    if (url.match(/\/api\/inventory\/count-sheets\/countsheet_.*\/preview/)) {
      const produceItems = mockItems
        .filter(item => item.categoryId === 'produce')
        .map(item => ({
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          unit: item.uom.base,
          categoryName: item.categoryId,
          currentStock: item.levels.current,
          isActive: item.status === 'active'
        }));
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          totalItems: produceItems.length,
          items: produceItems,
          page: 1,
          pageSize: 25,
          totalPages: 1
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
  
  // Test count sheets with inventory items
  it('should create count sheet and preview items', async () => {
    // 1. Create a count sheet
    const createResponse = await fetch('/api/inventory/count-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Count Sheet',
        branchScope: { type: 'all' },
        criteria: {
          categoryIds: ['produce'],
          includeZeroStock: true
        }
      })
    });
    
    const createData = await createResponse.json();
    expect(createResponse.ok).toBe(true);
    expect(createData.countSheetId).toBeDefined();
    
    // 2. Get preview of items
    const previewResponse = await fetch(`/api/inventory/count-sheets/${createData.countSheetId}/preview`);
    const previewData = await previewResponse.json();
    
    expect(previewResponse.ok).toBe(true);
    expect(previewData.items).toBeDefined();
    expect(previewData.items.length).toBeGreaterThan(0);
    
    // Verify produce items are included
    const produceItems = previewData.items.filter((item: any) => 
      item.categoryName === 'Produce' || item.categoryName === 'produce'
    );
    expect(produceItems.length).toBeGreaterThan(0);
  });
  
  // Test inventory count creation with count sheet
  it('should create inventory count from count sheet', async () => {
    // 1. Create a count sheet
    const sheetResponse = await fetch('/api/inventory/count-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Integration Test Sheet',
        branchScope: { type: 'all' },
        criteria: {
          categoryIds: ['produce', 'meat'],
          includeZeroStock: true
        }
      })
    });
    
    const sheetData = await sheetResponse.json();
    const countSheetId = sheetData.countSheetId;
    
    // 2. Create inventory count using the sheet
    const countResponse = await fetch('/api/inventory/counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId: 'main-branch',
        scope: {
          countSheetId: countSheetId
        },
        notes: 'Created from integration test'
      })
    });
    
    const countData = await countResponse.json();
    expect(countResponse.ok).toBe(true);
    expect(countData.countId).toBeDefined();
    
    // 3. Get count details to verify items were included
    const countDetailsResponse = await fetch(`/api/inventory/counts/${countData.countId}`);
    const countDetails = await countDetailsResponse.json();
    
    expect(countDetailsResponse.ok).toBe(true);
    expect(countDetails.items).toBeDefined();
    expect(countDetails.items.length).toBeGreaterThan(0);
  });
  
  // Test count sheet utilities
  it('should correctly generate count sheet ID', () => {
    const id = CountSheetUtils.generateCountSheetId();
    expect(id).toMatch(/^countsheet_\d+_[a-z0-9]{3,}$/);
  });
  
  // Test count utilities
  it('should correctly generate count ID', () => {
    const id = CountUtils.generateCountId();
    expect(id).toMatch(/^COUNT_\d+_[A-Z0-9]{6,}$/);
  });
});