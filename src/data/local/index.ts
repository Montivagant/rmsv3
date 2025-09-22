// Data local storage (PouchDB) — thin wrapper over existing adapter
import {
  createPouchDBAdapter,
  createIndexes,
  type PouchDBAdapter,
} from '../../db/pouch';

export type { PouchDBAdapter };

export async function openLocalDB(name: string): Promise<PouchDB.Database> {
  const adapter = await createPouchDBAdapter({ name });
  await createIndexes(adapter as unknown as PouchDB.Database);
  return adapter as unknown as PouchDB.Database;
}

