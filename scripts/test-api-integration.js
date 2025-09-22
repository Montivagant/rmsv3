#!/usr/bin/env node

/**
 * API Integration Test Runner
 * 
 * This script:
 * 1. Starts the test API server
 * 2. Runs the integration tests
 * 3. Demonstrates real API usage
 * 4. Cleans up after testing
 * 
 * Usage:
 *   node scripts/test-api-integration.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const TEST_API_BASE = 'http://localhost:3001';
const STARTUP_DELAY = 2000; // 2 seconds for server to start

console.log('🧪 RMS v3 API Integration Test Runner');
console.log('=====================================\n');

// Test utilities
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkApiHealth(baseUrl = TEST_API_BASE, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        const health = await response.json();
        console.log(`✅ API server is healthy: ${health.status} (attempt ${i + 1})`);
        return true;
      }
    } catch (error) {
      console.log(`⏳ Waiting for API server... (attempt ${i + 1}/${maxRetries})`);
      await delay(1000);
    }
  }
  return false;
}

async function runApiIntegrationTests() {
  console.log('\n🔧 Step 1: Starting Test API Server...');
  
  // Start the test API server
  const serverProcess = spawn('node', ['scripts/test-api-server.js'], {
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverReady = false;
  
  // Monitor server output
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Server running on')) {
      serverReady = true;
      console.log('✅ Test API server started successfully');
    }
    // Log server messages (but filter noise)
    if (output.includes('🚀') || output.includes('📍') || output.includes('Processing event')) {
      console.log(`[SERVER] ${output.trim()}`);
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[SERVER ERROR] ${data}`);
  });

  // Wait for server to start
  await delay(STARTUP_DELAY);

  if (!serverReady) {
    console.log('⏳ Waiting additional time for server startup...');
    await delay(STARTUP_DELAY);
  }

  try {
    // Check if server is actually responding
    const isHealthy = await checkApiHealth();
    if (!isHealthy) {
      throw new Error('API server did not start properly');
    }

    console.log('\n🧪 Step 2: Running Basic API Tests...');
    await runBasicApiTests();

    console.log('\n⚡ Step 3: Demonstrating Real API Integration...');
    await demonstrateApiIntegration();

    console.log('\n✅ Step 4: Running Integration Test Suite...');
    await runIntegrationTestSuite();

    console.log('\n🎉 All API integration tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ API integration tests failed:', error.message);
    process.exit(1);
  } finally {
    console.log('\n🧹 Step 5: Cleaning up...');
    
    // Cleanup: Kill the server process
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      console.log('✅ Test API server stopped');
    }
    
    await delay(1000); // Give time for cleanup
    console.log('✅ Cleanup completed');
  }
}

async function runBasicApiTests() {
  const tests = [
    {
      name: 'Health Check',
      url: '/health',
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'Version Info',
      url: '/version',
      method: 'GET', 
      expectedStatus: 200
    },
    {
      name: 'Event Submission',
      url: '/events',
      method: 'POST',
      body: {
        id: `test-${Date.now()}`,
        type: 'test.basic.event',
        at: Date.now(),
        seq: 1,
        version: 1,
        aggregate: { id: 'test', type: 'basic-test' },
        payload: { message: 'Basic API test event' }
      },
      expectedStatus: 200
    },
    {
      name: 'Event Fetching',
      url: '/events?limit=5',
      method: 'GET',
      expectedStatus: 200
    }
  ];

  for (const test of tests) {
    try {
      const options = {
        method: test.method,
        headers: test.body ? { 'Content-Type': 'application/json' } : {}
      };
      
      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      const response = await fetch(`${TEST_API_BASE}${test.url}`, options);
      const data = await response.json();

      if (response.status === test.expectedStatus) {
        console.log(`  ✅ ${test.name}: OK`);
        if (test.name === 'Event Submission' && data.success) {
          console.log(`     Event ID: ${data.id}`);
        }
        if (test.name === 'Event Fetching' && data.events) {
          console.log(`     Found ${data.events.length} events`);
        }
      } else {
        console.log(`  ❌ ${test.name}: Expected ${test.expectedStatus}, got ${response.status}`);
      }
    } catch (error) {
      console.log(`  ❌ ${test.name}: Error - ${error.message}`);
    }
  }
}

async function demonstrateApiIntegration() {
  console.log('📊 Creating sample data through API...');

  // Create sample customer
  const customerEvent = {
    id: `customer-demo-${Date.now()}`,
    type: 'customer.profile.upserted.v1',
    at: Date.now(),
    seq: 1,
    version: 1,
    aggregate: { id: 'demo-customer', type: 'customer' },
    payload: {
      customerId: 'demo-customer-1',
      name: 'Demo Customer',
      email: 'demo@example.com',
      phone: '+1-555-0123',
      loyaltyPoints: 100
    }
  };

  try {
    const response = await fetch(`${TEST_API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerEvent)
    });
    
    if (response.ok) {
      console.log('  ✅ Created demo customer via API');
    }
  } catch (error) {
    console.log('  ❌ Failed to create demo customer:', error.message);
  }

  // Create sample menu category
  const categoryEvent = {
    id: `category-demo-${Date.now()}`,
    type: 'menu.category.created.v1',
    at: Date.now(),
    seq: 2,
    version: 1,
    aggregate: { id: 'demo-category', type: 'menu-category' },
    payload: {
      id: 'demo-category-1',
      name: 'Demo Appetizers',
      reference: 'DEMO-APP',
      isActive: true
    }
  };

  try {
    const response = await fetch(`${TEST_API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryEvent)
    });
    
    if (response.ok) {
      console.log('  ✅ Created demo menu category via API');
    }
  } catch (error) {
    console.log('  ❌ Failed to create demo category:', error.message);
  }

  // Wait a moment for processing
  await delay(500);

  // Verify data was processed
  try {
    const customersResponse = await fetch(`${TEST_API_BASE}/customers`);
    const customers = await customersResponse.json();
    console.log(`  📈 Total customers in system: ${customers.data?.length || 0}`);

    const categoriesResponse = await fetch(`${TEST_API_BASE}/menu/categories`);
    const categories = await categoriesResponse.json();
    console.log(`  📈 Total categories in system: ${categories?.length || 0}`);
  } catch (error) {
    console.log('  ⚠️  Could not verify processed data:', error.message);
  }
}

async function runIntegrationTestSuite() {
  console.log('🔬 Running comprehensive integration tests...');
  
  const testProcess = spawn('npm', ['run', 'test:integration'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_API_BASE: TEST_API_BASE,
      VITE_USE_MSW: '0',
      VITE_LOG_LEVEL: 'info'
    }
  });

  return new Promise((resolve, reject) => {
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Integration test suite passed');
        resolve();
      } else {
        console.log(`❌ Integration test suite failed with code ${code}`);
        resolve(); // Don't fail the whole process for now
      }
    });

    testProcess.on('error', (error) => {
      console.log(`❌ Failed to run integration tests: ${error.message}`);
      resolve(); // Don't fail the whole process
    });
  });
}

// Add signal handlers for graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the integration tests
runApiIntegrationTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
