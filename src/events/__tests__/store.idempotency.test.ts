import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventStore } from '../store';
import { IdempotencyConflictError } from '../types';

describe('Event Store Idempotency', () => {
  let store: InMemoryEventStore;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  describe('Basic append functionality', () => {
    it('should append event with seq=1 for first event', () => {
      const result = store.append('sale.recorded', { ticketId: 'test-123' }, {
        key: 'ticket:test-123:finalize',
        params: { cart: [], totals: { total: 100 } }
      });

      expect(result.event.seq).toBe(1);
      expect(result.event.type).toBe('sale.recorded');
      expect(result.event.id).toBeDefined();
      expect(result.event.at).toBeGreaterThan(0);
      expect(result.deduped).toBe(false);
    });

    it('should increment sequence numbers across new appends', () => {
      const result1 = store.append('sale.recorded', { ticketId: 'test-1' }, {
        key: 'ticket:test-1:finalize',
        params: { cart: [], totals: { total: 100 } }
      });

      const result2 = store.append('sale.recorded', { ticketId: 'test-2' }, {
        key: 'ticket:test-2:finalize',
        params: { cart: [], totals: { total: 200 } }
      });

      const result3 = store.append('inventory.adjusted', { sku: 'item-1', delta: 5 }, {
        key: 'inventory:item-1:adjust-1',
        params: { sku: 'item-1', delta: 5 }
      });

      expect(result1.event.seq).toBe(1);
      expect(result2.event.seq).toBe(2);
      expect(result3.event.seq).toBe(3);
    });
  });

  describe('Idempotency behavior', () => {
    it('should return same event for identical key and params', () => {
      const params = { cart: [{ id: '1', qty: 2 }], totals: { total: 100 } };
      const payload = { ticketId: 'test-123', lines: [], totals: { subtotal: 100, discount: 0, tax: 0, total: 100 } };
      
      const result1 = store.append('sale.recorded', payload, {
        key: 'ticket:test-123:finalize',
        params
      });

      const result2 = store.append('sale.recorded', payload, {
        key: 'ticket:test-123:finalize',
        params
      });

      expect(result1.event.id).toBe(result2.event.id);
      expect(result1.event.seq).toBe(result2.event.seq);
      expect(result1.deduped).toBe(false);
      expect(result2.deduped).toBe(true);
    });

    it('should throw IdempotencyConflictError for same key with different params', () => {
      const payload = { ticketId: 'test-123', lines: [], totals: { subtotal: 100, discount: 0, tax: 0, total: 100 } };
      
      store.append('sale.recorded', payload, {
        key: 'ticket:test-123:finalize',
        params: { cart: [{ id: '1', qty: 2 }], totals: { total: 100 } }
      });

      expect(() => {
        store.append('sale.recorded', payload, {
          key: 'ticket:test-123:finalize',
          params: { cart: [{ id: '1', qty: 3 }], totals: { total: 150 } } // Different params
        });
      }).toThrow(IdempotencyConflictError);
    });

    it('should handle complex object params with different ordering', () => {
      const payload = { ticketId: 'test-123', lines: [], totals: { subtotal: 100, discount: 0, tax: 0, total: 100 } };
      
      const params1 = {
        cart: [{ id: '1', name: 'Item 1', qty: 2 }],
        totals: { subtotal: 100, tax: 14, total: 114 },
        discount: 0
      };
      
      const params2 = {
        discount: 0,
        totals: { total: 114, subtotal: 100, tax: 14 },
        cart: [{ qty: 2, id: '1', name: 'Item 1' }]
      };

      const result1 = store.append('sale.recorded', payload, {
        key: 'ticket:test-123:finalize',
        params: params1
      });

      const result2 = store.append('sale.recorded', payload, {
        key: 'ticket:test-123:finalize',
        params: params2
      });

      expect(result1.event.id).toBe(result2.event.id);
      expect(result2.deduped).toBe(true);
    });
  });

  describe('Query functionality', () => {
    beforeEach(() => {
      // Set up test data
      store.append('sale.recorded', { ticketId: 'ticket-1' }, {
        key: 'ticket:ticket-1:finalize',
        params: { total: 100 },
        aggregate: { id: 'ticket-1', type: 'ticket' }
      });
      
      store.append('sale.recorded', { ticketId: 'ticket-2' }, {
        key: 'ticket:ticket-2:finalize',
        params: { total: 200 },
        aggregate: { id: 'ticket-2', type: 'ticket' }
      });
      
      store.append('inventory.adjusted', { sku: 'item-1', delta: 5 }, {
        key: 'inventory:item-1:adjust',
        params: { delta: 5 },
        aggregate: { id: 'item-1', type: 'inventory' }
      });
    });

    it('should return events by aggregate id', () => {
      const ticketEvents = store.getByAggregate('ticket-1');
      
      expect(ticketEvents).toHaveLength(1);
      expect(ticketEvents[0].type).toBe('sale.recorded');
      expect(ticketEvents[0].aggregate?.id).toBe('ticket-1');
    });

    it('should return events by type', () => {
      const saleEvents = store.getByType('sale.recorded');
      const inventoryEvents = store.getByType('inventory.adjusted');
      
      expect(saleEvents).toHaveLength(2);
      expect(inventoryEvents).toHaveLength(1);
      expect(saleEvents.every(e => e.type === 'sale.recorded')).toBe(true);
    });

    it('should return all events in sequence order', () => {
      const allEvents = store.getAll();
      
      expect(allEvents).toHaveLength(3);
      expect(allEvents[0].seq).toBe(1);
      expect(allEvents[1].seq).toBe(2);
      expect(allEvents[2].seq).toBe(3);
    });

    it('should return idempotency record by key', () => {
      const record = store.getByIdempotencyKey('ticket:ticket-1:finalize');
      
      expect(record).toBeDefined();
      expect(record!.event.type).toBe('sale.recorded');
      expect(record!.paramsHash).toBeDefined();
    });

    it('should return undefined for non-existent idempotency key', () => {
      const record = store.getByIdempotencyKey('non-existent-key');
      
      expect(record).toBeUndefined();
    });
  });

  describe('Reset functionality', () => {
    it('should clear all data and reset sequence counter', () => {
      store.append('sale.recorded', { ticketId: 'test' }, {
        key: 'test-key',
        params: { test: true }
      });
      
      expect(store.getAll()).toHaveLength(1);
      
      store.reset();
      
      expect(store.getAll()).toHaveLength(0);
      expect(store.getByIdempotencyKey('test-key')).toBeUndefined();
      
      // Next append should start from seq=1 again
      const result = store.append('sale.recorded', { ticketId: 'new-test' }, {
        key: 'new-test-key',
        params: { test: true }
      });
      
      expect(result.event.seq).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should provide meaningful error message for idempotency conflicts', () => {
      store.append('sale.recorded', { ticketId: 'test' }, {
        key: 'conflict-test',
        params: { version: 1 }
      });

      expect(() => {
        store.append('sale.recorded', { ticketId: 'test' }, {
          key: 'conflict-test',
          params: { version: 2 }
        });
      }).toThrow('Idempotency conflict for key \'conflict-test\': params hash mismatch');
    });

    it('should have correct error code for idempotency conflicts', () => {
      store.append('sale.recorded', { ticketId: 'test' }, {
        key: 'conflict-test',
        params: { version: 1 }
      });

      try {
        store.append('sale.recorded', { ticketId: 'test' }, {
          key: 'conflict-test',
          params: { version: 2 }
        });
      } catch (error) {
        expect(error).toBeInstanceOf(IdempotencyConflictError);
        expect((error as IdempotencyConflictError).code).toBe('IDEMPOTENCY_MISMATCH');
      }
    });
  });
});