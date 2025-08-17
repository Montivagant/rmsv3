import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncManager, SyncConfig, SyncStatusEvent } from '../sync';
import PouchDB from 'pouchdb';

// Mock PouchDB
vi.mock('pouchdb', () => {
  const mockDB = {
    sync: vi.fn(),
    cancel: vi.fn(),
    destroy: vi.fn()
  };
  
  const MockPouchDB = vi.fn(() => mockDB);
  MockPouchDB.prototype = mockDB;
  
  return { default: MockPouchDB };
});

describe('SyncManager', () => {
  let syncManager: SyncManager;
  let mockDB: any;
  let mockSync: any;

  beforeEach(() => {
    syncManager = new SyncManager();
    
    // Setup mock sync object
    mockSync = {
      on: vi.fn().mockReturnThis(),
      cancel: vi.fn()
    };
    
    // Setup mock database
    mockDB = {
      sync: vi.fn().mockReturnValue(mockSync),
      cancel: vi.fn(),
      destroy: vi.fn()
    };
    
    // Mock PouchDB constructor
    vi.mocked(PouchDB).mockReturnValue(mockDB);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('configure', () => {
    it('should store sync configuration', () => {
      const config: SyncConfig = {
        url: 'http://localhost:5984',
        dbPrefix: 'rmsv3_',
        username: 'admin',
        password: 'secret'
      };

      syncManager.configure(config);
      expect(syncManager.getStatus().config).toEqual(config);
    });

    it('should work without authentication', () => {
      const config: SyncConfig = {
        url: 'http://localhost:5984',
        dbPrefix: 'rmsv3_'
      };

      syncManager.configure(config);
      expect(syncManager.getStatus().config).toEqual(config);
    });
  });

  describe('startReplication', () => {
    beforeEach(() => {
      const config: SyncConfig = {
        url: 'http://localhost:5984',
        dbPrefix: 'rmsv3_',
        username: 'admin',
        password: 'secret'
      };
      syncManager.configure(config);
    });

    it('should start replication with correct parameters', async () => {
      const branchId = 'main';
      
      await syncManager.startReplication(branchId);
      
      expect(PouchDB).toHaveBeenCalledWith('rmsv3_events_main');
      expect(mockDB.sync).toHaveBeenCalled();
    });

    it('should handle URL without authentication', async () => {
      const config: SyncConfig = {
        url: 'http://localhost:5984',
        dbPrefix: 'rmsv3_'
      };
      syncManager.configure(config);
      
      await syncManager.startReplication('main');
      
      expect(mockDB.sync).toHaveBeenCalled();
    });

    it('should setup event listeners', async () => {
      await syncManager.startReplication('main');
      
      expect(mockSync.on).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockSync.on).toHaveBeenCalledWith('paused', expect.any(Function));
      expect(mockSync.on).toHaveBeenCalledWith('active', expect.any(Function));
      expect(mockSync.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should emit sync.connected event on successful start', async () => {
      const eventSpy = vi.fn();
      syncManager.on('sync.connected', eventSpy);
      
      await syncManager.startReplication('main');
      
      expect(eventSpy).toHaveBeenCalledWith({
        status: 'sync.connected',
        message: 'Started replication for branch main',
        error: undefined
      });
    });

    it('should throw error if not configured', async () => {
      const unconfiguredManager = new SyncManager();
      
      await expect(unconfiguredManager.startReplication('main'))
        .rejects.toThrow('Sync manager not configured');
    });

    it('should restart replication if already replicating', async () => {
      await syncManager.startReplication('main');
      
      // Should not throw, but restart replication
      await expect(syncManager.startReplication('main')).resolves.toBeUndefined();
      
      const status = syncManager.getStatus();
      expect(status.isReplicating).toBe(true);
      expect(status.branchId).toBe('main');
    });
  });

  describe('stopReplication', () => {
    it('should stop replication and update status', async () => {
      const config: SyncConfig = {
        url: 'http://localhost:5984',
        dbPrefix: 'rms'
      };
      syncManager.configure(config);
      await syncManager.startReplication('main');
      await syncManager.stopReplication();

      const status = syncManager.getStatus();
      expect(status.isReplicating).toBe(false);
      expect(status.branchId).toBeUndefined();
      expect(mockSync.cancel).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return initial status', () => {
      const status = syncManager.getStatus();
      
      expect(status).toEqual({
        isReplicating: false,
        config: undefined,
        branchId: undefined
      });
    });

    it('should return updated status after configuration', () => {
      const config: SyncConfig = {
        url: 'http://localhost:5984',
        dbPrefix: 'rmsv3_'
      };
      
      syncManager.configure(config);
      
      const status = syncManager.getStatus();
      expect(status.config).toEqual(config);
    });

    it('should return updated status during replication', async () => {
      const config: SyncConfig = {
        url: 'http://localhost:5984',
        dbPrefix: 'rmsv3_'
      };
      
      syncManager.configure(config);
      await syncManager.startReplication('main');
      
      const status = syncManager.getStatus();
      expect(status.isReplicating).toBe(true);
      expect(status.branchId).toBe('main');
    });
  });

  describe('event emission', () => {
    it('should emit events during sync lifecycle', async () => {
      const config: SyncConfig = {
        url: 'http://localhost:5984',
        dbPrefix: 'rmsv3_'
      };
      syncManager.configure(config);
      
      const statusSpy = vi.fn();
      syncManager.on('sync.connected', statusSpy);

      await syncManager.startReplication('main');
      
      // Should have emitted sync.connected event
      expect(statusSpy).toHaveBeenCalled();
      
      // Check that the event has the correct structure
      const lastCall = statusSpy.mock.calls[statusSpy.mock.calls.length - 1];
      expect(lastCall[0]).toHaveProperty('status', 'sync.connected');
      expect(lastCall[0]).toHaveProperty('message', 'Started replication for branch main');
    });
  });
});