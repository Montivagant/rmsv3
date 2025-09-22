/**
 * LocalStorage-persisted event store
 * Provides the same interface as PouchDB-persisted store
 * Safe bridge while PouchDB is unavailable
 */

import type { Event, EventStore, AppendOptions, AppendResult } from './types';
import { InMemoryEventStore } from './store';
import type { LocalStorageAdapter, DBEvent } from '../db/localStorage';

export class LocalStoragePersistedEventStore implements EventStore {
  private memoryStore: InMemoryEventStore;
  private db: LocalStorageAdapter;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  constructor(memoryStore: InMemoryEventStore, db: LocalStorageAdapter, _dbPrefix: string = 'rmsv3_events') {
    this.memoryStore = memoryStore;
    this.db = db;
    // The db already handles the prefix, we just store it for reference
  }

  /**
   * Load events from localStorage into memory store
   */
  async hydrateFromLocalStorage(): Promise<void> {
    // Hydration logging simplified to prevent console noise
    
    try {
      const result = await this.db.allDocs();
      const events = result.rows
        .map(row => this.dbEventToEvent(row.doc))
        .filter(event => event !== null) as Event[];

      // Sort by sequence to maintain order
      events.sort((a, b) => a.seq - b.seq);

      // Hydration logging simplified
      
      // Reset memory store and add events one by one to maintain consistency
      this.memoryStore.reset();
      
      for (const event of events) {
        try {
          // Bypass idempotency for hydration - these are already committed events
          this.memoryStore.addEventDirectly(event);
        } catch (error) {
          console.warn(`⚠️ Failed to hydrate event: ${event.id}`);
        }
      }

      // Only log hydration status once per session
      if (!(globalThis as any).__RMS_HYDRATION_LOGGED) {
        console.log(`✅ Hydrated ${this.memoryStore.getAll().length} events`);
        (globalThis as any).__RMS_HYDRATION_LOGGED = true;
      }
    } catch (error) {
      console.error('❌ Failed to hydrate from localStorage');
      throw error;
    }
  }

  private pendingWrites: Promise<void>[] = [];

  /**
   * Append event to both memory and localStorage
   * Made synchronous-like by immediately saving to localStorage
   */
  append(type: string, payload: any, opts: AppendOptions): AppendResult {
    // First append to memory store (handles validation, idempotency, etc.)
    const result = this.memoryStore.append(type, payload, opts);
    
    // Then persist to localStorage immediately if it's a new event
    if (result.isNew) {
      try {
        const dbEvent = this.eventToDBEvent(result.event);
        // Track the pending write so we can wait for it if needed
        const writePromise = this.db.put(dbEvent).then(() => {
          // Success - event is persisted
        }).catch(error => {
          console.error('Failed to persist event to localStorage:', error);
        });
        
        this.pendingWrites.push(writePromise);
        
        // Clean up completed writes
        writePromise.finally(() => {
          const index = this.pendingWrites.indexOf(writePromise);
          if (index > -1) {
            this.pendingWrites.splice(index, 1);
          }
        });
      } catch (error) {
        console.error('Failed to persist event to localStorage:', error);
      }
    }
    
    return result;
  }

  /**
   * Wait for all pending writes to complete
   */
  async waitForPendingWrites(): Promise<void> {
    if (this.pendingWrites.length > 0) {
      await Promise.all(this.pendingWrites);
    }
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
   * Query events with optional filter
   */
  query(filter?: any): Event[] {
    return this.memoryStore.query(filter);
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
    
    // Only log auto-sync start once per session to avoid React StrictMode duplicate messages
    if (!(globalThis as any).__RMS_AUTOSYNC_LOGGED) {
      (globalThis as any).__RMS_AUTOSYNC_LOGGED = true;
    }
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

  /**
   * Convert Event to DBEvent for localStorage
   */
  private eventToDBEvent(event: Event): DBEvent {
    return {
      ...event,
      _id: event.id,
      _rev: '', // Will be set by localStorage adapter
      timestamp: event.at,
      aggregateId: event.aggregate?.id || ''
    };
  }

  /**
   * Convert DBEvent to Event from localStorage
   */
  private dbEventToEvent(dbEvent: DBEvent): Event | null {
    try {
      // Reconstruct the event from the stored data
      const event: Event = {
        id: dbEvent._id || dbEvent.id,
        seq: dbEvent.seq,
        type: dbEvent.type,
        at: dbEvent.timestamp || dbEvent.at,
        aggregate: dbEvent.aggregate,
        payload: dbEvent.payload
      } as Event;
      
      return event;
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
  db: LocalStorageAdapter,
  dbPrefix?: string
): Promise<LocalStoragePersistedEventStore> {
  const persistedStore = new LocalStoragePersistedEventStore(memoryStore, db, dbPrefix);
  return persistedStore;
}
