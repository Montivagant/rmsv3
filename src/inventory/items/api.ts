/**
 * Enhanced Inventory Items API
 * 
 * HTTP handlers for comprehensive inventory item management with
 * UOM conversions, lot tracking, and advanced filtering.
 */

import { http, HttpResponse } from 'msw';
import type { 
  InventoryItem,
  InventoryMovement,
  ReorderAlert,
  InventoryAnalytics,
  UnitOfMeasure,
  StorageLocation
} from './types';
import { DEFAULT_UNITS, DEFAULT_STORAGE_LOCATIONS } from './types';

// Enhanced mock data store
const mockInventoryItems = new Map<string, InventoryItem>();
const mockMovements = new Map<string, InventoryMovement>();
const mockAlerts = new Map<string, ReorderAlert>();
const mockUnits = new Map<string, UnitOfMeasure>();
const mockLocations = new Map<string, StorageLocation>();
let nextItemId = 1;
let nextMovementId = 1;
const nextAlertId = 1;

// Initialize default data
function initializeMockData() {
  // Initialize units
  for (const unit of DEFAULT_UNITS) {
    mockUnits.set(unit.id, unit);
  }

  // Initialize storage locations
  DEFAULT_STORAGE_LOCATIONS.forEach((location, index) => {
    const id = `loc_${index + 1}`;
    mockLocations.set(id, { ...location, id });
  });

  // Initialize sample inventory items
  const sampleItems: Partial<InventoryItem>[] = [
    {
      sku: 'BEEF-001',
      name: 'Ground Beef 80/20',
      categoryId: 'food-proteins',
      uom: {
        base: 'lb',
        purchase: 'case',
        recipe: 'oz',
        conversions: []
      },
      tracking: {
        lotTracking: true,
        expiryTracking: true,
        serialTracking: false,
        trackByLocation: true
      },
      levels: {
        current: 25,
        reserved: 5,
        available: 20,
        onOrder: 0,
        par: {
          min: 10,
          max: 50,
          reorderPoint: 15,
          reorderQuantity: 30
        }
      },
      costing: {
        averageCost: 4.99,
        lastCost: 5.25,
        currency: 'USD',
        costMethod: 'AVERAGE'
      },
      quality: {
        shelfLifeDays: 3,
        allergens: [],
        certifications: [],
        hazmat: false
      },
      flags: {
        isCritical: true,
        isPerishable: true,
        isControlled: false,
        isRecipe: false,
        isRawMaterial: true,
        isFinishedGood: false
      },
      status: 'active'
    },
    {
      sku: 'TOMATO-001',
      name: 'Roma Tomatoes',
      categoryId: 'food-vegetables',
      uom: {
        base: 'lb',
        purchase: 'case',
        recipe: 'piece',
        conversions: []
      },
      tracking: {
        lotTracking: false,
        expiryTracking: true,
        serialTracking: false,
        trackByLocation: false
      },
      levels: {
        current: 15,
        reserved: 2,
        available: 13,
        onOrder: 20,
        par: {
          min: 5,
          max: 30,
          reorderPoint: 8,
          reorderQuantity: 25
        }
      },
      costing: {
        averageCost: 2.99,
        lastCost: 3.15,
        currency: 'USD',
        costMethod: 'FIFO'
      },
      quality: {
        shelfLifeDays: 7,
        allergens: [],
        certifications: ['Organic'],
        hazmat: false
      },
      flags: {
        isCritical: false,
        isPerishable: true,
        isControlled: false,
        isRecipe: false,
        isRawMaterial: true,
        isFinishedGood: false
      },
      status: 'active'
    },
    {
      sku: 'OLIVE-OIL-001',
      name: 'Extra Virgin Olive Oil',
      categoryId: 'food',
      uom: {
        base: 'ml',
        purchase: 'bottle',
        recipe: 'tbsp',
        conversions: []
      },
      tracking: {
        lotTracking: false,
        expiryTracking: true,
        serialTracking: false,
        trackByLocation: false
      },
      levels: {
        current: 2000,
        reserved: 200,
        available: 1800,
        onOrder: 0,
        par: {
          min: 500,
          max: 3000,
          reorderPoint: 750,
          reorderQuantity: 2000
        }
      },
      costing: {
        averageCost: 0.015,
        lastCost: 0.016,
        currency: 'USD',
        costMethod: 'AVERAGE'
      },
      quality: {
        shelfLifeDays: 730,
        allergens: [],
        certifications: ['Extra Virgin'],
        hazmat: false
      },
      flags: {
        isCritical: false,
        isPerishable: false,
        isControlled: false,
        isRecipe: false,
        isRawMaterial: true,
        isFinishedGood: false
      },
      status: 'active'
    }
  ];

  sampleItems.forEach((item, index) => {
    const id = `item_${index + 1}`;
    const fullItem: InventoryItem = {
      id,
      sku: item.sku || `SKU-${index + 1}`,
      name: item.name || `Item ${index + 1}`,
      description: item.description,
      categoryId: item.categoryId || 'food',
      uom: item.uom || {
        base: 'piece',
        purchase: 'piece',
        recipe: 'piece',
        conversions: []
      },
      storage: {
        locationId: 'loc_1',
        requirements: item.storage?.requirements
      },
      tracking: item.tracking || {
        lotTracking: false,
        expiryTracking: false,
        serialTracking: false,
        trackByLocation: false
      },
      levels: item.levels || {
        current: 10,
        reserved: 0,
        available: 10,
        onOrder: 0,
        par: {
          min: 5,
          max: 25,
          reorderPoint: 8,
          reorderQuantity: 15
        }
      },
      costing: item.costing || {
        averageCost: 1.00,
        lastCost: 1.00,
        currency: 'USD',
        costMethod: 'AVERAGE'
      },
      quality: item.quality || {
        allergens: [],
        certifications: [],
        hazmat: false
      },
      suppliers: {
        alternatives: []
      },
      lots: [],
      status: item.status || 'active',
      flags: item.flags || {
        isRawMaterial: true,
        isFinishedGood: false
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        tags: []
      }
    };
    mockInventoryItems.set(id, fullItem);
  });
}

