import { http, HttpResponse } from 'msw';
import { eventStore } from '../events/store';
import { handleWebhook } from '../payments/webhook';
import { categoryApiHandlers } from '../inventory/categories/api';
import { inventoryItemApiHandlers } from '../inventory/items/api';
import { inventoryCountApiHandlers } from '../inventory/counts/api';
import { inventoryTransferApiHandlers } from '../inventory/transfers/api';
import { inventoryMovementsApiHandlers } from '../inventory/movements/api';
import { recipeApiHandlers } from '../recipes/api';
import { inventoryItemTypeApiHandlers } from '../inventory/item-types/api';
import { menuCategoriesApiHandlers } from '../menu/categories/api';
import { menuItemsApiHandlers } from '../menu/items/api';
import { menuModifiersApiHandlers } from '../menu/modifiers/api';
import { ordersApiHandlers } from '../orders/api';
import { authHandlers } from './auth';
import { SYSTEM_ROLES } from '../rbac/permissions';
import type { DynamicRole } from '../rbac/permissions';

// Mock data for branches
const mockBranches = [
  { 
    id: 'main-restaurant', 
    name: 'Main Restaurant', 
    isMain: true, 
    type: 'restaurant' as const, 
    address: {
      street: '123 Main St',
      city: 'Downtown',
      state: 'Cairo',
      postalCode: '11511',
      country: 'Egypt'
    },
    contact: {
      phone: '+20 2 1234 5678',
      email: 'main@restaurant.com',
      manager: 'Ahmed Hassan'
    },
    storageAreas: ['Main Walk-in', 'Dry Storage', 'Bar'], 
    isActive: true,
    metadata: {
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      itemCount: 125,
      employeeCount: 15
    }
  },
  { 
    id: 'downtown-location', 
    name: 'Downtown Location', 
    isMain: false,
    type: 'restaurant' as const, 
    address: {
      street: '456 Central Ave',
      city: 'Downtown',
      state: 'Cairo',
      postalCode: '11512',
      country: 'Egypt'
    },
    contact: {
      phone: '+20 2 9876 5432',
      email: 'downtown@restaurant.com',
      manager: 'Fatima El-Sayed'
    },
    storageAreas: ['Kitchen Cooler', 'Dry Storage'], 
    isActive: true,
    metadata: {
      createdAt: new Date('2024-02-01').toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      itemCount: 85,
      employeeCount: 12
    }
  },
  { 
    id: 'warehouse', 
    name: 'Central Warehouse', 
    isMain: false,
    type: 'warehouse' as const, 
    address: {
      street: '789 Warehouse Rd',
      city: 'Industrial Park',
      state: 'Giza',
      postalCode: '12511',
      country: 'Egypt'
    },
    contact: {
      phone: '+20 2 5555 1234',
      manager: 'Mohamed Ali'
    },
    storageAreas: ['Receiving', 'Cold Storage', 'Dry Goods'], 
    isActive: false,
    metadata: {
      createdAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      itemCount: 450,
      employeeCount: 8
    }
  },
];


const mockRoles: DynamicRole[] = SYSTEM_ROLES.map(role => ({
  ...role,
  permissions: role.permissions ? role.permissions.map(permission => ({ ...permission })) : [],
}));

// Mock users data
const mockUsers: any[] = [
  {
    id: 'user_1',
    email: 'admin@restaurant.com',
    name: 'Admin User',
    phone: '+20 2 1234 5678',
    status: 'active',
    roles: ['business_owner'],
    branchIds: [],
    metadata: {
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      loginCount: 152,
      createdBy: 'system'
    },
    preferences: {
      defaultBranch: 'main-restaurant',
      locale: 'en',
      timeZone: 'Africa/Cairo'
    }
  },
  {
    id: 'user_2',
    email: 'manager@restaurant.com',
    name: 'Restaurant Manager',
    phone: '+20 2 9876 5432',
    status: 'active',
    roles: ['business_owner'],
    branchIds: ['main-restaurant'],
    metadata: {
      createdAt: new Date('2024-02-01').toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      loginCount: 89,
      createdBy: 'user_1'
    }
  },
  {
    id: 'user_3',
    email: 'staff@restaurant.com',
    name: 'Staff Member',
    status: 'inactive',
    roles: ['business_owner'],
    branchIds: ['downtown-location'],
    metadata: {
      createdAt: new Date('2024-03-01').toISOString(),
      updatedAt: new Date().toISOString(),
      loginCount: 45,
      createdBy: 'user_1'
    }
  }
];

