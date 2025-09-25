// Removed localStorage persistence - PouchDB/IndexedDB is now canonical
import { InMemoryEventStore } from '../events/store'
import { OptimizedEventStore } from '../events/optimizedStore'
import { createOptimizedQueries } from '../events/optimizedQueries'
import type { EventStore, Event } from '../events/types'
// Removed localStorage import - using PouchDB/IndexedDB as canonical persistence
// import { setOptimizedQueries } from '../loyalty/state'
import { environment } from '../lib/environment'
import { configureOutbox } from '../data/sync/outboxBridge'
import { syncManager } from '../db/syncManager'
import { logger } from '../shared/logger'

// Extend globalThis with custom properties
declare global {
  var __RMS_OPTIMIZED_STORE_SINGLETON: BootstrapResult | null;
  var __RMS_BOOTSTRAP_LOGGED: boolean;
  var __RMS_READY_LOGGED: boolean;
  var __RMS_MIGRATION_LOGGED: boolean;
}

// Types for bootstrap results
interface BootstrapResult {
  store: OptimizedEventStore
  db?: unknown
}

// Global optimized store instances with React StrictMode protection
let optimizedStore: OptimizedEventStore | null = null
let optimizedQueries: ReturnType<typeof createOptimizedQueries> | null = null
let isBootstrapping = false
let bootstrapPromise: Promise<BootstrapResult> | null = null

// Singleton protection - prevent React StrictMode from creating multiple stores
globalThis.__RMS_OPTIMIZED_STORE_SINGLETON = globalThis.__RMS_OPTIMIZED_STORE_SINGLETON || null

// Dynamically import PouchDB to handle module conflicts gracefully
async function tryPouchDBAdapter(dbName: string) {
  try {
    const { createPouchDBAdapter } = await import('../db/pouch')
    return await createPouchDBAdapter({ name: dbName })
  } catch {
    // PouchDB unavailable - will use localStorage fallback
    return null
  }
}

export async function bootstrapEventStore() {
  // Return existing store if already initialized (React StrictMode protection)
  if (globalThis.__RMS_OPTIMIZED_STORE_SINGLETON) {
    return globalThis.__RMS_OPTIMIZED_STORE_SINGLETON
  }

  // If currently bootstrapping, wait for completion
  if (isBootstrapping && bootstrapPromise) {
    return bootstrapPromise
  }

  isBootstrapping = true

  // Create the bootstrap promise
  bootstrapPromise = (async () => {
    // Only log once per session to avoid React StrictMode duplicate messages
    if (!globalThis.__RMS_BOOTSTRAP_LOGGED) {
      // Development info: Initializing optimized event store...
      globalThis.__RMS_BOOTSTRAP_LOGGED = true
    }
    
    // Create optimized event store with performance configuration
    optimizedStore = new OptimizedEventStore({
      maxEventsInMemory: 25000, // Increased capacity for better performance
      cacheExpiry: 10 * 60 * 1000, // 10 minutes cache
      enableMetrics: true
    })

    // Create optimized query utilities
    optimizedQueries = createOptimizedQueries(optimizedStore)

    const remoteEnabled = Boolean(import.meta.env?.VITE_API_BASE);
    configureOutbox({ enabled: remoteEnabled });

    // Auto-configure sync manager for real API usage
    if (remoteEnabled) {
      await configureSyncManager();
    }

    // Start PouchDB compaction manager for production - temporarily disabled due to spark-md5 import issue
    // compactionManager.start();

    // Loyalty queries deprecated

  // Try PouchDB first (preferred for Electron) 
  if (environment.isElectron) {
    try {
      const pouchAdapter = await tryPouchDBAdapter(environment.eventStorePath)
      
      if (pouchAdapter) {
        const legacyStore = new InMemoryEventStore({ persistToPouch: true, dbName: environment.eventStorePath })
        
        // Hydrate from PouchDB into legacy store first
        const events = await pouchAdapter.allEvents()
        events.forEach(event => legacyStore.addEventDirectly(event))
        
        // Migrate to optimized store
        await migrateToOptimizedStore(legacyStore)
        await hydrateFromRemoteEvents(optimizedStore!)
        if (!globalThis.__RMS_READY_LOGGED) {
          // Development info: Optimized PouchDB persistence ready
          globalThis.__RMS_READY_LOGGED = true
        }
        
        const result = { store: optimizedStore, db: pouchAdapter }
        
        // Store in singleton for React StrictMode protection
        globalThis.__RMS_OPTIMIZED_STORE_SINGLETON = result
        isBootstrapping = false
        
        return result
      }
    } catch {
      // Silently fall back to localStorage
    }
  }

    // Fallback to optimized store with best-effort persistence
    try {
      await hydrateFromRemoteEvents(optimizedStore!)
      
      if (!globalThis.__RMS_READY_LOGGED) {
        // Development info: Optimized event store ready (PouchDB canonical persistence)
        globalThis.__RMS_READY_LOGGED = true
      }
      
      const result = { store: optimizedStore, db: null }
      
      // Store in singleton for React StrictMode protection
      globalThis.__RMS_OPTIMIZED_STORE_SINGLETON = result
      isBootstrapping = false
      
      return result
    } catch (error) {
      logger.warn('Failed to hydrate from remote, using empty optimized store', { error: error instanceof Error ? error.message : error })
      
      const result = { store: optimizedStore, db: null }
      // Store in singleton for React StrictMode protection
      globalThis.__RMS_OPTIMIZED_STORE_SINGLETON = result
      isBootstrapping = false
      
      return result
    }
  })()

  return bootstrapPromise
}

