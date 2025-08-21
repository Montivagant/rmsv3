import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureRemote, startReplication, stopReplication, subscribe } from '../sync';

// Mock PouchDB
vi.mock('pouchdb', () => {
  const mockReplication = {
    on: vi.fn().mockReturnThis(),
    cancel: vi.fn()
  };
  
  const mockDB = {
    replicate: {
      to: vi.fn().mockReturnValue(mockReplication),
      from: vi.fn().mockReturnValue(mockReplication)
    }
  };
  
  const MockPouchDB = vi.fn(() => mockDB);
  MockPouchDB.prototype = mockDB;
  
  return { default: MockPouchDB };
});

describe('Sync Functions', () => {
  let mockLocalDB: any;
  let mockReplication: any;

  beforeEach(() => {
    // Setup mock replication object
    mockReplication = {
      on: vi.fn().mockReturnThis(),
      cancel: vi.fn()
    };
    
    // Setup mock local database
    mockLocalDB = {
      replicate: {
        to: vi.fn().mockReturnValue(mockReplication),
        from: vi.fn().mockReturnValue(mockReplication)
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    stopReplication();
  });

  describe('configureRemote', () => {
    it('should configure remote database with basic auth', () => {
      const config = {
        baseUrl: 'http://localhost:5984',
        dbPrefix: 'test_',
        username: 'admin',
        password: 'secret'
      };
      const branchId = 'branch-123';

      const remote = configureRemote(config, branchId);
      expect(remote).toBeDefined();
    });

    it('should configure remote database without auth', () => {
      const config = {
        baseUrl: 'http://localhost:5984',
        dbPrefix: 'test_'
      };
      const branchId = 'branch-123';

      const remote = configureRemote(config, branchId);
      expect(remote).toBeDefined();
    });
  });

  describe('subscribe', () => {
    it('should allow subscribing to sync state changes', () => {
      const callback = vi.fn();
      const unsubscribe = subscribe(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Test unsubscribe
      unsubscribe();
    });
  });

  describe('startReplication', () => {
    beforeEach(() => {
      const config = {
        baseUrl: 'http://localhost:5984',
        dbPrefix: 'test_'
      };
      configureRemote(config, 'test-branch');
    });

    it('should start bidirectional replication', () => {
      startReplication(mockLocalDB, 'test-branch');
      
      expect(mockLocalDB.replicate.to).toHaveBeenCalled();
      expect(mockLocalDB.replicate.from).toHaveBeenCalled();
      expect(mockReplication.on).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockReplication.on).toHaveBeenCalledWith('paused', expect.any(Function));
      expect(mockReplication.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should throw error if remote not configured', () => {
      // Reset remote configuration
      stopReplication();
      
      expect(() => {
        startReplication(mockLocalDB, 'test-branch');
      }).toThrow('Remote not configured');
    });
  });

  describe('stopReplication', () => {
    it('should stop replication when active', () => {
      const config = {
        baseUrl: 'http://localhost:5984',
        dbPrefix: 'test_'
      };
      configureRemote(config, 'test-branch');
      startReplication(mockLocalDB, 'test-branch');
      
      stopReplication();
      
      expect(mockReplication.cancel).toHaveBeenCalled();
    });

    it('should handle stop when not active', () => {
      expect(() => stopReplication()).not.toThrow();
    });
  });
});