// Initialize mock data
if (import.meta.env.DEV) console.log('📊 Initializing mock data handlers...');

  // Mock data with branch associations
  const mockMenuItems = [
    { id: '1', name: 'Classic Burger', price: 12.99, category: 'Main', description: 'Beef patty with lettuce, tomato, onion', image: '/api/placeholder/150/150', branchIds: ['main-restaurant', 'downtown-location'] },
    { id: '2', name: 'Chicken Sandwich', price: 11.99, category: 'Main', description: 'Grilled chicken breast with mayo', image: '/api/placeholder/150/150', branchIds: ['main-restaurant', 'downtown-location'] },
    { id: '3', name: 'French Fries', price: 4.99, category: 'Sides', description: 'Crispy golden fries', image: '/api/placeholder/150/150', branchIds: ['main-restaurant', 'downtown-location'] },
    { id: '4', name: 'Onion Rings', price: 5.99, category: 'Sides', description: 'Beer-battered onion rings', image: '/api/placeholder/150/150', branchIds: ['main-restaurant'] },
    { id: '5', name: 'Coca Cola', price: 2.99, category: 'Drinks', description: 'Classic soft drink', image: '/api/placeholder/150/150', branchIds: ['main-restaurant', 'downtown-location', 'warehouse'] },
    { id: '6', name: 'Coffee', price: 3.49, category: 'Drinks', description: 'Fresh brewed coffee', image: '/api/placeholder/150/150', branchIds: ['main-restaurant', 'downtown-location'] },
  ];


const mockInventory: Array<{
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  lowStock: number;
  reorderPoint: number;
  parLevel: number;
  category: string;
  cost: number;
  price: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired';
  branchId: string;
}> = [
  // Main Restaurant inventory
  { id: '1', name: 'Beef Patty (1/4 lb)', sku: 'BEEF_PATTY', quantity: 15, unit: 'pieces', lowStock: 20, reorderPoint: 20, parLevel: 50, category: 'Food - Perishable', cost: 2.45, price: 4.99, status: 'low-stock' as const, branchId: 'main-restaurant' },
  { id: '2', name: 'Hamburger Buns', sku: 'BURGER_BUNS', quantity: 8, unit: 'pieces', lowStock: 25, reorderPoint: 25, parLevel: 100, category: 'Food - Perishable', cost: 0.33, price: 0.75, status: 'low-stock' as const, branchId: 'main-restaurant' },
  { id: '3', name: 'Frozen French Fries', sku: 'FRIES_FROZEN', quantity: 45, unit: 'lbs', lowStock: 30, reorderPoint: 30, parLevel: 80, category: 'Food - Non-Perishable', cost: 1.25, price: 2.50, status: 'in-stock' as const, branchId: 'main-restaurant' },
  { id: '4', name: 'Fresh Lettuce', sku: 'LETTUCE', quantity: 12, unit: 'heads', lowStock: 15, reorderPoint: 15, parLevel: 40, category: 'Food - Perishable', cost: 0.75, price: 1.50, status: 'low-stock' as const, branchId: 'main-restaurant' },
  { id: '5', name: 'Tomatoes', sku: 'TOMATOES', quantity: 25, unit: 'lbs', lowStock: 20, reorderPoint: 20, parLevel: 60, category: 'Food - Perishable', cost: 1.85, price: 3.50, status: 'in-stock' as const, branchId: 'main-restaurant' },
  // Downtown Location inventory
  { id: '6', name: 'Cheese Slices', sku: 'CHEESE_SLICES', quantity: 40, unit: 'pieces', lowStock: 30, reorderPoint: 30, parLevel: 100, category: 'Food - Perishable', cost: 0.45, price: 0.95, status: 'in-stock' as const, branchId: 'downtown-location' },
  { id: '7', name: 'Onions', sku: 'ONIONS', quantity: 18, unit: 'lbs', lowStock: 15, reorderPoint: 15, parLevel: 50, category: 'Food - Perishable', cost: 0.65, price: 1.25, status: 'in-stock' as const, branchId: 'downtown-location' },
  { id: '8', name: 'Ketchup', sku: 'KETCHUP', quantity: 6, unit: 'bottles', lowStock: 8, reorderPoint: 8, parLevel: 20, category: 'Condiments', cost: 3.25, price: 5.99, status: 'low-stock' as const, branchId: 'downtown-location' },
  // Warehouse inventory
  { id: '9', name: 'Mustard', sku: 'MUSTARD', quantity: 4, unit: 'bottles', lowStock: 6, reorderPoint: 6, parLevel: 15, category: 'Condiments', cost: 2.85, price: 4.99, status: 'low-stock' as const, branchId: 'warehouse' },
  { id: '10', name: 'Cooking Oil', sku: 'COOKING_OIL', quantity: 3, unit: 'gallons', lowStock: 5, reorderPoint: 5, parLevel: 10, category: 'Cooking Supplies', cost: 8.50, price: 15.99, status: 'low-stock' as const, branchId: 'warehouse' },
  // Additional items per branch
  { id: '11', name: 'Beef Patty (1/4 lb)', sku: 'BEEF_PATTY', quantity: 30, unit: 'pieces', lowStock: 20, reorderPoint: 20, parLevel: 50, category: 'Food - Perishable', cost: 2.45, price: 4.99, status: 'in-stock' as const, branchId: 'downtown-location' },
  { id: '12', name: 'Hamburger Buns', sku: 'BURGER_BUNS', quantity: 50, unit: 'pieces', lowStock: 25, reorderPoint: 25, parLevel: 100, category: 'Food - Perishable', cost: 0.33, price: 0.75, status: 'in-stock' as const, branchId: 'downtown-location' },
  { id: '13', name: 'Frozen French Fries', sku: 'FRIES_FROZEN', quantity: 200, unit: 'lbs', lowStock: 30, reorderPoint: 30, parLevel: 300, category: 'Food - Non-Perishable', cost: 1.25, price: 2.50, status: 'in-stock' as const, branchId: 'warehouse' },
];

