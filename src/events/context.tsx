import React, { createContext, useContext, useEffect, useState } from 'react';
import { eventStore as defaultEventStore, type EventStore } from './store';
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
    // Initialize the store (hydrate from persistence if needed)
    const initStore = async () => {
      try {
        let storeToUse = store;
        
        // If no store provided, create a persisted one
        if (!storeToUse) {
          console.log('🔄 Initializing persisted event store...');
          storeToUse = await getPersistedEventStore();
        } else if ('hydrate' in storeToUse && typeof storeToUse.hydrate === 'function') {
          // If a store was provided with hydrate method, call it
          await storeToUse.hydrate();
        }
        
        setEventStore(storeToUse);
        setIsReady(true);
        console.log('✅ Event store ready');
      } catch (error) {
        console.error('Failed to initialize event store:', error);
        // Fallback to default store
        setEventStore(defaultEventStore);
        setIsReady(true);
      }
    };

    initStore();
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
