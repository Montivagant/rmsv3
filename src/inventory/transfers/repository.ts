import { bootstrapEventStore } from '../../bootstrap/persist';
import { logger } from '../../shared/logger';
import type { VersionedEvent } from '../../events/validation';
import type { 
  Transfer, 
  TransferLine, 
  TransferQuery,
  TransfersResponse,
  CreateTransferRequest,
  CompleteTransferRequest,
  CancelTransferRequest,
  TransferStatus,
  Location
} from './types';

//=============================================================================
// INVENTORY TRANSFERS REPOSITORY FUNCTIONS  
//=============================================================================

// Event types for transfer operations
interface TransferCreatedEvent extends VersionedEvent {
  type: 'transfer.created.v1';
  payload: {
    id: string;
    code: string;
    sourceLocationId: string;
    destinationLocationId: string;
    lines: TransferLine[];
    notes?: string;
    createdBy: string;
  };
}

interface TransferCompletedEvent extends VersionedEvent {
  type: 'transfer.completed.v1';
  payload: {
    id: string;
    linesFinal: Array<{
      itemId: string;
      qtyFinal: number;
    }>;
    completedBy: string;
  };
}

interface TransferCancelledEvent extends VersionedEvent {
  type: 'transfer.cancelled.v1';
  payload: {
    id: string;
    reason: string;
    notes?: string;
    cancelledBy: string;
  };
}

interface TransferUpdatedEvent extends VersionedEvent {
  type: 'transfer.updated.v1';
  payload: {
    id: string;
    changes: {
      lines?: TransferLine[];
      notes?: string;
      destinationLocationId?: string;
    };
    updatedBy: string;
  };
}

