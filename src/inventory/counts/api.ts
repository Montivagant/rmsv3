/**
 * Inventory Audit API Layer
 * MSW mock implementations for development and testing
 */

import { http, HttpResponse } from 'msw';
import { eventStore } from '../../events/store';
import type {
  InventoryCount,
  CountItem,
  CountsResponse,
  CreateCountRequest,
  UpdateCountItemRequest,
  BulkUpdateCountItemsRequest,
  SubmitCountRequest,
  SubmitCountResponse,
  CancelCountRequest
} from './types';
import { CountUtils } from './types';

// Mock data store
const mockCounts = new Map<string, InventoryCount>();
const mockCountItems = new Map<string, CountItem[]>(); // countId -> items[]

// Initialize some mock data
function initializeMockCounts() {
  // Clear existing data to prevent stale entries
  mockCounts.clear();
  mockCountItems.clear();
  const now = new Date().toISOString();
  
  // Sample count sessions
  const sampleCounts: InventoryCount[] = [
    {
      id: 'COUNT_1704067200000_ABC123',
      branchId: 'main-restaurant',
      status: 'closed',
      createdBy: 'john.manager',
      createdAt: '2024-12-28T09:00:00Z',
      closedBy: 'john.manager',
      closedAt: '2024-12-28T11:30:00Z',
      scope: { all: true },
      totals: {
        varianceQty: -12.5,
        varianceValue: -45.80,
        itemsCountedCount: 156,
        totalItemsCount: 156,
        positiveVarianceValue: 23.40,
        negativeVarianceValue: 69.20
      },
      metadata: {
        lastSavedAt: '2024-12-28T11:30:00Z',
        submittedAt: '2024-12-28T11:30:00Z',
        adjustmentBatchId: 'COUNTADJ_COUNT_1704067200000_ABC123_1704074200000',
        actualDurationMinutes: 150,
        notes: 'End of month full count'
      }
    },
    {
      id: 'COUNT_1704153600000_DEF456',
      branchId: 'downtown-location',
      status: 'open',
      createdBy: 'jane.supervisor',
      createdAt: '2024-12-29T14:00:00Z',
      scope: {
        filters: {
          categoryIds: ['beverages', 'alcohol'],
          storageLocationIds: ['bar-area', 'wine-cellar']
        }
      },
      totals: {
        varianceQty: 5.2,
        varianceValue: 12.40,
        itemsCountedCount: 23,
        totalItemsCount: 45,
        positiveVarianceValue: 18.60,
        negativeVarianceValue: 6.20
      },
      metadata: {
        lastSavedAt: '2024-12-29T15:45:00Z',
        estimatedDurationMinutes: 90,
        notes: 'Weekly beverage cycle count'
      }
    },
    {
      id: 'COUNT_1704240000000_GHI789',
      branchId: 'main-restaurant',
      status: 'draft',
      createdBy: 'mike.assistant',
      createdAt: now,
      scope: {
        filters: {
          categoryIds: ['produce', 'meat'],
          includeInactive: false
        }
      },
      totals: {
        varianceQty: 0,
        varianceValue: 0,
        itemsCountedCount: 0,
        totalItemsCount: 78,
        positiveVarianceValue: 0,
        negativeVarianceValue: 0
      },
      metadata: {
        lastSavedAt: now,
        estimatedDurationMinutes: 60,
        notes: 'Perishables spot check'
      }
    }
  ];

  sampleCounts.forEach(count => {
    mockCounts.set(count.id, count);
  });

  // Sample count items for the open count
  const sampleCountItems: CountItem[] = Array.from({ length: 45 }, (_, i) => ({
    id: `COUNT_1704153600000_DEF456_item_${i}`,
    itemId: `item_${i}`,
    sku: `BEV${String(i + 1).padStart(3, '0')}`,
    name: `Beverage Item ${i + 1}`,
    unit: i % 3 === 0 ? 'bottles' : i % 3 === 1 ? 'cases' : 'liters',
    auditedQty: i < 10 ? Math.floor(Math.random() * 100) : null,
    categoryName: i < 30 ? 'Beverages' : 'Alcohol',
    
    // Snapshot data
    snapshotQty: Math.floor(Math.random() * 100) + 10,
    snapshotAvgCost: Math.round((Math.random() * 15 + 5) * 100) / 100,
    snapshotTimestamp: '2024-12-29T14:00:00Z',
    
    // Count data (some items already counted)
    countedQty: i < 23 ? Math.floor(Math.random() * 100) + 8 : null,
    ...(i < 23 && { countedBy: 'jane.supervisor' }),
    ...(i < 23 && { countedAt: '2024-12-29T15:30:00Z' }),
    
    // Calculated fields (would be computed)
    varianceQty: 0,
    varianceValue: 0,
    variancePercentage: 0,
    
    isActive: true,
    hasDiscrepancy: Math.random() > 0.85
  }));

  // Calculate variances for counted items  
  sampleCountItems.forEach(item => {
    if (item.countedQty !== null && item.countedQty !== undefined) {
      // Manual variance calculation to avoid circular dependency
      const varianceQty = item.countedQty - item.snapshotQty;
      const varianceValue = varianceQty * item.snapshotAvgCost;
      const variancePercentage = item.snapshotQty === 0 ? 
        ((item.countedQty || 0) > 0 ? 100 : 0) :
        (varianceQty / item.snapshotQty) * 100;
      
      Object.assign(item, {
        varianceQty: Math.round(varianceQty * 100) / 100,
        varianceValue: Math.round(varianceValue * 100) / 100,
        variancePercentage: Math.round(variancePercentage * 100) / 100,
        hasDiscrepancy: Math.abs(variancePercentage) > 10
      });
    }
  });

  mockCountItems.set('COUNT_1704153600000_DEF456', sampleCountItems);
}