// Validation helpers
const validateSKU = (sku: string, existingItems: InventoryItem[], excludeId?: string): string | null => {
  if (!sku || sku.trim().length === 0) {
    return 'SKU is required';
  }
  if (sku.length < 2) {
    return 'SKU must be at least 2 characters';
  }
  if (!/^[A-Za-z0-9_-]+$/.test(sku)) {
    return 'SKU can only contain letters, numbers, underscores, and hyphens';
  }
  
  const exists = existingItems.some(item => 
    item.sku.toLowerCase() === sku.toLowerCase() && 
    item.id !== excludeId &&
    item.status !== 'discontinued'
  );
  
  if (exists) {
    return `SKU "${sku}" already exists`;
  }
  
  return null;
};

const validateItemName = (name: string): string | null => {
  if (!name || name.trim().length === 0) {
    return 'Item name is required';
  }
  if (name.length < 2) {
    return 'Item name must be at least 2 characters';
  }
  if (name.length > 100) {
    return 'Item name must be 100 characters or less';
  }
  return null;
};

const validateParLevels = (levels: any): string | null => {
  if (levels.min !== undefined && levels.max !== undefined) {
    if (levels.min >= levels.max) {
      return 'Minimum stock level must be less than maximum stock level';
    }
  }
  if (levels.reorderPoint !== undefined && levels.min !== undefined) {
    if (levels.reorderPoint < levels.min) {
      return 'Reorder point should not be below minimum stock level';
    }
  }
  return null;
};

