/**
 * Persisted Event Store Implementation
 * Uses localStorage as the persistence layer
 * Provides automatic hydration and persistence
 */

import { InMemoryEventStore } from './store';
import { openLocalStorageDB } from '../db/localStorage';
import { createLocalStoragePersistedEventStore } from './localStoragePersisted';
import type { EventStore } from './types';

let persistedStoreInstance: EventStore | null = null;

/**
 * Create or get the singleton persisted event store
 */
export async function getPersistedEventStore(): Promise<EventStore> {
  if (persistedStoreInstance) {
    return persistedStoreInstance;
  }

  try {
    // Create in-memory store
    const memoryStore = new InMemoryEventStore();
    
    // Create localStorage adapter - use consistent naming
    const db = await openLocalStorageDB({ name: 'rmsv3_events' });
    
    // Create persisted store - the db already adds underscore, so just pass the base name
    const persistedStore = await createLocalStoragePersistedEventStore(memoryStore, db, 'rmsv3_events');
    
    // Hydrate from localStorage
    await persistedStore.hydrateFromLocalStorage();
    
    // Start auto-sync (every 5 seconds in development, 30 seconds in production)
    const syncInterval = import.meta.env.DEV ? 5000 : 30000;
    persistedStore.startAutoSync(syncInterval);
    
    persistedStoreInstance = persistedStore;
    
    console.log('✅ Persisted event store initialized with localStorage');
    
    return persistedStore;
  } catch (error) {
    console.error('Failed to create persisted store, falling back to memory-only:', error);
    
    // Fallback to memory-only store
    const memoryStore = new InMemoryEventStore();
    persistedStoreInstance = memoryStore;
    return memoryStore;
  }
}

/**
 * Reset the persisted store (useful for testing)
 */
export async function resetPersistedEventStore(): Promise<void> {
  if (persistedStoreInstance && 'reset' in persistedStoreInstance) {
    await persistedStoreInstance.reset();
  }
  persistedStoreInstance = null;
}

/**
 * Get storage statistics
 */
export function getStorageStats(): { used: number; available: number; itemCount: number } | null {
  if (persistedStoreInstance && 'getStorageInfo' in persistedStoreInstance) {
    return (persistedStoreInstance as any).getStorageInfo();
  }
  return null;
}
