import { useContext } from 'react';
import { EventStoreContext } from './context';
import type { EventStore } from './store';

export interface EventStoreContextValue {
  store: EventStore;
  isReady: boolean;
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
