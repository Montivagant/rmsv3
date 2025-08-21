import { openLocalDB } from '../db/pouch'
import { createPersistedEventStore } from '../events/persisted'
import { createInMemoryEventStore } from '../events/store'

export async function bootstrapEventStore() {
  const db = await openLocalDB({ name: 'rmsv3_events' })
  const mem = createInMemoryEventStore()
  const persisted = await createPersistedEventStore(mem, db)
  await persisted.hydrateFromPouch()
  return { store: persisted, db }
}