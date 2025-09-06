/**
 * Inventory Transfer System Types
 * Simplified transfer system with Draft → Completed/Cancelled flow
 * No timing/in-transit concepts - stock moves instantly on completion
 */

// Transfer Status - simplified flow
export type TransferStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';

// Transfer Line Item
export interface TransferLine {
  itemId: string;          // Reference to inventory item
  sku: string;             // Item SKU
  name: string;            // Item name
  unit: 'each' | 'kg' | 'L' | string;  // Item unit of measure
  qtyPlanned: number;      // Planned quantity (entered in Draft)
  qtyFinal?: number;       // Final quantity (set at Complete, defaults to qtyPlanned)
}

// Main Transfer Entity
export interface Transfer {
  id: string;
  code: string;                     // e.g. TRF-000123
  sourceLocationId: string;
  destinationLocationId: string;
  status: TransferStatus;
  lines: TransferLine[];
  notes?: string;
  
  // Audit fields (non-time)
  createdBy: string;
  completedBy?: string;
  cancelledBy?: string;
}

// Query interface for listing transfers
export interface TransferQuery {
  sourceLocationId?: string;
  destinationLocationId?: string;
  status?: TransferStatus;
  search?: string;          // Free text search for code, items, notes
  page?: number;
  pageSize?: number;
  sortBy?: 'code' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// API Response for transfer list
export interface TransfersResponse {
  data: Transfer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Transfer creation request
export interface CreateTransferRequest {
  sourceLocationId: string;
  destinationLocationId: string;
  lines: Array<{
    itemId: string;
    qtyPlanned: number;
  }>;
  notes?: string;
}

// Complete transfer request (transitions DRAFT → COMPLETED)
export interface CompleteTransferRequest {
  linesFinal: Array<{
    itemId: string;
    qtyFinal: number;    // Final quantity to transfer (defaults to qtyPlanned if not provided)
  }>;
}

// Cancel transfer request (DRAFT only)
export interface CancelTransferRequest {
  reason: string;
  notes?: string;
}

// Location interface for transfer UI
export interface Location {
  id: string;
  name: string;
  type: 'restaurant' | 'warehouse' | 'central_kitchen' | 'commissary';
  address?: string;
  isActive: boolean;
}

// Transfer validation result
export interface TransferValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Event types for transfer operations
export interface TransferCreatedEvent {
  type: 'inventory.transfer.created';
  payload: {
    transferId: string;
    sourceLocationId: string;
    destinationLocationId: string;
    lines: TransferLine[];
    createdBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface TransferCompletedEvent {
  type: 'inventory.transfer.completed';
  payload: {
    transferId: string;
    sourceLocationId: string;
    destinationLocationId: string;
    lines: Array<{
      itemId: string;
      sku: string;
      qtyFinal: number;
    }>;
    completedBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface TransferCancelledEvent {
  type: 'inventory.transfer.cancelled';
  payload: {
    transferId: string;
    reason: string;
    cancelledBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

// Transfer error types
export interface TransferError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export class TransferValidationError extends Error {
  public errors: TransferError[];

  constructor(errors: TransferError[]) {
    super(errors.map(e => e.message).join(', '));
    this.errors = errors;
    this.name = 'TransferValidationError';
  }
}

export class TransferConcurrencyError extends Error {
  constructor(transferId: string) {
    super(`Transfer ${transferId} was modified by another user`);
    this.name = 'TransferConcurrencyError';
  }
}

// Transfer configuration constants
export const TRANSFER_CONFIG = {
  MAX_LINES_PER_TRANSFER: 100,
  MIN_QTY: 0.01,
  MAX_QTY: 999999.99,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  CODE_PREFIX: 'TRF',
} as const;

// Utility functions for transfers
export const TransferUtils = {
  /**
   * Generate human-readable transfer code
   */
  generateTransferCode(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${TRANSFER_CONFIG.CODE_PREFIX}-${timestamp}`;
  },

  /**
   * Generate unique transfer ID
   */
  generateTransferId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `transfer_${timestamp}_${random}`;
  },

  /**
   * Calculate transfer summary
   */
  calculateSummary(lines: TransferLine[]): { totalLines: number; totalQtyPlanned: number; totalQtyFinal: number } {
    const totalLines = lines.length;
    const totalQtyPlanned = lines.reduce((sum, line) => sum + line.qtyPlanned, 0);
    const totalQtyFinal = lines.reduce((sum, line) => sum + (line.qtyFinal || line.qtyPlanned), 0);

    return {
      totalLines,
      totalQtyPlanned: Math.round(totalQtyPlanned * 100) / 100,
      totalQtyFinal: Math.round(totalQtyFinal * 100) / 100,
    };
  },

  /**
   * Validate transfer creation
   */
  validateCreateTransfer(request: CreateTransferRequest): TransferValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Source and destination validation
    if (!request.sourceLocationId) {
      errors.push('Source location is required');
    }
    if (!request.destinationLocationId) {
      errors.push('Destination location is required');
    }
    if (request.sourceLocationId === request.destinationLocationId) {
      errors.push('Source and destination must be different');
    }

    // Lines validation
    if (!request.lines || request.lines.length === 0) {
      errors.push('At least one item is required');
    }

    if (request.lines && request.lines.length > TRANSFER_CONFIG.MAX_LINES_PER_TRANSFER) {
      errors.push(`Maximum ${TRANSFER_CONFIG.MAX_LINES_PER_TRANSFER} items allowed per transfer`);
    }

    // Validate each line
    request.lines?.forEach((line, index) => {
      if (!line.itemId) {
        errors.push(`Line ${index + 1}: Item is required`);
      }
      if (line.qtyPlanned === undefined || line.qtyPlanned <= 0) {
        errors.push(`Line ${index + 1}: Quantity must be greater than 0`);
      }
      if (line.qtyPlanned > TRANSFER_CONFIG.MAX_QTY) {
        errors.push(`Line ${index + 1}: Quantity exceeds maximum allowed`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  /**
   * Validate complete transfer (with stock availability check)
   */
  validateCompleteTransfer(transfer: Transfer, request: CompleteTransferRequest, availableStock: Map<string, number>): TransferValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (transfer.status !== 'DRAFT') {
      errors.push('Only draft transfers can be completed');
    }

    if (transfer.lines.length === 0) {
      errors.push('Transfer must have items');
    }

    // Validate final quantities and stock availability
    request.linesFinal?.forEach((finalLine) => {
      const transferLine = transfer.lines.find(l => l.itemId === finalLine.itemId);
      if (!transferLine) {
        errors.push(`Invalid item reference: ${finalLine.itemId}`);
      } else {
        if (finalLine.qtyFinal <= 0) {
          errors.push(`${transferLine.name}: Final quantity must be greater than 0`);
        }
        if (finalLine.qtyFinal > TRANSFER_CONFIG.MAX_QTY) {
          errors.push(`${transferLine.name}: Quantity exceeds maximum allowed`);
        }
        
        // Check stock availability
        const available = availableStock.get(finalLine.itemId) || 0;
        if (finalLine.qtyFinal > available) {
          errors.push(`${transferLine.name}: Insufficient stock. Requested: ${finalLine.qtyFinal}, Available: ${available}`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  /**
   * Format transfer code for display
   */
  formatTransferCode(code: string): string {
    return code || 'TRF-UNKNOWN';
  },

  /**
   * Get transfer status display text
   */
  getStatusDisplayText(status: TransferStatus): string {
    switch (status) {
      case 'DRAFT': return 'Draft';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  },

  /**
   * Get status color variant for badges
   */
  getStatusColorVariant(status: TransferStatus): 'default' | 'secondary' | 'success' | 'destructive' {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'destructive';
      default: return 'default';
    }
  },

  /**
   * Check if transfer can be edited
   */
  canEdit(transfer: Transfer): boolean {
    return transfer.status === 'DRAFT';
  },

  /**
   * Check if transfer can be cancelled
   */
  canCancel(transfer: Transfer): boolean {
    return transfer.status === 'DRAFT';
  },

  /**
   * Check if transfer can be completed
   */
  canComplete(transfer: Transfer): boolean {
    return transfer.status === 'DRAFT' && transfer.lines.length > 0;
  },

  /**
   * Check if transfer can be deleted
   */
  canDelete(transfer: Transfer): boolean {
    return transfer.status === 'DRAFT' && transfer.lines.length === 0;
  }
};

// Complete transfer request type guard
export function isCompleteTransferRequest(obj: any): obj is CompleteTransferRequest {
  return obj && Array.isArray(obj.linesFinal);
}
