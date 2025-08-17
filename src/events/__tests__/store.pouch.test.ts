import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEventStore, InMemoryEventStore } from '../store';
import { Event } from '../types';
import { openLocalDB } from '../../db/pouch';

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
      eventsByAggregate: vi.fn().mockResolvedValue([]),
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
      const event: Event = {
        id: 'test-event-1',
        type: 'SaleRecorded',
        payload: {
          items: [{ name: 'Coffee', price: 350, quantity: 1 }],
          total: 350,
          timestamp: Date.now()
        }
      };

      const result = await eventStore.append(event);

      expect(result.success).toBe(true);
      expect(mockAdapter.putEvent).toHaveBeenCalledWith({
        ...event,
        timestamp: expect.any(Number)
      });
    });

    it('should still work if PouchDB persistence fails', async () => {
      mockAdapter.putEvent.mockRejectedValue(new Error('PouchDB error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const event: Event = {
        id: 'test-event-1',
        type: 'SaleRecorded',
        payload: {
          items: [{ name: 'Coffee', price: 350, quantity: 1 }],
          total: 350,
          timestamp: Date.now()
        }
      };

      const result = await eventStore.append(event);

      expect(result.success).toBe(true); // Memory store still works
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to persist event to PouchDB:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should maintain idempotency across memory and PouchDB', async () => {
      const event: Event = {
        id: 'idempotent-test',
        type: 'SaleRecorded',
        payload: {
          items: [{ name: 'Coffee', price: 350, quantity: 1 }],
          total: 350,
          timestamp: Date.now()
        }
      };

      // Append the same event twice
      const result1 = await eventStore.append(event);
      const result2 = await eventStore.append(event);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.reason).toBe('duplicate');
      
      // PouchDB should only be called once
      expect(mockAdapter.putEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('hydrate', () => {
    it('should load events from PouchDB into memory', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          type: 'SaleRecorded',
          timestamp: Date.now(),
          payload: { items: [], total: 100, timestamp: Date.now() }
        },
        {
          id: 'event-2',
          type: 'PaymentInitiated',
          timestamp: Date.now(),
          aggregateId: 'order-123',
          payload: { amount: 100, method: 'card', timestamp: Date.now() }
        }
      ];

      mockAdapter.allEvents.mockResolvedValue(mockEvents);

      await eventStore.hydrate();

      expect(mockAdapter.allEvents).toHaveBeenCalled();
      
      // Verify events are now in memory
      const allEvents = eventStore.allEvents();
      expect(allEvents).toHaveLength(2);
      expect(allEvents[0].id).toBe('event-1');
      expect(allEvents[1].id).toBe('event-2');
    });

    it('should update sequence counter after hydration', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          type: 'SaleRecorded',
          timestamp: Date.now() - 1000,
          payload: { items: [], total: 100, timestamp: Date.now() }
        },
        {
          id: 'event-2',
          type: 'PaymentInitiated',
          timestamp: Date.now(),
          payload: { amount: 100, method: 'card', timestamp: Date.now() }
        }
      ];

      mockAdapter.allEvents.mockResolvedValue(mockEvents);

      await eventStore.hydrate();

      // Add a new event after hydration
      const newEvent: Event = {
        id: 'event-3',
        type: 'SaleRecorded',
        payload: { items: [], total: 200, timestamp: Date.now() }
      };

      await eventStore.append(newEvent);

      const allEvents = eventStore.allEvents();
      expect(allEvents).toHaveLength(3);
      
      // New event should have a sequence number higher than hydrated events
      const newEventInStore = allEvents.find(e => e.id === 'event-3');
      expect(newEventInStore?.sequence).toBeGreaterThan(2);
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
          type: 'SaleRecorded',
          timestamp: Date.now(),
          aggregateId: 'order-123',
          payload: { items: [], total: 100, timestamp: Date.now() }
        }
      ];

      mockAdapter.allEvents.mockResolvedValue(mockKnownEvents);

      await eventStore.hydrate();

      const events = eventStore.allEvents();
      expect(events[0]).toEqual({
        id: 'event-1',
        type: 'SaleRecorded',
        aggregateId: 'order-123',
        payload: { items: [], total: 100, timestamp: expect.any(Number) },
        sequence: expect.any(Number),
        timestamp: expect.any(Number)
      });
    });
  });

  describe('reset with PouchDB', () => {
    it('should clear both memory and PouchDB', async () => {
      // Add some events first
      const event: Event = {
        id: 'test-event',
        type: 'SaleRecorded',
        payload: { items: [], total: 100, timestamp: Date.now() }
      };

      await eventStore.append(event);
      expect(eventStore.allEvents()).toHaveLength(1);

      // Reset should clear both
      await eventStore.reset();

      expect(eventStore.allEvents()).toHaveLength(0);
      expect(mockAdapter.reset).toHaveBeenCalled();
    });

    it('should handle PouchDB reset errors gracefully', async () => {
      mockAdapter.reset.mockRejectedValue(new Error('PouchDB reset error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await eventStore.reset();

      // Memory should still be cleared
      expect(eventStore.allEvents()).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to reset PouchDB:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('memory-only operations', () => {
    it('should work normally for read operations', async () => {
      const event: Event = {
        id: 'test-event',
        type: 'SaleRecorded',
        aggregateId: 'order-123',
        payload: { items: [], total: 100, timestamp: Date.now() }
      };

      await eventStore.append(event);

      expect(eventStore.allEvents()).toHaveLength(1);
      expect(eventStore.eventsByAggregate('order-123')).toHaveLength(1);
      expect(eventStore.eventsByType('SaleRecorded')).toHaveLength(1);
    });
  });
});