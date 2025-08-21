import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEventStore, InMemoryEventStore } from '../store';
import type { Event } from '../types';
import { openLocalDB } from '../../db/pouch';
import { createSaleRecordedEvent, createPaymentInitiatedEvent } from '../../test/factories';

// Mock the PouchDB adapter
vi.mock('../../db/pouch', () => ({
  openLocalDB: vi.fn()
}));

describe('EventStore with PouchDB Integration', () => {
  let mockAdapter: any;
  let eventStore: InMemoryEventStore;

  beforeEach(async () => {
    // Setup mock adapter
    mockAdapter = {
      putEvent: vi.fn().mockResolvedValue({ ok: true, id: 'test-id', rev: 'test-rev' }),
      allEvents: vi.fn().mockResolvedValue([]),
      getByAggregate: vi.fn().mockResolvedValue([]),
      eventsByType: vi.fn().mockResolvedValue([]),
      reset: vi.fn().mockResolvedValue(undefined)
    };

    vi.mocked(openLocalDB).mockResolvedValue(mockAdapter);
    
    eventStore = await createEventStore({ persistToPouch: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createEventStore', () => {
    it('should create store with PouchDB persistence when enabled', async () => {
      expect(openLocalDB).toHaveBeenCalledWith('events');
      expect(eventStore).toBeInstanceOf(InMemoryEventStore);
    });

    it('should create store without PouchDB when disabled', async () => {
      const memoryOnlyStore = await createEventStore({ persistToPouch: false });
      expect(memoryOnlyStore).toBeInstanceOf(InMemoryEventStore);
    });

    it('should create store without PouchDB by default', async () => {
      const defaultStore = await createEventStore();
      expect(defaultStore).toBeInstanceOf(InMemoryEventStore);
    });
  });

  describe('append with PouchDB persistence', () => {
    it('should persist events to PouchDB when appending', async () => {
      const result = eventStore.append('sale.recorded', {
        ticketId: 'test-event-1',
        lines: [{ name: 'Coffee', price: 350, qty: 1, taxRate: 0 }],
        totals: { subtotal: 350, tax: 0, total: 350, discount: 0 }
      }, { key: 'test-key', params: {} });

      expect(result.deduped).toBe(false);
      expect(mockAdapter.putEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'sale.recorded',
        payload: expect.objectContaining({
          ticketId: 'test-event-1'
        }),
        timestamp: expect.any(Number)
      }));
    });

    it('should still work if PouchDB persistence fails', async () => {
      mockAdapter.putEvent.mockRejectedValue(new Error('PouchDB error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = eventStore.append('sale.recorded', {
        ticketId: 'test-event-1',
        lines: [{ name: 'Coffee', price: 350, qty: 1, taxRate: 0 }],
        totals: { subtotal: 350, tax: 0, total: 350, discount: 0 }
      }, { key: 'test-key', params: {} });

      expect(result.deduped).toBe(false); // Memory store still works
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to persist event to PouchDB:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should maintain idempotency across memory and PouchDB', async () => {
      const payload = {
        ticketId: 'idempotent-test',
        lines: [{ name: 'Coffee', price: 350, qty: 1, taxRate: 0 }],
        totals: { subtotal: 350, tax: 0, total: 350, discount: 0 }
      };

      // Append the same event twice
      const result1 = eventStore.append('sale.recorded', payload, { key: 'test-key', params: {} });
      const result2 = eventStore.append('sale.recorded', payload, { key: 'test-key', params: {} });

      expect(result1.deduped).toBe(false);
      expect(result2.deduped).toBe(true);
      
      // PouchDB should only be called once
      expect(mockAdapter.putEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('hydrate', () => {
    it('should load events from PouchDB into memory', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          type: 'sale.recorded' as const,
          aggregate: { id: 'order-123', type: 'order' },
          payload: {
            ticketId: 'sale-1',
            lines: [],
            totals: { subtotal: 100, tax: 0, total: 100, discount: 0 }
          },
          seq: 1,
          at: Date.now()
        } satisfies Event,
        {
          id: 'event-2',
          type: 'payment.initiated' as const,
          aggregate: { id: 'payment-123', type: 'payment' },
          payload: {
            ticketId: 'ticket-2',
            provider: 'stripe',
            sessionId: 'session-2',
            amount: 100,
            currency: 'USD',
            redirectUrl: 'https://example.com'
          },
          seq: 2,
          at: Date.now()
        } satisfies Event
      ];

      mockAdapter.allEvents.mockResolvedValue(mockEvents);

      await eventStore.hydrate();

      expect(mockAdapter.allEvents).toHaveBeenCalled();
      
      // Verify events are now in memory
      const allEvents = eventStore.getAll();
      expect(allEvents).toHaveLength(2);
      expect(allEvents[0].id).toBe('event-1');
      expect(allEvents[1].id).toBe('event-2');
    });

    it('should update sequence counter after hydration', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          type: 'sale.recorded' as const,
          aggregate: { id: 'order-123', type: 'order' },
          payload: {
            ticketId: 'sale-1',
            lines: [],
            totals: { subtotal: 100, tax: 0, total: 100, discount: 0 }
          },
          seq: 1,
          at: Date.now()
        } satisfies Event,
        {
          id: 'event-2',
          type: 'payment.initiated' as const,
          aggregate: { id: 'payment-123', type: 'payment' },
          payload: {
            ticketId: 'ticket-2',
            provider: 'stripe',
            sessionId: 'session-2',
            amount: 100,
            currency: 'USD',
            redirectUrl: 'https://example.com'
          },
          seq: 2,
          at: Date.now()
        } satisfies Event
      ];

      mockAdapter.allEvents.mockResolvedValue(mockEvents);

      await eventStore.hydrate();

      // Add a new event after hydration
      eventStore.append('sale.recorded', {
        ticketId: 'sale-3',
        lines: [],
        totals: { subtotal: 200, tax: 0, total: 200, discount: 0 }
      }, { key: 'event-3', params: {} });

      const allEvents = eventStore.getAll();
      expect(allEvents).toHaveLength(3);
      
      // New event should have a sequence number higher than hydrated events
      const newEventInStore = allEvents.find(e => e.type === 'sale.recorded' && e.payload.ticketId === 'sale-3');
      expect(newEventInStore?.seq).toBeGreaterThan(2);
    });

    it('should handle hydration errors gracefully', async () => {
      mockAdapter.allEvents.mockRejectedValue(new Error('PouchDB read error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(eventStore.hydrate()).rejects.toThrow('PouchDB read error');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to hydrate from PouchDB:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should convert KnownEvent back to Event format', async () => {
      const mockKnownEvents = [
        {
          id: 'event-1',
          type: 'sale.recorded' as const,
          aggregate: { id: 'order-123', type: 'order' },
          payload: {
            ticketId: 'sale-1',
            lines: [],
            totals: { subtotal: 100, tax: 0, total: 100, discount: 0 }
          },
          seq: 1,
          at: Date.now()
        } satisfies Event
      ];

      mockAdapter.allEvents.mockResolvedValue(mockKnownEvents);

      await eventStore.hydrate();

      const events = eventStore.getAll();
      expect(events[0]).toEqual({
        id: 'event-1',
        type: 'sale.recorded',
        aggregate: { id: 'order-123', type: 'order' },
        payload: { ticketId: 'sale-1', lines: [], totals: { subtotal: 100, tax: 0, total: 100, discount: 0 } },
        seq: expect.any(Number),
        at: expect.any(Number)
      });
    });
  });

  describe('reset with PouchDB', () => {
    it('should clear both memory and PouchDB', async () => {
      // Add some events first
      eventStore.append('sale.recorded', {
        ticketId: 'test-event',
        lines: [],
        totals: { subtotal: 100, tax: 0, total: 100, discount: 0 }
      }, { key: 'test-key', params: {} });
      expect(eventStore.getAll()).toHaveLength(1);

      // Reset should clear both
      await eventStore.reset();

      expect(eventStore.getAll()).toHaveLength(0);
      expect(mockAdapter.reset).toHaveBeenCalled();
    });

    it('should handle PouchDB reset errors gracefully', async () => {
      mockAdapter.reset.mockRejectedValue(new Error('PouchDB reset error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await eventStore.reset();

      // Memory should still be cleared
      expect(eventStore.getAll()).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to reset PouchDB:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('memory-only operations', () => {
    it('should work normally for read operations', async () => {
      eventStore.append('sale.recorded', {
         ticketId: 'test-event',
         lines: [],
         totals: { subtotal: 100, tax: 0, total: 100, discount: 0 }
       }, { key: 'test-key', params: {}, aggregate: { id: 'order-123', type: 'order' } });

      expect(eventStore.getAll()).toHaveLength(1);
      expect(eventStore.getByAggregate('order-123')).toHaveLength(1);
      expect(eventStore.getByType('sale.recorded')).toHaveLength(1);
    });
  });
});