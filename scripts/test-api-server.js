#!/usr/bin/env node

/**
 * Minimal API server for testing real API integration
 * 
 * Usage:
 *   node scripts/test-api-server.js
 *   VITE_API_BASE=http://localhost:3001 pnpm dev
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));

// In-memory storage (for testing only)
const events = [];
const customers = [];
const menuItems = [];
const categories = [];
const inventoryItems = [];
const branches = [];
const users = [];
const roles = [
  {
    id: 'business-owner',
    name: 'Business Owner',
    description: 'Full system access',
    permissions: [{ id: 'all', name: 'All Permissions', description: 'Full access', module: '*', action: '*' }],
    isSystemRole: true,
    metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'system', usageCount: 0 }
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Management access',
    permissions: [
      { id: 'pos-manage', name: 'POS Management', description: 'Manage POS', module: 'pos', action: 'manage' },
      { id: 'inventory-manage', name: 'Inventory Management', description: 'Manage inventory', module: 'inventory', action: 'manage' }
    ],
    isSystemRole: true,
    metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'system', usageCount: 0 }
  },
  {
    id: 'staff',
    name: 'Staff',
    description: 'Basic staff access',
    permissions: [
      { id: 'pos-operate', name: 'Operate POS', description: 'Use POS', module: 'pos', action: 'operate' },
      { id: 'inventory-view', name: 'View Inventory', description: 'View inventory', module: 'inventory', action: 'view' }
    ],
    isSystemRole: true,
    metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'system', usageCount: 0 }
  }
];

// Add default branch
branches.push({
  id: 'main',
  name: 'Main Branch',
  isMain: true,
  type: 'restaurant',
  address: { street: '123 Main St', city: 'City', state: 'State', postalCode: '12345', country: 'Country' },
  contact: { phone: '+1-555-0123', email: 'main@restaurant.com', manager: 'Main Manager' },
  storageAreas: ['kitchen', 'storage', 'freezer'],
  isActive: true,
  metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'system', itemCount: 0, employeeCount: 0 }
});

// Utility functions
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`, req.body ? JSON.stringify(req.body).slice(0, 200) + '...' : '');
  next();
};

app.use(logRequest);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: Date.now(),
    version: '1.0.0-test',
    uptime: process.uptime()
  });
});

app.get('/version', (req, res) => {
  res.json({ 
    version: '1.0.0-test',
    build: 'test-server',
    timestamp: Date.now()
  });
});

// Event endpoints
app.post('/events', (req, res) => {
  const event = {
    ...req.body,
    id: req.body.id || `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: Date.now()
  };
  
  events.push(event);
  
  // Simulate processing different event types
  try {
    processEvent(event);
  } catch (error) {
    console.error('Error processing event:', error);
  }
  
  res.json({ 
    success: true, 
    id: event.id,
    processed: true
  });
});

app.get('/events', (req, res) => {
  const since = parseInt(req.query.since) || 0;
  const limit = parseInt(req.query.limit) || 100;
  
  const filteredEvents = events
    .filter(e => e.at > since)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit);
  
  res.json({ 
    events: filteredEvents,
    since,
    limit,
    hasMore: filteredEvents.length === limit,
    total: events.length
  });
});

app.get('/events/:id', (req, res) => {
  const event = events.find(e => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json(event);
});

// Management endpoints (for compatibility with existing hooks)
app.get('/manage/users', (req, res) => {
  res.json(users);
});

app.get('/manage/roles', (req, res) => {
  res.json(roles);
});

app.get('/manage/branches', (req, res) => {
  res.json(branches);
});

app.get('/customers', (req, res) => {
  res.json({ data: customers, total: customers.length });
});

app.get('/menu/categories', (req, res) => {
  res.json(categories);
});

app.get('/menu/items', (req, res) => {
  res.json({ items: menuItems, total: menuItems.length });
});

app.get('/inventory/items', (req, res) => {
  res.json({ items: inventoryItems, total: inventoryItems.length });
});

// Event processing logic (simulate real backend processing)
function processEvent(event) {
  console.log(`Processing event: ${event.type}`);
  
  switch (event.type) {
    case 'customer.profile.upserted.v1':
    case 'customer.profile.upserted':
      const existingCustomer = customers.find(c => c.id === event.payload.customerId || c.id === event.payload.id);
      if (existingCustomer) {
        Object.assign(existingCustomer, event.payload);
        existingCustomer.updatedAt = new Date(event.at).toISOString();
      } else {
        customers.push({
          id: event.payload.customerId || event.payload.id,
          name: event.payload.name,
          email: event.payload.email,
          phone: event.payload.phone,
          points: event.payload.loyaltyPoints || event.payload.points || 0,
          orders: event.payload.visits || 0,
          totalSpent: event.payload.totalSpent || 0,
          visits: event.payload.visits || 0,
          lastVisit: event.payload.lastVisit,
          tags: event.payload.tags || [],
          createdAt: new Date(event.at).toISOString(),
          updatedAt: new Date(event.at).toISOString()
        });
      }
      break;
      
    case 'menu.category.created.v1':
    case 'menu.category.created':
      if (!categories.find(c => c.id === event.payload.id)) {
        categories.push({
          id: event.payload.id,
          name: event.payload.name,
          reference: event.payload.reference || '',
          isActive: event.payload.isActive !== false,
          itemCount: 0,
          createdAt: new Date(event.at).toISOString(),
          updatedAt: new Date(event.at).toISOString(),
          deleted: false
        });
      }
      break;
      
    case 'menu.item.created.v1':
    case 'menu.item.created':
      if (!menuItems.find(m => m.id === event.payload.id)) {
        menuItems.push({
          id: event.payload.id,
          sku: event.payload.sku || '',
          name: event.payload.name,
          description: event.payload.description || '',
          categoryId: event.payload.categoryId,
          price: event.payload.price || 0,
          taxRate: event.payload.taxRate || 0,
          isActive: event.payload.isActive !== false,
          isAvailable: event.payload.isAvailable !== false,
          branchIds: event.payload.branchIds || ['main'],
          image: event.payload.image,
          createdAt: new Date(event.at).toISOString(),
          updatedAt: new Date(event.at).toISOString()
        });
        
        // Update category item count
        const category = categories.find(c => c.id === event.payload.categoryId);
        if (category) {
          category.itemCount = (category.itemCount || 0) + 1;
        }
      }
      break;
      
    case 'inventory.item.created.v1':
    case 'inventory.item.created':
      if (!inventoryItems.find(i => i.id === event.payload.id)) {
        inventoryItems.push({
          id: event.payload.id,
          sku: event.payload.sku || '',
          name: event.payload.name,
          description: event.payload.description || '',
          categoryId: event.payload.categoryId,
          unit: event.payload.unit || 'unit',
          quantity: event.payload.quantity || 0,
          reorderPoint: event.payload.reorderPoint,
          parLevel: event.payload.parLevel,
          cost: event.payload.cost,
          price: event.payload.price,
          location: event.payload.location,
          status: event.payload.status || 'active',
          levels: event.payload.levels,
          costing: event.payload.costing,
          quality: event.payload.quality,
          flags: event.payload.flags,
          createdAt: new Date(event.at).toISOString(),
          updatedAt: new Date(event.at).toISOString()
        });
      }
      break;
      
    case 'user.created.v1':
    case 'user.created':
      if (!users.find(u => u.id === event.payload.id)) {
        users.push({
          id: event.payload.id,
          email: event.payload.email,
          name: event.payload.name,
          phone: event.payload.phone,
          status: event.payload.status || 'active',
          roles: event.payload.roles || [],
          branchIds: event.payload.branchIds || ['main'],
          metadata: {
            createdAt: new Date(event.at).toISOString(),
            updatedAt: new Date(event.at).toISOString(),
            createdBy: event.payload.metadata?.createdBy || 'system',
            notes: event.payload.metadata?.notes,
            loginCount: 0
          },
          preferences: event.payload.preferences || {
            defaultBranch: 'main',
            locale: 'en',
            timeZone: 'UTC'
          }
        });
      }
      break;
      
    case 'branch.created.v1':
    case 'branch.created':
      if (!branches.find(b => b.id === event.payload.id)) {
        branches.push({
          id: event.payload.id,
          name: event.payload.name,
          isMain: event.payload.isMain || false,
          type: event.payload.type || 'restaurant',
          address: event.payload.address,
          contact: event.payload.contact,
          storageAreas: event.payload.storageAreas || [],
          isActive: event.payload.isActive !== false,
          metadata: {
            createdAt: new Date(event.at).toISOString(),
            updatedAt: new Date(event.at).toISOString(),
            createdBy: event.payload.createdBy || 'system',
            itemCount: 0,
            employeeCount: 0
          }
        });
      }
      break;
      
    case 'role.created.v1':
    case 'role.created':
      if (!roles.find(r => r.id === event.payload.id)) {
        roles.push({
          id: event.payload.id,
          name: event.payload.name,
          description: event.payload.description || '',
          permissions: event.payload.permissions || [],
          isSystemRole: event.payload.isSystemRole || false,
          metadata: {
            createdAt: new Date(event.at).toISOString(),
            updatedAt: new Date(event.at).toISOString(),
            createdBy: event.payload.createdBy || 'system',
            usageCount: 0
          }
        });
      }
      break;
  }
}

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error', details: error.message });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Test API Server for RMS v3');
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log('\n📋 Available endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  GET  /version - Version info');
  console.log('  POST /events - Submit events');
  console.log('  GET  /events - Fetch events');
  console.log('  GET  /manage/* - Management endpoints');
  console.log('  GET  /customers - Customer data');
  console.log('  GET  /menu/* - Menu data');
  console.log('  GET  /inventory/* - Inventory data');
  console.log('\n🔧 To test with RMS v3:');
  console.log('  VITE_API_BASE=http://localhost:3001 pnpm dev');
  console.log('\n📊 Current data counts:');
  console.log(`  Events: ${events.length}`);
  console.log(`  Customers: ${customers.length}`);
  console.log(`  Menu Categories: ${categories.length}`);
  console.log(`  Menu Items: ${menuItems.length}`);
  console.log(`  Inventory Items: ${inventoryItems.length}`);
  console.log(`  Users: ${users.length}`);
  console.log(`  Branches: ${branches.length}`);
  console.log(`  Roles: ${roles.length}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down test server...');
  console.log('📊 Final statistics:');
  console.log(`  Total events processed: ${events.length}`);
  console.log(`  Total customers: ${customers.length}`);
  console.log(`  Total menu items: ${menuItems.length}`);
  process.exit(0);
});
