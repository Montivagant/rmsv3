/**
 * Inventory Transfer API Layer
 * MSW mock implementations for simplified transfer flow
 */

import { http, HttpResponse } from 'msw';
import type {
  Transfer,
  TransfersResponse,
  CreateTransferRequest,
  CompleteTransferRequest,
  CancelTransferRequest,
  Location
} from './types';
import { TRANSFER_CONFIG } from './types';

// Mock data stores
const mockTransfers = new Map<string, Transfer>();
const mockLocations = new Map<string, Location>();
const mockItemStock = new Map<string, Map<string, number>>(); // itemId -> locationId -> quantity

// Initialize mock data
function initializeMockData() {
  // Clear existing data
  mockTransfers.clear();
  mockLocations.clear();
  mockItemStock.clear();

  // Initialize branch locations  
  const locations: Location[] = [
    {
      id: 'main-restaurant',
      name: 'Main Restaurant',
      type: 'restaurant',
      address: '123 Main St, Downtown',
      isActive: true
    },
    {
      id: 'downtown-branch',
      name: 'Downtown Branch', 
      type: 'restaurant',
      address: '456 Downtown Ave',
      isActive: true
    },
    {
      id: 'westside-branch',
      name: 'Westside Branch',
      type: 'restaurant', 
      address: '789 West Side Blvd',
      isActive: true
    },
    {
      id: 'central-warehouse',
      name: 'Central Warehouse',
      type: 'warehouse',
      address: '789 Industrial Blvd',
      isActive: true
    },
    {
      id: 'central-kitchen',
      name: 'Central Kitchen',
      type: 'central_kitchen',
      address: '321 Kitchen Way',
      isActive: true
    }
  ];

  locations.forEach(location => {
    mockLocations.set(location.id, location);
  });

  // Initialize some stock data
  const items = [
    { id: 'item-tomatoes', sku: 'VEG-TOMATO-001', name: 'Fresh Tomatoes', unit: 'kg' },
    { id: 'item-lettuce', sku: 'VEG-LETTUCE-001', name: 'Iceberg Lettuce', unit: 'each' },
    { id: 'item-chicken', sku: 'MEAT-CHICKEN-001', name: 'Chicken Breast', unit: 'kg' },
    { id: 'item-beef', sku: 'MEAT-BEEF-001', name: 'Ground Beef', unit: 'kg' },
    { id: 'item-rice', sku: 'DRY-RICE-001', name: 'Basmati Rice', unit: 'kg' },
    { id: 'item-pasta', sku: 'DRY-PASTA-001', name: 'Penne Pasta', unit: 'kg' },
    { id: 'item-olive-oil', sku: 'OIL-OLIVE-001', name: 'Extra Virgin Olive Oil', unit: 'L' },
    { id: 'item-milk', sku: 'DAIRY-MILK-001', name: 'Whole Milk', unit: 'L' }
  ];

  // Initialize stock levels for each item at each location
  items.forEach(item => {
    const stockMap = new Map<string, number>();
    
    // Warehouse has more stock
    stockMap.set('central-warehouse', Math.floor(Math.random() * 100) + 50);
    
    // Restaurants have less stock
    stockMap.set('main-restaurant', Math.floor(Math.random() * 30) + 10);
    stockMap.set('downtown-branch', Math.floor(Math.random() * 30) + 10);
    stockMap.set('westside-branch', Math.floor(Math.random() * 30) + 10);
    
    // Central kitchen has medium stock
    stockMap.set('central-kitchen', Math.floor(Math.random() * 50) + 20);
    
    mockItemStock.set(item.id, stockMap);
  });

  // Sample transfers
  const sampleTransfers: Transfer[] = [
    {
      id: 'transfer_1704067200000_abc123',
      code: 'TRF-067200',
      sourceLocationId: 'central-warehouse',
      destinationLocationId: 'main-restaurant',
      status: 'COMPLETED',
      lines: [
        {
          itemId: 'item-tomatoes',
          sku: 'VEG-TOMATO-001',
          name: 'Fresh Tomatoes',
          unit: 'kg',
          qtyPlanned: 50,
          qtyFinal: 48
        },
        {
          itemId: 'item-lettuce',
          sku: 'VEG-LETTUCE-001',
          name: 'Iceberg Lettuce',
          unit: 'each',
          qtyPlanned: 24,
          qtyFinal: 24
        }
      ],
      createdBy: 'john.manager',
      completedBy: 'john.manager',
      notes: 'Weekly produce delivery'
    },
    {
      id: 'transfer_1704153600000_def456',
      code: 'TRF-153600',
      sourceLocationId: 'main-restaurant',
      destinationLocationId: 'downtown-branch',
      status: 'DRAFT',
      lines: [
        {
          itemId: 'item-chicken',
          sku: 'MEAT-CHICKEN-001',
          name: 'Chicken Breast',
          unit: 'kg',
          qtyPlanned: 20
        }
      ],
      createdBy: 'jane.supervisor',
      notes: 'Extra inventory for weekend rush'
    }
  ];

  sampleTransfers.forEach(transfer => {
    mockTransfers.set(transfer.id, transfer);
  });

  if (import.meta.env.DEV) console.log(`📊 MSW: Initialized ${sampleTransfers.length} sample transfers`);
}

