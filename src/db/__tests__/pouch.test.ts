import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Event as AppEvent } from '../../events/types';
import { createSaleRecordedEvent, createPaymentInitiatedEvent } from '../../test/factories';

// Mock PouchDB for test environment
vi.mock('pouchdb', () => {
  const mockDB = {
    put: vi.fn().mockResolvedValue({ ok: true }),
    allDocs: vi.fn().mockResolvedValue({ rows: [] }),
    destroy: vi.fn().mockResolvedValue({ ok: true }),
  };
  
  const MockPouchDB = vi.fn(() => mockDB);
  (MockPouchDB as any).adapters = { memory: { valid: () => true } };
  (MockPouchDB as any).plugin = vi.fn();
  
  return { default: MockPouchDB };
});

// Mock the entire pouch module
vi.mock('../pouch', () => {
  let currentAdapter: any = null;
  
  const createMockAdapter = () => {
    let events: any[] = [];
    
    return {
      putEvent: vi.fn().mockImplementation(async (event: any) => {
        events.push(event);
      }),
      allEvents: vi.fn().mockImplementation(async () => {
        return [...events];
      }),
      getByAggregate: vi.fn().mockImplementation(async (aggregateId: string) => {
        return events.filter(e => e.aggregate?.id === aggregateId);
      }),
      eventsByType: vi.fn().mockImplementation(async (type: string) => {
        return events.filter(e => e.type === type);
      }),
      reset: vi.fn().mockImplementation(async () => {
        events = [];
        currentAdapter = null; // Reset the adapter reference
      }),
    };
  };
  
  return {
    openLocalDB: vi.fn(() => {
      if (!currentAdapter) {
        currentAdapter = createMockAdapter();
      }
      return currentAdapter;
    }),
    openLocalDBLegacy: vi.fn(() => {
      if (!currentAdapter) {
        currentAdapter = createMockAdapter();
      }
      return currentAdapter;
    }),
    createPouchDBAdapter: vi.fn().mockImplementation(async () => {
      if (!currentAdapter) {
        currentAdapter = createMockAdapter();
      }
      return currentAdapter;
    }),
  };
});

import { openLocalDBLegacy, type PouchDBAdapter } from '../pouch';

