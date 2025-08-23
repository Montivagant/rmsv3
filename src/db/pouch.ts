// Lightweight PouchDB adapter for events
// PouchDB import disabled in development due to CommonJS/ESM conflicts
// import PouchDB from 'pouchdb';
const PouchDB: any = null;

// Configure PouchDB for browser environment
let adapterConfigured = false;

async function configurePouchDB() {
  if (adapterConfigured) return;
  
  // PouchDB is configured for browser environment by default with IndexedDB
  adapterConfigured = true;
}
import type { Event as AppEvent, KnownEvent } from '../events/types';

// Base document structure for PouchDB
export interface DBDocument {
  _id: string;
  _rev?: string;
  timestamp: number;
  aggregateId?: string;
  type: string;
  [key: string]: any;
}

// DB-shaped events with PouchDB metadata
export type DBEvent = KnownEvent & DBDocument;
export type PouchCfg = { name: string };

export async function openLocalDB(cfg: PouchCfg) {
  if (PouchDB === null) {
    throw new Error('PouchDB is disabled in development mode due to module conflicts');
  }
  
  await configurePouchDB();
  // TypeScript workaround for development mode when PouchDB is null
  const db = new (PouchDB as any)(cfg.name) as PouchDB.Database<DBDocument>; // IndexedDB in browser
  
  // Create Mango indexes for better query performance
  await createIndexes(db);
  
  return db;
}

// Create Mango indexes for efficient queries
export async function createIndexes(db: PouchDB.Database<DBDocument>) {
  try {
    // Index for aggregateId queries
    await db.createIndex({
      index: {
        fields: ['aggregateId']
      }
    });
    
    // Index for type queries
    await db.createIndex({
      index: {
        fields: ['type']
      }
    });
    
    // Composite index for aggregateId + type queries
    await db.createIndex({
      index: {
        fields: ['aggregateId', 'type']
      }
    });
    
    // Index for timestamp-based queries
    await db.createIndex({
      index: {
        fields: ['timestamp']
      }
    });
  } catch (error) {
    console.warn('Failed to create some indexes:', error);
  }
}

export async function putEvent(db: PouchDB.Database<DBDocument>, event: AppEvent) {
  // Map domain event to DB event
  const dbEvent: DBDocument = {
    ...event,
    timestamp: event.at,
    aggregateId: event.aggregate?.id,
    _id: event.id
  };
  
  try {
    const existing = await db.get(dbEvent._id);
    // Idempotent: same id → keep first (append-only model)
    return await db.put({ ...existing, ...dbEvent, _rev: existing._rev });
  } catch (err: unknown) {
    if ((err as any)?.status === 404) return db.put(dbEvent);
    throw err;
  }
}

export async function bulkPutEvents(db: PouchDB.Database<DBDocument>, events: AppEvent[]) {
  const docs: DBDocument[] = events.map(event => ({
    ...event,
    timestamp: event.at,
    aggregateId: event.aggregate?.id,
    _id: event.id
  }));
  return db.bulkDocs(docs, { new_edits: false }); // keep provided _id/_rev or insert
}

export async function allEvents(db: PouchDB.Database<DBDocument>): Promise<AppEvent[]> {
  const res = await db.allDocs({ include_docs: true });
  return res.rows.flatMap(r => (r.doc ? [stripMeta(r.doc)] : []));
}

export async function getByAggregate(db: PouchDB.Database<DBDocument>, aggregateId: string): Promise<AppEvent[]> {
  try {
    const result = await db.find({
      selector: { aggregateId },
      sort: ['timestamp']
    });
    return result.docs.map(doc => stripMeta(doc));
  } catch (error) {
    console.warn('Mango query failed, falling back to allEvents filter:', error);
    const events = await allEvents(db);
    return events.filter(e => e.aggregate?.id === aggregateId);
  }
}

export async function eventsByType<T extends AppEvent['type']>(
  db: PouchDB.Database<DBDocument>, 
  type: T
): Promise<Extract<AppEvent, { type: T }>[]> {
  try {
    const result = await db.find({
      selector: { type },
      sort: ['timestamp']
    });
    return result.docs
      .map(doc => stripMeta(doc))
      .filter((event): event is Extract<AppEvent, { type: T }> => event.type === type);
  } catch (error) {
    console.warn('Mango query failed, falling back to allEvents filter:', error);
    const events = await allEvents(db);
    return events.filter((e): e is Extract<AppEvent, { type: T }> => e.type === type);
  }
}

export async function resetDB(db: PouchDB.Database<DBDocument>) {
  await db.destroy();
}

function stripMeta(doc: DBDocument): AppEvent {
  // remove Pouch meta fields and map back to domain event
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, _rev, timestamp, aggregateId, ...rest } = doc;
  return {
    ...rest,
    at: timestamp,
    aggregate: aggregateId ? { id: aggregateId, type: rest.aggregate?.type || 'unknown' } : rest.aggregate
  } as AppEvent;
}

// Legacy adapter interface for backward compatibility
export interface PouchDBAdapter {
  putEvent(event: AppEvent): Promise<void>;
  allEvents(): Promise<AppEvent[]>;
  getByAggregate(aggregateId: string): Promise<AppEvent[]>;
  eventsByType<T extends AppEvent['type']>(eventType: T): Promise<Extract<AppEvent, { type: T }>[]>;
  reset(): Promise<void>;
}

// Modern composition-based adapter (recommended)
export async function createPouchDBAdapter(cfg: PouchCfg): Promise<PouchDBAdapter> {
  if (PouchDB === null) {
    throw new Error('PouchDB is disabled in development mode due to module conflicts');
  }
  
  const db = await openLocalDB(cfg);
  
  return {
    async putEvent(event: AppEvent): Promise<void> {
      await putEvent(db, event);
    },
    
    async allEvents(): Promise<AppEvent[]> {
      return allEvents(db);
    },
    
    async getByAggregate(aggregateId: string): Promise<AppEvent[]> {
      return getByAggregate(db, aggregateId);
    },
    
    async eventsByType<T extends AppEvent['type']>(eventType: T): Promise<Extract<AppEvent, { type: T }>[]> {
      return eventsByType(db, eventType);
    },
    
    async reset(): Promise<void> {
      await resetDB(db);
    }
  };
}

// Legacy function for backward compatibility
export function openLocalDBLegacy(name: string): PouchDBAdapter {
  if (PouchDB === null) {
    throw new Error('PouchDB is disabled in development mode due to module conflicts');
  }
  
  const dbPromise = openLocalDB({ name });
  
  return {
    async putEvent(event: AppEvent): Promise<void> {
      const db = await dbPromise;
      await putEvent(db, event);
    },
    
    async allEvents(): Promise<AppEvent[]> {
      const db = await dbPromise;
      return allEvents(db);
    },
    
    async getByAggregate(aggregateId: string): Promise<AppEvent[]> {
      const db = await dbPromise;
      return getByAggregate(db, aggregateId);
    },
    
    async eventsByType<T extends AppEvent['type']>(eventType: T): Promise<Extract<AppEvent, { type: T }>[]> {
      const db = await dbPromise;
      return eventsByType(db, eventType);
    },
    
    async reset(): Promise<void> {
      const db = await dbPromise;
      await resetDB(db);
    }
  };
}