import React, { createContext, useContext, useEffect, useState } from 'react';
import { eventStore as defaultEventStore, type EventStore } from './store';

interface EventStoreContextValue {
  store: EventStore;
  isReady: boolean;
}

const EventStoreContext = createContext<EventStoreContextValue | null>(null);

export interface EventStoreProviderProps {
  children: React.ReactNode;
  store?: EventStore;
}

export function EventStoreProvider({ children, store = defaultEventStore }: EventStoreProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize the store (hydrate from persistence if needed)
    const initStore = async () => {
      try {
        if ('hydrate' in store && typeof store.hydrate === 'function') {
          await store.hydrate();
        }
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize event store:', error);
        // Still mark as ready even if hydration fails
        setIsReady(true);
      }
    };

    initStore();
  }, [store]);

  return (
    <EventStoreContext.Provider value={{ store, isReady }}>
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
