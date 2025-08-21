/**
 * LocalStorage-persisted event store
 * Provides the same interface as PouchDB-persisted store
 * Safe bridge while PouchDB is unavailable
 */

import type { Event, KnownEvent, EventStore, AppendOptions, AppendResult } from './types';
import { InMemoryEventStore } from './store';
import type { LocalStorageAdapter, DBEvent } from '../db/localStorage';

export class LocalStoragePersistedEventStore implements EventStore {
  private memoryStore: InMemoryEventStore;
  private db: LocalStorageAdapter;
  private syncInterval: number | null = null;

  constructor(memoryStore: InMemoryEventStore, db: LocalStorageAdapter) {
    this.memoryStore = memoryStore;
    this.db = db;
  }

  /**
   * Load events from localStorage into memory store
   */
  async hydrateFromLocalStorage(): Promise<void> {
    try {
      const result = await this.db.allDocs();
      const events = result.rows
        .map(row => this.dbEventToEvent(row.doc))
        .filter(event => event !== null) as Event[];

      // Sort by sequence to maintain order
      events.sort((a, b) => a.seq - b.seq);

      console.log(`💧 Hydrating ${events.length} events from localStorage...`);
      
      // Reset memory store and add events one by one to maintain consistency
      this.memoryStore.reset();
      
      for (const event of events) {
        try {
          // Bypass idempotency for hydration - these are already committed events
          this.memoryStore.addEventDirectly(event);
        } catch (error) {
          console.warn('Failed to hydrate event:', event.id, error);
        }
      }

      console.log(`✅ Hydrated ${this.memoryStore.getAll().length} events successfully`);
    } catch (error) {
      console.error('Failed to hydrate from localStorage:', error);
      throw error;
    }
  }

  /**
   * Append event to both memory and localStorage
   */
  append(type: string, payload: any, opts: AppendOptions): AppendResult {
    // First append to memory store (handles validation, idempotency, etc.)
    const result = this.memoryStore.append(type, payload, opts);
    
    // Then persist to localStorage asynchronously
    this.persistEventToLocalStorage(result.event).catch(error => {
      console.error('Failed to persist event to localStorage:', error);
      // Note: In a production system, you might want to implement retry logic
    });
    
    return result;
  }

  /**
   * Get all events from memory store
   */
  getAll(): Event[] {
    return this.memoryStore.getAll();
  }

  /**
   * Get events by aggregate ID
   */
  getEventsForAggregate(aggregateId: string): Event[] {
    return this.memoryStore.getEventsForAggregate(aggregateId);
  }

  /**
   * Reset both memory and localStorage
   */
  async reset(): Promise<void> {
    this.memoryStore.reset();
    try {
      await this.db.destroy();
      console.log('🗑️ LocalStorage database cleared');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  /**
   * Get storage statistics
   */
  getStorageInfo() {
    if ('getStorageInfo' in this.db) {
      return (this.db as any).getStorageInfo();
    }
    return { used: 0, available: 0, itemCount: 0 };
  }

  /**
   * Start automatic background sync
   */
  startAutoSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.syncToLocalStorage().catch(error => {
        console.warn('Auto-sync failed:', error);
      });
    }, intervalMs);
    
    console.log(`🔄 Auto-sync started (${intervalMs}ms interval)`);
  }

  /**
   * Stop automatic background sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Auto-sync stopped');
    }
  }

  /**
   * Manually sync all memory events to localStorage
   */
  private async syncToLocalStorage(): Promise<void> {
    try {
      const memoryEvents = this.memoryStore.getAll();
      const dbResult = await this.db.allDocs();
      const dbEventIds = new Set(dbResult.rows.map(row => row.doc._id));
      
      // Find events in memory that aren't in localStorage
      const eventsToSync = memoryEvents.filter(event => !dbEventIds.has(event.id));
      
      if (eventsToSync.length > 0) {
        console.log(`🔄 Syncing ${eventsToSync.length} events to localStorage...`);
        const dbEvents = eventsToSync.map(event => this.eventToDBEvent(event));
        await this.db.bulkDocs(dbEvents);
        console.log(`✅ Synced ${eventsToSync.length} events`);
      }
    } catch (error) {
      console.error('Sync to localStorage failed:', error);
      throw error;
    }
  }

  /**
   * Persist a single event to localStorage
   */
  private async persistEventToLocalStorage(event: Event): Promise<void> {
    try {
      const dbEvent = this.eventToDBEvent(event);
      await this.db.put(dbEvent);
    } catch (error) {
      console.error('Failed to persist event:', event.id, error);
      throw error;
    }
  }

  /**
   * Convert Event to DBEvent for localStorage
   */
  private eventToDBEvent(event: Event): DBEvent {
    return {
      ...event,
      _id: event.id,
      _rev: '', // Will be set by localStorage adapter
      timestamp: event.at,
      aggregateId: event.aggregate.id
    };
  }

  /**
   * Convert DBEvent to Event from localStorage
   */
  private dbEventToEvent(dbEvent: DBEvent): Event | null {
    try {
      // Remove localStorage-specific fields
      const { _id, _rev, timestamp, aggregateId, ...eventData } = dbEvent;
      return eventData as Event;
    } catch (error) {
      console.warn('Failed to convert DBEvent to Event:', error);
      return null;
    }
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.stopAutoSync();
  }
}

/**
 * Create a localStorage-persisted event store
 */
export async function createLocalStoragePersistedEventStore(
  memoryStore: InMemoryEventStore,
  db: LocalStorageAdapter
): Promise<LocalStoragePersistedEventStore> {
  const persistedStore = new LocalStoragePersistedEventStore(memoryStore, db);
  return persistedStore;
}