// Initialize on module load
initializeMockData();

// Helper to get stock for an item at a location
function getStock(itemId: string, locationId: string): number {
  return mockItemStock.get(itemId)?.get(locationId) || 0;
}

// Helper to update stock
function updateStock(itemId: string, locationId: string, delta: number): void {
  const itemStock = mockItemStock.get(itemId) || new Map();
  const currentStock = itemStock.get(locationId) || 0;
  itemStock.set(locationId, Math.max(0, currentStock + delta));
  mockItemStock.set(itemId, itemStock);
}

// MSW API handlers
export const inventoryTransferApiHandlers = [
  // GET /api/inventory/transfers - List transfers
  http.get('/api/inventory/transfers', async ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '25'), TRANSFER_CONFIG.MAX_PAGE_SIZE);
    const status = url.searchParams.get('status') as Transfer['status'] | undefined;
    const sourceLocationId = url.searchParams.get('sourceLocationId') || undefined;
    const destinationLocationId = url.searchParams.get('destinationLocationId') || undefined;
    const search = url.searchParams.get('search') || undefined;

    try {
      // Use real repository function instead of mock data
      const { listTransfers } = await import('./repository');
      const transfersResponse = await listTransfers({
        page,
        pageSize,
        ...(status && { status }),
        ...(sourceLocationId && { sourceLocationId }),
        ...(destinationLocationId && { destinationLocationId }),
        ...(search && { search })
      });

      const response: TransfersResponse = {
        data: transfersResponse.data,
        total: transfersResponse.total,
        page: transfersResponse.page,
        pageSize: transfersResponse.pageSize,
        totalPages: Math.ceil(transfersResponse.total / transfersResponse.pageSize)
      };

      console.log(`📋 MSW: Returning ${transfersResponse.data.length} real transfers from repository`);
      return HttpResponse.json(response);
    } catch (error) {
      console.error('Error listing transfers:', error);
      return HttpResponse.json({
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      });
    }
  }),

  // GET /api/inventory/transfers/:id - Get single transfer
  http.get('/api/inventory/transfers/:id', async ({ params }) => {
    const transferId = params.id as string;
    
    try {
      // Use real repository function instead of mock data
      const { getTransferById } = await import('./repository');
      const transfer = await getTransferById(transferId);

      if (!transfer) {
        return HttpResponse.json({ error: 'Transfer not found' }, { status: 404 });
      }

      console.log(`📄 MSW: Returning real transfer ${transfer.code} from repository`);
      return HttpResponse.json(transfer);
    } catch (error) {
      console.error('Error getting transfer:', error);
      return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }),

  // POST /api/inventory/transfers - Create new transfer
  http.post('/api/inventory/transfers', async ({ request }) => {
    const createRequest = await request.json() as CreateTransferRequest;
    
    try {
      // Use real repository function instead of mock data
      const { createTransfer } = await import('./repository');
      const transfer = await createTransfer(createRequest);
      
      console.log('✅ MSW: Created real transfer:', transfer.code);
      return HttpResponse.json({
        transferId: transfer.id,
        code: transfer.code,
        message: 'Transfer created successfully'
      });
    } catch (error) {
      console.error('Error creating transfer:', error);
      return HttpResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to create transfer' 
      }, { status: 400 });
    }
  }),

  // PUT /api/inventory/transfers/:id - Update draft transfer
  http.put('/api/inventory/transfers/:id', async ({ params, request }) => {
    const transferId = params.id as string;
    const updates = await request.json() as Partial<CreateTransferRequest>;
    
    const transfer = mockTransfers.get(transferId);
    if (!transfer) {
      return HttpResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    if (transfer.status !== 'DRAFT') {
      return HttpResponse.json({ error: 'Only draft transfers can be updated' }, { status: 400 });
    }

    // Apply updates
    if (updates.lines) {
      transfer.lines = updates.lines.map(line => {
        const existing = transfer.lines.find(l => l.itemId === line.itemId);
        return {
          itemId: line.itemId,
          sku: existing?.sku || `SKU-${line.itemId.slice(-6).toUpperCase()}`,
          name: existing?.name || `Item ${line.itemId.slice(-4)}`,
          unit: existing?.unit || 'each',
          qtyPlanned: line.qtyPlanned || 0
        };
      });
    }

    if (updates.notes !== undefined) {
      transfer.notes = updates.notes;
    }

    mockTransfers.set(transferId, transfer);
    
    console.log('✅ MSW: Updated transfer:', transfer.code);
    return HttpResponse.json({
      transferId,
      message: 'Transfer updated successfully'
    });
  }),

  // POST /api/inventory/transfers/:id/complete - Complete transfer
  http.post('/api/inventory/transfers/:id/complete', async ({ params, request }) => {
    const transferId = params.id as string;
    const completeRequest = await request.json() as CompleteTransferRequest;
    
    const transfer = mockTransfers.get(transferId);
    if (!transfer) {
      return HttpResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    if (transfer.status !== 'DRAFT') {
      return HttpResponse.json({ error: 'Only draft transfers can be completed' }, { status: 400 });
    }

    // Validate stock availability
    const stockErrors: string[] = [];
    
    for (const finalLine of completeRequest.linesFinal) {
      const transferLine = transfer.lines.find(l => l.itemId === finalLine.itemId);
      if (!transferLine) continue;
      
      const availableStock = getStock(finalLine.itemId, transfer.sourceLocationId);
      if (finalLine.qtyFinal > availableStock) {
        stockErrors.push(
          `${transferLine.name}: Insufficient stock. Requested: ${finalLine.qtyFinal}, Available: ${availableStock}`
        );
      }
    }

    if (stockErrors.length > 0) {
      return HttpResponse.json({ 
        error: 'Stock validation failed',
        details: stockErrors 
      }, { status: 400 });
    }

    // Apply stock movements
    completeRequest.linesFinal.forEach(finalLine => {
      const qtyFinal = finalLine.qtyFinal;
      
      // Decrement source
      updateStock(finalLine.itemId, transfer.sourceLocationId, -qtyFinal);
      
      // Increment destination
      updateStock(finalLine.itemId, transfer.destinationLocationId, qtyFinal);
    });

    // Update transfer
    const completedTransfer: Transfer = {
      ...transfer,
      status: 'COMPLETED',
      completedBy: 'current-user',
      lines: transfer.lines.map(line => {
        const finalLine = completeRequest.linesFinal.find(f => f.itemId === line.itemId);
        return {
          ...line,
          qtyFinal: finalLine?.qtyFinal || line.qtyPlanned
        };
      })
    };

    mockTransfers.set(transferId, completedTransfer);
    
    console.log('✅ MSW: Transfer completed successfully:', completedTransfer.code);
    return HttpResponse.json({
      transferId: completedTransfer.id,
      code: completedTransfer.code,
      message: 'Transfer completed successfully - stock moved instantly'
    });
  }),

  // POST /api/inventory/transfers/:id/cancel - Cancel transfer
  http.post('/api/inventory/transfers/:id/cancel', async ({ params, request }) => {
    const transferId = params.id as string;
    await request.json() as CancelTransferRequest;
    
    const transfer = mockTransfers.get(transferId);
    if (!transfer) {
      return HttpResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    if (transfer.status !== 'DRAFT') {
      return HttpResponse.json({ error: 'Only draft transfers can be cancelled' }, { status: 400 });
    }

    // Update transfer
    const cancelledTransfer: Transfer = {
      ...transfer,
      status: 'CANCELLED',
      cancelledBy: 'current-user'
    };

    mockTransfers.set(transferId, cancelledTransfer);
    
    console.log('✅ MSW: Transfer cancelled:', cancelledTransfer.code);
    return HttpResponse.json({
      transferId: cancelledTransfer.id,
      message: 'Transfer cancelled successfully'
    });
  }),

  // DELETE /api/inventory/transfers/:id - Delete empty draft transfer
  http.delete('/api/inventory/transfers/:id', async ({ params }) => {
    const transferId = params.id as string;
    
    const transfer = mockTransfers.get(transferId);
    if (!transfer) {
      return HttpResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    if (transfer.status !== 'DRAFT') {
      return HttpResponse.json({ error: 'Only draft transfers can be deleted' }, { status: 400 });
    }

    if (transfer.lines.length > 0) {
      return HttpResponse.json({ error: 'Only empty transfers can be deleted' }, { status: 400 });
    }

    mockTransfers.delete(transferId);
    
    console.log('✅ MSW: Transfer deleted:', transfer.code);
    return HttpResponse.json({
      message: 'Transfer deleted successfully'
    });
  }),

  // GET /api/inventory/locations - Get branch locations
  http.get('/api/inventory/locations', async () => {
    try {
      // Use real repository function instead of mock data
      const { listLocations } = await import('./repository');
      const locations = await listLocations();
      console.log(`📍 MSW: Returning ${locations.length} real locations from repository`);
      return HttpResponse.json(locations);
    } catch (error) {
      console.error('Error listing locations:', error);
      return HttpResponse.json([]);
    }
  }),

  // GET /api/inventory/items/search - Search items with stock levels
  http.get('/api/inventory/items/search', async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const locationId = url.searchParams.get('locationId');

    // Import real inventory data
    const { listInventoryItems } = await import('../repository');
    
    try {
      // Get real inventory items from the repository
      const allItems = await listInventoryItems();

      // Filter by search query
      const queryLower = query.toLowerCase();
      const filteredItems = allItems.filter(item =>
        item.name.toLowerCase().includes(queryLower) ||
        item.sku.toLowerCase().includes(queryLower) ||
        item.description?.toLowerCase().includes(queryLower)
      );

      // Transform to expected transfer search format with real data
      const itemsWithStock = filteredItems.map(item => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        unit: item.unit || 'each',
        availableQty: locationId ? item.quantity || 0 : undefined,
        isFractional: ['kg', 'L', 'lb', 'g', 'ml', 'oz'].includes(item.unit || ''),
        category: item.categoryId,
        description: item.description,
        status: item.status
      }));

      console.log(`🔍 MSW: Found ${itemsWithStock.length} real inventory items for query "${query}"`);
      return HttpResponse.json(itemsWithStock.slice(0, 20)); // Limit results
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      return HttpResponse.json([], { status: 500 });
    }
  })
];

