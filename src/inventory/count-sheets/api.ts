/**
 * Count Sheets API Layer
 * MSW mock implementations for development and testing
 */

import { http, HttpResponse } from 'msw';
import type {
  CountSheet,
  CountSheetQuery,
  CountSheetsResponse,
  CreateCountSheetRequest,
  UpdateCountSheetRequest,
  CountSheetPreview,
  CountSheetPreviewQuery,
  ArchiveCountSheetRequest,
  DuplicateCountSheetRequest
} from './types';
import { CountSheetUtils, COUNT_SHEET_CONFIG } from './types';

// Mock data stores
const mockCountSheets = new Map<string, CountSheet>();

// Initialize mock data
function initializeMockCountSheets() {
  mockCountSheets.clear();

  const now = Date.now();
  const yesterday = now - (24 * 60 * 60 * 1000);
  const lastWeek = now - (7 * 24 * 60 * 60 * 1000);

  const sampleSheets: CountSheet[] = [
    {
      id: 'sheet_1704067200000_abc',
      name: 'Daily Produce Check',
      branchScope: { type: 'all' },
      criteria: {
        categoryIds: ['produce'],
        includeZeroStock: false
      },
      isArchived: false,
      lastUsedAt: yesterday,
      createdAt: lastWeek,
      createdBy: 'john.manager'
    },
    {
      id: 'sheet_1704153600000_def',
      name: 'Freezer Items',
      branchScope: { type: 'specific', branchId: 'main-restaurant' },
      criteria: {
        storageAreaIds: ['freezer'],
        includeZeroStock: true
      },
      isArchived: false,
      createdAt: lastWeek,
      createdBy: 'jane.supervisor'
    },
    {
      id: 'sheet_1704240000000_ghi',
      name: 'High Value Items',
      branchScope: { type: 'all' },
      criteria: {
        categoryIds: ['meat', 'seafood'],
        supplierIds: ['premium-foods'],
        includeZeroStock: false
      },
      isArchived: false,
      lastUsedAt: now - (3 * 24 * 60 * 60 * 1000),
      createdAt: now - (14 * 24 * 60 * 60 * 1000),
      createdBy: 'admin'
    },
    {
      id: 'sheet_1703980800000_jkl',
      name: 'Old Weekly Check',
      branchScope: { type: 'specific', branchId: 'downtown-branch' },
      criteria: {
        categoryIds: ['beverages'],
        includeZeroStock: true
      },
      isArchived: true,
      lastUsedAt: now - (30 * 24 * 60 * 60 * 1000),
      createdAt: now - (45 * 24 * 60 * 60 * 1000),
      createdBy: 'old.manager'
    }
  ];

  sampleSheets.forEach(sheet => {
    mockCountSheets.set(sheet.id, sheet);
  });

  console.log(`📋 MSW: Initialized ${sampleSheets.length} sample count sheets`);
}

// Initialize on module load
initializeMockCountSheets();

