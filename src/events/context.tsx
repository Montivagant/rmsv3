/* @refresh reset */
import React, { createContext, useEffect, useState } from 'react';
import { eventStore as defaultEventStore } from './store';
import type { EventStore } from './store';
import { bootstrapEventStore } from '../bootstrap/persist';

import type { EventStoreContextValue } from './hooks';

export const EventStoreContext = createContext<EventStoreContextValue | null>(null);

export interface EventStoreProviderProps {
  children: React.ReactNode;
  store?: EventStore;
}

export function EventStoreProvider({ children, store }: EventStoreProviderProps) {
  const [eventStore, setEventStore] = useState<EventStore | null>(store || null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Initialize the store (hydrate from persistence if needed)
    const initStore = async () => {
      try {
        // If a store is provided, set it synchronously to avoid initial loading state in tests,
        // then hydrate in the background without blocking readiness.
        if (store) {
          setEventStore(store);
          setIsReady(true);
          // Best-effort background hydrate
          if ('hydrate' in store && typeof store.hydrate === 'function') {
            store.hydrate().catch((e: unknown) =>
              console.error('Background hydrate failed:', e)
            );
          }
          return;
        }

        // Otherwise, create the canonical bootstrap store (async)
        const { store: storeToUse } = await bootstrapEventStore();
        if (!cancelled) {
          setEventStore(storeToUse);
          setIsReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize event store:', error);
        if (!cancelled) {
          // Fallback to default store
          setEventStore(defaultEventStore);
          setIsReady(true);
        }
      }
    };

    initStore();
    return () => {
      cancelled = true;
    };
  }, [store]);

  if (!eventStore) {
    return <div>Loading event store...</div>;
  }

  return (
    <EventStoreContext.Provider value={{ store: eventStore, isReady }}>
      {children}
    </EventStoreContext.Provider>
  );
}

