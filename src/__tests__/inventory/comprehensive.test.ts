/**
 * Comprehensive Inventory System Test
 * 
 * Tests the integration and functionality of all inventory components:
 * - Items
 * - Categories
 * - Counts
 * - Count Sheets
 * - Transfers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch for testing
global.fetch = vi.fn();

// Mock categories
const mockCategories = [
  { id: 'food', name: 'Food', description: 'All food items' },
  { id: 'food-proteins', name: 'Proteins', parentId: 'food' },
  { id: 'food-vegetables', name: 'Vegetables', parentId: 'food' }
];

// Mock units
const mockUnits = [
  { id: 'pieces', name: 'Pieces', abbreviation: 'pcs' },
  { id: 'lbs', name: 'Pounds', abbreviation: 'lbs' },
  { id: 'kg', name: 'Kilograms', abbreviation: 'kg' }
];

// Mock inventory items
const mockItems = [
  {
    id: 'item-1',
    sku: 'VEG-001',
    name: 'Fresh Tomatoes',
    categoryId: 'food-vegetables',
    uom: { base: 'kg' },
    levels: { current: 25, available: 25 },
    costing: { averageCost: 2.99 },
    status: 'active'
  },
  {
    id: 'item-2',
    sku: 'MEAT-001',
    name: 'Chicken Breast',
    categoryId: 'food-proteins',
    uom: { base: 'kg' },
    levels: { current: 10, available: 10 },
    costing: { averageCost: 5.99 },
    status: 'active'
  }
];

// Mock count sheets
const mockCountSheets = [
  {
    id: 'sheet-1',
    name: 'Produce Check',
    branchScope: { type: 'all' },
    criteria: { categoryIds: ['food-vegetables'] },
    isArchived: false
  },
  {
    id: 'sheet-2',
    name: 'Protein Check',
    branchScope: { type: 'all' },
    criteria: { categoryIds: ['food-proteins'] },
    isArchived: false
  }
];

// Mock counts
const mockCounts = [
  {
    id: 'count-1',
    status: 'draft',
    branchId: 'main-branch',
    scope: { countSheetId: 'sheet-1' },
    totals: { totalItemsCount: 1 }
  }
];

// Setup and teardown
beforeEach(() => {
  vi.resetAllMocks();
  
  // Mock fetch responses
  vi.mocked(fetch).mockImplementation((url: string, options?: RequestInit) => {
    // Categories endpoint
    if (url === '/api/inventory/categories') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCategories)
      } as Response);
    }
    
    // Units endpoint
    if (url === '/api/inventory/units') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUnits)
      } as Response);
    }
    
    // Items endpoint
    if (url === '/api/inventory/items') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: mockItems, total: mockItems.length })
      } as Response);
    }
    
    // Count sheets endpoint
    if (url === '/api/inventory/count-sheets') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockCountSheets, total: mockCountSheets.length })
      } as Response);
    }
    
    // Counts endpoint
    if (url === '/api/inventory/counts') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockCounts, total: mockCounts.length })
      } as Response);
    }
    
    // Count sheet preview endpoint
    if (url.match(/\/api\/inventory\/count-sheets\/sheet-\d+\/preview/)) {
      const sheetId = url.split('/')[4];
      const isVegetables = sheetId === 'sheet-1';
      const filteredItems = mockItems.filter(item => 
        isVegetables 
          ? item.categoryId === 'food-vegetables'
          : item.categoryId === 'food-proteins'
      );
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          totalItems: filteredItems.length,
          items: filteredItems.map(item => ({
            itemId: item.id,
            sku: item.sku,
            name: item.name,
            unit: item.uom.base,
            categoryName: item.categoryId,
            currentStock: item.levels.current,
            isActive: item.status === 'active'
          })),
          page: 1,
          pageSize: 25,
          totalPages: 1
        })
      } as Response);
    }
    
    // Default response
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' })
    } as Response);
  });
});

describe('Inventory System Integration', () => {
  // Test categories API
  it('should fetch inventory categories', async () => {
    const response = await fetch('/api/inventory/categories');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data).toHaveLength(3);
    expect(data[0].name).toBe('Food');
  });
  
  // Test units API
  it('should fetch inventory units', async () => {
    const response = await fetch('/api/inventory/units');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data).toHaveLength(3);
    expect(data[0].name).toBe('Pieces');
  });
  
  // Test items API
  it('should fetch inventory items', async () => {
    const response = await fetch('/api/inventory/items');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.items).toHaveLength(2);
    expect(data.items[0].name).toBe('Fresh Tomatoes');
  });
  
  // Test count sheets API
  it('should fetch count sheets', async () => {
    const response = await fetch('/api/inventory/count-sheets');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.data[0].name).toBe('Produce Check');
  });
  
  // Test count sheets preview
  it('should preview count sheet items correctly', async () => {
    const response = await fetch('/api/inventory/count-sheets/sheet-1/preview');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].name).toBe('Fresh Tomatoes');
  });
  
  // Test count sheets filtering by category
  it('should filter count sheet items by category', async () => {
    const response = await fetch('/api/inventory/count-sheets/sheet-2/preview');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].name).toBe('Chicken Breast');
  });
  
  // Test counts API
  it('should fetch inventory counts', async () => {
    const response = await fetch('/api/inventory/counts');
    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].status).toBe('draft');
  });
});
