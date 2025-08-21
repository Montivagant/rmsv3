import { openLocalStorageDB } from '../db/localStorage'
import { LocalStoragePersistedEventStore } from '../events/localStoragePersisted'
import { InMemoryEventStore } from '../events/store'

export async function bootstrapEventStore() {
  try {
    console.log('💾 Initializing localStorage persistence...')
    const db = await openLocalStorageDB({ name: 'rmsv3_events' })
    const mem = new InMemoryEventStore()
    const persisted = new LocalStoragePersistedEventStore(mem, db)
    await persisted.hydrateFromLocalStorage()
    
    // Start auto-sync every 10 seconds for better responsiveness
    persisted.startAutoSync(10000)
    
    console.log('🎉 Event store with localStorage persistence ready!')
    return { store: persisted, db }
  } catch (error) {
    console.warn('Failed to initialize localStorage persistence, falling back to in-memory store:', error)
    return { store: new InMemoryEventStore(), db: null }
  }
}