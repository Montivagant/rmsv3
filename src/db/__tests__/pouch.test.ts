import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openLocalDB, PouchDBAdapter } from '../pouch';
import { Event } from '../../events/types';

describe('PouchDB Adapter', () => {
  let adapter: PouchDBAdapter;
  const testDbName = 'test-events';

  beforeEach(async () => {
    adapter = await openLocalDB(testDbName);
  });

  afterEach(async () => {
    await adapter.reset();
  });

  describe('putEvent', () => {
    it('should store an event successfully', async () => {
      const event: Event = {
        id: 'test-event-1',
        type: 'SaleRecorded',
        payload: {
          items: [{ name: 'Coffee', price: 350, quantity: 1 }],
          total: 350,
          timestamp: Date.now()
        }
      };

      await adapter.putEvent(event); // Should not throw
      
      // Verify the event was stored
      const allEvents = await adapter.allEvents();
      const storedEvent = allEvents.find(e => e.id === 'test-event-1');
      expect(storedEvent).toBeDefined();
      expect(storedEvent?.id).toBe('test-event-1');
    });

    it('should be idempotent - same event ID should not create duplicates', async () => {
      const event: Event = {
        id: 'idempotent-test',
        type: 'SaleRecorded',
        payload: {
          items: [{ name: 'Coffee', price: 350, quantity: 1 }],
          total: 350,
          timestamp: Date.now()
        }
      };

      // Store the same event twice
      await adapter.putEvent(event);
      await adapter.putEvent(event); // Should not throw

      // Verify only one event exists
      const allEvents = await adapter.allEvents();
      const matchingEvents = allEvents.filter(e => e.id === 'idempotent-test');
      expect(matchingEvents).toHaveLength(1);
    });

    it('should handle conflict when same ID has different payload', async () => {
      const event1: Event = {
        id: 'conflict-test',
        type: 'SaleRecorded',
        payload: {
          items: [{ name: 'Coffee', price: 350, quantity: 1 }],
          total: 350,
          timestamp: Date.now()
        }
      };

      const event2: Event = {
        id: 'conflict-test',
        type: 'SaleRecorded',
        payload: {
          items: [{ name: 'Tea', price: 250, quantity: 1 }],
          total: 250,
          timestamp: Date.now()
        }
      };

      await adapter.putEvent(event1);
      
      // This should log an error but not throw
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await adapter.putEvent(event2); // Should not throw
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Idempotency conflict detected'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('allEvents', () => {
    it('should return empty array when no events exist', async () => {
      const events = await adapter.allEvents();
      expect(events).toEqual([]);
    });

    it('should return all stored events', async () => {
      const events: Event[] = [
        {
          id: 'event-1',
          type: 'SaleRecorded',
          payload: { items: [], total: 100, timestamp: Date.now() }
        },
        {
          id: 'event-2',
          type: 'PaymentInitiated',
          payload: { amount: 100, method: 'card', timestamp: Date.now() }
        }
      ];

      for (const event of events) {
        await adapter.putEvent(event);
      }

      const retrievedEvents = await adapter.allEvents();
      expect(retrievedEvents).toHaveLength(2);
      expect(retrievedEvents.map(e => e.id)).toContain('event-1');
      expect(retrievedEvents.map(e => e.id)).toContain('event-2');
    });
  });

  describe('eventsByAggregate', () => {
    beforeEach(async () => {
      const events: Event[] = [
        {
          id: 'sale-1',
          type: 'SaleRecorded',
          aggregateId: 'order-123',
          payload: { items: [], total: 100, timestamp: Date.now() }
        },
        {
          id: 'payment-1',
          type: 'PaymentInitiated',
          aggregateId: 'order-123',
          payload: { amount: 100, method: 'card', timestamp: Date.now() }
        },
        {
          id: 'sale-2',
          type: 'SaleRecorded',
          aggregateId: 'order-456',
          payload: { items: [], total: 200, timestamp: Date.now() }
        }
      ];

      for (const event of events) {
        await adapter.putEvent(event);
      }
    });

    it('should return events for specific aggregate', async () => {
      const events = await adapter.eventsByAggregate('order-123');
      expect(events).toHaveLength(2);
      expect(events.every(e => e.aggregateId === 'order-123')).toBe(true);
    });

    it('should return empty array for non-existent aggregate', async () => {
      const events = await adapter.eventsByAggregate('non-existent');
      expect(events).toEqual([]);
    });
  });

  describe('eventsByType', () => {
    beforeEach(async () => {
      const events: Event[] = [
        {
          id: 'sale-1',
          type: 'SaleRecorded',
          payload: { items: [], total: 100, timestamp: Date.now() }
        },
        {
          id: 'sale-2',
          type: 'SaleRecorded',
          payload: { items: [], total: 200, timestamp: Date.now() }
        },
        {
          id: 'payment-1',
          type: 'PaymentInitiated',
          payload: { amount: 100, method: 'card', timestamp: Date.now() }
        }
      ];

      for (const event of events) {
        await adapter.putEvent(event);
      }
    });

    it('should return events of specific type', async () => {
      const events = await adapter.eventsByType('SaleRecorded');
      expect(events).toHaveLength(2);
      expect(events.every(e => e.type === 'SaleRecorded')).toBe(true);
    });

    it('should return empty array for non-existent type', async () => {
      const events = await adapter.eventsByType('NonExistentType' as any);
      expect(events).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should clear all events', async () => {
      const event: Event = {
        id: 'test-event',
        type: 'SaleRecorded',
        payload: { items: [], total: 100, timestamp: Date.now() }
      };

      await adapter.putEvent(event);
      
      let events = await adapter.allEvents();
      expect(events).toHaveLength(1);

      await adapter.reset();
      
      events = await adapter.allEvents();
      expect(events).toHaveLength(0);
    });
  });
});