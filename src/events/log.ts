import type { Event } from './types';

/**
 * Logs events to console with structured JSON format
 * Provides observability for event store operations
 */
export function logEvent(event: Event): void {
  const logData = {
    timestamp: new Date().toISOString(),
    event: {
      id: event.id,
      seq: event.seq,
      type: event.type,
      at: event.at,
      aggregate: event.aggregate
    }
  };
  
  console.info('[EVENT_STORE]', JSON.stringify(logData));
}