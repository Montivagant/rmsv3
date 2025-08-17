import type { 
  Event, 
  EventStore, 
  AppendOptions, 
  AppendResult, 
  IdempotencyRecord,
  KnownEvent
} from './types';
import { IdempotencyConflictError } from './types';
import { stableHash } from './hash';
import { logEvent } from './log';
import { openLocalDB, type PouchDBAdapter } from '../db/pouch';

/**
 * In-memory event store with strict idempotency
 * Maintains append-only log with monotonic sequence numbers
 * Optionally persists to PouchDB for offline-first sync
 */
export class InMemoryEventStore implements EventStore {
  private events: Event[] = [];
  private idempotencyIndex = new Map<string, { eventId: string; paramsHash: string }>();
  private eventIndex = new Map<string, Event>();
  private sequenceCounter = 0;
  private pouchAdapter?: PouchDBAdapter;

  constructor(options: { persistToPouch?: boolean; dbName?: string } = {}) {
    if (options.persistToPouch) {
      this.pouchAdapter = openLocalDB(options.dbName || 'rmsv3_events');
    }
  }

  append(type: string, payload: any, opts: AppendOptions): AppendResult {
    const paramsHash = stableHash(opts.params);
    
    // Check for existing idempotency key
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
          deduped: true
        };
      }
      
      // Different params hash - conflict
      throw new IdempotencyConflictError(
        `Idempotency conflict for key '${opts.key}': params hash mismatch`
      );
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
    
    // Index for idempotency
    this.idempotencyIndex.set(opts.key, {
      eventId: event.id,
      paramsHash
    });
    
    // Persist to PouchDB if adapter is available
    if (this.pouchAdapter) {
      const knownEvent: KnownEvent = {
        ...event,
        timestamp: event.at,
        aggregateId: event.aggregate?.id
      };
      
      // Fire and forget - don't block on persistence
      this.pouchAdapter.putEvent(knownEvent).catch(error => {
        console.error('Failed to persist event to PouchDB:', error);
      });
    }
    
    // Log the event
    logEvent(event);
    
    return {
      event,
      deduped: false
    };
  }

  getAll(): Event[] {
    return [...this.events];
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
      event,
      paramsHash: existing.paramsHash
    };
  }

  async hydrate(): Promise<void> {
    if (!this.pouchAdapter) {
      return;
    }

    try {
      const knownEvents = await this.pouchAdapter.allEvents();
      
      // Convert KnownEvents back to Events and load into memory
      for (const knownEvent of knownEvents) {
        const event: Event = {
          ...knownEvent,
          at: knownEvent.timestamp,
          aggregate: knownEvent.aggregateId ? {
            id: knownEvent.aggregateId,
            type: knownEvent.aggregate?.type || 'unknown'
          } : undefined
        };
        
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
      
      console.log(`Hydrated ${knownEvents.length} events from PouchDB`);
    } catch (error) {
      console.error('Failed to hydrate events from PouchDB:', error);
    }
  }

  reset(): void {
    this.events = [];
    this.idempotencyIndex.clear();
    this.eventIndex.clear();
    this.sequenceCounter = 0;
    
    // Also reset PouchDB if adapter is available
    if (this.pouchAdapter) {
      this.pouchAdapter.reset().catch(error => {
        console.error('Failed to reset PouchDB:', error);
      });
    }
  }
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Factory function to create EventStore instances
 */
export function createEventStore(options: { persistToPouch?: boolean; dbName?: string } = {}): InMemoryEventStore {
  return new InMemoryEventStore(options);
}

// Global instance for the application (memory-only by default)
export const eventStore = new InMemoryEventStore();

// Global instance with PouchDB persistence
export const persistentEventStore = new InMemoryEventStore({ persistToPouch: true });