// Transfer API service for direct usage
export const transferApiService = {
  async getLocations(): Promise<Location[]> {
    const response = await fetch('/api/inventory/locations');
    return response.json();
  },

  async searchItems(query: string, locationId?: string): Promise<any[]> {
    const params = new URLSearchParams({ q: query });
    if (locationId) params.set('locationId', locationId);
    
    const response = await fetch(`/api/inventory/items/search?${params}`);
    return response.json();
  },

  async createTransfer(request: CreateTransferRequest): Promise<{ transferId: string; code: string }> {
    const response = await fetch('/api/inventory/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  },

  async updateTransfer(transferId: string, updates: Partial<CreateTransferRequest>): Promise<any> {
    const response = await fetch(`/api/inventory/transfers/${transferId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  },

  async getTransfer(transferId: string): Promise<Transfer> {
    const response = await fetch(`/api/inventory/transfers/${transferId}`);
    return response.json();
  },

  async completeTransfer(transferId: string, request: CompleteTransferRequest): Promise<any> {
    const response = await fetch(`/api/inventory/transfers/${transferId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  },

  async cancelTransfer(transferId: string, request: CancelTransferRequest): Promise<any> {
    const response = await fetch(`/api/inventory/transfers/${transferId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return response.json();
  },

  async deleteTransfer(transferId: string): Promise<any> {
    const response = await fetch(`/api/inventory/transfers/${transferId}`, {
      method: 'DELETE'
    });
    return response.json();
  }
};