// MSW API handlers
export const countSheetsApiHandlers = [
  // GET /api/inventory/count-sheets - List count sheets
  http.get('/api/inventory/count-sheets', async ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '25'), COUNT_SHEET_CONFIG.MAX_PAGE_SIZE);
    const search = url.searchParams.get('search');
    const branchId = url.searchParams.get('branchId');
    const archived = url.searchParams.get('archived');

    // Filter count sheets
    let filteredSheets = Array.from(mockCountSheets.values());

    // Archive filter
    if (archived !== null) {
      const isArchived = archived === 'true';
      filteredSheets = filteredSheets.filter(sheet => sheet.isArchived === isArchived);
    }

    // Branch filter
    if (branchId) {
      filteredSheets = filteredSheets.filter(sheet => 
        sheet.branchScope.type === 'all' || 
        (sheet.branchScope.type === 'specific' && sheet.branchScope.branchId === branchId)
      );
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSheets = filteredSheets.filter(sheet =>
        sheet.name.toLowerCase().includes(searchLower)
      );
    }

    // Sort by last used (most recent first), then by created date
    filteredSheets.sort((a, b) => {
      const aLastUsed = a.lastUsedAt || a.createdAt;
      const bLastUsed = b.lastUsedAt || b.createdAt;
      return bLastUsed - aLastUsed;
    });

    // Paginate
    const startIndex = (page - 1) * pageSize;
    const paginatedSheets = filteredSheets.slice(startIndex, startIndex + pageSize);

    const response: CountSheetsResponse = {
      data: paginatedSheets,
      total: filteredSheets.length,
      page,
      pageSize,
      totalPages: Math.ceil(filteredSheets.length / pageSize)
    };

    console.log(`📋 MSW: Returning ${paginatedSheets.length} count sheets (page ${page})`);
    return HttpResponse.json(response);
  }),

  // POST /api/inventory/count-sheets - Create count sheet
  http.post('/api/inventory/count-sheets', async ({ request }) => {
    const createRequest = await request.json() as CreateCountSheetRequest;
    
    // Validate name uniqueness
    const existingWithName = Array.from(mockCountSheets.values()).find(sheet => {
      const sameScope = 
        (sheet.branchScope.type === 'all' && createRequest.branchScope.type === 'all') ||
        (sheet.branchScope.type === 'specific' && 
         createRequest.branchScope.type === 'specific' &&
         sheet.branchScope.branchId === createRequest.branchScope.branchId);
      
      return sameScope && sheet.name.toLowerCase() === createRequest.name.toLowerCase() && !sheet.isArchived;
    });

    if (existingWithName) {
      return HttpResponse.json({ 
        error: 'A count sheet with this name already exists in this scope' 
      }, { status: 400 });
    }

    // Create new count sheet
    const countSheetId = CountSheetUtils.generateCountSheetId();
    const now = Date.now();

    const newSheet: CountSheet = {
      id: countSheetId,
      name: createRequest.name.trim(),
      branchScope: createRequest.branchScope,
      criteria: createRequest.criteria,
      isArchived: false,
      createdAt: now,
      createdBy: 'current-user'
    };

    mockCountSheets.set(countSheetId, newSheet);
    
    console.log('✅ MSW: Created count sheet:', newSheet.name);
    return HttpResponse.json({
      countSheetId,
      name: newSheet.name,
      message: 'Count sheet created successfully'
    });
  }),

  // GET /api/inventory/count-sheets/:id - Get count sheet
  http.get('/api/inventory/count-sheets/:id', async ({ params }) => {
    const countSheetId = params.id as string;
    const sheet = mockCountSheets.get(countSheetId);

    if (!sheet) {
      return HttpResponse.json({ error: 'Count sheet not found' }, { status: 404 });
    }

    console.log(`📄 MSW: Returning count sheet ${sheet.name}`);
    return HttpResponse.json(sheet);
  }),

  // PUT /api/inventory/count-sheets/:id - Update count sheet
  http.put('/api/inventory/count-sheets/:id', async ({ params, request }) => {
    const countSheetId = params.id as string;
    const updateRequest = await request.json() as UpdateCountSheetRequest;
    
    const sheet = mockCountSheets.get(countSheetId);
    if (!sheet) {
      return HttpResponse.json({ error: 'Count sheet not found' }, { status: 404 });
    }

    // Check name uniqueness if name changed
    if (updateRequest.name.toLowerCase() !== sheet.name.toLowerCase()) {
      const existingWithName = Array.from(mockCountSheets.values()).find(s => {
        if (s.id === countSheetId) return false; // Exclude self
        
        const sameScope = 
          (s.branchScope.type === 'all' && updateRequest.branchScope.type === 'all') ||
          (s.branchScope.type === 'specific' && 
           updateRequest.branchScope.type === 'specific' &&
           s.branchScope.branchId === updateRequest.branchScope.branchId);
        
        return sameScope && s.name.toLowerCase() === updateRequest.name.toLowerCase() && !s.isArchived;
      });

      if (existingWithName) {
        return HttpResponse.json({ 
          error: 'A count sheet with this name already exists in this scope' 
        }, { status: 400 });
      }
    }

    // Update count sheet
    const updatedSheet: CountSheet = {
      ...sheet,
      name: updateRequest.name.trim(),
      branchScope: updateRequest.branchScope,
      criteria: updateRequest.criteria,
      updatedAt: Date.now(),
      updatedBy: 'current-user'
    };

    mockCountSheets.set(countSheetId, updatedSheet);
    
    console.log('✅ MSW: Updated count sheet:', updatedSheet.name);
    return HttpResponse.json({
      message: 'Count sheet updated successfully'
    });
  }),

  // POST /api/inventory/count-sheets/:id/archive - Archive/unarchive
  http.post('/api/inventory/count-sheets/:id/archive', async ({ params, request }) => {
    const countSheetId = params.id as string;
    const archiveRequest = await request.json() as ArchiveCountSheetRequest;
    
    const sheet = mockCountSheets.get(countSheetId);
    if (!sheet) {
      return HttpResponse.json({ error: 'Count sheet not found' }, { status: 404 });
    }

    const updatedSheet: CountSheet = {
      ...sheet,
      isArchived: archiveRequest.isArchived,
      updatedAt: Date.now(),
      updatedBy: 'current-user'
    };

    mockCountSheets.set(countSheetId, updatedSheet);
    
    const action = archiveRequest.isArchived ? 'archived' : 'unarchived';
    console.log(`✅ MSW: Count sheet ${action}:`, updatedSheet.name);
    return HttpResponse.json({
      message: `Count sheet ${action} successfully`
    });
  }),

  // POST /api/inventory/count-sheets/:id/duplicate - Duplicate count sheet
  http.post('/api/inventory/count-sheets/:id/duplicate', async ({ params, request }) => {
    const countSheetId = params.id as string;
    const duplicateRequest = await request.json() as DuplicateCountSheetRequest;
    
    const originalSheet = mockCountSheets.get(countSheetId);
    if (!originalSheet) {
      return HttpResponse.json({ error: 'Count sheet not found' }, { status: 404 });
    }

    const newCountSheetId = CountSheetUtils.generateCountSheetId();
    const now = Date.now();
    const targetBranchScope = duplicateRequest.branchScope || originalSheet.branchScope;

    // Check name uniqueness in target scope
    const existingWithName = Array.from(mockCountSheets.values()).find(sheet => {
      const sameScope = 
        (sheet.branchScope.type === 'all' && targetBranchScope.type === 'all') ||
        (sheet.branchScope.type === 'specific' && 
         targetBranchScope.type === 'specific' &&
         sheet.branchScope.branchId === targetBranchScope.branchId);
      
      return sameScope && sheet.name.toLowerCase() === duplicateRequest.newName.toLowerCase() && !sheet.isArchived;
    });

    if (existingWithName) {
      return HttpResponse.json({ 
        error: 'A count sheet with this name already exists in this scope' 
      }, { status: 400 });
    }

    const duplicatedSheet: CountSheet = {
      id: newCountSheetId,
      name: duplicateRequest.newName.trim(),
      branchScope: targetBranchScope,
      criteria: originalSheet.criteria, // Copy exactly
      isArchived: false,
      createdAt: now,
      createdBy: 'current-user'
    };

    mockCountSheets.set(newCountSheetId, duplicatedSheet);
    
    console.log('✅ MSW: Duplicated count sheet:', duplicatedSheet.name);
    return HttpResponse.json({
      countSheetId: newCountSheetId,
      name: duplicatedSheet.name,
      message: 'Count sheet duplicated successfully'
    });
  }),

  // GET /api/inventory/count-sheets/:id/preview - Preview resolved items
  http.get('/api/inventory/count-sheets/:id/preview', async ({ params, request }) => {
    const countSheetId = params.id as string;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || COUNT_SHEET_CONFIG.PREVIEW_PAGE_SIZE.toString());
    const branchId = url.searchParams.get('branchId');
    
    const sheet = mockCountSheets.get(countSheetId);
    if (!sheet) {
      return HttpResponse.json({ error: 'Count sheet not found' }, { status: 404 });
    }

    // Mock item resolution based on criteria
    let allItems = [
      { itemId: 'item-1', sku: 'VEG-001', name: 'Fresh Tomatoes', unit: 'kg', categoryName: 'Produce', currentStock: 25, isActive: true },
      { itemId: 'item-2', sku: 'VEG-002', name: 'Iceberg Lettuce', unit: 'each', categoryName: 'Produce', currentStock: 15, isActive: true },
      { itemId: 'item-3', sku: 'VEG-003', name: 'Yellow Onions', unit: 'kg', categoryName: 'Produce', currentStock: 0, isActive: true },
      { itemId: 'item-4', sku: 'MEAT-001', name: 'Chicken Breast', unit: 'kg', categoryName: 'Meat', currentStock: 10, isActive: true },
      { itemId: 'item-5', sku: 'MEAT-002', name: 'Ground Beef', unit: 'kg', categoryName: 'Meat', currentStock: 8, isActive: true },
      { itemId: 'item-6', sku: 'DAIRY-001', name: 'Whole Milk', unit: 'L', categoryName: 'Dairy', currentStock: 12, isActive: true },
      { itemId: 'item-7', sku: 'DAIRY-002', name: 'Cheddar Cheese', unit: 'kg', categoryName: 'Dairy', currentStock: 0, isActive: true },
      { itemId: 'item-8', sku: 'FROZ-001', name: 'Ice Cream', unit: 'L', categoryName: 'Frozen', currentStock: 6, isActive: true }
    ];

    // Apply filters based on criteria
    const { criteria } = sheet;
    
    // Category filter
    if (criteria.categoryIds?.length) {
      const allowedCategories = criteria.categoryIds.map(id => {
        const categoryMap: Record<string, string> = {
          'produce': 'Produce',
          'meat': 'Meat', 
          'dairy': 'Dairy',
          'frozen': 'Frozen'
        };
        return categoryMap[id] || id;
      });
      allItems = allItems.filter(item => 
        item.categoryName && allowedCategories.includes(item.categoryName)
      );
    }

    // Storage area filter (mock mapping)
    if (criteria.storageAreaIds?.length) {
      const storageItemMap: Record<string, string[]> = {
        'freezer': ['Frozen'],
        'cooler': ['Dairy', 'Meat'], 
        'dry-storage': ['Produce']
      };
      
      const allowedCategories = criteria.storageAreaIds.flatMap(id => storageItemMap[id] || []);
      if (allowedCategories.length > 0) {
        allItems = allItems.filter(item => 
          item.categoryName && allowedCategories.includes(item.categoryName)
        );
      }
    }

    // Zero stock filter
    if (criteria.includeZeroStock === false) {
      allItems = allItems.filter(item => item.currentStock > 0);
    }

    // Explicit item picks (union with filters)
    if (criteria.itemIds?.length) {
      const explicitItems = allItems.filter(item => 
        criteria.itemIds!.includes(item.itemId)
      );
      // Union: include both filtered items AND explicit picks
      const filteredItemIds = new Set(allItems.map(item => item.itemId));
      criteria.itemIds.forEach(itemId => {
        if (!filteredItemIds.has(itemId)) {
          // Add explicit picks that weren't caught by filters
          const mockItem = {
            itemId,
            sku: `PICK-${itemId.slice(-3).toUpperCase()}`,
            name: `Explicit Item ${itemId.slice(-3)}`,
            unit: 'each',
            categoryName: 'Other',
            currentStock: Math.floor(Math.random() * 50),
            isActive: true
          };
          allItems.push(mockItem);
        }
      });
    }

    const totalItems = allItems.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = allItems.slice(startIndex, startIndex + pageSize);

    const preview: CountSheetPreview = {
      totalItems,
      items: paginatedItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize)
    };

    console.log(`🔍 MSW: Count sheet preview for "${sheet.name}": ${totalItems} items`);
    return HttpResponse.json(preview);
  }),

  // DELETE /api/inventory/count-sheets/:id - Delete (soft delete via archive)
  http.delete('/api/inventory/count-sheets/:id', async ({ params }) => {
    const countSheetId = params.id as string;
    
    const sheet = mockCountSheets.get(countSheetId);
    if (!sheet) {
      return HttpResponse.json({ error: 'Count sheet not found' }, { status: 404 });
    }

    // Soft delete by archiving
    const updatedSheet: CountSheet = {
      ...sheet,
      isArchived: true,
      updatedAt: Date.now(),
      updatedBy: 'current-user'
    };

    mockCountSheets.set(countSheetId, updatedSheet);
    
    console.log('✅ MSW: Count sheet deleted (archived):', sheet.name);
    return HttpResponse.json({
      message: 'Count sheet deleted successfully'
    });
  })
];

