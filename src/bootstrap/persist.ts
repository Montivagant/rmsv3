import { openLocalStorageDB } from '../db/localStorage'
import { LocalStoragePersistedEventStore } from '../events/localStoragePersisted'
import { InMemoryEventStore } from '../events/store'
import { OptimizedEventStore } from '../events/optimizedStore'
import { createOptimizedQueries } from '../events/optimizedQueries'
import { setOptimizedQueries } from '../loyalty/state'
import { environment } from '../lib/environment'

// Global optimized store instances with React StrictMode protection
let optimizedStore: OptimizedEventStore | null = null
let optimizedQueries: any = null
let isBootstrapping = false
let bootstrapPromise: Promise<any> | null = null

// Singleton protection - prevent React StrictMode from creating multiple stores
globalThis.__RMS_OPTIMIZED_STORE_SINGLETON = globalThis.__RMS_OPTIMIZED_STORE_SINGLETON || null

// Dynamically import PouchDB to handle module conflicts gracefully
async function tryPouchDBAdapter(dbName: string) {
  try {
    const { createPouchDBAdapter } = await import('../db/pouch')
    return await createPouchDBAdapter({ name: dbName })
  } catch (error) {
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
      console.log('🚀 Initializing optimized event store...')
      globalThis.__RMS_BOOTSTRAP_LOGGED = true
    }
    
    const startTime = performance.now()

    // Create optimized event store with performance configuration
    optimizedStore = new OptimizedEventStore({
      maxEventsInMemory: 25000, // Increased capacity for better performance
      cacheExpiry: 10 * 60 * 1000, // 10 minutes cache
      enableMetrics: true
    })

    // Create optimized query utilities
    optimizedQueries = createOptimizedQueries(optimizedStore)

    // Set global optimized queries for legacy modules
    setOptimizedQueries(optimizedQueries)

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
        
        const duration = performance.now() - startTime
        if (!globalThis.__RMS_READY_LOGGED) {
          console.log(`🎉 Optimized PouchDB persistence ready! (${events.length} events loaded in ${duration.toFixed(2)}ms)`)
          globalThis.__RMS_READY_LOGGED = true
        }
        
        const result = { store: optimizedStore, db: pouchAdapter }
        
        // Store in singleton for React StrictMode protection
        globalThis.__RMS_OPTIMIZED_STORE_SINGLETON = result
        isBootstrapping = false
        
        return result
      }
    } catch (error) {
      // Silently fall back to localStorage
    }
  }

    // Fallback to localStorage for browser or if PouchDB fails
    try {
    // Only log once per session to avoid React StrictMode duplicate messages
    if (!globalThis.__RMS_PERSISTENCE_LOGGED) {
      console.log('💾 Initializing localStorage persistence...')
      globalThis.__RMS_PERSISTENCE_LOGGED = true
    }
    
    const db = await openLocalStorageDB({ name: 'rmsv3_events' })
    const mem = new InMemoryEventStore()
    const persisted = new LocalStoragePersistedEventStore(mem, db)
    await persisted.hydrateFromLocalStorage()
    
    // Migrate to optimized store
    await migrateToOptimizedStore(persisted)
    
    // Start auto-sync for the persisted store but use optimized store for queries
    persisted.startAutoSync(10000)
    
    const duration = performance.now() - startTime
    if (!globalThis.__RMS_READY_LOGGED) {
      console.log(`🎉 Optimized event store with localStorage persistence ready! (${duration.toFixed(2)}ms)`)
      globalThis.__RMS_READY_LOGGED = true
    }
    
    const result = { store: optimizedStore, db, persistedStore: persisted }
    
    // Store in singleton for React StrictMode protection
    globalThis.__RMS_OPTIMIZED_STORE_SINGLETON = result
    isBootstrapping = false
    
    return result
    } catch (error) {
      console.warn('Failed to initialize localStorage persistence, using optimized in-memory store:', error)
      const duration = performance.now() - startTime
      console.log(`🎉 Optimized in-memory event store ready! (${duration.toFixed(2)}ms)`)
      
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
async function migrateToOptimizedStore(legacyStore: any): Promise<void> {
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
      console.log(`📦 Migrating ${events.length} events to optimized store...`)
      globalThis.__RMS_MIGRATION_LOGGED = true
    }
    
    const startTime = performance.now()

    // Sort by sequence to maintain order
    events.sort((a: any, b: any) => a.seq - b.seq)

    // Add events directly to optimized store (only new ones)
    for (const event of events) {
      // Check if event already exists to prevent duplicates
      const existingEvents = optimizedStore!.getAll()
      const alreadyExists = existingEvents.some(existing => existing.id === event.id)
      
      if (!alreadyExists) {
        optimizedStore!.addEventDirectly(event)
      }
    }

    const duration = performance.now() - startTime
    if (!globalThis.__RMS_MIGRATION_LOGGED) {
      console.log(`✅ Migration completed in ${duration.toFixed(2)}ms`)
      
      // Log initial performance metrics
      const metrics = optimizedStore!.getMetrics()
      console.log(`📊 Initial store metrics: ${optimizedStore!.getAll().length} events indexed`)
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