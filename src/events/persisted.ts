import type PouchDB from 'pouchdb';
import type { Event } from './types';
import { type EventStore } from './store';
import { putEvent, allEvents, type DBEvent } from '../db/pouch';

// Local type to match event structure
type KnownEvent = Event & {
  timestamp: number;
  aggregateId?: string;
};

type MemWithIngest = EventStore & { ingest?: (e: KnownEvent) => void };

export function createPersistedEventStore(mem: EventStore, db: PouchDB.Database<DBEvent>) {
  const m = mem as MemWithIngest;

  async function hydrateFromPouch() {
    const events = await allEvents(db);
    for (const e of events) {
      if (typeof m.ingest === 'function') {
        m.ingest(e);
      } else {
        // Fallback: only add if not present via idempotent append on a shadow key
        try {
          mem.append(e.type as any, (e as any).payload, {
            key: `rehydrate:${e.id}`,
            params: { id: e.id },
            aggregate: e.aggregate,
          });
        } catch {
          // ignore (key collisions or mismatch) – we only need indices populated
        }
      }
    }
  }

  function appendPersisted<T extends KnownEvent['type']>(
    type: T,
    payload: Extract<KnownEvent, { type: T }>['payload'],
    opts: Parameters<EventStore['append']>[2]
  ) {
    const res = mem.append(type, payload, opts);
    // Fire-and-forget persist; don't block UI
    const eventWithTimestamp = { ...res.event, timestamp: res.event.at };
    putEvent(db, eventWithTimestamp as KnownEvent).catch(err => {
      console.error('[pouch] putEvent failed', err);
    });
    return res;
  }

  return {
    ...mem,
    append: appendPersisted,
    hydrateFromPouch,
  } as EventStore & { hydrateFromPouch: () => Promise<void> };
}