// Count sheets API service for direct usage
export const countSheetsApiService = {
  async listCountSheets(query: CountSheetQuery = {}): Promise<CountSheetsResponse> {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.branchId) params.set('branchId', query.branchId);
    if (query.archived !== undefined) params.set('archived', query.archived.toString());
    if (query.page) params.set('page', query.page.toString());
    if (query.pageSize) params.set('pageSize', query.pageSize.toString());
    
    const response = await fetch(`/api/inventory/count-sheets?${params}`);
    return response.json();
  },

  async createCountSheet(request: CreateCountSheetRequest): Promise<{ countSheetId: string; name: string }> {
    const response = await fetch('/api/inventory/count-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  },

  async getCountSheet(countSheetId: string): Promise<CountSheet> {
    const response = await fetch(`/api/inventory/count-sheets/${countSheetId}`);
    return response.json();
  },

  async updateCountSheet(countSheetId: string, request: UpdateCountSheetRequest): Promise<any> {
    const response = await fetch(`/api/inventory/count-sheets/${countSheetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  },

  async archiveCountSheet(countSheetId: string, isArchived: boolean, reason?: string): Promise<any> {
    const response = await fetch(`/api/inventory/count-sheets/${countSheetId}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived, reason })
    });
    return response.json();
  },

  async duplicateCountSheet(countSheetId: string, newName: string, branchScope?: CountSheet['branchScope']): Promise<{ countSheetId: string; name: string }> {
    const response = await fetch(`/api/inventory/count-sheets/${countSheetId}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName, branchScope })
    });
    return response.json();
  },

  async previewCountSheet(countSheetId: string, query: CountSheetPreviewQuery = {}): Promise<CountSheetPreview> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', query.page.toString());
    if (query.pageSize) params.set('pageSize', query.pageSize.toString());
    if (query.branchId) params.set('branchId', query.branchId);
    
    const response = await fetch(`/api/inventory/count-sheets/${countSheetId}/preview?${params}`);
    return response.json();
  },

  async deleteCountSheet(countSheetId: string): Promise<any> {
    const response = await fetch(`/api/inventory/count-sheets/${countSheetId}`, {
      method: 'DELETE'
    });
    return response.json();
  }
};