// MSW API Handlers
export const inventoryItemApiHandlers = [
  // GET /api/inventory/items - List items with filtering
  http.get('/api/inventory/items', async ({ request }) => {
    if (mockInventoryItems.size === 0) {
      initializeMockData();
    }

    const url = new URL(request.url);
    const categoryId = url.searchParams.get('categoryId');
    const status = url.searchParams.get('status') as InventoryItem['status'];
    const locationId = url.searchParams.get('locationId');
    const isLotTracked = url.searchParams.get('isLotTracked');
    const isBelowMin = url.searchParams.get('isBelowMin') === 'true';
    const isBelowReorder = url.searchParams.get('isBelowReorder') === 'true';
    const search = url.searchParams.get('search');
    const sortBy = url.searchParams.get('sortBy') || 'name';
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let items = Array.from(mockInventoryItems.values());

    // Apply filters
    if (categoryId) {
      items = items.filter(item => item.categoryId === categoryId);
    }
    if (status) {
      items = items.filter(item => item.status === status);
    }
    if (locationId) {
      items = items.filter(item => item.storage.locationId === locationId);
    }
    if (isLotTracked !== null) {
      items = items.filter(item => item.tracking.lotTracking === (isLotTracked === 'true'));
    }
    if (isBelowMin) {
      items = items.filter(item => item.levels.current <= item.levels.par.min);
    }
    if (isBelowReorder) {
      items = items.filter(item => item.levels.current <= item.levels.par.reorderPoint);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.sku.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.metadata.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    items.sort((a, b) => {
      let valueA: any, valueB: any;
      switch (sortBy) {
        case 'sku':
          valueA = a.sku.toLowerCase();
          valueB = b.sku.toLowerCase();
          break;
        case 'category':
          valueA = a.categoryId;
          valueB = b.categoryId;
          break;
        case 'level':
          valueA = a.levels.current;
          valueB = b.levels.current;
          break;
        case 'cost':
          valueA = a.costing.averageCost;
          valueB = b.costing.averageCost;
          break;
        default:
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply pagination
    const total = items.length;
    const paginatedItems = items.slice(offset, offset + limit);

    console.log('📦 MSW: Inventory items API called, returning', paginatedItems.length, 'of', total, 'items');
    return HttpResponse.json({
      items: paginatedItems,
      total,
      offset,
      limit
    });
  }),

  // GET /api/inventory/items/:id - Get item by ID
  http.get('/api/inventory/items/:id', async ({ params }) => {
    const { id } = params;
    const item = mockInventoryItems.get(id as string);
    
    if (!item) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Item not found'
      });
    }

    console.log('📦 MSW: Inventory item by ID API called for', id);
    return HttpResponse.json(item);
  }),

  // POST /api/inventory/items - Create new item
  http.post('/api/inventory/items', async ({ request }) => {
    const itemData = await request.json() as Partial<InventoryItem>;
    
    if (mockInventoryItems.size === 0) {
      initializeMockData();
    }

    const existingItems = Array.from(mockInventoryItems.values());
    
    // Validate input
    const skuError = validateSKU(itemData.sku || '', existingItems);
    if (skuError) {
      return new HttpResponse(JSON.stringify({ error: skuError }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const nameError = validateItemName(itemData.name || '');
    if (nameError) {
      return new HttpResponse(JSON.stringify({ error: nameError }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!itemData.categoryId) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Category is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (itemData.levels?.par) {
      const parError = validateParLevels(itemData.levels.par);
      if (parError) {
        return new HttpResponse(JSON.stringify({ error: parError }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Create item
    const itemId = `item_${nextItemId++}`;
    const now = new Date().toISOString();
    
    const newItem: InventoryItem = {
      id: itemId,
      sku: itemData.sku!.trim(),
      name: itemData.name!.trim(),
      description: itemData.description?.trim(),
      categoryId: itemData.categoryId,
      uom: {
        base: itemData.uom?.base || 'piece',
        purchase: itemData.uom?.purchase || itemData.uom?.base || 'piece',
        recipe: itemData.uom?.recipe || itemData.uom?.base || 'piece',
        conversions: itemData.uom?.conversions || []
      },
      storage: {
        locationId: itemData.storage?.locationId,
        requirements: itemData.storage?.requirements
      },
      tracking: {
        lotTracking: itemData.tracking?.lotTracking || false,
        expiryTracking: itemData.tracking?.expiryTracking || false,
        serialTracking: itemData.tracking?.serialTracking || false,
        trackByLocation: itemData.tracking?.trackByLocation || false
      },
      levels: {
        current: itemData.levels?.current || 0,
        reserved: itemData.levels?.reserved || 0,
        available: (itemData.levels?.current || 0) - (itemData.levels?.reserved || 0),
        onOrder: itemData.levels?.onOrder || 0,
        par: {
          min: itemData.levels?.par?.min || 0,
          max: itemData.levels?.par?.max || 100,
          reorderPoint: itemData.levels?.par?.reorderPoint || itemData.levels?.par?.min || 5,
          reorderQuantity: itemData.levels?.par?.reorderQuantity || 20
        }
      },
      costing: {
        averageCost: itemData.costing?.averageCost || 0,
        lastCost: itemData.costing?.lastCost || 0,
        standardCost: itemData.costing?.standardCost,
        currency: itemData.costing?.currency || 'USD',
        costMethod: itemData.costing?.costMethod || 'AVERAGE'
      },
      quality: {
        shelfLifeDays: itemData.quality?.shelfLifeDays,
        allergens: itemData.quality?.allergens || [],
        certifications: itemData.quality?.certifications || [],
        hazmat: itemData.quality?.hazmat || false,
        temperatureAbuse: itemData.quality?.temperatureAbuse
      },
      suppliers: {
        primary: itemData.suppliers?.primary,
        alternatives: itemData.suppliers?.alternatives || [],
        preferredSupplier: itemData.suppliers?.preferredSupplier
      },
      lots: [],
      status: itemData.status || 'active',
      flags: {
        isCritical: itemData.flags?.isCritical || false,
        isPerishable: itemData.flags?.isPerishable || false,
        isControlled: itemData.flags?.isControlled || false,
        isRecipe: itemData.flags?.isRecipe || false,
        isRawMaterial: itemData.flags?.isRawMaterial !== false,
        isFinishedGood: itemData.flags?.isFinishedGood || false
      },
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: 'current-user',
        notes: itemData.metadata?.notes,
        tags: itemData.metadata?.tags || []
      }
    };

    mockInventoryItems.set(itemId, newItem);

    console.log('📦 MSW: Created new inventory item:', newItem.name);
    return HttpResponse.json(newItem, { status: 201 });
  }),

  // PATCH /api/inventory/items/:id - Update item
  http.patch('/api/inventory/items/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json() as Partial<InventoryItem>;
    
    const item = mockInventoryItems.get(id as string);
    if (!item) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Item not found'
      });
    }

    if (item.status === 'discontinued') {
      return new HttpResponse(JSON.stringify({ 
        error: 'Cannot update discontinued item' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate updates
    if (updates.sku) {
      const existingItems = Array.from(mockInventoryItems.values());
      const skuError = validateSKU(updates.sku, existingItems, id as string);
      if (skuError) {
        return new HttpResponse(JSON.stringify({ error: skuError }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (updates.name) {
      const nameError = validateItemName(updates.name);
      if (nameError) {
        return new HttpResponse(JSON.stringify({ error: nameError }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (updates.levels?.par) {
      const parError = validateParLevels(updates.levels.par);
      if (parError) {
        return new HttpResponse(JSON.stringify({ error: parError }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Apply updates
    const updatedItem = { 
      ...item, 
      ...updates,
      metadata: {
        ...item.metadata,
        ...updates.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    // Recalculate available if current or reserved changed
    if (updates.levels) {
      updatedItem.levels.available = updatedItem.levels.current - updatedItem.levels.reserved;
    }

    mockInventoryItems.set(id as string, updatedItem);

    console.log('📦 MSW: Updated inventory item:', updatedItem.name);
    return HttpResponse.json(updatedItem);
  }),

  // DELETE /api/inventory/items/:id - Discontinue item
  http.delete('/api/inventory/items/:id', async ({ params }) => {
    const { id } = params;
    const item = mockInventoryItems.get(id as string);
    
    if (!item) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Item not found'
      });
    }

    if (item.status === 'discontinued') {
      return new HttpResponse(JSON.stringify({ 
        error: 'Item is already discontinued' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Mark as discontinued instead of deleting
    const discontinuedItem = { 
      ...item, 
      status: 'discontinued' as const,
      metadata: {
        ...item.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    mockInventoryItems.set(id as string, discontinuedItem);

    console.log('📦 MSW: Discontinued inventory item:', item.name);
    return HttpResponse.json({ message: 'Item discontinued successfully' });
  }),

  // POST /api/inventory/items/:id/adjust - Adjust stock levels
  http.post('/api/inventory/items/:id/adjust', async ({ params, request }) => {
    const { id } = params;
    const { adjustment, reason, lotNumber } = await request.json() as {
      adjustment: number;
      reason: string;
      lotNumber?: string;
    };
    
    const item = mockInventoryItems.get(id as string);
    if (!item) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Item not found'
      });
    }

    const newLevel = item.levels.current + adjustment;
    if (newLevel < 0) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Stock adjustment would result in negative inventory' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update item stock levels
    const updatedItem = {
      ...item,
      levels: {
        ...item.levels,
        current: newLevel,
        available: newLevel - item.levels.reserved
      },
      metadata: {
        ...item.metadata,
        updatedAt: new Date().toISOString(),
        lastMovementDate: new Date().toISOString()
      }
    };

    mockInventoryItems.set(id as string, updatedItem);

    // Record movement
    const movementId = `mov_${nextMovementId++}`;
    const movement: InventoryMovement = {
      id: movementId,
      itemId: id as string,
      movementType: adjustment > 0 ? 'receipt' : 'adjustment',
      quantity: Math.abs(adjustment),
      unit: item.uom.base,
      lotNumber,
      reason,
      timestamp: new Date().toISOString(),
      performedBy: 'current-user'
    };

    mockMovements.set(movementId, movement);

    console.log('📦 MSW: Adjusted stock for item:', item.name, 'by', adjustment);
    return HttpResponse.json({
      item: updatedItem,
      movement
    });
  }),

  // GET /api/inventory/analytics - Get inventory analytics
  http.get('/api/inventory/analytics', async () => {
    if (mockInventoryItems.size === 0) {
      initializeMockData();
    }

    const items = Array.from(mockInventoryItems.values());
    const movements = Array.from(mockMovements.values());
    const alerts = Array.from(mockAlerts.values());

    const analytics: InventoryAnalytics = {
      totalItems: items.length,
      activeItems: items.filter(item => item.status === 'active').length,
      lotTrackedItems: items.filter(item => item.tracking.lotTracking).length,
      itemsBelowMin: items.filter(item => item.levels.current <= item.levels.par.min).length,
      itemsBelowReorder: items.filter(item => item.levels.current <= item.levels.par.reorderPoint).length,
      expiringItems: 0, // Would calculate based on lot expiry dates
      totalValue: items.reduce((total, item) => total + (item.levels.current * item.costing.averageCost), 0),
      averageTurnover: 0, // Would calculate based on movement history
      topCategories: calculateTopCategories(items),
      lowStockAlerts: alerts.filter(alert => ['below_min', 'below_reorder'].includes(alert.alertType)),
      recentMovements: movements.slice(-10)
    };

    console.log('📊 MSW: Inventory analytics API called');
    return HttpResponse.json(analytics);
  }),

  // GET /api/inventory/units - Get available units of measure
  http.get('/api/inventory/units', async () => {
    if (mockUnits.size === 0) {
      initializeMockData();
    }

    const units = Array.from(mockUnits.values());
    console.log('📏 MSW: Units API called, returning', units.length, 'units');
    return HttpResponse.json(units);
  }),

  // NOTE: /api/inventory/locations endpoint is now handled by inventory/transfers/api.ts
  // to provide proper branch locations for transfers instead of internal storage areas
];

// Helper functions
function calculateTopCategories(items: InventoryItem[]) {
  const categoryMap = new Map<string, { count: number; value: number }>();
  
  for (const item of items) {
    const existing = categoryMap.get(item.categoryId) || { count: 0, value: 0 };
    categoryMap.set(item.categoryId, {
      count: existing.count + 1,
      value: existing.value + (item.levels.current * item.costing.averageCost)
    });
  }

  return Array.from(categoryMap.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: categoryId, // Would lookup actual category name
      itemCount: data.count,
      totalValue: data.value
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);
}
