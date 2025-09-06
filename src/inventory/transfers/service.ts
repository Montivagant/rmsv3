/**
 * Inventory Transfer Service
 * Simplified transfer system with immediate stock movement on completion
 */

import type { EventStore } from '../../events/types';
import { generateEventId } from '../../events/hash';
import { getCurrentUser } from '../../rbac/roles';
import type {
  Transfer,
  TransferLine,
  CreateTransferRequest,
  CompleteTransferRequest,
  CancelTransferRequest,
  TransferQuery,
  TransfersResponse,
  TransferCreatedEvent,
  TransferCompletedEvent,
  TransferCancelledEvent,
  TransferValidationError,
  Location
} from './types';
import { TransferUtils, TRANSFER_CONFIG } from './types';

export class InventoryTransferService {
  private eventStore: EventStore;
  private locations: Map<string, Location>;

  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
    this.locations = new Map();
    this.initializeLocations();
  }

  /**
   * Initialize mock branch locations for development
   */
  private initializeLocations() {
    const mockLocations: Location[] = [
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
        address: '456 Market St, Downtown',
        isActive: true
      },
      {
        id: 'westside-branch',
        name: 'Westside Branch',
        type: 'restaurant',
        address: '789 West Ave, Westside',
        isActive: true
      },
      {
        id: 'central-warehouse',
        name: 'Central Warehouse',
        type: 'warehouse',
        address: '100 Industrial Blvd',
        isActive: true
      },
      {
        id: 'central-kitchen',
        name: 'Central Kitchen',
        type: 'central_kitchen',
        address: '200 Production Way',
        isActive: true
      }
    ];

    mockLocations.forEach(loc => this.locations.set(loc.id, loc));
  }

  /**
   * Create a new transfer (Draft status)
   */
  async createTransfer(request: CreateTransferRequest): Promise<Transfer> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to create transfers');
    }

    // Validate request
    const validation = TransferUtils.validateCreateTransfer(request);
    if (!validation.isValid) {
      throw new TransferValidationError(
        validation.errors.map(msg => ({
          code: 'VALIDATION_ERROR',
          message: msg
        }))
      );
    }

    // Validate locations exist
    const sourceLocation = this.locations.get(request.sourceLocationId);
    const destinationLocation = this.locations.get(request.destinationLocationId);
    
    if (!sourceLocation) {
      throw new TransferValidationError([{
        code: 'INVALID_LOCATION',
        message: 'Source location not found'
      }]);
    }
    
    if (!destinationLocation) {
      throw new TransferValidationError([{
        code: 'INVALID_LOCATION',
        message: 'Destination location not found'
      }]);
    }

    // Generate identifiers
    const transferId = TransferUtils.generateTransferId();
    const transferCode = TransferUtils.generateTransferCode();

    // Create transfer lines with item details
    const lines: TransferLine[] = await Promise.all(
      request.lines.map(async (lineRequest) => {
        const itemDetails = await this.getItemDetails(lineRequest.itemId);
        
        return {
          itemId: lineRequest.itemId,
          sku: itemDetails.sku,
          name: itemDetails.name,
          unit: itemDetails.unit,
          qtyPlanned: lineRequest.qtyPlanned
        };
      })
    );

    // Create transfer entity
    const transfer: Transfer = {
      id: transferId,
      code: transferCode,
      sourceLocationId: request.sourceLocationId,
      destinationLocationId: request.destinationLocationId,
      status: 'DRAFT',
      lines,
      notes: request.notes,
      createdBy: currentUser.id
    };

    // Record creation event
    const event: TransferCreatedEvent = {
      type: 'inventory.transfer.created',
      payload: {
        transferId,
        sourceLocationId: request.sourceLocationId,
        destinationLocationId: request.destinationLocationId,
        lines,
        createdBy: currentUser.id
      },
      timestamp: new Date().toISOString(),
      aggregateId: transferId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: transferId, type: 'inventory-transfer' }
    });

    return transfer;
  }

  /**
   * Complete a transfer (DRAFT → COMPLETED with immediate stock movement)
   */
  async completeTransfer(transferId: string, request: CompleteTransferRequest): Promise<Transfer> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to complete transfers');
    }

    // Get current transfer state
    const transfer = await this.getTransfer(transferId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    // Get available stock for validation
    const availableStock = await this.getAvailableStock(
      transfer.lines.map(l => l.itemId),
      transfer.sourceLocationId
    );

    // Validate completion request
    const validation = TransferUtils.validateCompleteTransfer(transfer, request, availableStock);
    if (!validation.isValid) {
      throw new TransferValidationError(
        validation.errors.map(msg => ({
          code: 'VALIDATION_ERROR',
          message: msg
        }))
      );
    }

    // Update lines with final quantities
    const completedLines: TransferLine[] = transfer.lines.map(line => {
      const finalLine = request.linesFinal.find(f => f.itemId === line.itemId);
      return {
        ...line,
        qtyFinal: finalLine?.qtyFinal || line.qtyPlanned
      };
    });

    // Apply stock movements atomically
    await this.applyStockMovements(transfer, completedLines);

    // Record completion event
    const event: TransferCompletedEvent = {
      type: 'inventory.transfer.completed',
      payload: {
        transferId,
        sourceLocationId: transfer.sourceLocationId,
        destinationLocationId: transfer.destinationLocationId,
        lines: completedLines.map(line => ({
          itemId: line.itemId,
          sku: line.sku,
          qtyFinal: line.qtyFinal || line.qtyPlanned
        })),
        completedBy: currentUser.id
      },
      timestamp: new Date().toISOString(),
      aggregateId: transferId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: transferId, type: 'inventory-transfer' }
    });

    // Return updated transfer
    return {
      ...transfer,
      status: 'COMPLETED',
      lines: completedLines,
      completedBy: currentUser.id
    };
  }

  /**
   * Cancel a transfer (DRAFT → CANCELLED)
   */
  async cancelTransfer(transferId: string, request: CancelTransferRequest): Promise<Transfer> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to cancel transfers');
    }

    // Get current transfer state
    const transfer = await this.getTransfer(transferId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'DRAFT') {
      throw new Error('Only draft transfers can be cancelled');
    }

    // Record cancellation event
    const event: TransferCancelledEvent = {
      type: 'inventory.transfer.cancelled',
      payload: {
        transferId,
        reason: request.reason,
        cancelledBy: currentUser.id
      },
      timestamp: new Date().toISOString(),
      aggregateId: transferId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: transferId, type: 'inventory-transfer' }
    });

    // Return updated transfer
    return {
      ...transfer,
      status: 'CANCELLED',
      cancelledBy: currentUser.id
    };
  }

  /**
   * Update a draft transfer
   */
  async updateTransferDraft(transferId: string, updates: Partial<CreateTransferRequest>): Promise<Transfer> {
    const transfer = await this.getTransfer(transferId);
    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status !== 'DRAFT') {
      throw new Error('Only draft transfers can be updated');
    }

    // Validate updates if provided
    if (updates.sourceLocationId || updates.destinationLocationId || updates.lines) {
      const updatedRequest: CreateTransferRequest = {
        sourceLocationId: updates.sourceLocationId || transfer.sourceLocationId,
        destinationLocationId: updates.destinationLocationId || transfer.destinationLocationId,
        lines: updates.lines || transfer.lines.map(l => ({ itemId: l.itemId, qtyPlanned: l.qtyPlanned })),
        notes: updates.notes
      };

      const validation = TransferUtils.validateCreateTransfer(updatedRequest);
      if (!validation.isValid) {
        throw new TransferValidationError(
          validation.errors.map(msg => ({
            code: 'VALIDATION_ERROR',
            message: msg
          }))
        );
      }
    }

    // Apply updates and record event
    // Implementation would record an update event and return updated transfer
    throw new Error('Implementation pending - requires event store update logic');
  }

  /**
   * List transfers with filtering
   */
  async listTransfers(query: TransferQuery): Promise<TransfersResponse> {
    // Implementation would query event store for transfers
    // For now, returning mock data structure
    return {
      data: [],
      total: 0,
      page: query.page || 1,
      pageSize: query.pageSize || TRANSFER_CONFIG.DEFAULT_PAGE_SIZE,
      totalPages: 0
    };
  }

  /**
   * Get a single transfer by ID
   */
  async getTransfer(transferId: string): Promise<Transfer | null> {
    // Implementation would reconstruct transfer from event store
    // For now, returning null
    return null;
  }

  /**
   * Apply stock movements atomically
   */
  private async applyStockMovements(transfer: Transfer, completedLines: TransferLine[]): Promise<void> {
    const transactionId = generateEventId();
    
    for (const line of completedLines) {
      const qtyFinal = line.qtyFinal || line.qtyPlanned;
      
      // Decrement source location stock
      await this.eventStore.append('inventory.stock.moved', {
        itemId: line.itemId,
        sku: line.sku,
        locationId: transfer.sourceLocationId,
        quantity: -qtyFinal,
        unit: line.unit,
        reason: 'Transfer out',
        reference: transfer.code,
        transactionId
      }, {
        aggregate: { id: line.itemId, type: 'inventory-item' }
      });

      // Increment destination location stock
      await this.eventStore.append('inventory.stock.moved', {
        itemId: line.itemId,
        sku: line.sku,
        locationId: transfer.destinationLocationId,
        quantity: qtyFinal,
        unit: line.unit,
        reason: 'Transfer in',
        reference: transfer.code,
        transactionId
      }, {
        aggregate: { id: line.itemId, type: 'inventory-item' }
      });
    }
  }

  /**
   * Get item details (mock implementation)
   */
  private async getItemDetails(itemId: string): Promise<{ sku: string; name: string; unit: string }> {
    // Mock implementation - would integrate with inventory items service
    return {
      sku: `SKU-${itemId.slice(-6).toUpperCase()}`,
      name: `Item ${itemId.slice(-4)}`,
      unit: 'each'
    };
  }

  /**
   * Get available stock quantities
   */
  private async getAvailableStock(itemIds: string[], locationId: string): Promise<Map<string, number>> {
    // Mock implementation - would integrate with inventory service
    const stock = new Map<string, number>();
    itemIds.forEach(id => {
      stock.set(id, Math.floor(Math.random() * 100) + 10);
    });
    return stock;
  }

  /**
   * Get all active locations
   */
  async getLocations(): Promise<Location[]> {
    return Array.from(this.locations.values()).filter(loc => loc.isActive);
  }
}

// Service factory and singleton management
let transferServiceInstance: InventoryTransferService | null = null;

export function createInventoryTransferService(eventStore: EventStore): InventoryTransferService {
  return new InventoryTransferService(eventStore);
}

export function getInventoryTransferService(): InventoryTransferService {
  if (!transferServiceInstance) {
    throw new Error('InventoryTransferService not initialized. Call initializeInventoryTransferService first.');
  }
  return transferServiceInstance;
}

export function initializeInventoryTransferService(eventStore: EventStore): InventoryTransferService {
  transferServiceInstance = createInventoryTransferService(eventStore);
  return transferServiceInstance;
}