const mockCustomers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', phone: '555-0123', orders: 15, totalSpent: 234.50, branchIds: ['main-restaurant'] },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '555-0124', orders: 8, totalSpent: 156.75, branchIds: ['main-restaurant', 'downtown-location'] },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', phone: '555-0125', orders: 22, totalSpent: 445.20, branchIds: ['downtown-location'] },
];

const mockReports = {
  sales: {
    today: 1250.75,
    week: 8750.25,
    month: 35420.80,
    topItems: [
      { name: 'Classic Burger', sales: 45, revenue: 584.55 },
      { name: 'French Fries', sales: 38, revenue: 189.62 },
      { name: 'Coca Cola', sales: 52, revenue: 155.48 },
    ]
  },
  inventory: {
    lowStock: mockInventory.filter(item => item.quantity <= item.lowStock),
    totalValue: 2450.75
  },
  dashboard: {
    todayRevenue: 1250.75,
    todayOrders: 47,
    avgOrderValue: 26.61,
    topItems: [
      { name: 'Classic Burger', quantity: 45, revenue: 584.55 },
      { name: 'French Fries', quantity: 38, revenue: 189.62 },
      { name: 'Coca Cola', quantity: 52, revenue: 155.48 },
    ],
    salesTrend: [
      { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], revenue: 980.25, orders: 35 },
      { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], revenue: 1120.50, orders: 42 },
      { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], revenue: 1350.75, orders: 48 },
      { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], revenue: 1180.25, orders: 41 },
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], revenue: 1420.80, orders: 52 },
      { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], revenue: 1290.45, orders: 46 },
      { date: new Date().toISOString().split('T')[0], revenue: 1250.75, orders: 47 },
    ]
  }
};

// Mock inventory categories
const mockInventoryCategories = [
  { id: '1', name: 'Food - Perishable', description: 'Perishable food items requiring refrigeration' },
  { id: '2', name: 'Food - Non-Perishable', description: 'Non-perishable food items' },
  { id: '3', name: 'Condiments', description: 'Sauces, seasonings, and condiments' },
  { id: '4', name: 'Cooking Supplies', description: 'Oils, spices, and cooking essentials' },
  { id: '5', name: 'Beverages', description: 'Drinks and beverage supplies' },
  { id: '6', name: 'Packaging', description: 'Containers, wraps, and packaging materials' },
  { id: '7', name: 'Cleaning Supplies', description: 'Cleaning and sanitation products' },
];

// Mock menu categories
const mockMenuCategories = [
  { id: '1', name: 'Appetizers', reference: 'APPS', isActive: true, itemCount: 5 },
  { id: '2', name: 'Main Dishes', reference: 'MAINS', isActive: true, itemCount: 8 },
  { id: '3', name: 'Sides', reference: 'SIDES', isActive: true, itemCount: 4 },
  { id: '4', name: 'Drinks', reference: 'DRINKS', isActive: true, itemCount: 6 },
  { id: '5', name: 'Desserts', reference: 'DESSERTS', isActive: true, itemCount: 3 },
];

