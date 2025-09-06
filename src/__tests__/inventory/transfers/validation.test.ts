import { describe, it, expect } from 'vitest';
import { TransferUtils, TRANSFER_CONFIG } from '../../../inventory/transfers/types';
import type { 
  CreateTransferRequest, 
  Transfer, 
  CompleteTransferRequest 
} from '../../../inventory/transfers/types';

describe('Transfer Validation', () => {
  describe('validateCreateTransfer', () => {
    it('should pass validation for valid request', () => {
      const request: CreateTransferRequest = {
        sourceLocationId: 'loc-1',
        destinationLocationId: 'loc-2',
        lines: [
          { itemId: 'item-1', qtyPlanned: 10 },
          { itemId: 'item-2', qtyPlanned: 5.5 }
        ],
        notes: 'Test transfer'
      };

      const result = TransferUtils.validateCreateTransfer(request);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if source location is missing', () => {
      const request: CreateTransferRequest = {
        sourceLocationId: '',
        destinationLocationId: 'loc-2',
        lines: [{ itemId: 'item-1', qtyPlanned: 10 }]
      };

      const result = TransferUtils.validateCreateTransfer(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Source location is required');
    });

    it('should fail if destination location is missing', () => {
      const request: CreateTransferRequest = {
        sourceLocationId: 'loc-1',
        destinationLocationId: '',
        lines: [{ itemId: 'item-1', qtyPlanned: 10 }]
      };

      const result = TransferUtils.validateCreateTransfer(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Destination location is required');
    });

    it('should fail if source and destination are the same', () => {
      const request: CreateTransferRequest = {
        sourceLocationId: 'loc-1',
        destinationLocationId: 'loc-1',
        lines: [{ itemId: 'item-1', qtyPlanned: 10 }]
      };

      const result = TransferUtils.validateCreateTransfer(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Source and destination must be different');
    });

    it('should fail if no lines are provided', () => {
      const request: CreateTransferRequest = {
        sourceLocationId: 'loc-1',
        destinationLocationId: 'loc-2',
        lines: []
      };

      const result = TransferUtils.validateCreateTransfer(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one item is required');
    });

    it('should fail if too many lines are provided', () => {
      const lines = Array.from({ length: TRANSFER_CONFIG.MAX_LINES_PER_TRANSFER + 1 }, (_, i) => ({
        itemId: `item-${i}`,
        qtyPlanned: 1
      }));

      const request: CreateTransferRequest = {
        sourceLocationId: 'loc-1',
        destinationLocationId: 'loc-2',
        lines
      };

      const result = TransferUtils.validateCreateTransfer(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Maximum ${TRANSFER_CONFIG.MAX_LINES_PER_TRANSFER} items allowed per transfer`);
    });

    it('should fail if line quantity is zero or negative', () => {
      const request: CreateTransferRequest = {
        sourceLocationId: 'loc-1',
        destinationLocationId: 'loc-2',
        lines: [
          { itemId: 'item-1', qtyPlanned: 0 },
          { itemId: 'item-2', qtyPlanned: -5 }
        ]
      };

      const result = TransferUtils.validateCreateTransfer(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Line 1: Quantity must be greater than 0');
      expect(result.errors).toContain('Line 2: Quantity must be greater than 0');
    });

    it('should fail if line quantity exceeds maximum', () => {
      const request: CreateTransferRequest = {
        sourceLocationId: 'loc-1',
        destinationLocationId: 'loc-2',
        lines: [
          { itemId: 'item-1', qtyPlanned: TRANSFER_CONFIG.MAX_QTY + 1 }
        ]
      };

      const result = TransferUtils.validateCreateTransfer(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Line 1: Quantity exceeds maximum allowed');
    });
  });

  describe('validateCompleteTransfer', () => {
    const mockTransfer: Transfer = {
      id: 'transfer-1',
      code: 'TRF-001',
      sourceLocationId: 'loc-1',
      destinationLocationId: 'loc-2',
      status: 'DRAFT',
      lines: [
        { itemId: 'item-1', sku: 'SKU-1', name: 'Item 1', unit: 'each', qtyPlanned: 10 },
        { itemId: 'item-2', sku: 'SKU-2', name: 'Item 2', unit: 'kg', qtyPlanned: 5.5 }
      ],
      createdBy: 'user-1'
    };

    const mockStock = new Map([
      ['item-1', 20],
      ['item-2', 10]
    ]);

    it('should pass validation for valid completion', () => {
      const request: CompleteTransferRequest = {
        linesFinal: [
          { itemId: 'item-1', qtyFinal: 10 },
          { itemId: 'item-2', qtyFinal: 5.5 }
        ]
      };

      const result = TransferUtils.validateCompleteTransfer(mockTransfer, request, mockStock);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if transfer is not in draft status', () => {
      const completedTransfer = { ...mockTransfer, status: 'COMPLETED' as const };
      const request: CompleteTransferRequest = {
        linesFinal: [{ itemId: 'item-1', qtyFinal: 10 }]
      };

      const result = TransferUtils.validateCompleteTransfer(completedTransfer, request, mockStock);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Only draft transfers can be completed');
    });

    it('should fail if insufficient stock', () => {
      const request: CompleteTransferRequest = {
        linesFinal: [
          { itemId: 'item-1', qtyFinal: 25 }, // Only 20 available
          { itemId: 'item-2', qtyFinal: 5 }
        ]
      };

      const result = TransferUtils.validateCompleteTransfer(mockTransfer, request, mockStock);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item 1: Insufficient stock. Requested: 25, Available: 20');
    });

    it('should fail if final quantity is zero or negative', () => {
      const request: CompleteTransferRequest = {
        linesFinal: [
          { itemId: 'item-1', qtyFinal: 0 },
          { itemId: 'item-2', qtyFinal: -5 }
        ]
      };

      const result = TransferUtils.validateCompleteTransfer(mockTransfer, request, mockStock);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item 1: Final quantity must be greater than 0');
      expect(result.errors).toContain('Item 2: Final quantity must be greater than 0');
    });
  });

  describe('Transfer Status Utilities', () => {
    const draftTransfer: Transfer = {
      id: 'transfer-1',
      code: 'TRF-001',
      sourceLocationId: 'loc-1',
      destinationLocationId: 'loc-2',
      status: 'DRAFT',
      lines: [{ itemId: 'item-1', sku: 'SKU-1', name: 'Item 1', unit: 'each', qtyPlanned: 10 }],
      createdBy: 'user-1'
    };

    const completedTransfer: Transfer = {
      ...draftTransfer,
      status: 'COMPLETED',
      completedBy: 'user-1'
    };

    const cancelledTransfer: Transfer = {
      ...draftTransfer,
      status: 'CANCELLED',
      cancelledBy: 'user-1'
    };

    const emptyDraftTransfer: Transfer = {
      ...draftTransfer,
      lines: []
    };

    describe('canEdit', () => {
      it('should return true for draft transfers', () => {
        expect(TransferUtils.canEdit(draftTransfer)).toBe(true);
      });

      it('should return false for completed transfers', () => {
        expect(TransferUtils.canEdit(completedTransfer)).toBe(false);
      });

      it('should return false for cancelled transfers', () => {
        expect(TransferUtils.canEdit(cancelledTransfer)).toBe(false);
      });
    });

    describe('canComplete', () => {
      it('should return true for draft transfers with items', () => {
        expect(TransferUtils.canComplete(draftTransfer)).toBe(true);
      });

      it('should return false for draft transfers without items', () => {
        expect(TransferUtils.canComplete(emptyDraftTransfer)).toBe(false);
      });

      it('should return false for completed transfers', () => {
        expect(TransferUtils.canComplete(completedTransfer)).toBe(false);
      });
    });

    describe('canCancel', () => {
      it('should return true for draft transfers', () => {
        expect(TransferUtils.canCancel(draftTransfer)).toBe(true);
      });

      it('should return false for completed transfers', () => {
        expect(TransferUtils.canCancel(completedTransfer)).toBe(false);
      });

      it('should return false for cancelled transfers', () => {
        expect(TransferUtils.canCancel(cancelledTransfer)).toBe(false);
      });
    });

    describe('canDelete', () => {
      it('should return true for empty draft transfers', () => {
        expect(TransferUtils.canDelete(emptyDraftTransfer)).toBe(true);
      });

      it('should return false for draft transfers with items', () => {
        expect(TransferUtils.canDelete(draftTransfer)).toBe(false);
      });

      it('should return false for completed transfers', () => {
        expect(TransferUtils.canDelete(completedTransfer)).toBe(false);
      });
    });
  });

  describe('Transfer Calculations', () => {
    it('should calculate summary correctly', () => {
      const lines = [
        { itemId: 'item-1', sku: 'SKU-1', name: 'Item 1', unit: 'each', qtyPlanned: 10, qtyFinal: 9 },
        { itemId: 'item-2', sku: 'SKU-2', name: 'Item 2', unit: 'kg', qtyPlanned: 5.5, qtyFinal: 5.5 },
        { itemId: 'item-3', sku: 'SKU-3', name: 'Item 3', unit: 'each', qtyPlanned: 20 }
      ];

      const summary = TransferUtils.calculateSummary(lines);

      expect(summary.totalLines).toBe(3);
      expect(summary.totalQtyPlanned).toBe(35.5);
      expect(summary.totalQtyFinal).toBe(34.5); // 9 + 5.5 + 20 (defaults to planned)
    });

    it('should handle empty lines', () => {
      const summary = TransferUtils.calculateSummary([]);

      expect(summary.totalLines).toBe(0);
      expect(summary.totalQtyPlanned).toBe(0);
      expect(summary.totalQtyFinal).toBe(0);
    });
  });
});
