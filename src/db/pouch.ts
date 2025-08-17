import PouchDB from 'pouchdb';
import { KnownEvent } from '../events/types';

export interface PouchDBAdapter {
  putEvent(event: KnownEvent): Promise<void>;
  allEvents(): Promise<KnownEvent[]>;
  eventsByAggregate(aggregateId: string): Promise<KnownEvent[]>;
  eventsByType(eventType: string): Promise<KnownEvent[]>;
  reset(): Promise<void>;
}

export function openLocalDB(name: string): PouchDBAdapter {
  const db = new PouchDB(name);

  return {
    async putEvent(event: KnownEvent): Promise<void> {
      try {
        // Use event.id as document _id for idempotency
        const doc = {
          _id: event.id,
          ...event
        };
        
        await db.put(doc);
      } catch (error: any) {
        // If document already exists with same ID, check if content matches
        if (error.status === 409) {
          try {
            const existing = await db.get(event.id);
            // Remove PouchDB metadata for comparison
            const { _id, _rev, ...existingEvent } = existing as any;
            const eventWithoutId = { ...event };
            
            // If content differs, log structured error (TODO: moderation UI)
            if (JSON.stringify(existingEvent) !== JSON.stringify(eventWithoutId)) {
              console.error('Idempotency conflict detected:', {
                eventId: event.id,
                existing: existingEvent,
                attempted: eventWithoutId
              });
            }
            // Idempotent - same event ID, operation succeeds
            return;
          } catch (getError) {
            throw error; // Re-throw original error if we can't get existing doc
          }
        }
        throw error;
      }
    },

    async allEvents(): Promise<KnownEvent[]> {
      try {
        const result = await db.allDocs({ include_docs: true });
        return result.rows
          .map(row => {
            if (!row.doc) return null;
            const { _id, _rev, ...event } = row.doc as any;
            return event as KnownEvent;
          })
          .filter((event): event is KnownEvent => event !== null)
          .sort((a, b) => a.timestamp - b.timestamp);
      } catch (error) {
        console.error('Failed to fetch all events:', error);
        return [];
      }
    },

    async eventsByAggregate(aggregateId: string): Promise<KnownEvent[]> {
      try {
        const allEvents = await this.allEvents();
        return allEvents.filter(event => event.aggregateId === aggregateId);
      } catch (error) {
        console.error('Failed to fetch events by aggregate:', error);
        return [];
      }
    },

    async eventsByType(eventType: string): Promise<KnownEvent[]> {
      try {
        const allEvents = await this.allEvents();
        return allEvents.filter(event => event.type === eventType);
      } catch (error) {
        console.error('Failed to fetch events by type:', error);
        return [];
      }
    },

    async reset(): Promise<void> {
      try {
        await db.destroy();
        // Recreate the database
        Object.assign(db, new PouchDB(name));
      } catch (error) {
        console.error('Failed to reset database:', error);
        throw error;
      }
    }
  };
}