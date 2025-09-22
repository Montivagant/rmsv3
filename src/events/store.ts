import type { 
  Event, 
  EventStore as IEventStore, 
  AppendOptions, 
  AppendResult, 
  IdempotencyRecord
} from './types';
import { IdempotencyConflictError } from './types';
import { stableHash } from './hash';
import { logEvent } from './log';
// PouchDB integration for offline-first sync
import { openLocalDBLegacy, type PouchDBAdapter } from '../db/pouch';

/**
 * In-memory event store with strict idempotency
 * Maintains append-only log with monotonic sequence numbers
 * Optionally persists to PouchDB for offline-first sync
 */
export class InMemoryEventStore implements IEventStore {
  private events: Event[] = [];
  private idempotencyIndex = new Map<string, { eventId: string; paramsHash: string }>();
  private eventIndex = new Map<string, Event>();
  private sequenceCounter = 0;
  private pouchAdapter?: PouchDBAdapter;

  constructor(options: { persistToPouch?: boolean; dbName?: string } = {}) {
    // Initialize PouchDB adapter if persistence is requested
    if (options.persistToPouch) {
      try {
        this.pouchAdapter = openLocalDBLegacy(options.dbName || 'rmsv3_events');
      } catch (error) {
        console.warn('Failed to initialize PouchDB adapter:', error);
        // Continue without persistence adapter - graceful fallback
      }
    }
  }

  append(type: string, payload: any, opts: AppendOptions): AppendResult {
    const paramsHash = stableHash(opts.params);
    
    // Check for existing idempotency key (only if provided)
    if (opts.key) {
      const existing = this.idempotencyIndex.get(opts.key);
      
      if (existing) {
        const existingEvent = this.eventIndex.get(existing.eventId);
        
        if (!existingEvent) {
          throw new Error(`Event ${existing.eventId} not found in index`);
        }
        
        // Same params hash - return existing event (deduped)
        if (existing.paramsHash === paramsHash) {
          return {
            event: existingEvent,
            deduped: true,
            isNew: false
          };
        }
        
        // Different params hash - conflict
        throw new IdempotencyConflictError(
          `Idempotency conflict for key '${opts.key}': params hash mismatch`
        );
      }
    } else {
      // Guard: if no idempotency key is provided, proceed without idempotency indexing
      console.warn('append called without idempotency key; operation will not be idempotent');
    }
    
    // Create new event
    const event: Event = {
      id: generateEventId(),
      seq: ++this.sequenceCounter,
      type,
      at: Date.now(),
      aggregate: opts.aggregate,
      payload
    } as Event;
    
    // Store event in memory
    this.events.push(event);
    this.eventIndex.set(event.id, event);
    
    // Index for idempotency only when key is provided
    if (opts.key) {
      this.idempotencyIndex.set(opts.key, {
        eventId: event.id,
        paramsHash
      });
    }
    
    // Persist to PouchDB if adapter is available
    if (this.pouchAdapter) {
      // Fire and forget - don't block on persistence
      this.pouchAdapter.putEvent(event).catch(error => {
        console.error('Failed to persist event to PouchDB:', error);
      });
    }
    
    // Log the event
    logEvent(event);
    
    return {
      event,
      deduped: false,
      isNew: true
    };
  }

  getAll(): Event[] {
    return [...this.events];
  }

  getEventsForAggregate(aggregateId: string): Event[] {
    return this.events.filter(event => event.aggregate?.id === aggregateId);
  }

  query(filter?: any): Event[] {
    if (!filter) {
      return this.getAll();
    }
    
    // Simple filtering implementation
    return this.events.filter(event => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.aggregateId && event.aggregate?.id !== filter.aggregateId) return false;
      if (filter.aggregateType && event.aggregate?.type !== filter.aggregateType) return false;
      return true;
    });
  }

  getByAggregate(id: string): Event[] {
    return this.events.filter(event => event.aggregate?.id === id);
  }

  getByType(type: string): Event[] {
    return this.events.filter(event => event.type === type);
  }

  getByIdempotencyKey(key: string): IdempotencyRecord | undefined {
    const existing = this.idempotencyIndex.get(key);
    
    if (!existing) {
      return undefined;
    }
    
    const event = this.eventIndex.get(existing.eventId);
    
    if (!event) {
      return undefined;
    }
    
    return {
      eventId: event.id,
      paramsHash: existing.paramsHash
    };
  }

  async hydrate(): Promise<void> {
    if (!this.pouchAdapter) {
      console.log('PouchDB not available, using in-memory store only');
      return;
    }

    try {
      const events = await this.pouchAdapter.allEvents();
      
      // Load events into memory
      for (const event of events) {
        // Add to memory store
        this.events.push(event);
        this.eventIndex.set(event.id, event);
        
        // Update sequence counter
        if (event.seq > this.sequenceCounter) {
          this.sequenceCounter = event.seq;
        }
      }
      
      // Sort events by sequence number
      this.events.sort((a, b) => a.seq - b.seq);
      
      console.log(`Hydrated ${events.length} events from PouchDB`);
    } catch (error) {
      console.error('Failed to hydrate events from PouchDB:', error);
    }
  }

  ingest(e: Event): void {
    // No-op if already indexed
    if (this.eventIndex.has(e.id)) return;
    
    // Add to indices without changing sequence
    this.events.push(e);
    this.eventIndex.set(e.id, e);
    
    // Update sequence counter to maintain ordering
    if (e.seq && e.seq >= this.sequenceCounter) {
      this.sequenceCounter = e.seq;
    }
  }

  async reset(): Promise<void> {
    // Clear in-memory state
    this.events = [];
    this.idempotencyIndex.clear();
    this.eventIndex.clear();
    this.sequenceCounter = 0;
    
    // Reset PouchDB if available
    if (this.pouchAdapter) {
      try {
        await this.pouchAdapter.reset();
      } catch (error) {
        console.error('Failed to reset PouchDB:', error);
      }
    }
  }

  /**
   * Add event directly to store without validation (for hydration)
   * Used when loading events from persistence layer
   */
  addEventDirectly(event: Event): void {
    this.events.push(event);
    this.eventIndex.set(event.id, event);
    this.sequenceCounter = Math.max(this.sequenceCounter, event.seq);
  }
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  const rand = Math.random().toString(36).slice(2, 11);
  return `evt_${Date.now()}_${rand}`;
}

/**
 * Factory function to create EventStore instances
 */
export function createEventStore(options: { persistToPouch?: boolean; dbName?: string } = {}): InMemoryEventStore {
  return new InMemoryEventStore(options);
}

/**
 * Factory function to create in-memory event store (for composition pattern)
 */
export function createInMemoryEventStore(): InMemoryEventStore {
  return new InMemoryEventStore();
}

// Enhanced factory for persisted event stores using composition pattern
// export function createPersistedStore(dbName: string = 'rmsv3_events') {
//   const memStore = new InMemoryEventStore();
//   const db = openLocalDB({ name: dbName });
//   return createPersistedEventStore(memStore, db);
// }

// Global instance for the application (memory-only by default)
export const eventStore = new InMemoryEventStore();

// Global instance with PouchDB persistence
export const persistentEventStore = new InMemoryEventStore({ persistToPouch: true, dbName: 'rmsv3_events' });

// Enhanced persisted store instance (temporarily disabled)
// export const enhancedPersistedStore = createPersistedStore();
export const enhancedPersistedStore = new InMemoryEventStore();

// Export the EventStore type for external use
export type EventStore = IEventStore;