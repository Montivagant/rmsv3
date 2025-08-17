import type { 
  Event, 
  EventStore, 
  AppendOptions, 
  AppendResult, 
  IdempotencyRecord
} from './types';
import { IdempotencyConflictError } from './types';
import { stableHash } from './hash';
import { logEvent } from './log';

/**
 * In-memory event store with strict idempotency
 * Maintains append-only log with monotonic sequence numbers
 */
export class InMemoryEventStore implements EventStore {
  private events: Event[] = [];
  private idempotencyIndex = new Map<string, { eventId: string; paramsHash: string }>();
  private eventIndex = new Map<string, Event>();
  private sequenceCounter = 0;

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
    
    // Store event
    this.events.push(event);
    this.eventIndex.set(event.id, event);
    
    // Index for idempotency
    this.idempotencyIndex.set(opts.key, {
      eventId: event.id,
      paramsHash
    });
    
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

  reset(): void {
    this.events = [];
    this.idempotencyIndex.clear();
    this.eventIndex.clear();
    this.sequenceCounter = 0;
  }
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Global instance for the application
export const eventStore = new InMemoryEventStore();