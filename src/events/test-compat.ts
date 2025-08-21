/**
 * Legacy compatibility shim for tests
 * Maps old store helpers to new EventStore API
 */

import { eventStore } from './store';
import type { Event } from './types';

/**
 * Legacy helper: append event with old signature
 * @deprecated Use eventStore.append() directly
 */
export function append(type: string, payload: any, options: { aggregate?: string; key?: string } = {}) {
  return eventStore.append(type, payload, {
    key: options.key || `test-${Date.now()}`,
    params: { timestamp: Date.now() },
    aggregate: options.aggregate ? { id: options.aggregate, type: 'test' } : undefined
  });
}

/**
 * Legacy helper: get all events
 * @deprecated Use eventStore.getAll() directly
 */
export function getAll(): Event[] {
  return eventStore.getAll();
}

/**
 * Legacy helper: get events by type
 * @deprecated Use eventStore.getByType() directly
 */
export function getEventsByType(type: string): Event[] {
  return eventStore.getByType(type);
}

/**
 * Legacy helper: get events by aggregate
 * @deprecated Use eventStore.getByAggregate() directly
 */
export function getByAggregate(aggregateId: string): Event[] {
  return eventStore.getByAggregate(aggregateId);
}

/**
 * Legacy helper: reset store
 * @deprecated Use eventStore.reset() directly
 */
export async function resetEventStore(): Promise<void> {
  return eventStore.reset();
}

/**
 * Legacy helper: create mock store for tests
 * @deprecated Import eventStore directly and use reset()
 */
export function createMockEventStore() {
  // Reset the global store for test isolation
  eventStore.reset();
  return eventStore;
}

/**
 * Legacy helper: wait for store to be ready
 * @deprecated EventStore is synchronous, no waiting needed
 */
export async function waitForStoreReady(): Promise<void> {
  // No-op: in-memory store is always ready
  return Promise.resolve();
}

/**
 * Legacy helper: simulate store hydration
 * @deprecated Use eventStore.hydrate() directly
 */
export async function hydrateStore(): Promise<void> {
  return eventStore.hydrate();
}

/**
 * Legacy helper: inject events for testing
 * @deprecated Use eventStore.append() in a loop
 */
export function injectTestEvents(events: Event[]): void {
  for (const event of events) {
    // Use the internal ingest method if available, otherwise append
    if ('ingest' in eventStore && typeof (eventStore as any).ingest === 'function') {
      (eventStore as any).ingest(event);
    } else {
      eventStore.append(event.type, (event as any).payload, {
        key: `inject-${event.id}`,
        params: { id: event.id },
        aggregate: event.aggregate
      });
    }
  }
}

/**
 * Legacy helper: get store state for debugging
 * @deprecated Use eventStore methods directly
 */
export function getStoreState() {
  return {
    eventCount: eventStore.getAll().length,
    events: eventStore.getAll(),
    ready: true // in-memory store is always ready
  };
}