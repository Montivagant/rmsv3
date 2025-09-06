/**
 * Inventory Transfer API Layer
 * MSW mock implementations for simplified transfer flow
 */

import { http, HttpResponse } from 'msw';
import type {
  Transfer,
  TransferLine,
  TransferQuery,
  TransfersResponse,
  CreateTransferRequest,
  CompleteTransferRequest,
  CancelTransferRequest,
  Location
} from './types';
import { TransferUtils, TRANSFER_CONFIG } from './types';

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

  console.log(`📊 MSW: Initialized ${sampleTransfers.length} sample transfers`);
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

    // Filter transfers
    let filteredTransfers = Array.from(mockTransfers.values());

    if (status) {
      filteredTransfers = filteredTransfers.filter(t => t.status === status);
    }

    if (sourceLocationId) {
      filteredTransfers = filteredTransfers.filter(t => t.sourceLocationId === sourceLocationId);
    }

    if (destinationLocationId) {
      filteredTransfers = filteredTransfers.filter(t => t.destinationLocationId === destinationLocationId);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredTransfers = filteredTransfers.filter(t => 
        t.code.toLowerCase().includes(searchLower) ||
        t.notes?.toLowerCase().includes(searchLower) ||
        t.lines.some(l => 
          l.name.toLowerCase().includes(searchLower) ||
          l.sku.toLowerCase().includes(searchLower)
        )
      );
    }

    // Sort by code descending (newest first)
    filteredTransfers.sort((a, b) => b.code.localeCompare(a.code));

    // Paginate
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedTransfers = filteredTransfers.slice(startIndex, endIndex);

    const response: TransfersResponse = {
      data: paginatedTransfers,
      total: filteredTransfers.length,
      page,
      pageSize,
      totalPages: Math.ceil(filteredTransfers.length / pageSize)
    };

    console.log(`📋 MSW: Returning ${paginatedTransfers.length} transfers (page ${page})`);
    return HttpResponse.json(response);
  }),

  // GET /api/inventory/transfers/:id - Get single transfer
  http.get('/api/inventory/transfers/:id', async ({ params }) => {
    const transferId = params.id as string;
    const transfer = mockTransfers.get(transferId);

    if (!transfer) {
      return HttpResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    console.log(`📄 MSW: Returning transfer ${transfer.code}`);
    return HttpResponse.json(transfer);
  }),

  // POST /api/inventory/transfers - Create new transfer
  http.post('/api/inventory/transfers', async ({ request }) => {
    const createRequest = await request.json() as CreateTransferRequest;
    
    // Validate locations
    if (!mockLocations.has(createRequest.sourceLocationId)) {
      return HttpResponse.json({ error: 'Invalid source location' }, { status: 400 });
    }
    if (!mockLocations.has(createRequest.destinationLocationId)) {
      return HttpResponse.json({ error: 'Invalid destination location' }, { status: 400 });
    }
    if (createRequest.sourceLocationId === createRequest.destinationLocationId) {
      return HttpResponse.json({ error: 'Source and destination must be different' }, { status: 400 });
    }

    // Create transfer
    const transferId = TransferUtils.generateTransferId();
    const transferCode = TransferUtils.generateTransferCode();
    
    // Build lines with item details
    const lines: TransferLine[] = createRequest.lines.map(line => {
      // In real implementation, would fetch from item service
      const mockItems: Record<string, { sku: string; name: string; unit: string }> = {
        'item-tomatoes': { sku: 'VEG-TOMATO-001', name: 'Fresh Tomatoes', unit: 'kg' },
        'item-lettuce': { sku: 'VEG-LETTUCE-001', name: 'Iceberg Lettuce', unit: 'each' },
        'item-chicken': { sku: 'MEAT-CHICKEN-001', name: 'Chicken Breast', unit: 'kg' },
        'item-beef': { sku: 'MEAT-BEEF-001', name: 'Ground Beef', unit: 'kg' },
        'item-rice': { sku: 'DRY-RICE-001', name: 'Basmati Rice', unit: 'kg' },
        'item-pasta': { sku: 'DRY-PASTA-001', name: 'Penne Pasta', unit: 'kg' },
        'item-olive-oil': { sku: 'OIL-OLIVE-001', name: 'Extra Virgin Olive Oil', unit: 'L' },
        'item-milk': { sku: 'DAIRY-MILK-001', name: 'Whole Milk', unit: 'L' }
      };
      
      const item = mockItems[line.itemId] || {
        sku: `SKU-${line.itemId.slice(-6).toUpperCase()}`,
        name: `Item ${line.itemId.slice(-4)}`,
        unit: 'each'
      };

      return {
        itemId: line.itemId,
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        qtyPlanned: line.qtyPlanned
      };
    });

    const newTransfer: Transfer = {
      id: transferId,
      code: transferCode,
      sourceLocationId: createRequest.sourceLocationId,
      destinationLocationId: createRequest.destinationLocationId,
      status: 'DRAFT',
      lines,
      notes: createRequest.notes,
      createdBy: 'current-user'
    };

    mockTransfers.set(transferId, newTransfer);
    
    console.log('✅ MSW: Created new transfer:', transferCode);
    return HttpResponse.json({
      transferId,
      code: transferCode,
      message: 'Transfer created successfully'
    });
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
          qtyPlanned: line.qtyPlanned
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
    const cancelRequest = await request.json() as CancelTransferRequest;
    
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
    const locations = Array.from(mockLocations.values()).filter(loc => loc.isActive);
    console.log(`📍 MSW: Returning ${locations.length} active locations`);
    return HttpResponse.json(locations);
  }),

  // GET /api/inventory/items/search - Search items with stock levels
  http.get('/api/inventory/items/search', async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const locationId = url.searchParams.get('locationId');

    // Mock items with stock levels
    const allItems = [
      { id: 'item-tomatoes', sku: 'VEG-TOMATO-001', name: 'Fresh Tomatoes', unit: 'kg' },
      { id: 'item-lettuce', sku: 'VEG-LETTUCE-001', name: 'Iceberg Lettuce', unit: 'each' },
      { id: 'item-chicken', sku: 'MEAT-CHICKEN-001', name: 'Chicken Breast', unit: 'kg' },
      { id: 'item-beef', sku: 'MEAT-BEEF-001', name: 'Ground Beef', unit: 'kg' },
      { id: 'item-rice', sku: 'DRY-RICE-001', name: 'Basmati Rice', unit: 'kg' },
      { id: 'item-pasta', sku: 'DRY-PASTA-001', name: 'Penne Pasta', unit: 'kg' },
      { id: 'item-olive-oil', sku: 'OIL-OLIVE-001', name: 'Extra Virgin Olive Oil', unit: 'L' },
      { id: 'item-milk', sku: 'DAIRY-MILK-001', name: 'Whole Milk', unit: 'L' }
    ];

    // Filter by search query
    const queryLower = query.toLowerCase();
    const filteredItems = allItems.filter(item =>
      item.name.toLowerCase().includes(queryLower) ||
      item.sku.toLowerCase().includes(queryLower)
    );

    // Add stock levels if location specified
    const itemsWithStock = filteredItems.map(item => ({
      ...item,
      availableQty: locationId ? getStock(item.id, locationId) : undefined,
      isFractional: ['kg', 'L'].includes(item.unit)
    }));

    console.log(`🔍 MSW: Found ${itemsWithStock.length} items for query "${query}"`);
    return HttpResponse.json(itemsWithStock.slice(0, 20)); // Limit results
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