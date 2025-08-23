/**
 * Environment detection utilities
 */

// Detect if running in Electron
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof window.navigator !== 'undefined' && 
         window.navigator.userAgent.includes('Electron');
};

// Detect if running in browser
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && !isElectron();
};

// Detect if running in Node.js (main process)
export const isNode = (): boolean => {
  return typeof process !== 'undefined' && !!process.versions?.node;
};

// Get database path for the event store
export const getEventStorePath = (): string => {
  if (isElectron()) {
    // Use a simple path that PouchDB will handle in the user data directory
    return 'rmsv3_events';
  }
  return 'rmsv3_events'; // Browser fallback (IndexedDB)
};

export const environment = {
  isElectron: isElectron(),
  isBrowser: isBrowser(),
  isNode: isNode(),
  eventStorePath: getEventStorePath()
};
