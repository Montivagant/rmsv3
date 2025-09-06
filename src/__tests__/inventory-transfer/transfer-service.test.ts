import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryTransferService } from '../../inventory/transfers/service';
import { TransferUtils } from '../../inventory/transfers/types';
import type { 
  CreateTransferRequest, 
  Transfer, 
  TransferLine 
} from '../../inventory/transfers/types';
import type { EventStore } from '../../events/types';

describe('Inventory Transfer Service', () => {
  let mockEventStore: EventStore;
  let transferService: InventoryTransferService;

  beforeEach(() => {
    mockEventStore = {
      append: vi.fn().mockResolvedValue({ id: 'evt-123' }),
      query: vi.fn().mockReturnValue([]),
      getAll: vi.fn().mockReturnValue([]),
      reset: vi.fn().mockResolvedValue(undefined)
    } as unknown as EventStore;

    transferService = new InventoryTransferService(mockEventStore);
  });

  describe('TransferUtils', () => {
    describe('generateTransferCode', () => {
      it('should generate code with TR prefix', () => {
        const code = TransferUtils.generateTransferCode();
        expect(code).toMatch(/^TR-\d{6}-[A-Z0-9]{3}$/);
      });

      it('should generate unique codes', () => {
        const code1 = TransferUtils.generateTransferCode();
        const code2 = TransferUtils.generateTransferCode();
        expect(code1).not.toBe(code2);
      });
    });

    describe('calculateTotals', () => {
      it('should calculate totals correctly', () => {
        const lines: TransferLine[] = [
          {
            id: 'line-1',
            itemId: 'item-1',
            sku: 'SKU-1',
            name: 'Item 1',
            unit: 'each',
            qtyRequested: 10,
            qtySent: 10,
            qtyReceived: 9,
            variance: 1,
            availableQty: 50,
            unitCost: 5.00
          },
          {
            id: 'line-2',
            itemId: 'item-2',
            sku: 'SKU-2',
            name: 'Item 2',
            unit: 'lbs',
            qtyRequested: 5,
            qtySent: 5,
            qtyReceived: 5,
            variance: 0,
            availableQty: 20,
            unitCost: 10.00
          }
        ];

        const totals = TransferUtils.calculateTotals(lines);

        expect(totals.totalItems).toBe(2);
        expect(totals.totalQtyRequested).toBe(15);
        expect(totals.totalQtySent).toBe(15);
        expect(totals.totalQtyReceived).toBe(14);
        expect(totals.totalVariance).toBe(1);
        expect(totals.totalValueRequested).toBe(100); // (10 * 5) + (5 * 10)
        expect(totals.totalValueSent).toBe(100);
        expect(totals.totalValueReceived).toBe(95); // (9 * 5) + (5 * 10)
        expect(totals.totalVarianceValue).toBe(5); // 1 * 5.00
      });
    });

    describe('validateCreateTransfer', () => {
      it('should validate valid transfer request', () => {
        const request: CreateTransferRequest = {
          sourceLocationId: 'loc-1',
          destinationLocationId: 'loc-2',
          lines: [
            {
              itemId: 'item-1',
              qtyRequested: 5
            }
          ],
          notes: 'Test transfer'
        };

        const result = TransferUtils.validateCreateTransfer(request);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject transfer with same source and destination', () => {
        const request: CreateTransferRequest = {
          sourceLocationId: 'loc-1',
          destinationLocationId: 'loc-1',
          lines: [
            {
              itemId: 'item-1',
              qtyRequested: 5
            }
          ]
        };

        const result = TransferUtils.validateCreateTransfer(request);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Source and destination must be different');
      });

      it('should require at least one line item', () => {
        const request: CreateTransferRequest = {
          sourceLocationId: 'loc-1',
          destinationLocationId: 'loc-2',
          lines: []
        };

        const result = TransferUtils.validateCreateTransfer(request);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('At least one line item is required');
      });

      it('should validate line quantities', () => {
        const request: CreateTransferRequest = {
          sourceLocationId: 'loc-1',
          destinationLocationId: 'loc-2',
          lines: [
            {
              itemId: 'item-1',
              qtyRequested: 0 // Invalid quantity
            }
          ]
        };

        const result = TransferUtils.validateCreateTransfer(request);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Quantity must be greater than 0'))).toBe(true);
      });
    });

    describe('status utilities', () => {
      it('should get correct status display text', () => {
        expect(TransferUtils.getStatusDisplayText('DRAFT')).toBe('Draft');
        expect(TransferUtils.getStatusDisplayText('SENT')).toBe('In Transit');
        expect(TransferUtils.getStatusDisplayText('CLOSED')).toBe('Completed');
        expect(TransferUtils.getStatusDisplayText('CANCELLED')).toBe('Cancelled');
      });

      it('should get correct status color variants', () => {
        expect(TransferUtils.getStatusColorVariant('DRAFT')).toBe('default');
        expect(TransferUtils.getStatusColorVariant('SENT')).toBe('warning');
        expect(TransferUtils.getStatusColorVariant('CLOSED')).toBe('success');
        expect(TransferUtils.getStatusColorVariant('CANCELLED')).toBe('error');
      });

      it('should correctly identify transfer capabilities', () => {
        const draftTransfer: Transfer = { status: 'DRAFT', lines: [] } as Transfer;
        const draftTransferWithLines: Transfer = { status: 'DRAFT', lines: [{}] } as Transfer;
        const sentTransfer: Transfer = { status: 'SENT', lines: [{}] } as Transfer;
        const closedTransfer: Transfer = { status: 'CLOSED', lines: [{}] } as Transfer;

        expect(TransferUtils.canCancel(draftTransfer)).toBe(true);
        expect(TransferUtils.canCancel(sentTransfer)).toBe(false);

        expect(TransferUtils.canSend(draftTransfer)).toBe(false); // No lines
        expect(TransferUtils.canSend(draftTransferWithLines)).toBe(true); // Has lines
        expect(TransferUtils.canReceive(sentTransfer)).toBe(true);
        expect(TransferUtils.canReceive(closedTransfer)).toBe(false);
      });
    });

    describe('formatVariance', () => {
      it('should format positive variance correctly', () => {
        expect(TransferUtils.formatVariance(5, true)).toBe('+5');
        expect(TransferUtils.formatVariance(5, false)).toBe('5');
      });

      it('should format negative variance correctly', () => {
        expect(TransferUtils.formatVariance(-3, true)).toBe('-3');
        expect(TransferUtils.formatVariance(-3, false)).toBe('3');
      });

      it('should format zero variance', () => {
        expect(TransferUtils.formatVariance(0)).toBe('0');
      });
    });
  });

  describe('Transfer Service Integration', () => {
    describe('getLocations', () => {
      it('should return active locations', async () => {
        const locations = await transferService.getLocations();
        
        expect(locations.length).toBeGreaterThan(0);
        expect(locations.every(loc => loc.isActive)).toBe(true);
        expect(locations.some(loc => loc.name === 'Main Restaurant')).toBe(true);
        expect(locations.some(loc => loc.name === 'Central Warehouse')).toBe(true);
      });
    });
  });
});