// Initialize mock data
initializeMockCounts();

// MSW API handlers
export const inventoryCountApiHandlers = [
  // GET /api/inventory/counts - List counts
  http.get('/api/inventory/counts', async ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '25');
    const status = url.searchParams.get('status');
    const branchId = url.searchParams.get('branchId');
    const search = url.searchParams.get('search');

        // Rehydrate counts from event store if needed (persisted across reloads)
    try {
      const createdEvents = eventStore.getAll().filter(e => e.type === 'inventory.audit.created');
      for (const ev of createdEvents) {
        const id = ev.payload?.auditId || ev.aggregate?.id;
        if (id && !mockCounts.has(id)) {
          const when = new Date(ev.at).toISOString();
          mockCounts.set(id, {
            id,
            branchId: ev.payload?.branchId || 'main-restaurant',
            status: 'draft',
            createdBy: ev.payload?.createdBy || 'current-user',
            createdAt: when,
            scope: ev.payload?.scope || { all: true },
            totals: {
              varianceQty: 0,
              varianceValue: 0,
              itemsCountedCount: 0,
              totalItemsCount: ev.payload?.itemCount || 0,
              positiveVarianceValue: 0,
              negativeVarianceValue: 0
            },
            metadata: { lastSavedAt: when }
          } as any);
        }
      }
    } catch {
      // ignore event ingestion errors in mock API
    }
    let filteredCounts = Array.from(mockCounts.values());

    // Apply filters
    if (status && status !== 'all') {
      filteredCounts = filteredCounts.filter(count => count.status === status);
    }

    if (branchId) {
      filteredCounts = filteredCounts.filter(count => count.branchId === branchId);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredCounts = filteredCounts.filter(count => 
        count.id.toLowerCase().includes(searchLower) ||
        count.branchId.toLowerCase().includes(searchLower) ||
        count.createdBy.toLowerCase().includes(searchLower)
      );
    }

    // Sort by creation date (newest first)
    filteredCounts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const total = filteredCounts.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCounts = filteredCounts.slice(startIndex, endIndex);

    const response: CountsResponse = {
      data: paginatedCounts,
      total,
      page,
      pageSize,
      hasMore: endIndex < total
    };

    return HttpResponse.json(response);
  }),

  // POST /api/inventory/counts - Create new count
  http.post('/api/inventory/counts', async ({ request }) => {
    const requestData = await request.json() as CreateCountRequest;
    
    // Validate request
    if (!requestData.branchId) {
      return new HttpResponse(JSON.stringify({ 
        error: 'branchId is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate count ID
    const countId = CountUtils.generateCountId();
    const now = new Date().toISOString();

    // Create count session
    const newCount: InventoryCount = {
      id: countId,
      branchId: requestData.branchId,
      status: 'draft',
      createdBy: 'current-user', // Would get from auth
      createdAt: now,
      scope: requestData.scope,
      totals: {
        varianceQty: 0,
        varianceValue: 0,
        itemsCountedCount: 0,
        totalItemsCount: 0, // Would calculate based on scope
        positiveVarianceValue: 0,
        negativeVarianceValue: 0
      },
      metadata: {
        lastSavedAt: now,
        ...(requestData.notes && { notes: requestData.notes }),
        ...(requestData.estimatedDurationMinutes != null && { estimatedDurationMinutes: requestData.estimatedDurationMinutes })
      }
    };

    // Estimate item count based on scope
    let estimatedItemCount = 0;
    if (requestData.scope.all) {
      estimatedItemCount = 500; // Mock estimate for all items
    } else if (requestData.scope.filters) {
      estimatedItemCount = Math.floor(Math.random() * 200) + 50; // Mock filtered count
    }

    newCount.totals.totalItemsCount = estimatedItemCount;

    // Store count
    mockCounts.set(countId, newCount);

    // Generate mock count items (simplified for demo)
    const countItems: CountItem[] = Array.from({ length: estimatedItemCount }, (_, i) => ({
      id: `${countId}_item_${i}`,
      itemId: `item_${i}`,
      sku: `ITM${String(i + 1).padStart(3, '0')}`,
      name: `Item ${i + 1}`,
      unit: ['pieces', 'kg', 'liters', 'cases'][i % 4],
      categoryName: ['Produce', 'Meat', 'Dairy', 'Beverages'][i % 4],
      auditedQty: null,
      
      snapshotQty: Math.floor(Math.random() * 100) + 10,
      snapshotAvgCost: Math.round((Math.random() * 20 + 2) * 100) / 100,
      snapshotTimestamp: now,
      
      countedQty: null,
      varianceQty: 0,
      varianceValue: 0,
      variancePercentage: 0,
      
      isActive: true,
      hasDiscrepancy: false
    }));

    mockCountItems.set(countId, countItems);
    // Append audit created event to the event store for persistence/analytics
    try {
      eventStore.append('inventory.audit.created', {
        auditId: countId,
        branchId: requestData.branchId,
        scope: requestData.scope,
        itemCount: estimatedItemCount,
        createdBy: 'current-user'
      }, { aggregate: { id: countId, type: 'inventory.audit' }, key: `audit.created:${countId}` });
    } catch {
      // non-fatal: event store append failed in mock
    }


    console.log(`📊 MSW: Created count session ${countId} with ${estimatedItemCount} items`);

    return HttpResponse.json({
      countId,
      itemCount: estimatedItemCount,
      message: 'Count session created successfully'
    }, { status: 201 });
  }),

  // GET /api/inventory/counts/:id - Get count details
  http.get('/api/inventory/counts/:id', async ({ params }) => {
    const { id } = params;
    
    // Debug logging
    console.log(`🔍 MSW: Looking for count ID: ${id}`);
    console.log(`📊 MSW: Available count IDs:`, Array.from(mockCounts.keys()));
    
    const count = mockCounts.get(id as string);
    const items = mockCountItems.get(id as string) || [];

    if (!count) {
      console.error(`❌ MSW: Count ${id} not found`);
      return new HttpResponse(JSON.stringify({ 
        error: `Count session ${id} not found` 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ MSW: Found count ${id} with ${items.length} items`);
    return HttpResponse.json({
      count,
      items
    });
  }),

  // PUT /api/inventory/counts/:id/items - Update count items
  http.put('/api/inventory/counts/:id/items', async ({ params, request }) => {
    const { id } = params;
    const { updates } = await request.json() as BulkUpdateCountItemsRequest;
    
    const count = mockCounts.get(id as string);
    if (!count) {
      return new HttpResponse(null, { status: 404 });
    }

    if (count.status !== 'draft' && count.status !== 'open') {
      return new HttpResponse(JSON.stringify({ 
        error: 'Count must be in draft or open status to edit' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const items = mockCountItems.get(id as string) || [];
    let updatedCount = 0;

    // Apply updates
    updates.forEach(update => {
      const itemIndex = items.findIndex(item => item.itemId === update.itemId);
      if (itemIndex >= 0) {
        const item = items[itemIndex];
        
        // Update count data
        item.countedQty = update.countedQty;
        item.auditedQty = update.countedQty;
        item.countedBy = 'current-user';
        item.countedAt = new Date().toISOString();
        if (update.notes) {
          item.notes = update.notes;
        }

        // Recalculate variance manually to avoid circular dependency
        const varianceQty = item.countedQty - item.snapshotQty;
        const varianceValue = varianceQty * item.snapshotAvgCost;
        const variancePercentage = item.snapshotQty === 0 ? 
          (item.countedQty > 0 ? 100 : 0) :
          (varianceQty / item.snapshotQty) * 100;
        
        Object.assign(item, {
          varianceQty: Math.round(varianceQty * 100) / 100,
          varianceValue: Math.round(varianceValue * 100) / 100,
          variancePercentage: Math.round(variancePercentage * 100) / 100,
          hasDiscrepancy: Math.abs(variancePercentage) > 10
        });

        updatedCount++;
      }
    });

    // Recalculate totals for the count
    const countedItems = items.filter(item => item.countedQty !== null);
    const totalVarianceValue = items.reduce((sum, item) => sum + item.varianceValue, 0);
    const totalVarianceQty = items.reduce((sum, item) => sum + item.varianceQty, 0);
    const positiveVariances = items.filter(item => item.varianceValue > 0);
    const negativeVariances = items.filter(item => item.varianceValue < 0);

    // Update count totals
    count.totals = {
      varianceQty: totalVarianceQty,
      varianceValue: totalVarianceValue,
      itemsCountedCount: countedItems.length,
      totalItemsCount: items.length,
      positiveVarianceValue: positiveVariances.reduce((sum, item) => sum + item.varianceValue, 0),
      negativeVarianceValue: Math.abs(negativeVariances.reduce((sum, item) => sum + item.varianceValue, 0))
    };

    count.metadata.lastSavedAt = new Date().toISOString();

    console.log(`📊 MSW: Updated ${updatedCount} count items for session ${id}`);
    try {
      eventStore.append('inventory.audit.updated', {
        auditId: id,
        itemsUpdated: updates.map(u => ({ itemId: u.itemId, auditedQty: (u as any).countedQty ?? 0, previousAuditedQty: null })),
        updatedBy: 'current-user'
      }, { aggregate: { id: id as string, type: 'inventory.audit' }, key: `audit.updated:${id}:${Date.now()}` });
    } catch {
      // non-fatal: event store append failed in mock
    }

    return HttpResponse.json({
      success: true,
      updatedCount,
      totals: count.totals
    });
  }),

  // POST /api/inventory/counts/:id/submit - Submit count
  http.post('/api/inventory/counts/:id/submit', async ({ params, request }) => {
    const { id } = params;
    await request.json() as SubmitCountRequest;
    
    const count = mockCounts.get(id as string);
    const items = mockCountItems.get(id as string) || [];

    if (!count) {
      return new HttpResponse(null, { status: 404 });
    }

    if (count.status !== 'draft' && count.status !== 'open') {
      return new HttpResponse(JSON.stringify({ 
        error: 'Count must be in draft or open status to submit' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const countedItems = items.filter(item => item.countedQty !== null);
    if (countedItems.length === 0) {
      return new HttpResponse(JSON.stringify({ 
        error: 'At least one item must be counted before submission' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate adjustment batch ID
    const adjustmentBatchId = `COUNTADJ_${id}_${Date.now()}`;
    const now = new Date().toISOString();

    // Create adjustments for items with variances
    const itemsWithVariance = countedItems.filter(item => item.varianceQty !== 0);
    const adjustments = itemsWithVariance.map(item => ({
      itemId: item.itemId,
      sku: item.sku,
      name: item.name,
      adjustmentQty: item.varianceQty,
      adjustmentValue: item.varianceValue,
      newStockLevel: item.snapshotQty + item.varianceQty
    }));

    // Update count status
    count.status = 'closed';
    count.closedBy = 'current-user';
    count.closedAt = now;
    count.metadata.submittedAt = now;
    count.metadata.adjustmentBatchId = adjustmentBatchId;
    count.metadata.actualDurationMinutes = Math.floor(
      (new Date(now).getTime() - new Date(count.createdAt).getTime()) / (1000 * 60)
    );

    // Build movements report from real event store between audit start and now
    const createdAtMs = new Date(count.createdAt).getTime();
    const nowMs = new Date(now).getTime();
    const allEvents = eventStore.getAll();
    const windowEvents = allEvents.filter(e => e.at >= createdAtMs && e.at <= nowMs);

    const movements = [] as Array<{
      itemId: string;
      itemName: string;
      sku: string;
      movementType: 'sale' | 'receipt' | 'adjustment' | 'transfer' | 'waste' | 'production';
      quantity: number;
      timestamp: string;
      reference: string;
      performedBy?: string;
      reason?: string;
    }>;

    for (const ev of windowEvents) {
      try {
        switch (ev.type) {
          case 'sale.recorded': {
            const lines = ev.payload?.lines || [];
            for (const line of lines) {
              const sku = line.sku || '';
              movements.push({
                itemId: sku || line.name,
                itemName: line.name,
                sku,
                movementType: 'sale',
                quantity: -(line.qty || 0),
                timestamp: new Date(ev.at).toISOString(),
                reference: ev.payload?.ticketId || ev.id,
                performedBy: 'pos',
              });
            }
            break;
          }
          case 'inventory.received': {
            const received = ev.payload?.items || [];
            for (const r of received) {
              const sku = r.sku || '';
              movements.push({
                itemId: sku,
                itemName: sku,
                sku,
                movementType: 'receipt',
                quantity: r.quantityReceived || 0,
                timestamp: new Date(ev.at).toISOString(),
                reference: ev.payload?.purchaseOrderId || ev.id,
                performedBy: ev.payload?.receivedBy || 'system',
              });
            }
            break;
          }
          case 'inventory.adjusted': {
            const sku = ev.payload?.sku || '';
            const oldQty = Number(ev.payload?.oldQty ?? 0);
            const newQty = Number(ev.payload?.newQty ?? 0);
            movements.push({
              itemId: sku,
              itemName: sku,
              sku,
              movementType: 'adjustment',
              quantity: newQty - oldQty,
              timestamp: new Date(ev.at).toISOString(),
              reference: ev.id,
              performedBy: 'system',
              reason: ev.payload?.reason,
            });
            break;
          }
          case 'inventory.transfer.initiated': {
            // If transfer payload includes items, add a summary entry
            const transfer = ev.payload?.transfer;
            const itemCount = Array.isArray(transfer?.items) ? transfer.items.length : 0;
            if (itemCount > 0) {
              movements.push({
                itemId: transfer.id || 'transfer',
                itemName: 'Stock Transfer',
                sku: '',
                movementType: 'transfer',
                quantity: 0,
                timestamp: new Date(ev.at).toISOString(),
                reference: transfer.id || ev.id,
                performedBy: transfer.createdBy || 'system',
              });
            }
            break;
          }
          case 'inventory.batch.wasted': {
            const sku = ev.payload?.sku || ev.payload?.batchId || '';
            movements.push({
              itemId: sku,
              itemName: sku,
              sku,
              movementType: 'waste',
              quantity: -(Number(ev.payload?.wasteQuantity || 0)),
              timestamp: new Date(ev.at).toISOString(),
              reference: ev.id,
              performedBy: ev.payload?.markedBy || 'system',
              reason: ev.payload?.reason,
            });
            break;
          }
          case 'inventory.batch.consumed': {
            const sku = ev.payload?.sku || '';
            const qty = Number(ev.payload?.consumption?.quantity || 0);
            movements.push({
              itemId: sku,
              itemName: sku,
              sku,
              movementType: 'production',
              quantity: -qty,
              timestamp: new Date(ev.at).toISOString(),
              reference: ev.id,
              performedBy: 'system',
            });
            break;
          }
          default:
            break;
        }
      } catch {
        // ignore movement event parse errors
      }
    }

    const movementsDuringAudit = {
      hasMovements: movements.length > 0,
      movements: movements.map(m => ({
        ...m,
        performedBy: m.performedBy || 'system',
        reason: m.reason || 'System generated movement'
      })),
      message: movements.length > 0
        ? `${movements.length} inventory movements occurred during this audit.`
        : 'No stock movements occurred during the audit.'
    };

    const response: SubmitCountResponse = {
      adjustmentBatchId,
      adjustments,
      summary: {
        totalAdjustments: adjustments.length,
        totalVarianceValue: count.totals.varianceValue,
        positiveAdjustments: adjustments.filter(a => a.adjustmentQty > 0).length,
        negativeAdjustments: adjustments.filter(a => a.adjustmentQty < 0).length
      },
      movementsDuringAudit
    };

    console.log(`📊 MSW: Submitted count ${id} with ${adjustments.length} adjustments`);
    try {
      eventStore.append('inventory.audit.submitted', {
        auditId: id,
        branchId: count.branchId,
        adjustmentBatchId,
        totalVarianceValue: count.totals.varianceValue,
        adjustmentCount: adjustments.length,
        submittedBy: 'current-user'
      }, { aggregate: { id: id as string, type: 'inventory.audit' }, key: `audit.submitted:${id}` });
    } catch {
      // non-fatal: event store append failed in mock
    }

    return HttpResponse.json(response, { status: 200 });
  }),

  // POST /api/inventory/counts/:id/cancel - Cancel count
  http.post('/api/inventory/counts/:id/cancel', async ({ params, request }) => {
    const { id } = params;
    const { reason, notes } = await request.json() as CancelCountRequest;
    
    const count = mockCounts.get(id as string);
    if (!count) {
      return new HttpResponse(null, { status: 404 });
    }

    if (count.status === 'closed') {
      return new HttpResponse(JSON.stringify({ 
        error: 'Cannot cancel a closed count' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update count status
    count.status = 'cancelled';
    count.metadata.lastSavedAt = new Date().toISOString();
    if (notes) {
      count.metadata.notes = `${count.metadata.notes || ''}\n\nCancelled: ${reason}\n${notes}`.trim();
    }

    console.log(`📊 MSW: Cancelled count ${id}, reason: ${reason}`);

    return HttpResponse.json({ success: true });
  }),

  // GET /api/inventory/counts/:id/export - Export count results  
  http.get('/api/inventory/counts/:id/export', async ({ params, request }) => {
    const { id } = params;
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'csv';

    const count = mockCounts.get(id as string);
    const items = mockCountItems.get(id as string) || [];

    if (!count) {
      return new HttpResponse(null, { status: 404 });
    }

    if (format === 'csv') {
      // Generate CSV content
      const headers = [
        'SKU',
        'Item Name',
        'Unit',
        'Theoretical Qty',
        'Counted Qty', 
        'Variance Qty',
        'Variance Value',
        'Counted By',
        'Notes'
      ];

      const rows = items.map(item => [
        item.sku,
        item.name,
        item.unit,
        item.snapshotQty.toString(),
        item.countedQty?.toString() || '',
        item.varianceQty.toString(),
        item.varianceValue.toFixed(2),
        item.countedBy || '',
        item.notes || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return new HttpResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="count-${id}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return new HttpResponse(null, { status: 400 });
  })
];

// API service functions (for use in components)
export const countApiService = {
  async createCount(request: CreateCountRequest): Promise<{ countId: string; itemCount: number }> {
    const response = await fetch('/api/inventory/counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create count');
    }

    return response.json();
  },

  async getCount(countId: string): Promise<{ count: InventoryCount; items: CountItem[] }> {
    const response = await fetch(`/api/inventory/counts/${countId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load count');
    }

    return response.json();
  },

  async updateCountItems(countId: string, updates: UpdateCountItemRequest[]): Promise<any> {
    const response = await fetch(`/api/inventory/counts/${countId}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update count items');
    }

    return response.json();
  },

  async submitCount(countId: string, request: SubmitCountRequest): Promise<SubmitCountResponse> {
    const response = await fetch(`/api/inventory/counts/${countId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit count');
    }

    return response.json();
  },

  async cancelCount(countId: string, request: CancelCountRequest): Promise<void> {
    const response = await fetch(`/api/inventory/counts/${countId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel count');
    }
  }
};



