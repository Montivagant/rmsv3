import PouchDBBrowser from 'pouchdb-browser';
import pouchdbFind from 'pouchdb-find';
import pouchdbAdapterMemory from 'pouchdb-adapter-memory';
// PouchDB document shape that mirrors our event format
export interface DBDocument {
  _id: string;
  _rev?: string;
  timestamp: number;
  aggregateId?: string;
  type: string;
  [key: string]: any;
}

type PouchStatic = PouchDB.Static;
type PouchDatabase = PouchDB.Database;

const AdapterPreset = {
  IndexedDB: 'idb',
  Memory: 'memory',
} as const;

let pouchFactory: PouchStatic | null = null;

async function configurePouchDB(): Promise<PouchStatic> {
  if (pouchFactory) return pouchFactory;

  const isBrowser = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

  const base: PouchStatic = isBrowser
    ? (PouchDBBrowser as unknown as PouchStatic)
    : ((PouchDBBrowser as unknown as PouchStatic).defaults({ adapter: AdapterPreset.Memory }) as PouchStatic);

  (base as any).plugin(pouchdbFind);
  if (!isBrowser) {
    (base as any).plugin(pouchdbAdapterMemory);
  }

  pouchFactory = base;
  return pouchFactory;
}

import type { Event as AppEventType, KnownEvent as KnownEventType } from '../events/types';

// Re-exported types
export type DBEvent = KnownEventType & DBDocument;
export type PouchCfg = { name: string };

export async function openLocalDB(cfg: PouchCfg) {
  const Pouch = await configurePouchDB();
  const db = new Pouch(cfg.name, { auto_compaction: true }) as PouchDatabase;
  await createIndexes(db);
  return db;
}

export async function createIndexes(db: PouchDatabase) {
  try {
    await db.createIndex({ index: { fields: ['aggregateId'] } });
    await db.createIndex({ index: { fields: ['type'] } });
    await db.createIndex({ index: { fields: ['aggregateId', 'type'] } });
    await db.createIndex({ index: { fields: ['timestamp'] } });
  } catch (error) {
    console.warn('PouchDB index creation warning:', error);
  }
}

export async function putEvent(db: PouchDatabase, event: AppEventType) {
  const document: DBDocument = {
    ...event,
    timestamp: event.at,
    aggregateId: event.aggregate?.id,
    _id: event.id,
  };

  try {
    const existing = await db.get(document._id);
    return db.put({ ...existing, ...document, _rev: existing._rev });
  } catch (error) {
    if ((error as any)?.status === 404) {
      return db.put(document);
    }
    throw error;
  }
}

export async function bulkPutEvents(db: PouchDatabase, events: AppEventType[]) {
  const docs: DBDocument[] = events.map(event => ({
    ...event,
    timestamp: event.at,
    aggregateId: event.aggregate?.id,
    _id: event.id,
  }));
  return db.bulkDocs(docs, { new_edits: false });
}

export async function allEvents(db: PouchDatabase): Promise<AppEventType[]> {
  const result = await db.allDocs({ include_docs: true });
  return result.rows.flatMap(row => (row.doc ? [stripMeta(row.doc as DBDocument)] : []));
}

export async function getByAggregate(db: PouchDatabase, aggregateId: string): Promise<AppEventType[]> {
  try {
    const result = await db.find({ selector: { aggregateId }, sort: ['timestamp'] });
    return result.docs.map(doc => stripMeta(doc as DBDocument));
  } catch (error) {
    console.warn('PouchDB aggregate query fell back to scan:', error);
    const events = await allEvents(db);
    return events.filter(event => event.aggregate?.id === aggregateId);
  }
}

export async function eventsByType<T extends AppEventType['type']>(
  db: PouchDatabase,
  type: T,
): Promise<Extract<AppEventType, { type: T }>[]> {
  try {
    const result = await db.find({ selector: { type }, sort: ['timestamp'] });
    return result.docs
      .map(doc => stripMeta(doc as DBDocument))
      .filter((event): event is Extract<AppEventType, { type: T }> => event.type === type);
  } catch (error) {
    console.warn('PouchDB type query fell back to scan:', error);
    const events = await allEvents(db);
    return events.filter((event): event is Extract<AppEventType, { type: T }> => event.type === type);
  }
}

export async function resetDB(db: PouchDatabase) {
  await db.destroy();
}

function stripMeta(doc: DBDocument): AppEventType {
  const { _id, _rev, timestamp, aggregateId, ...rest } = doc;
  return {
    ...rest,
    at: timestamp,
    aggregate: aggregateId ? { id: aggregateId, type: rest.aggregate?.type || 'unknown' } : rest.aggregate,
  } as AppEventType;
}

export interface PouchDBAdapter {
  putEvent(event: AppEventType): Promise<void>;
  allEvents(): Promise<AppEventType[]>;
  getByAggregate(aggregateId: string): Promise<AppEventType[]>;
  eventsByType<T extends AppEventType['type']>(eventType: T): Promise<Extract<AppEventType, { type: T }>[]>;
  reset(): Promise<void>;
}

export async function createPouchDBAdapter(cfg: PouchCfg): Promise<PouchDBAdapter> {
  const db = await openLocalDB(cfg);

  return {
    async putEvent(event: AppEventType) {
      await putEvent(db, event);
    },
    async allEvents() {
      return allEvents(db);
    },
    async getByAggregate(aggregateId: string) {
      return getByAggregate(db, aggregateId);
    },
    async eventsByType<T extends AppEventType['type']>(eventType: T) {
      return eventsByType(db, eventType);
    },
    async reset() {
      await resetDB(db);
    },
  };
}

export function openLocalDBLegacy(name: string): PouchDBAdapter {
  let dbPromise: Promise<PouchDatabase> | null = null;

  const ensure = () => {
    if (!dbPromise) {
      dbPromise = openLocalDB({ name });
    }
    return dbPromise;
  };

  return {
    async putEvent(event: AppEventType) {
      const db = await ensure();
      await putEvent(db, event);
    },
    async allEvents() {
      const db = await ensure();
      return allEvents(db);
    },
    async getByAggregate(aggregateId: string) {
      const db = await ensure();
      return getByAggregate(db, aggregateId);
    },
    async eventsByType<T extends AppEventType['type']>(eventType: T) {
      const db = await ensure();
      return eventsByType(db, eventType);
    },
    async reset() {
      const db = await ensure();
      await resetDB(db);
    },
  };
}
