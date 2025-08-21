import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type PouchDB from 'pouchdb-browser'
import { type EventStore } from './store'
import { bootstrapEventStore } from '../bootstrap/persist'
import { subscribe as subscribeSync } from '../db/sync'

type Ctx = {
  store: EventStore | null
  db: PouchDB.Database<any> | null
  ready: boolean
}

const EventStoreCtx = createContext<Ctx>({ store: null, db: null, ready: false })

type ProviderProps = {
  children: ReactNode
  /** Optional: custom fallback while hydrating (a11y-friendly by default) */
  fallback?: ReactNode
  /** Optional: inject a ready store/db (useful in tests) */
  value?: { store: EventStore; db: PouchDB.Database<any> | any }
}

export function EventStoreProvider({ children, fallback, value }: ProviderProps) {
  const [state, setState] = useState<Ctx>({
    store: value?.store ?? null,
    db: value?.db ?? null,
    ready: !!value,
  })

  useEffect(() => {
    if (value) return // test-injected, nothing to hydrate
    let mounted = true
    ;(async () => {
      const { store, db } = await bootstrapEventStore()
      if (mounted) setState({ store, db, ready: true })
    })()
    return () => { mounted = false }
  }, [value])

  if (!state.ready) {
    return (
      <>
        {fallback ?? (
          <div role="status" aria-live="polite" className="p-4 text-sm text-gray-600">
            Loading data…
          </div>
        )}
      </>
    )
  }

  return (
    <EventStoreCtx.Provider value={state}>
      {children}
    </EventStoreCtx.Provider>
  )
}

/** Get the hydrated EventStore. Throws if called before ready. */
export function useEventStore(): EventStore {
  const ctx = useContext(EventStoreCtx)
  if (!ctx.ready || !ctx.store) throw new Error('Event store not ready yet')
  return ctx.store
}

/** Access the underlying PouchDB instance if you need it. */
export function useEventDB(): PouchDB.Database<any> | null {
  return useContext(EventStoreCtx).db
}

/** Subscribe to replication status as simple state. */
export function useSyncStatus() {
  const [status, setStatus] = useState<'idle' | 'active' | 'paused' | 'error'>('idle')
  useEffect(() => subscribeSync((s) => setStatus(s)), [])
  return status
}

/** Optional: tiny hook to guard on hydration */
export function useEventHydrated() {
  return useContext(EventStoreCtx).ready
}