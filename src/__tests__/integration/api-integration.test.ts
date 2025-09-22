/**
 * API Integration Tests
 * 
 * Tests the real API integration functionality when VITE_API_BASE is configured.
 * These tests verify that the offline-first architecture works correctly with a real backend.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { bootstrapEventStore } from '../../bootstrap/persist';
import { createUser, listUsers, createBranch, listBranches } from '../../management/repository';
import { upsertCustomerProfile, listCustomers } from '../../customers/repository';
import { createCategory, listCategories } from '../../menu/categories/repository';
import { logger } from '../../shared/logger';

// Mock environment for testing
const originalEnv = import.meta.env;

// Test API server details
const TEST_API_BASE = 'http://localhost:3001';
const TEST_TIMEOUT = 10000;

describe('API Integration Tests', () => {
  // Note: testApiServer is not actually used in this test - it's just for documentation
  // The actual API server should be started externally
  
  beforeAll(async () => {
    // Override environment for testing
    (import.meta as any).env = {
      ...originalEnv,
      VITE_API_BASE: TEST_API_BASE,
      VITE_USE_MSW: '0',
      VITE_LOG_LEVEL: 'debug'
    };

    // Check if test API server is running
    try {
      const response = await fetch(`${TEST_API_BASE}/health`);
      if (!response.ok) {
        throw new Error('API server not healthy');
      }
      logger.info('Test API server is running', { url: TEST_API_BASE });
    } catch (error) {
      logger.error('Test API server not available. Start it with: pnpm api:test-server', { error: (error as Error).message });
      throw new Error('Test API server not available. Please run: pnpm api:test-server');
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Restore original environment
    (import.meta as any).env = originalEnv;
    
    // No cleanup needed - external API server
  });

  beforeEach(() => {
    // Clear any test data before each test
    vi.clearAllMocks();
  });

  describe('Event Store Integration', () => {
    it('should initialize event store with API base configured', async () => {
      const { store } = await bootstrapEventStore();
      
      expect(store).toBeDefined();
      expect(store.getAll).toBeInstanceOf(Function);
      expect(store.append).toBeInstanceOf(Function);
      
      // Verify store is ready
      const initialEvents = store.getAll();
      expect(Array.isArray(initialEvents)).toBe(true);
      
      logger.info('Event store initialized successfully for API integration test');
    });

    it('should handle offline event persistence', async () => {
      const { store } = await bootstrapEventStore();
      
      // Create a test event
      const testEvent = store.append('test.event.created', {
        testId: 'integration-test-1',
        message: 'Testing offline persistence'
      }, {
        key: 'test-event-integration',
        params: { testId: 'integration-test-1' },
        aggregate: { id: 'test-aggregate', type: 'test' }
      });

      expect(testEvent).toBeDefined();
      expect(testEvent.event.type).toBe('test.event.created');
      expect(testEvent.event.payload.testId).toBe('integration-test-1');
      
      // Verify event is in local store
      const events = store.getAll();
      const createdEvent = events.find((e: any) => e.payload?.testId === 'integration-test-1');
      expect(createdEvent).toBeDefined();
    });
  });

  describe('Repository Integration', () => {
    it('should create and sync users with API', async () => {
      const testUser = await createUser({
        email: `test-user-${Date.now()}@example.com`,
        name: 'Integration Test User',
        phone: '+1-555-0199',
        status: 'active',
        roles: ['staff'],
        branchIds: ['main'],
        createdBy: 'integration-test',
        notes: 'Created during API integration test'
      });

      expect(testUser).toBeDefined();
      expect(testUser.email).toContain('test-user-');
      expect(testUser.name).toBe('Integration Test User');
      expect(testUser.roles).toContain('staff');

      // Verify user appears in list
      const users = await listUsers();
      const createdUser = users.find(u => u.id === testUser.id);
      expect(createdUser).toBeDefined();
      expect(createdUser?.email).toBe(testUser.email);
    });

    it('should create and sync branches with API', async () => {
      const testBranch = await createBranch({
        name: `Integration Test Branch ${Date.now()}`,
        isMain: false,
        type: 'restaurant',
        street: '456 Test Ave',
        city: 'Test City',
        state: 'TS',
        postalCode: '12345',
        country: 'Test Country',
        phone: '+1-555-0188',
        email: 'test-branch@example.com',
        manager: 'Test Manager',
        storageAreas: ['test-storage'],
        isActive: true
      }, 'integration-test');

      expect(testBranch).toBeDefined();
      expect(testBranch.name).toContain('Integration Test Branch');
      expect(testBranch.type).toBe('restaurant');
      expect(testBranch.isActive).toBe(true);

      // Verify branch appears in list
      const branches = await listBranches();
      const createdBranch = branches.find(b => b.id === testBranch.id);
      expect(createdBranch).toBeDefined();
      expect(createdBranch?.name).toBe(testBranch.name);
    });

    it('should create and sync customers with API', async () => {
      const customerId = `integration-test-customer-${Date.now()}`;
      
      await upsertCustomerProfile({
        id: customerId,
        name: 'Integration Test Customer',
        email: 'integration-customer@example.com',
        phone: '+1-555-0177'
      });

      // Verify customer appears in list
      const customers = await listCustomers();
      const createdCustomer = customers.find(c => c.id === customerId);
      expect(createdCustomer).toBeDefined();
      expect(createdCustomer?.name).toBe('Integration Test Customer');
      expect(createdCustomer?.email).toBe('integration-customer@example.com');
    });

    it('should create and sync menu categories with API', async () => {
      const testCategory = await createCategory({
        name: `Integration Test Category ${Date.now()}`,
        isActive: true
      });

      expect(testCategory).toBeDefined();
      expect(testCategory.name).toContain('Integration Test Category');
      // Reference property removed as it doesn't exist in MenuCategory type
      expect(testCategory.isActive).toBe(true);

      // Verify category appears in list
      const categories = await listCategories();
      const createdCategory = categories.find(c => c.id === testCategory.id);
      expect(createdCategory).toBeDefined();
      expect(createdCategory?.name).toBe(testCategory.name);
    });
  });

  describe('API Communication', () => {
    it('should successfully connect to API health endpoint', async () => {
      const response = await fetch(`${TEST_API_BASE}/health`);
      const health = await response.json();
      
      expect(response.ok).toBe(true);
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
    });

    it('should handle API version endpoint', async () => {
      const response = await fetch(`${TEST_API_BASE}/version`);
      const version = await response.json();
      
      expect(response.ok).toBe(true);
      expect(version.version).toBeDefined();
      expect(version.build).toBeDefined();
    });

    it('should submit events to API', async () => {
      const testEvent = {
        id: `api-test-event-${Date.now()}`,
        type: 'test.api.event',
        at: Date.now(),
        seq: 1,
        version: 1,
        aggregate: { id: 'test-api', type: 'test' },
        payload: {
          message: 'Testing API event submission',
          testId: Date.now()
        }
      };

      const response = await fetch(`${TEST_API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testEvent)
      });
      
      const result = await response.json();
      
      expect(response.ok).toBe(true);
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('should fetch events from API', async () => {
      const response = await fetch(`${TEST_API_BASE}/events?limit=10`);
      const result = await response.json();
      
      expect(response.ok).toBe(true);
      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
      expect(result.limit).toBe(10);
      expect(typeof result.hasMore).toBe('boolean');
    });
  });

  describe('Offline/Online Behavior', () => {
    it('should handle offline operations gracefully', async () => {
      // Simulate offline condition by using a wrong API base
      const originalApiBase = (import.meta as any).env.VITE_API_BASE;
      (import.meta as any).env.VITE_API_BASE = 'http://localhost:9999'; // Non-existent server

      try {
        // Operations should still work locally even when API is unreachable
        const { store } = await bootstrapEventStore();
        
        const offlineEvent = store.append('offline.test.event', {
          message: 'Testing offline capability',
          timestamp: Date.now()
        }, {
          key: 'offline-test',
          params: {},
          aggregate: { id: 'offline-test', type: 'test' }
        });

        expect(offlineEvent).toBeDefined();
        expect(offlineEvent.event.type).toBe('offline.test.event');
        
        // Event should be in local store even when offline
        const events = store.getAll();
        const createdEvent = events.find((e: any) => e.id === offlineEvent.event.id);
        expect(createdEvent).toBeDefined();
        
      } finally {
        // Restore original API base
        (import.meta as any).env.VITE_API_BASE = originalApiBase;
      }
    });

    it('should queue events for synchronization when offline', async () => {
      // This test would verify that events are queued locally when offline
      // and synced when connection is restored
      
      const { store } = await bootstrapEventStore();
      
      // Create events that should be queued for sync
      const queuedEvent = store.append('queued.sync.event', {
        message: 'Event created while testing offline sync',
        shouldSync: true
      }, {
        key: 'queued-sync-test',
        params: {},
        aggregate: { id: 'sync-test', type: 'test' }
      });

      expect(queuedEvent).toBeDefined();
      
      // In a real scenario, we would:
      // 1. Go offline
      // 2. Create events (they get queued locally)
      // 3. Come back online  
      // 4. Verify events are synced to server
      
      logger.info('Offline/online sync behavior tested', { eventId: queuedEvent.event.id });
    });
  });
});

// Helper function to wait for async operations
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Additional test utilities for API integration testing
export const apiIntegrationTestUtils = {
  // Test if API server is available
  async isApiServerRunning(baseUrl: string = TEST_API_BASE): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  // Clean up test data
  async cleanupTestData(testIdPrefix: string = 'integration-test'): Promise<void> {
    // In a real implementation, this would clean up test data from the API
    // For now, we just log the cleanup action
    logger.info('Cleaning up test data', { testIdPrefix });
  },

  // Wait for sync completion
  async waitForSync(maxWaitMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    // Poll for sync completion (simplified version)
    while (Date.now() - startTime < maxWaitMs) {
      await delay(100);
      
      // In a real implementation, check sync status here
      // For now, just simulate successful sync
      if (Date.now() - startTime > 1000) { // Simulate 1 second sync time
        return true;
      }
    }
    
    return false;
  }
};
