/**
 * Network Status Hook
 * 
 * Provides real-time network status information and utilities for handling
 * offline/online transitions in the offline-first application.
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '../shared/logger';

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean; // Tracks if we were offline and just came back online
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export interface NetworkStatusHook extends NetworkStatus {
  // Utility functions
  retryOperation: (operation: () => Promise<any>, maxRetries?: number) => Promise<any>;
  isSlowConnection: () => boolean;
  hasStableConnection: () => boolean;
  
  // Event handlers
  onOnline: (callback: () => void) => () => void;
  onOffline: (callback: () => void) => () => void;
}

// Type declarations for Network API (experimental)
declare global {
  interface Navigator {
    connection?: {
      effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
      downlink?: number;
      rtt?: number;
      type?: string;
      addEventListener?: (type: string, listener: EventListener) => void;
      removeEventListener?: (type: string, listener: EventListener) => void;
    };
  }
}

const SLOW_CONNECTION_THRESHOLD = 1; // Mbps
const HIGH_RTT_THRESHOLD = 1000; // milliseconds
const RETRY_DELAYS = [1000, 2000, 4000, 8000]; // Exponential backoff

export function useNetworkStatus(): NetworkStatusHook {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    wasOffline: false
  });

  const updateNetworkStatus = useCallback(() => {
    const connection = navigator.connection;
    const isOnline = navigator.onLine;
    const wasOfflineNow = !isOnline && networkStatus.isOnline; // Just went offline
    const wasOfflineAndBackOnline = isOnline && !networkStatus.isOnline; // Just came back online

    setNetworkStatus(prev => ({
      isOnline,
      isOffline: !isOnline,
      wasOffline: wasOfflineAndBackOnline || (prev.wasOffline && !isOnline),
      ...(connection?.type && { connectionType: connection.type }),
      ...(connection?.effectiveType && { effectiveType: connection.effectiveType }),
      ...(connection?.downlink != null && { downlink: connection.downlink }),
      ...(connection?.rtt != null && { rtt: connection.rtt })
    }));

    // Log network changes
    if (wasOfflineNow) {
      logger.warn('🔌 Network connection lost');
    } else if (wasOfflineAndBackOnline) {
      logger.info('📶 Network connection restored', {
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt
      });
    }
  }, [networkStatus.isOnline]);

  useEffect(() => {
    // Initial setup
    updateNetworkStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      updateNetworkStatus();
      logger.info('📶 Online event detected');
    };

    const handleOffline = () => {
      updateNetworkStatus();
      logger.warn('🔌 Offline event detected');
    };

    // Listen for connection changes (if supported)
    const handleConnectionChange = () => {
      updateNetworkStatus();
      logger.debug('🌐 Connection properties changed', {
        effectiveType: navigator.connection?.effectiveType,
        downlink: navigator.connection?.downlink,
        rtt: navigator.connection?.rtt
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.connection?.addEventListener) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (navigator.connection?.removeEventListener) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkStatus]);

  // Reset wasOffline flag after it's been acknowledged
  useEffect(() => {
    if (networkStatus.wasOffline && networkStatus.isOnline) {
      const timer = setTimeout(() => {
        setNetworkStatus(prev => ({ ...prev, wasOffline: false }));
      }, 5000); // Clear flag after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [networkStatus.wasOffline, networkStatus.isOnline]);

  // Utility functions
  const retryOperation = useCallback(async (
    operation: () => Promise<any>, 
    maxRetries: number = 3
  ): Promise<any> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 0) {
          logger.info(`🔄 Operation succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          logger.error(`❌ Operation failed after ${maxRetries + 1} attempts`, { error: lastError.message });
          throw lastError;
        }
        
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        logger.warn(`⏳ Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`, { error: lastError.message });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }, []);

  const isSlowConnection = useCallback(() => {
    if (!navigator.connection) return false;
    
    return (
      navigator.connection.effectiveType === 'slow-2g' ||
      navigator.connection.effectiveType === '2g' ||
      (navigator.connection.downlink !== undefined && 
       navigator.connection.downlink < SLOW_CONNECTION_THRESHOLD) ||
      (navigator.connection.rtt !== undefined && 
       navigator.connection.rtt > HIGH_RTT_THRESHOLD)
    );
  }, []);

  const hasStableConnection = useCallback(() => {
    if (!networkStatus.isOnline) return false;
    if (!navigator.connection) return true; // Assume stable if we can't measure
    
    return (
      navigator.connection.effectiveType === '4g' &&
      (navigator.connection.rtt === undefined || navigator.connection.rtt < 300)
    );
  }, [networkStatus.isOnline]);

  const onOnline = useCallback((callback: () => void) => {
    const handler = () => {
      if (navigator.onLine) {
        callback();
      }
    };
    
    window.addEventListener('online', handler);
    
    // Return cleanup function
    return () => window.removeEventListener('online', handler);
  }, []);

  const onOffline = useCallback((callback: () => void) => {
    const handler = () => {
      if (!navigator.onLine) {
        callback();
      }
    };
    
    window.addEventListener('offline', handler);
    
    // Return cleanup function
    return () => window.removeEventListener('offline', handler);
  }, []);

  return {
    ...networkStatus,
    retryOperation,
    isSlowConnection,
    hasStableConnection,
    onOnline,
    onOffline
  };
}

// Helper hook for component lifecycle network events
export function useNetworkEffects() {
  const networkStatus = useNetworkStatus();

  useEffect(() => {
    if (networkStatus.wasOffline && networkStatus.isOnline) {
      // Trigger any app-wide sync operations
      logger.info('🔄 Triggering sync after coming back online');
      
      // In a real implementation, you might dispatch a sync event or call sync methods
      window.dispatchEvent(new CustomEvent('network-restored'));
    }
  }, [networkStatus.wasOffline, networkStatus.isOnline]);

  useEffect(() => {
    if (networkStatus.isOffline) {
      // App went offline - could trigger offline mode UI changes
      logger.info('🔌 App is now in offline mode');
      
      window.dispatchEvent(new CustomEvent('app-offline'));
    }
  }, [networkStatus.isOffline]);

  return networkStatus;
}
