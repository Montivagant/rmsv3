// Enhanced sync manager with network detection and graceful fallbacks

export type SyncState = 'idle' | 'active' | 'paused' | 'error' | 'offline' | 'unavailable';
export type SyncConfig = { 
  baseUrl: string; 
  dbPrefix: string; 
  username?: string; 
  password?: string;
  branchId: string;
};

type SyncSubscriber = (state: SyncState, info?: any) => void;
type NetworkStatusListener = (online: boolean) => void;

class SyncManager {
  private subscribers: SyncSubscriber[] = [];
  private currentState: SyncState = 'idle';
  private config: SyncConfig | null = null;
  private cancelReplication: (() => void) | null = null;
  private remote: any = null;
  private networkListeners: NetworkStatusListener[] = [];
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // Listen for network changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = () => {
    console.log('🌐 Network connection restored');
    this.notifyNetworkListeners(true);
    if (this.config && this.currentState === 'offline') {
      this.emit('idle', { reason: 'network_restored' });
      // Auto-retry sync after network restoration
      this.scheduleRetry();
    }
  };

  private handleOffline = () => {
    console.log('📴 Network connection lost');
    this.notifyNetworkListeners(false);
    if (this.currentState === 'active') {
      this.stopReplication();
      this.emit('offline', { reason: 'network_lost' });
    }
  };

  private scheduleRetry() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.retryTimeout = setTimeout(() => {
      if (navigator.onLine && this.config) {
        console.log('🔄 Auto-retrying sync after network restoration');
        this.startReplication().catch(err => {
          console.warn('Auto-retry sync failed:', err);
        });
      }
    }, 3000); // 3 second delay for network to stabilize
  }

  private async tryDynamicImport() {
    try {
      if (process.env.NODE_ENV === 'development') {
        // In development, PouchDB might be disabled
        console.warn('⚠️ PouchDB sync disabled in development mode due to module conflicts');
        return null;
      }
      
      // Try to dynamically import PouchDB sync functionality
      const syncModule = await import('../db/sync');
      return syncModule;
    } catch (error) {
      console.warn('📦 PouchDB sync module not available:', error);
      return null;
    }
  }

  private notifyNetworkListeners(online: boolean) {
    this.networkListeners.forEach(listener => {
      try {
        listener(online);
      } catch (error) {
        console.warn('Network listener error:', error);
      }
    });
  }

  private emit(state: SyncState, info?: any) {
    this.currentState = state;
    console.log(`🔄 Sync state: ${state}`, info);
    this.subscribers.forEach(subscriber => {
      try {
        subscriber(state, info);
      } catch (error) {
        console.warn('Sync subscriber error:', error);
      }
    });
  }

  subscribe(subscriber: SyncSubscriber): () => void {
    this.subscribers.push(subscriber);
    // Immediately notify of current state
    subscriber(this.currentState);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== subscriber);
    };
  }

  subscribeToNetworkStatus(listener: NetworkStatusListener): () => void {
    this.networkListeners.push(listener);
    // Immediately notify of current status
    listener(navigator.onLine);
    return () => {
      this.networkListeners = this.networkListeners.filter(l => l !== listener);
    };
  }

  async configure(config: SyncConfig): Promise<boolean> {
    try {
      this.config = config;
      
      const syncModule = await this.tryDynamicImport();
      if (!syncModule) {
        this.emit('unavailable', { reason: 'module_not_available' });
        return false;
      }

      if (!navigator.onLine) {
        this.emit('offline', { reason: 'no_network' });
        return false;
      }

      // Test network connectivity to the server
      const isReachable = await this.testServerReachability(config.baseUrl);
      if (!isReachable) {
        this.emit('error', { reason: 'server_unreachable', baseUrl: config.baseUrl });
        return false;
      }

      const remote = syncModule.configureRemote({
        baseUrl: config.baseUrl,
        dbPrefix: config.dbPrefix,
        username: config.username,
        password: config.password
      }, config.branchId);

      this.remote = remote;
      this.emit('idle', { configured: true });
      return true;
    } catch (error) {
      console.error('Sync configuration failed:', error);
      this.emit('error', { reason: 'configuration_failed', error: error.message });
      return false;
    }
  }

  private async testServerReachability(baseUrl: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(baseUrl, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 401; // 401 is OK (auth required but server reachable)
    } catch (error) {
      console.warn('Server reachability test failed:', error);
      return false;
    }
  }

  async startReplication(): Promise<boolean> {
    try {
      if (!this.config) {
        this.emit('error', { reason: 'not_configured' });
        return false;
      }

      if (!navigator.onLine) {
        this.emit('offline', { reason: 'no_network' });
        return false;
      }

      const syncModule = await this.tryDynamicImport();
      if (!syncModule) {
        this.emit('unavailable', { reason: 'module_not_available' });
        return false;
      }

      // Get local database
      const { openLocalDB } = await import('./pouch');
      const localDb = await openLocalDB({ name: 'rmsv3_events' });

      // Start replication
      const unsubscribe = syncModule.subscribe((state: SyncState, info?: any) => {
        this.emit(state, info);
      });

      syncModule.startReplication(localDb, this.config.branchId);

      this.cancelReplication = () => {
        unsubscribe();
        syncModule.stopReplication();
      };

      return true;
    } catch (error) {
      console.error('Failed to start replication:', error);
      this.emit('error', { reason: 'start_failed', error: error.message });
      return false;
    }
  }

  stopReplication(): void {
    if (this.cancelReplication) {
      this.cancelReplication();
      this.cancelReplication = null;
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.emit('idle', { reason: 'stopped' });
  }

  getState(): SyncState {
    return this.currentState;
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  destroy(): void {
    this.stopReplication();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.subscribers = [];
    this.networkListeners = [];
  }
}

// Singleton instance
export const syncManager = new SyncManager();

// Helper hook for React components
export function useSyncStatus() {
  return {
    subscribe: syncManager.subscribe.bind(syncManager),
    configure: syncManager.configure.bind(syncManager),
    start: syncManager.startReplication.bind(syncManager),
    stop: syncManager.stopReplication.bind(syncManager),
    getState: syncManager.getState.bind(syncManager),
    isOnline: syncManager.isOnline.bind(syncManager)
  };
}

// Helper hook for network status
export function useNetworkStatus() {
  return {
    subscribe: syncManager.subscribeToNetworkStatus.bind(syncManager),
    isOnline: syncManager.isOnline.bind(syncManager)
  };
}
