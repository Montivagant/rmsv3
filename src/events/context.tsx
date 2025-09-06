/* @refresh reset */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { eventStore as defaultEventStore } from './store';
import type { EventStore } from './store';
import { getPersistedEventStore } from './persistedStore';

interface EventStoreContextValue {
  store: EventStore;
  isReady: boolean;
}

const EventStoreContext = createContext<EventStoreContextValue | null>(null);

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
          if ('hydrate' in store && typeof (store as any).hydrate === 'function') {
            (store as any).hydrate().catch((e: any) =>
              console.error('Background hydrate failed:', e)
            );
          }
          return;
        }

        // Otherwise, create a persisted store (async)
        const storeToUse = await getPersistedEventStore();
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

export function useEventStore(): EventStore {
  const context = useContext(EventStoreContext);
  
  if (!context) {
    throw new Error('useEventStore must be used within an EventStoreProvider');
  }
  
  if (!context.isReady) {
    throw new Error('Event store not ready yet');
  }
  
  return context.store;
}

export function useEventStoreContext(): EventStoreContextValue | null {
  return useContext(EventStoreContext);
}