let customersDb: any[] = [];
export const handlers = [
  // Menu Management
  ...menuCategoriesApiHandlers,
  ...menuItemsApiHandlers,
  ...ordersApiHandlers,
  ...menuModifiersApiHandlers,
  ...inventoryMovementsApiHandlers,
  
  // Category management
  ...categoryApiHandlers,
  
  // Inventory Transfer Management (before items to override search endpoint)
  ...inventoryTransferApiHandlers,
  
  // Enhanced Inventory Items  
  ...inventoryItemApiHandlers,
  
  // Inventory Item Types (classification)
  ...inventoryItemTypeApiHandlers,
  
  // Inventory Count Management
  ...inventoryCountApiHandlers,
  
  // Recipe & BOM Management
  ...recipeApiHandlers,

  // Auth & Signup
  ...authHandlers,

  // Inventory categories endpoint (different from general categories)
  http.get('/api/inventory/categories', () => {
    console.log('📦 MSW: Inventory categories API called, returning', mockInventoryCategories.length, 'categories');
    return HttpResponse.json(mockInventoryCategories);
  }),
  // POST to create a simple inventory category in this mock list
  http.post('/api/inventory/categories', async ({ request }) => {
    const body = await request.json().catch(() => ({})) as { name?: string; description?: string };
    const name = (body.name || '').toString().trim();
    if (!name) return new HttpResponse(JSON.stringify({ error: 'Category name is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const exists = mockInventoryCategories.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) return new HttpResponse(JSON.stringify({ error: 'Category already exists' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    const id = String(mockInventoryCategories.length + 1);
    const category = { id, name, description: body.description || '' };
    mockInventoryCategories.push(category);
    return HttpResponse.json(category, { status: 201 });
  }),

  // Menu categories endpoints
  http.get('/api/menu/categories', () => {
    console.log('📁 MSW: Menu categories API called, returning', mockMenuCategories.length, 'categories');
    return HttpResponse.json(mockMenuCategories);
  }),

  http.post('/api/menu/categories', async ({ request }) => {
    const newCategory = await request.json() as any;
    const category = {
      ...newCategory,
      id: String(mockMenuCategories.length + 1),
      isActive: true,
      itemCount: 0
    };
    mockMenuCategories.push(category);
    console.log('📁 MSW: Created new menu category:', category.name);
    return HttpResponse.json(category, { status: 201 });
  }),

  http.get('/api/menu/categories/references', () => {
    const references = mockMenuCategories
      .map(cat => cat.reference)
      .filter(ref => ref); // Filter out empty references
    console.log('📁 MSW: Menu category references called, returning', references.length, 'references');
    return HttpResponse.json({ references });
  }),

  http.get('/api/menu/categories/names', () => {
    const names = mockMenuCategories.map(cat => cat.name);
    console.log('📁 MSW: Menu category names called, returning', names.length, 'names');
    return HttpResponse.json({ names });
  }),

  http.get('/api/menu/categories/check-name', ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    const exists = mockMenuCategories.some(cat => 
      cat.name.toLowerCase() === name?.toLowerCase()
    );
    return HttpResponse.json({ exists });
  }),

  http.get('/api/menu/categories/check-reference', ({ request }) => {
    const url = new URL(request.url);
    const reference = url.searchParams.get('reference');
    const exists = mockMenuCategories.some(cat => 
      cat.reference?.toLowerCase() === reference?.toLowerCase()
    );
    return HttpResponse.json({ exists });
  }),

  // Menu items endpoints (for POS, KDS, and Menu Management)
  http.get('/api/menu', ({ request }) => {
    const url = new URL(request.url);
    const branchId = url.searchParams.get('branchId');
    
    let items = [...mockMenuItems];
    
    // Filter by branch if branchId is provided
    if (branchId) {
      items = items.filter(item => item.branchIds.includes(branchId));
    }
    
    return HttpResponse.json(items);
  }),

  http.post('/api/menu', async ({ request }) => {
    const newItem = await request.json() as any;
    const item = {
      id: String(Date.now()),
      name: newItem.name || 'New Item',
      price: Number(newItem.price) || 0,
      category: newItem.category || 'General',
      description: newItem.description || '',
      image: newItem.image || '/api/placeholder/150/150'
    };
    (mockMenuItems as any).push(item);
    return HttpResponse.json(item, { status: 201 });
  }),

  http.patch('/api/menu/:id', async ({ params, request }) => {
    const { id } = params as any;
    const updates = await request.json() as any;
    const idx = (mockMenuItems as any[]).findIndex((m: any) => m.id == id);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    (mockMenuItems as any)[idx] = { ...(mockMenuItems as any)[idx], ...updates };
    return HttpResponse.json((mockMenuItems as any)[idx]);
  }),

  http.delete('/api/menu/:id', ({ params }) => {
    const { id } = params as any;
    const idx = (mockMenuItems as any[]).findIndex((m: any) => m.id == id);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    const removed = (mockMenuItems as any).splice(idx, 1)[0];
    return HttpResponse.json(removed);
  }),

  // Role management endpoints
  http.get('/api/manage/roles', () => {
    return HttpResponse.json(mockRoles);
  }),

  http.post('/api/manage/roles', async ({ request }) => {
    const payload = await request.json() as Partial<DynamicRole>;
    const now = Date.now();

    if (!payload.name) {
      return new HttpResponse(JSON.stringify({ error: 'Role name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newRole: DynamicRole = {
      id: payload.id ?? ('role_' + now),
      name: payload.name,
      description: payload.description ?? '',
      permissions: (payload.permissions ?? []).map(permission => ({ ...permission })),
      inheritsFrom: payload.inheritsFrom ?? [],
      isSystem: false,
      createdBy: 'current-user',
      createdAt: now,
      modifiedBy: 'current-user',
      modifiedAt: now,
    };

    mockRoles.push(newRole);
    return HttpResponse.json(newRole, { status: 201 });
  }),

  http.patch('/api/manage/roles/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json() as Partial<DynamicRole>;
    const roleIndex = mockRoles.findIndex(role => role.id === id);

    if (roleIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    if (mockRoles[roleIndex].isSystem) {
      return new HttpResponse(JSON.stringify({ error: 'Cannot modify system roles' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = Date.now();
    const existing = mockRoles[roleIndex];

    mockRoles[roleIndex] = {
      ...existing,
      ...updates,
      permissions: updates.permissions
        ? updates.permissions.map(permission => ({ ...permission }))
        : existing.permissions,
      modifiedAt: now,
      modifiedBy: 'current-user',
    };

    return HttpResponse.json(mockRoles[roleIndex]);
  }),

  http.delete('/api/manage/roles/:id', ({ params }) => {
    const { id } = params;
    const roleIndex = mockRoles.findIndex(role => role.id === id);

    if (roleIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    if (mockRoles[roleIndex].isSystem) {
      return new HttpResponse(JSON.stringify({ error: 'Cannot delete system roles' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [removed] = mockRoles.splice(roleIndex, 1);
    return HttpResponse.json(removed);
  }),

  // Branches endpoints
  http.get('/api/branches', () => {
    return HttpResponse.json(mockBranches);
  }),
  
  http.get('/api/manage/branches', () => {
    return HttpResponse.json(mockBranches);
  }),

  http.post('/api/manage/branches', async ({ request }) => {
    const newBranchData = await request.json() as any;
    const newBranch = {
      id: `branch_${Date.now()}`,
      name: newBranchData.name,
      isMain: newBranchData.isMain || false,
      type: newBranchData.type || 'restaurant',
      address: newBranchData.address || {
        street: '',
        city: '',
        country: 'Egypt'
      },
      contact: newBranchData.contact || {},
      storageAreas: newBranchData.storageAreas || [],
      isActive: newBranchData.isActive !== false,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'current-user',
        itemCount: 0,
        employeeCount: 0
      }
    };
    
    // If setting as main, unset other branches
    if (newBranch.isMain) {
      mockBranches.forEach(b => b.isMain = false);
    }
    
    mockBranches.push(newBranch);
    return HttpResponse.json(newBranch, { status: 201 });
  }),

  http.patch('/api/manage/branches/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json() as any;
    const branchIndex = mockBranches.findIndex(b => b.id === id);

    if (branchIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    mockBranches[branchIndex] = { ...mockBranches[branchIndex], ...updates };
    return HttpResponse.json(mockBranches[branchIndex]);
  }),

  http.delete('/api/manage/branches/:id', async ({ params }) => {
    const { id } = params;
    const branchIndex = mockBranches.findIndex(b => b.id === id);

    if (branchIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    const branch = mockBranches[branchIndex];
    if (branch.isMain) {
      return new HttpResponse(JSON.stringify({ error: 'Cannot delete main branch' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    mockBranches.splice(branchIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/manage/branches/:id/set-main', async ({ params }) => {
    const { id } = params;
    const branchIndex = mockBranches.findIndex(b => b.id === id);

    if (branchIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    // Remove main flag from all other branches
    mockBranches.forEach(b => b.isMain = false);
    
    // Set this branch as main
    mockBranches[branchIndex].isMain = true;
    
    return HttpResponse.json(mockBranches[branchIndex]);
  }),

  // Inventory operations - receive stock
  http.post('/api/inventory/operations/receive', async ({ request }) => {
    const operation = await request.json() as any;
    console.log('📦 MSW: Processing receive operation:', operation);
    
    // Update inventory quantities
    operation.items.forEach((opItem: any) => {
      const inventoryIndex = mockInventory.findIndex(item => item.id === opItem.itemId);
      if (inventoryIndex !== -1) {
        mockInventory[inventoryIndex].quantity += opItem.receivedQuantity;
        // Update status based on new quantity
        if (mockInventory[inventoryIndex].quantity <= mockInventory[inventoryIndex].reorderPoint) {
          mockInventory[inventoryIndex].status = 'low-stock';
        } else {
          mockInventory[inventoryIndex].status = 'in-stock';
        }
        console.log(`📦 Received ${opItem.receivedQuantity} ${mockInventory[inventoryIndex].unit} of ${mockInventory[inventoryIndex].name}`);
      }
    });

    // Create operation record
    const operationRecord = {
      id: `RECV_${Date.now()}`,
      type: 'receive',
      reference: operation.generalData.reference || '',
      items: operation.items,
      timestamp: new Date().toISOString(),
      notes: operation.generalData.notes || ''
    };

    return HttpResponse.json(operationRecord, { status: 201 });
  }),

  // Inventory operations - adjust stock
  http.post('/api/inventory/operations/adjust', async ({ request }) => {
    const operation = await request.json() as any;
    console.log('📦 MSW: Processing adjust operation:', operation);
    
    // Update inventory quantities
    operation.items.forEach((opItem: any) => {
      const inventoryIndex = mockInventory.findIndex(item => item.id === opItem.itemId);
      if (inventoryIndex !== -1) {
        const oldQuantity = mockInventory[inventoryIndex].quantity;
        mockInventory[inventoryIndex].quantity = Math.max(0, oldQuantity + opItem.adjustmentQuantity);
        // Update status based on new quantity
        if (mockInventory[inventoryIndex].quantity === 0) {
          mockInventory[inventoryIndex].status = 'out-of-stock';
        } else if (mockInventory[inventoryIndex].quantity <= mockInventory[inventoryIndex].reorderPoint) {
          mockInventory[inventoryIndex].status = 'low-stock';
        } else {
          mockInventory[inventoryIndex].status = 'in-stock';
        }
        console.log(`📦 Adjusted ${mockInventory[inventoryIndex].name} by ${opItem.adjustmentQuantity} (${oldQuantity} → ${mockInventory[inventoryIndex].quantity})`);
      }
    });

    // Create operation record
    const operationRecord = {
      id: `ADJ_${Date.now()}`,
      type: 'adjust',
      reference: operation.generalData.reference || '',
      reason: operation.generalData.adjustmentReason,
      items: operation.items,
      timestamp: new Date().toISOString(),
      notes: operation.generalData.notes || ''
    };

    return HttpResponse.json(operationRecord, { status: 201 });
  }),

  // Inventory operations - stock count
  http.post('/api/inventory/operations/count', async ({ request }) => {
    const operation = await request.json() as any;
    console.log('📦 MSW: Processing count operation:', operation);
    
    // Update inventory quantities to counted amounts
    operation.items.forEach((opItem: any) => {
      const inventoryIndex = mockInventory.findIndex(item => item.id === opItem.itemId);
      if (inventoryIndex !== -1) {
        const oldQuantity = mockInventory[inventoryIndex].quantity;
        mockInventory[inventoryIndex].quantity = opItem.countedQuantity;
        // Update status based on new quantity
        if (mockInventory[inventoryIndex].quantity === 0) {
          mockInventory[inventoryIndex].status = 'out-of-stock';
        } else if (mockInventory[inventoryIndex].quantity <= mockInventory[inventoryIndex].reorderPoint) {
          mockInventory[inventoryIndex].status = 'low-stock';
        } else {
          mockInventory[inventoryIndex].status = 'in-stock';
        }
        const variance = opItem.countedQuantity - oldQuantity;
        console.log(`📦 Counted ${mockInventory[inventoryIndex].name}: ${oldQuantity} → ${opItem.countedQuantity} (variance: ${variance > 0 ? '+' : ''}${variance})`);
      }
    });

    // Create operation record
    const operationRecord = {
      id: `COUNT_${Date.now()}`,
      type: 'count',
      reference: operation.generalData.reference || '',
      items: operation.items,
      timestamp: new Date().toISOString(),
      notes: operation.generalData.notes || ''
    };

    return HttpResponse.json(operationRecord, { status: 201 });
  }),

  // Get operation history
  http.get('/api/inventory/operations', () => {
    // Mock operation history
    const operations = [
      {
        id: 'RECV_1735689600000',
        type: 'receive',
        reference: 'PO-2024-001',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        items: [{ itemId: '1', receivedQuantity: 10 }],
        notes: 'Weekly delivery'
      },
      {
        id: 'ADJ_1735689500000',
        type: 'adjust',
        reference: 'ADJ-001',
        reason: 'waste',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        items: [{ itemId: '4', adjustmentQuantity: -3 }],
        notes: 'Spoiled lettuce disposal'
      }
    ];
    return HttpResponse.json(operations);
  }),

  // Inventory units endpoint
  http.get('/api/inventory/units', () => {
    const units = [
      { id: 'pieces', name: 'Pieces', abbreviation: 'pcs' },
      { id: 'lbs', name: 'Pounds', abbreviation: 'lbs' },
      { id: 'gallons', name: 'Gallons', abbreviation: 'gal' },
      { id: 'bottles', name: 'Bottles', abbreviation: 'btl' },
      { id: 'heads', name: 'Heads', abbreviation: 'hd' },
      { id: 'boxes', name: 'Boxes', abbreviation: 'box' }
    ];
    return HttpResponse.json(units);
  }),

  // NOTE: Inventory locations endpoint moved to inventory/transfers/api.ts to provide proper branch locations

  http.post('/api/inventory', async ({ request }) => {
    const newItem = await request.json() as any;
    const item = { 
      ...newItem, 
      id: String(mockInventory.length + 1) 
    };
    mockInventory.push(item);
    console.log('📦 MSW: Added new inventory item:', item.name);
    return HttpResponse.json(item, { status: 201 });
  }),

  http.patch('/api/inventory/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json() as any;
    const itemIndex = mockInventory.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
      mockInventory[itemIndex] = { ...mockInventory[itemIndex], ...updates };
      return HttpResponse.json(mockInventory[itemIndex]);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Customers (server-side pagination, sorting, filtering)
  http.get('/api/customers', ({ request }) => {
    // Seed database on first call
    if (customersDb.length === 0) {
    customersDb = mockCustomers.map((c, _idx) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      orders: typeof c.orders === 'number' ? c.orders : Math.floor(Math.random() * 30),
      totalSpent: typeof c.totalSpent === 'number' ? c.totalSpent : Number((Math.random() * 1000).toFixed(2)),
      points: Math.floor(Math.random() * 500),
      branchIds: c.branchIds || ['main-restaurant'],
    }));
      // Generate additional mock customers to simulate scale
      const need = 500 - customersDb.length;
      for (let i = 0; i < Math.max(0, need); i++) {
        const id = String(customersDb.length + 1);
        const first = ['John', 'Jane', 'Alex', 'Sam', 'Chris', 'Taylor', 'Pat', 'Casey'][i % 8];
        const last = ['Doe', 'Smith', 'Johnson', 'Lee', 'Brown', 'Davis', 'Miller', 'Wilson'][i % 8];
        const spent = Number((Math.random() * 5000).toFixed(2));
        // Randomly assign customers to branches
        const randomBranches = [];
        if (Math.random() > 0.3) randomBranches.push('main-restaurant');
        if (Math.random() > 0.5) randomBranches.push('downtown-location');
        if (Math.random() > 0.8) randomBranches.push('warehouse');
        if (randomBranches.length === 0) randomBranches.push('main-restaurant'); // Ensure at least one branch
        
        customersDb.push({
          id,
          name: `${first} ${last} ${i}`,
          email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
          phone: `555-${String(1000 + Math.floor(Math.random() * 9000))}`,
          orders: Math.floor(Math.random() * 60),
          totalSpent: spent,
          points: Math.floor(spent / 10) + Math.floor(Math.random() * 100),
          branchIds: randomBranches,
        });
      }
    }

    const url = new URL(request.url);
    const branchId = url.searchParams.get('branchId');
    const hasQuery =
      url.searchParams.has('page') ||
      url.searchParams.has('pageSize') ||
      url.searchParams.has('sort') ||
      url.searchParams.has('filters') ||
      url.searchParams.has('search') ||
      url.searchParams.has('branchId');

    // Backwards-compat: if no pagination/sort/filter/search params, return plain array
    if (!hasQuery) {
      return HttpResponse.json(customersDb);
    }

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25', 10)));
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const sortParam = url.searchParams.get('sort') || 'name:asc';
    const [sortKeyRaw, sortDirRaw] = sortParam.split(':');
    const sortKey = sortKeyRaw || 'name';
    const sortDir = sortDirRaw === 'desc' ? 'desc' : 'asc';
    url.searchParams.get('filters');

    let data = customersDb.slice();
    
    // Filter by branch if branchId is provided
    if (branchId) {
      data = data.filter((c: any) => c.branchIds && c.branchIds.includes(branchId));
    }

    // Text search
    if (search) {
      data = data.filter((c: any) =>
        c.name.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        String(c.phone).toLowerCase().includes(search)
      );
    }

    // Facet filters
    // Simplified: ignore advanced filters

    // Sorting
    data.sort((a: any, b: any) => {
      const av = a[sortKey as keyof typeof a];
      const bv = b[sortKey as keyof typeof b];
      if (av == null && bv == null) return 0;
      if (av == null) return sortDir === 'asc' ? -1 : 1;
      if (bv == null) return sortDir === 'asc' ? 1 : -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      return sortDir === 'asc' ? (as > bs ? 1 : as < bs ? -1 : 0) : (as < bs ? 1 : as > bs ? -1 : 0);
    });

    const total = data.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = data.slice(start, end);

    return HttpResponse.json({
      data: pageData,
      page,
      pageSize,
      total,
    });
  }),

  http.post('/api/customers', async ({ request }) => {
    const body = await request.json() as any;
    const nextId =
      customersDb.length > 0
        ? String(
            Math.max(
              ...customersDb
                .map((c) => parseInt(String(c.id), 10))
                .filter((n) => !Number.isNaN(n))
            ) + 1
          )
        : '1';
    const now = new Date().toISOString();
    const customer = {
      id: nextId,
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      orders: 0,
      totalSpent: 0,
      visits: 0,
      points: 0,
      lastVisit: now,
      status: 'active' as const,
      tags: [] as string[],
    };
    customersDb.push(customer);
    return HttpResponse.json(customer, { status: 201 });
  }),

  http.patch('/api/customers/:id', async ({ params, request }) => {
    const { id } = params as any;
    const updates = await request.json() as any;
    const idx = customersDb.findIndex((c: any) => String(c.id) === String(id));
    if (idx === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    customersDb[idx] = { ...customersDb[idx], ...updates, id: customersDb[idx].id };
    return HttpResponse.json(customersDb[idx]);
  }),
  // Loyalty adjust (Profile Drawer only; role-gated in UI)
  http.post('/api/customers/:id/loyalty-adjust', async ({ params, request }) => {
    const { id } = params as any;
    const body = await request.json() as any;
    const deltaRaw = body?.delta;
    const reason = String(body?.reason || '').slice(0, 200);
    const idx = customersDb.findIndex((c: any) => String(c.id) === String(id));
    if (idx === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    const delta = Number(deltaRaw);
    if (!Number.isFinite(delta) || Math.abs(delta) > 100000) {
      return HttpResponse.json({ error: 'Invalid delta' }, { status: 400 });
    }
    const currentPoints = Number(customersDb[idx].points || 0);
    const nextPoints = Math.max(0, currentPoints + Math.trunc(delta));
    customersDb[idx] = { ...customersDb[idx], points: nextPoints };
    // In a real system, an event would be appended with audit payload incl. reason
    console.log('⭐ MSW: loyalty-adjust', { id, delta: Math.trunc(delta), reason });
    return HttpResponse.json({ ...customersDb[idx] });
  }),

  // Reports
  http.get('/api/reports', () => {
    return HttpResponse.json(mockReports.dashboard);
  }),

  http.get('/api/reports/sales', () => {
    return HttpResponse.json(mockReports.sales);
  }),

  http.get('/api/reports/inventory', () => {
    return HttpResponse.json(mockReports.inventory);
  }),

  // Payment endpoints
  http.post('/api/payments/checkout', async ({ request }) => {
    const { ticketId, amount, currency } = await request.json() as any;
    
    // Generate mock session ID and redirect URL
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const redirectUrl = `https://mock-payment-provider.com/checkout/${sessionId}?amount=${amount}&currency=${currency || 'USD'}&ticket=${ticketId}`;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return HttpResponse.json({
      redirectUrl,
      sessionId
    });
  }),

  http.post('/api/payments/simulate-webhook', async ({ request }) => {
    const { provider, sessionId, eventType, ticketId, amount, currency, reason } = await request.json() as any;
    
    try {
      // Call the local webhook handler
      const result = handleWebhook(eventStore, {
        provider,
        sessionId,
        eventType,
        ticketId,
        amount,
        currency,
        reason
      });
      
      return HttpResponse.json({
        success: result.success,
        deduped: result.deduped,
        error: result.error
      });
    } catch (error) {
      return HttpResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }),

  // User Management endpoints
  http.get('/api/manage/users', () => {
    return HttpResponse.json(mockUsers);
  }),

  http.get('/api/manage/users/:id', ({ params }) => {
    const { id } = params;
    const user = mockUsers.find(u => u.id === id);
    if (!user) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  http.post('/api/manage/users', async ({ request }) => {
    const userData = await request.json() as any;
    const newUser = {
      id: `user_${Date.now()}`,
      email: userData.email,
      name: userData.name,
      phone: userData.phone,
      status: userData.status || 'active',
      roles: userData.roles || [],
      branchIds: userData.branchIds || [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        loginCount: 0,
        createdBy: 'current-user'
      }
    };
    
    // Check if email already exists
    if (mockUsers.some(u => u.email === newUser.email)) {
      return new HttpResponse(JSON.stringify({ error: 'Email already exists' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    mockUsers.push(newUser);
    
    // Generate temporary password
    const tempPassword = `Temp${Math.random().toString(36).substr(2, 8)}!`;
    
    return HttpResponse.json({ 
      ...newUser, 
      temporaryPassword: tempPassword 
    }, { status: 201 });
  }),

  http.patch('/api/manage/users/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json() as any;
    const userIndex = mockUsers.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    // Don't allow email changes for existing users
    delete updates.email;
    
    mockUsers[userIndex] = { 
      ...mockUsers[userIndex], 
      ...updates,
      metadata: {
        ...mockUsers[userIndex].metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    return HttpResponse.json(mockUsers[userIndex]);
  }),

  http.delete('/api/manage/users/:id', ({ params }) => {
    const { id } = params;
    const userIndex = mockUsers.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    // Don't allow deleting the primary admin
    if (mockUsers[userIndex].id === 'user_1') {
      return new HttpResponse(JSON.stringify({ error: 'Cannot delete primary administrator' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    mockUsers.splice(userIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.put('/api/manage/users/:id/roles', async ({ params, request }) => {
    const { id } = params;
    const { roleIds } = await request.json() as any;
    const userIndex = mockUsers.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    mockUsers[userIndex].roles = roleIds;
    mockUsers[userIndex].metadata.updatedAt = new Date().toISOString();
    
    return HttpResponse.json(mockUsers[userIndex]);
  }),

  http.post('/api/manage/users/:id/reset-password', ({ params }) => {
    const { id } = params;
    const user = mockUsers.find(u => u.id === id);

    if (!user) {
      return new HttpResponse(null, { status: 404 });
    }

    // Generate new temporary password
    const temporaryPassword = `Reset${Math.random().toString(36).substr(2, 8)}!`;
    
    return HttpResponse.json({ temporaryPassword });
  }),

  http.patch('/api/manage/users/:id/preferences', async ({ params, request }) => {
    const { id } = params;
    const preferences = await request.json() as any;
    const userIndex = mockUsers.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    // Validate default branch if provided
    if (preferences.defaultBranch) {
      const branch = mockBranches.find(b => b.id === preferences.defaultBranch);
      if (!branch) {
        return new HttpResponse(JSON.stringify({ error: 'Invalid branch' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Check if user has access to this branch
      if (mockUsers[userIndex].branchIds.length > 0 && 
          !mockUsers[userIndex].branchIds.includes(preferences.defaultBranch)) {
        return new HttpResponse(JSON.stringify({ error: 'User does not have access to this branch' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    mockUsers[userIndex].preferences = {
      ...mockUsers[userIndex].preferences,
      ...preferences
    };
    mockUsers[userIndex].metadata.updatedAt = new Date().toISOString();
    
    return HttpResponse.json(mockUsers[userIndex]);
  }),

  // Placeholder image endpoint
  http.get('/api/placeholder/:width/:height', ({ params }) => {
    const { width, height } = params;
    // Use token-aligned grays for better theme parity
    const bg = 'rgb(243,244,246)';
    const text = 'rgb(156,163,175)';
    return HttpResponse.text(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bg}"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="${text}">${width}×${height}</text>
      </svg>`,
      {
        headers: {
          'Content-Type': 'image/svg+xml',
        },
      }
    );
  }),
];

