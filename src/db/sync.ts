import PouchDB from 'pouchdb';
import { EventEmitter } from 'events';

export type SyncStatus = 'sync.connected' | 'sync.error' | 'sync.paused' | 'sync.active';

export interface SyncConfig {
  url: string;
  dbPrefix: string;
  auth?: {
    username: string;
    password: string;
  };
}

export interface SyncStatusEvent {
  status: SyncStatus;
  message?: string;
  error?: Error;
}

export class SyncManager extends EventEmitter {
  private config?: SyncConfig;
  private localDB?: PouchDB.Database;
  private remoteDB?: PouchDB.Database;
  private replication?: PouchDB.Replication.Sync<{}>;
  private branchId?: string;
  private isReplicating = false;

  configure(config: SyncConfig): void {
    this.config = config;
    this.emit('configured', config);
  }

  async startReplication(branchId: string): Promise<void> {
    if (!this.config) {
      throw new Error('Sync manager not configured');
    }

    if (this.isReplicating) {
      await this.stopReplication();
    }

    this.branchId = branchId;
    const dbName = `${this.config.dbPrefix}events_${branchId}`;
    
    try {
      // Initialize local database
      this.localDB = new PouchDB(dbName);
      
      // Initialize remote database
      const remoteUrl = `${this.config.url}/${dbName}`;
      this.remoteDB = new PouchDB(remoteUrl, {
        auth: this.config.auth
      });

      // Start bidirectional replication
      this.replication = this.localDB.sync(this.remoteDB, {
        live: true,
        retry: true,
        back_off_function: (delay) => {
          // Exponential backoff with max 30 seconds
          return Math.min(delay * 2, 30000);
        }
      });

      // Handle replication events
      this.replication
        .on('change', (info) => {
          console.log('Sync change:', info);
          this.emitStatus('sync.active', `Synced ${info.change.docs?.length || 0} documents`);
        })
        .on('paused', (err) => {
          if (err) {
            console.error('Sync paused with error:', err);
            this.emitStatus('sync.error', 'Sync paused due to error', err);
          } else {
            console.log('Sync paused (up to date)');
            this.emitStatus('sync.paused', 'Sync up to date');
          }
        })
        .on('active', () => {
          console.log('Sync resumed');
          this.emitStatus('sync.active', 'Sync active');
        })
        .on('denied', (err) => {
          console.error('Sync denied:', err);
          this.emitStatus('sync.error', 'Sync denied', err);
        })
        .on('complete', (info) => {
          console.log('Sync complete:', info);
          this.emitStatus('sync.connected', 'Sync completed');
        })
        .on('error', (err) => {
          console.error('Sync error:', err);
          this.emitStatus('sync.error', 'Sync error occurred', err);
        });

      this.isReplicating = true;
      this.emitStatus('sync.connected', `Started replication for branch ${branchId}`);
      
    } catch (error) {
      console.error('Failed to start replication:', error);
      this.emitStatus('sync.error', 'Failed to start replication', error as Error);
      throw error;
    }
  }

  async stopReplication(): Promise<void> {
    if (this.replication) {
      try {
        await this.replication.cancel();
        console.log('Replication stopped');
      } catch (error) {
        console.error('Error stopping replication:', error);
      }
      this.replication = undefined;
    }

    this.isReplicating = false;
    this.branchId = undefined;
    this.localDB = undefined;
    this.remoteDB = undefined;
    
    this.emitStatus('sync.paused', 'Replication stopped');
  }

  getStatus(): {
    isReplicating: boolean;
    branchId?: string;
    config?: SyncConfig;
  } {
    return {
      isReplicating: this.isReplicating,
      branchId: this.branchId,
      config: this.config
    };
  }

  private emitStatus(status: SyncStatus, message?: string, error?: Error): void {
    const event: SyncStatusEvent = {
      status,
      message,
      error
    };
    
    this.emit('status', event);
    this.emit(status, event);
  }
}

// Global sync manager instance
export const syncManager = new SyncManager();