/**
 * Migrate data from legacy store to optimized store (with duplication protection)
 */
async function migrateToOptimizedStore(legacyStore: EventStore): Promise<void> {
  const events = legacyStore.getAll()
  
  if (events.length > 0) {
    // Check if migration already happened (React StrictMode protection)
    const currentOptimizedEvents = optimizedStore!.getAll()
    if (currentOptimizedEvents.length >= events.length) {
      // Migration already completed, skip
      return
    }

    // Only log once per session to avoid React StrictMode duplicate messages
    if (!globalThis.__RMS_MIGRATION_LOGGED) {
      globalThis.__RMS_MIGRATION_LOGGED = true
    }
    
    // Sort by sequence to maintain order
    events.sort((a: Event, b: Event) => a.seq - b.seq)

    // Add events directly to optimized store (only new ones)
    for (const event of events) {
      // Check if event already exists to prevent duplicates
      const existingEvents = optimizedStore!.getAll()
      const alreadyExists = existingEvents.some(existing => existing.id === event.id)
      
      if (!alreadyExists) {
        optimizedStore!.addEventDirectly(event)
      }
    }

    if (!globalThis.__RMS_MIGRATION_LOGGED) {
      // Development info: Migration completed
      globalThis.__RMS_MIGRATION_LOGGED = true
    }
  }
}

// Export utilities for accessing optimized store
export function getOptimizedEventStore(): OptimizedEventStore | null {
  // Try singleton first, then fallback to module variable
  const singleton = globalThis.__RMS_OPTIMIZED_STORE_SINGLETON
  return singleton?.store || optimizedStore
}

export function getOptimizedQueries() {
  return optimizedQueries
}

export function getPerformanceMetrics() {
  const store = getOptimizedEventStore()
  return store?.getMetrics() || {
    queriesExecuted: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageQueryTime: 0,
    indexUsage: {}
  }
}

async function hydrateFromRemoteEvents(targetStore: OptimizedEventStore) {
  const apiBase = import.meta.env?.VITE_API_BASE;
  if (!apiBase) {
    return;
  }

  try {
    const { createRemoteClient } = await import('../data/remote/client');
    const client = createRemoteClient();
    const existingEvents = targetStore.getAll();
    const lastTimestamp = existingEvents.reduce((max, event) => Math.max(max, event.at ?? 0), 0);
    const seenIds = new Set(existingEvents.map(event => event.id));
    const remoteEvents = await client.fetchEvents(lastTimestamp ? { since: lastTimestamp } : {});
    if (!remoteEvents.length) {
      return;
    }

    const toPersist: Event[] = remoteEvents
      .filter(remote => remote && typeof remote.id === 'string')
      .filter(remote => !seenIds.has(remote.id))
      .map(remote => ({
        id: remote.id,
        seq: remote.seq,
        type: remote.type,
        at: remote.at,
        aggregate: remote.aggregate,
        payload: remote.payload,
        version: remote.version,
      }) as Event);

    if (!toPersist.length) {
      return;
    }

    toPersist.sort((a, b) => a.seq - b.seq);

    try {
      const pouch = await import('../db/pouch');
      const db = await pouch.openLocalDB({ name: environment.eventStorePath });
      await pouch.bulkPutEvents(db, toPersist as Event[]);
    } catch (error) {
      logger.warn('Remote event persistence skipped (Pouch unavailable)', { error: error instanceof Error ? error.message : error });
    }

    for (const event of toPersist) {
      targetStore.addEventDirectly(event);
    }
  } catch (error) {
    logger.error('Failed to hydrate events from remote source', { apiBase }, error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Auto-configure sync manager with production defaults
 */
async function configureSyncManager(): Promise<void> {
  const apiBase = import.meta.env?.VITE_API_BASE;
  
  try {
    if (!apiBase) return;

    // Extract base URL for sync (assuming CouchDB/PouchDB endpoint)
    const baseUrl = apiBase.replace(/\/api.*$/, ''); // Remove /api path if present
    const syncConfig = {
      baseUrl: baseUrl,
      dbPrefix: 'rmsv3_',
      branchId: environment.isElectron ? 'desktop' : 'web',
    };

    logger.info('Configuring sync manager', syncConfig);
    
    const configured = await syncManager.configure(syncConfig);
    if (configured) {
      // Auto-start sync if configuration succeeded
      const started = await syncManager.startReplication();
      if (started) {
        logger.info('Sync manager auto-started successfully');
      } else {
        logger.warn('Sync manager configured but failed to start');
      }
    } else {
      logger.warn('Sync manager auto-configuration failed');
    }
  } catch (error) {
    logger.warn('Sync manager auto-configuration error', { apiBase }, error instanceof Error ? error : new Error(String(error)));
    // Don't throw - sync failure shouldn't prevent app startup
  }
}