describe('PouchDB Adapter', () => {
  let adapter: PouchDBAdapter;
  const testDbName = 'test-events';

  beforeEach(async () => {
    adapter = openLocalDBLegacy(testDbName);
  });

  afterEach(async () => {
    await adapter.reset();
  });

  describe('putEvent', () => {
    it('should store an event successfully', async () => {
      const event = {
        id: 'test-event-1',
        type: 'sale.recorded' as const,
        aggregate: { id: 'test-aggregate', type: 'sale' as const },
        payload: {
          ticketId: 'test-event-1',
          lines: [{ name: 'Coffee', qty: 1, price: 350, taxRate: 0 }],
          totals: { subtotal: 350, tax: 35, total: 385, discount: 0 }
        },
        seq: 1,
         at: Date.now()
      } satisfies Event;

      await adapter.putEvent(event); // Should not throw
      
      // Verify the event was stored
      const allEvents = await adapter.allEvents();
      const storedEvent = allEvents.find(e => e.id === 'test-event-1');
      expect(storedEvent).toBeDefined();
      expect(storedEvent?.id).toBe('test-event-1');
    });

    it('should be idempotent - same event ID should not create duplicates', async () => {
      const event = {
        id: 'idempotent-test',
        type: 'sale.recorded' as const,
        aggregate: { id: 'test-aggregate', type: 'sale' as const },
        payload: {
          ticketId: 'idempotent-test',
          lines: [{ name: 'Coffee', qty: 1, price: 350, taxRate: 0 }],
          totals: { subtotal: 350, tax: 35, total: 385, discount: 0 }
        },
        seq: 1,
        at: Date.now()
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
      const event1 = {
        id: 'conflict-test',
        type: 'sale.recorded' as const,
        aggregate: { id: 'test-aggregate', type: 'sale' as const },
        payload: {
          ticketId: 'conflict-test',
          lines: [{ name: 'Coffee', qty: 1, price: 350, taxRate: 0 }],
          totals: { subtotal: 350, tax: 35, total: 385, discount: 0 }
        },
        seq: 1,
        at: Date.now()
      };

      const event2 = {
        id: 'conflict-test',
        type: 'sale.recorded' as const,
        aggregate: { id: 'test-aggregate', type: 'sale' as const },
        payload: {
          ticketId: 'conflict-test',
          lines: [{ name: 'Tea', qty: 1, price: 250, taxRate: 0 }],
          totals: { subtotal: 250, tax: 25, total: 275, discount: 0 }
        },
        seq: 1,
        at: Date.now()
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
      const events: AppEvent[] = [
        {
          id: 'event-1',
          seq: 1,
          type: 'sale.recorded',
          at: Date.now(),
          payload: {
            ticketId: 'ticket-5',
            lines: [],
            totals: {
              subtotal: 100,
              discount: 0,
              tax: 10,
              total: 110
            }
          }
        },
        {
          id: 'event-2',
          seq: 2,
          type: 'payment.initiated',
          at: Date.now(),
          payload: {
            ticketId: 'ticket-5',
            provider: 'stripe',
            sessionId: 'session-123',
            amount: 110,
            currency: 'USD',
            redirectUrl: 'https://example.com/return'
          }
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

  describe('getByAggregate', () => {
    beforeEach(async () => {
      const events = [
        {
          id: 'sale-1',
          type: 'sale.recorded' as const,
          aggregate: { id: 'order-123', type: 'sale' as const },
          payload: {
            ticketId: 'sale-1',
            lines: [],
            totals: { subtotal: 100, tax: 10, total: 110, discount: 0 }
          },
          seq: 1,
          at: Date.now()
        } satisfies Event,
        {
          id: 'payment-1',
          type: 'payment.initiated' as const,
          aggregate: { id: 'order-123', type: 'payment' as const },
          payload: {
            ticketId: 'payment-1',
            provider: 'stripe',
            sessionId: 'session-123',
            amount: 110,
            currency: 'USD',
            redirectUrl: 'https://example.com/return'
          },
          seq: 2,
         at: Date.now()
        } satisfies Event,
        {
          id: 'sale-2',
          type: 'sale.recorded' as const,
          aggregate: { id: 'customer-456', type: 'sale' as const },
          payload: {
            ticketId: 'sale-2',
            lines: [],
            totals: { subtotal: 200, tax: 20, total: 220, discount: 0 }
          },
          seq: 3,
         at: Date.now()
        } satisfies Event
      ];

      for (const event of events) {
        await adapter.putEvent(event);
      }
    });

    it('should return events for specific aggregate', async () => {
      const events = await adapter.getByAggregate('order-123');
      expect(events).toHaveLength(2);
      expect(events.every(e => e.aggregate?.id === 'order-123')).toBe(true);
    });

    it('should return empty array for non-existent aggregate', async () => {
      const events = await adapter.getByAggregate('non-existent');
      expect(events).toEqual([]);
    });
  });

  describe('eventsByType', () => {
    beforeEach(async () => {
      const events = [
        {
          id: 'sale-1',
          type: 'sale.recorded' as const,
          aggregate: { id: 'test-aggregate-1', type: 'sale' as const },
          payload: {
            ticketId: 'sale-1',
            lines: [],
            totals: { subtotal: 100, tax: 10, total: 110, discount: 0 }
          },
          seq: 1,
          at: Date.now()
        } satisfies Event,
        {
          id: 'sale-2',
          type: 'sale.recorded' as const,
          aggregate: { id: 'test-aggregate-2', type: 'sale' as const },
          payload: {
            ticketId: 'sale-2',
            lines: [],
            totals: { subtotal: 200, tax: 20, total: 220, discount: 0 }
          },
          seq: 2,
          at: Date.now()
        } satisfies Event,
        {
          id: 'payment-1',
          type: 'payment.initiated' as const,
          aggregate: { id: 'test-aggregate-3', type: 'payment' as const },
          payload: {
            ticketId: 'payment-1',
            provider: 'stripe',
            sessionId: 'session-123',
            amount: 110,
            currency: 'USD',
            redirectUrl: 'https://example.com/return'
          },
          seq: 3,
          at: Date.now()
        } satisfies Event
      ];

      for (const event of events) {
        await adapter.putEvent(event);
      }
    });

    it('should return events of specific type', async () => {
      const events = await adapter.eventsByType('sale.recorded');
      expect(events).toHaveLength(2);
      expect(events.every(e => e.type === 'sale.recorded')).toBe(true);
    });

    it('should return empty array for non-existent type', async () => {
      const events = await adapter.eventsByType('NonExistentType' as any);
      expect(events).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should clear all events', async () => {
      const event = {
        id: 'test-event',
        type: 'sale.recorded' as const,
        aggregate: { id: 'test-aggregate', type: 'sale' as const },
        payload: {
          ticketId: 'test-event',
          lines: [],
          totals: { subtotal: 100, tax: 0, total: 100, discount: 0 }
        },
        seq: 1,
        at: Date.now()
      } satisfies Event;

      await adapter.putEvent(event);
      
      let events = await adapter.allEvents();
      expect(events).toHaveLength(1);

      await adapter.reset();
      
      events = await adapter.allEvents();
      expect(events).toHaveLength(0);
    });
  });
});