interface TransferState {
  id: string;
  code: string;
  sourceLocationId: string;
  destinationLocationId: string;
  status: TransferStatus;
  lines: TransferLine[];
  notes?: string;
  createdBy: string;
  completedBy?: string;
  cancelledBy?: string;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

async function loadTransfersMap(): Promise<Map<string, TransferState>> {
  const { store } = await bootstrapEventStore();
  const events = store.getAll() as VersionedEvent[];
  const map = new Map<string, TransferState>();

  for (const event of events) {
    if (event.type === 'transfer.created.v1' || event.type === 'transfer.created') {
      const payload = (event as TransferCreatedEvent).payload;
      const state: TransferState = {
        id: payload.id,
        code: payload.code,
        sourceLocationId: payload.sourceLocationId,
        destinationLocationId: payload.destinationLocationId,
        status: 'DRAFT',
        lines: payload.lines,
        ...(payload.notes !== undefined && { notes: payload.notes }),
        createdBy: payload.createdBy,
        createdAt: event.at,
        updatedAt: event.at,
        deleted: false
      };
      if (payload.notes) {
        state.notes = payload.notes;
      }
      map.set(payload.id, state);
      continue;
    }

    if (event.type === 'transfer.completed.v1' || event.type === 'transfer.completed') {
      const payload = (event as TransferCompletedEvent).payload;
      const transfer = map.get(payload.id);
      if (!transfer) continue;
      
      // Update final quantities
      const linesMap = new Map(transfer.lines.map(line => [line.itemId, line]));
      for (const finalLine of payload.linesFinal) {
        const line = linesMap.get(finalLine.itemId);
        if (line) {
          line.qtyFinal = finalLine.qtyFinal;
        }
      }

      transfer.status = 'COMPLETED';
      transfer.completedBy = payload.completedBy;
      transfer.updatedAt = event.at;
      continue;
    }

    if (event.type === 'transfer.cancelled.v1' || event.type === 'transfer.cancelled') {
      const payload = (event as TransferCancelledEvent).payload;
      const transfer = map.get(payload.id);
      if (!transfer) continue;
      
      transfer.status = 'CANCELLED';
      transfer.cancelledBy = payload.cancelledBy;
      if (payload.notes) {
        transfer.notes = payload.notes;
      }
      transfer.updatedAt = event.at;
      continue;
    }

    if (event.type === 'transfer.updated.v1' || event.type === 'transfer.updated') {
      const payload = (event as TransferUpdatedEvent).payload;
      const transfer = map.get(payload.id);
      if (!transfer) continue;
      
      if (payload.changes.lines) {
        transfer.lines = payload.changes.lines;
      }
      if (payload.changes.notes !== undefined) {
        transfer.notes = payload.changes.notes;
      }
      if (payload.changes.destinationLocationId) {
        transfer.destinationLocationId = payload.changes.destinationLocationId;
      }
      
      transfer.updatedAt = event.at;
      continue;
    }
  }

  return map;
}

function generateTransferCode(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `TRF-${timestamp}${random}`;
}

export async function listTransfers(query: TransferQuery = {}): Promise<TransfersResponse> {
  const transfersMap = await loadTransfersMap();
  let transfers = Array.from(transfersMap.values()).filter(transfer => !transfer.deleted);

  // Apply filters
  if (query.sourceLocationId) {
    transfers = transfers.filter(t => t.sourceLocationId === query.sourceLocationId);
  }
  
  if (query.destinationLocationId) {
    transfers = transfers.filter(t => t.destinationLocationId === query.destinationLocationId);
  }
  
  if (query.status) {
    transfers = transfers.filter(t => t.status === query.status);
  }

  if (query.search) {
    const search = query.search.toLowerCase();
    transfers = transfers.filter(t => 
      t.code.toLowerCase().includes(search) ||
      t.notes?.toLowerCase().includes(search) ||
      t.lines.some(line => 
        line.name.toLowerCase().includes(search) ||
        line.sku.toLowerCase().includes(search)
      )
    );
  }

  // Sort
  const sortBy = query.sortBy || 'code';
  const sortOrder = query.sortOrder || 'desc';
  transfers.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'code') {
      comparison = a.code.localeCompare(b.code);
    } else if (sortBy === 'status') {
      comparison = a.status.localeCompare(b.status);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination
  const page = query.page || 1;
  const pageSize = Math.min(query.pageSize || 25, 100);
  const offset = (page - 1) * pageSize;
  const paginatedData = transfers.slice(offset, offset + pageSize);

  // Convert to response format
  const transferData: Transfer[] = paginatedData.map(transfer => {
    const result: Transfer = {
      id: transfer.id,
      code: transfer.code,
      sourceLocationId: transfer.sourceLocationId,
      destinationLocationId: transfer.destinationLocationId,
      status: transfer.status,
      lines: transfer.lines,
      createdBy: transfer.createdBy,
    };
    if (transfer.notes !== undefined) result.notes = transfer.notes;
    if (transfer.completedBy !== undefined) result.completedBy = transfer.completedBy;
    if (transfer.cancelledBy !== undefined) result.cancelledBy = transfer.cancelledBy;
    return result;
  });

  return {
    data: transferData,
    total: transfers.length,
    page,
    pageSize,
    totalPages: Math.ceil(transfers.length / pageSize)
  };
}

export async function getTransferById(id: string): Promise<Transfer | null> {
  const transfersMap = await loadTransfersMap();
  const transfer = transfersMap.get(id);
  
  if (!transfer || transfer.deleted) {
    return null;
  }

  const result: Transfer = {
    id: transfer.id,
    code: transfer.code,
    sourceLocationId: transfer.sourceLocationId,
    destinationLocationId: transfer.destinationLocationId,
    status: transfer.status,
    lines: transfer.lines,
    createdBy: transfer.createdBy,
  };
  if (transfer.notes !== undefined) result.notes = transfer.notes;
  if (transfer.completedBy !== undefined) result.completedBy = transfer.completedBy;
  if (transfer.cancelledBy !== undefined) result.cancelledBy = transfer.cancelledBy;
  
  return result;
}

export async function createTransfer(request: CreateTransferRequest): Promise<Transfer> {
  const { store } = await bootstrapEventStore();
  const id = `transfer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const code = generateTransferCode();

  // Process lines - get item details from inventory
  const lines: TransferLine[] = request.lines.map((line) => ({
    itemId: line.itemId,
    sku: `SKU-${line.itemId}`, // In real implementation, get from inventory
    name: `Item ${line.itemId}`, // In real implementation, get from inventory
    unit: 'each', // In real implementation, get from inventory
    qtyPlanned: line.qtyPlanned || line.qtyRequested || 0,
  }));

  const payload: {
    id: string;
    code: string;
    sourceLocationId: string;
    destinationLocationId: string;
    lines: TransferLine[];
    notes?: string;
    createdBy: string;
  } = {
    id,
    code,
    sourceLocationId: request.sourceLocationId,
    destinationLocationId: request.destinationLocationId,
    lines,
    createdBy: 'dev-admin', // TODO: get from auth context
  };

  if (request.notes) {
    payload.notes = request.notes;
  }

  store.append('transfer.created.v1', payload, {
    key: `create-transfer-${id}`,
    params: request,
    aggregate: { id, type: 'transfer' }
  });

  logger.info('Created transfer', { id, code });

  const returnTransfer: Transfer = {
    id,
    code,
    sourceLocationId: payload.sourceLocationId,
    destinationLocationId: payload.destinationLocationId,
    status: 'DRAFT',
    lines: payload.lines,
    createdBy: payload.createdBy,
  };

  if (payload.notes) {
    returnTransfer.notes = payload.notes;
  }

  return returnTransfer;
}

export async function completeTransfer(id: string, request: CompleteTransferRequest): Promise<Transfer | null> {
  const { store } = await bootstrapEventStore();
  const transfersMap = await loadTransfersMap();
  const existingTransfer = transfersMap.get(id);
  
  if (!existingTransfer || existingTransfer.deleted) {
    throw new Error('Transfer not found');
  }

  if (existingTransfer.status !== 'DRAFT') {
    throw new Error('Only draft transfers can be completed');
  }

  const payload = {
    id,
    linesFinal: request.linesFinal,
    completedBy: 'dev-admin', // TODO: get from auth context
  };

  store.append('transfer.completed.v1', payload, {
    key: `complete-transfer-${id}`,
    params: { id, request },
    aggregate: { id, type: 'transfer' }
  });

  logger.info('Completed transfer', { id, code: existingTransfer.code });

  // Return updated transfer
  const updatedTransfer = { ...existingTransfer };
  updatedTransfer.status = 'COMPLETED';
  updatedTransfer.completedBy = payload.completedBy;
  
  // Update final quantities
  const linesMap = new Map(updatedTransfer.lines.map(line => [line.itemId, line]));
  for (const finalLine of payload.linesFinal) {
    const line = linesMap.get(finalLine.itemId);
    if (line) {
      line.qtyFinal = finalLine.qtyFinal;
    }
  }

  const returnTransfer: Transfer = {
    id: updatedTransfer.id,
    code: updatedTransfer.code,
    sourceLocationId: updatedTransfer.sourceLocationId,
    destinationLocationId: updatedTransfer.destinationLocationId,
    status: updatedTransfer.status,
    lines: updatedTransfer.lines,
    createdBy: updatedTransfer.createdBy,
    completedBy: updatedTransfer.completedBy,
    ...(updatedTransfer.cancelledBy !== undefined && { cancelledBy: updatedTransfer.cancelledBy }),
  };

  if (updatedTransfer.notes) {
    returnTransfer.notes = updatedTransfer.notes;
  }

  return returnTransfer;
}

export async function cancelTransfer(id: string, request: CancelTransferRequest): Promise<Transfer | null> {
  const { store } = await bootstrapEventStore();
  const transfersMap = await loadTransfersMap();
  const existingTransfer = transfersMap.get(id);
  
  if (!existingTransfer || existingTransfer.deleted) {
    throw new Error('Transfer not found');
  }

  if (existingTransfer.status !== 'DRAFT') {
    throw new Error('Only draft transfers can be cancelled');
  }

  const payload = {
    id,
    reason: request.reason,
    notes: request.notes,
    cancelledBy: 'dev-admin', // TODO: get from auth context
  };

  store.append('transfer.cancelled.v1', payload, {
    key: `cancel-transfer-${id}`,
    params: { id, request },
    aggregate: { id, type: 'transfer' }
  });

  logger.info('Cancelled transfer', { id, code: existingTransfer.code, reason: request.reason });

  // Return updated transfer
  const returnTransfer: Transfer = {
    id: existingTransfer.id,
    code: existingTransfer.code,
    sourceLocationId: existingTransfer.sourceLocationId,
    destinationLocationId: existingTransfer.destinationLocationId,
    status: 'CANCELLED',
    lines: existingTransfer.lines,
    createdBy: existingTransfer.createdBy,
    cancelledBy: payload.cancelledBy,
  };
  
  if (existingTransfer.completedBy !== undefined) {
    returnTransfer.completedBy = existingTransfer.completedBy;
  }

  const notes = request.notes || existingTransfer.notes;
  if (notes) {
    returnTransfer.notes = notes;
  }

  return returnTransfer;
}

export async function updateTransfer(id: string, changes: { lines?: TransferLine[]; notes?: string; destinationLocationId?: string; }): Promise<Transfer | null> {
  const { store } = await bootstrapEventStore();
  const transfersMap = await loadTransfersMap();
  const existingTransfer = transfersMap.get(id);
  
  if (!existingTransfer || existingTransfer.deleted) {
    throw new Error('Transfer not found');
  }

  if (existingTransfer.status !== 'DRAFT') {
    throw new Error('Only draft transfers can be updated');
  }

  const payload = {
    id,
    changes,
    updatedBy: 'dev-admin', // TODO: get from auth context
  };

  store.append('transfer.updated.v1', payload, {
    key: `update-transfer-${id}-${Date.now()}`,
    params: { id, changes },
    aggregate: { id, type: 'transfer' }
  });

  logger.info('Updated transfer', { id, code: existingTransfer.code });

  // Return updated transfer
  const updatedTransfer = { ...existingTransfer };
  if (changes.lines) {
    updatedTransfer.lines = changes.lines;
  }
  if (changes.notes !== undefined) {
    updatedTransfer.notes = changes.notes;
  }
  if (changes.destinationLocationId) {
    updatedTransfer.destinationLocationId = changes.destinationLocationId;
  }

  const returnTransfer: Transfer = {
    id: updatedTransfer.id,
    code: updatedTransfer.code,
    sourceLocationId: updatedTransfer.sourceLocationId,
    destinationLocationId: updatedTransfer.destinationLocationId,
    status: updatedTransfer.status,
    lines: updatedTransfer.lines,
    createdBy: updatedTransfer.createdBy,
  };

  if (updatedTransfer.notes) {
    returnTransfer.notes = updatedTransfer.notes;
  }
  
  if (updatedTransfer.completedBy !== undefined) {
    returnTransfer.completedBy = updatedTransfer.completedBy;
  }
  
  if (updatedTransfer.cancelledBy !== undefined) {
    returnTransfer.cancelledBy = updatedTransfer.cancelledBy;
  }

  return returnTransfer;
}

// Locations for transfers - in real system these would come from branch/location management
export async function listLocations(): Promise<Location[]> {
  // Default locations for development
  const locations: Location[] = [
    {
      id: 'main-restaurant',
      name: 'Main Restaurant',
      type: 'restaurant',
      address: '123 Main St, Downtown',
      isActive: true
    },
    {
      id: 'downtown-location', 
      name: 'Downtown Location',
      type: 'restaurant',
      address: '456 Downtown Ave',
      isActive: true
    },
    {
      id: 'central-warehouse',
      name: 'Central Warehouse',
      type: 'warehouse',
      address: '789 Storage Blvd',
      isActive: true
    },
    {
      id: 'prep-kitchen',
      name: 'Central Prep Kitchen', 
      type: 'prep',
      address: '321 Kitchen St',
      isActive: true
    }
  ];

  return locations;
}

export async function getLocationById(id: string): Promise<Location | null> {
  const locations = await listLocations();
  return locations.find(loc => loc.id === id) || null;
}

// Inventory movements/history (placeholder for now)
export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  type: 'transfer' | 'adjustment' | 'sale' | 'purchase' | 'audit';
  direction: 'in' | 'out';
  quantity: number;
  unit: string;
  fromLocation?: string;
  toLocation?: string;
  reference?: string;
  notes?: string;
  branchId: string;
  userId: string;
  timestamp: string;
}

export async function listInventoryMovements(query: any = {}): Promise<{
  movements: InventoryMovement[];
  total: number;
  page: number;
  pageSize: number;
}> {
  // Placeholder implementation - in real system would query event store for movements
  return {
    movements: [],
    total: 0,
    page: query.page || 1,
    pageSize: query.pageSize || 25
  };
}
