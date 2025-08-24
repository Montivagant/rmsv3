import React from 'react';
import type { ReactNode } from 'react';
import { EventStoreProvider } from '../events/context';
import { InMemoryEventStore } from '../events/store';

interface TestEventStoreProviderProps {
  children: ReactNode;
  store?: InMemoryEventStore;
}

/**
 * Test wrapper for EventStoreProvider that ensures the store is ready immediately
 * This avoids async initialization issues in tests
 */
export function TestEventStoreProvider({ children, store }: TestEventStoreProviderProps) {
  const testStore = store || new InMemoryEventStore();
  
  // Mock the hydrate method to resolve immediately
  if (!testStore.hydrate) {
    testStore.hydrate = async () => Promise.resolve();
  }
  
  // Create a wrapper that marks the store as ready immediately
  const TestWrapper = ({ children }: { children: ReactNode }) => {
    const [isReady, setIsReady] = React.useState(false);
    
    React.useEffect(() => {
      // Mark as ready immediately in tests
      setIsReady(true);
    }, []);
    
    if (!isReady) {
      // Return a loading state or null during the brief initialization
      return null;
    }
    
    return <EventStoreProvider store={testStore}>{children}</EventStoreProvider>;
  };
  
  return <TestWrapper>{children}</TestWrapper>;
}

/**
 * Create a test event store with immediate readiness
 */
export function createTestEventStore(): InMemoryEventStore {
  const store = new InMemoryEventStore();
  // Ensure hydrate resolves immediately
  store.hydrate = async () => Promise.resolve();
  return store;
}
