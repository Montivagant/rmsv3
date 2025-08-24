import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryEventStore } from '../store';
import { openLocalStorageDB } from '../../db/localStorage';
import { createLocalStoragePersistedEventStore } from '../localStoragePersisted';
import { getPersistedEventStore, resetPersistedEventStore, getStorageStats } from '../persistedStore';

describe('EventStore Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset any global state
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up after each test
    await resetPersistedEventStore();
    localStorage.clear();
  });

  describe('LocalStorage Persistence', () => {
    it('should persist events to localStorage', async () => {
      const memoryStore = new InMemoryEventStore();
      const db = await openLocalStorageDB({ name: 'test_events' });
      const persistedStore = await createLocalStoragePersistedEventStore(memoryStore, db);

      // Append an event
      const result = persistedStore.append('TEST_EVENT', { value: 42 }, {
        key: 'test-1',
        params: { test: true },
        aggregate: { id: 'agg-1', type: 'test' }
      });

      expect(result.isNew).toBe(true);
      expect(result.event.type).toBe('TEST_EVENT');

      // Check localStorage directly
      const storedData = localStorage.getItem(`test_events_${result.event.id}`);
      expect(storedData).toBeTruthy();
      
      const parsed = JSON.parse(storedData!);
      expect(parsed.type).toBe('TEST_EVENT');
      expect(parsed.payload.value).toBe(42);
    });

    it('should hydrate events from localStorage on initialization', async () => {
      // First, create and persist some events
      const memoryStore1 = new InMemoryEventStore();
      const db1 = await openLocalStorageDB({ name: 'test_hydrate' });
      const persistedStore1 = await createLocalStoragePersistedEventStore(memoryStore1, db1);

      persistedStore1.append('EVENT_1', { data: 'first' }, {
        key: 'hydrate-1',
        params: {},
        aggregate: { id: 'agg-1', type: 'test' }
      });

      persistedStore1.append('EVENT_2', { data: 'second' }, {
        key: 'hydrate-2',
        params: {},
        aggregate: { id: 'agg-1', type: 'test' }
      });

      // Now create a new store and hydrate from localStorage
      const memoryStore2 = new InMemoryEventStore();
      const db2 = await openLocalStorageDB({ name: 'test_hydrate' });
      const persistedStore2 = await createLocalStoragePersistedEventStore(memoryStore2, db2);
      
      await persistedStore2.hydrateFromLocalStorage();

      // Check that events were hydrated
      const allEvents = persistedStore2.getAll();
      expect(allEvents).toHaveLength(2);
      expect(allEvents[0].type).toBe('EVENT_1');
      expect(allEvents[1].type).toBe('EVENT_2');
    });

    it('should handle idempotency correctly with persistence', async () => {
      const memoryStore = new InMemoryEventStore();
      const db = await openLocalStorageDB({ name: 'test_idempotency' });
      const persistedStore = await createLocalStoragePersistedEventStore(memoryStore, db);

      // First append
      const result1 = persistedStore.append('IDEMPOTENT_EVENT', { value: 1 }, {
        key: 'idem-key',
        params: { test: true },
        aggregate: { id: 'agg-1', type: 'test' }
      });

      expect(result1.isNew).toBe(true);
      expect(result1.deduped).toBe(false);

      // Second append with same key and params (should be deduped)
      const result2 = persistedStore.append('IDEMPOTENT_EVENT', { value: 2 }, {
        key: 'idem-key',
        params: { test: true },
        aggregate: { id: 'agg-1', type: 'test' }
      });

      expect(result2.isNew).toBe(false);
      expect(result2.deduped).toBe(true);
      expect(result2.event.id).toBe(result1.event.id);

      // Third append with same key but different params (should throw)
      expect(() => {
        persistedStore.append('IDEMPOTENT_EVENT', { value: 3 }, {
          key: 'idem-key',
          params: { test: false }, // Different params
          aggregate: { id: 'agg-1', type: 'test' }
        });
      }).toThrow('Idempotency conflict');
    });
  });

  describe('Persisted Store Factory', () => {
    it('should create a persisted store with localStorage', async () => {
      const store = await getPersistedEventStore();
      
      expect(store).toBeDefined();
      expect(store.append).toBeDefined();
      expect(store.getAll).toBeDefined();

      // Test that it can append and retrieve events
      const result = store.append('FACTORY_EVENT', { test: true }, {
        key: 'factory-1',
        params: {},
        aggregate: { id: 'agg-1', type: 'test' }
      });

      expect(result.event.type).toBe('FACTORY_EVENT');
      
      const allEvents = store.getAll();
      expect(allEvents).toContainEqual(expect.objectContaining({
        type: 'FACTORY_EVENT'
      }));
    });

    it('should return the same instance on multiple calls', async () => {
      const store1 = await getPersistedEventStore();
      const store2 = await getPersistedEventStore();
      
      expect(store1).toBe(store2);
    });

    it('should provide storage statistics', async () => {
      const store = await getPersistedEventStore();
      
      // Add some events
      for (let i = 0; i < 5; i++) {
        store.append(`EVENT_${i}`, { index: i }, {
          key: `stats-${i}`,
          params: {},
          aggregate: { id: 'agg-1', type: 'test' }
        });
      }

      const stats = getStorageStats();
      expect(stats).toBeDefined();
      expect(stats?.itemCount).toBeGreaterThan(0);
      expect(stats?.used).toBeGreaterThan(0);
    });
  });

  describe('Event Persistence Across Sessions', () => {
    it('should simulate persistence across page reloads', async () => {
      // Session 1: Create events
      const store1 = await getPersistedEventStore();
      
      store1.append('SESSION_1_EVENT', { session: 1 }, {
        key: 'session-1',
        params: {},
        aggregate: { id: 'session-agg', type: 'test' }
      });

      // Reset the store (simulating page reload)
      await resetPersistedEventStore();

      // Session 2: Load and verify events persist
      const store2 = await getPersistedEventStore();
      
      const events = store2.getAll();
      expect(events).toContainEqual(expect.objectContaining({
        type: 'SESSION_1_EVENT',
        payload: { session: 1 }
      }));

      // Add more events in session 2
      store2.append('SESSION_2_EVENT', { session: 2 }, {
        key: 'session-2',
        params: {},
        aggregate: { id: 'session-agg', type: 'test' }
      });

      // Verify both events exist
      const allEvents = store2.getAll();
      expect(allEvents.filter(e => e.type === 'SESSION_1_EVENT')).toHaveLength(1);
      expect(allEvents.filter(e => e.type === 'SESSION_2_EVENT')).toHaveLength(1);
    });
  });
});
