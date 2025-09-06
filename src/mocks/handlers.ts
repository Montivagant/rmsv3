import { http, HttpResponse } from 'msw';
import { eventStore } from '../events/store';
import { handleWebhook } from '../payments/webhook';
import { categoryApiHandlers } from '../inventory/categories/api';
import { inventoryItemApiHandlers } from '../inventory/items/api';
import { inventoryCountApiHandlers } from '../inventory/counts/api';
import { inventoryTransferApiHandlers } from '../inventory/transfers/api';
import { countSheetsApiHandlers } from '../inventory/count-sheets/api';
import { recipeApiHandlers } from '../recipes/api';
import { authHandlers } from './auth';

// Initialize mock data
console.log('📊 Initializing mock data handlers...');

// Mock data
const mockMenuItems = [
  { id: '1', name: 'Classic Burger', price: 12.99, category: 'Main', description: 'Beef patty with lettuce, tomato, onion', image: '/api/placeholder/150/150' },
  { id: '2', name: 'Chicken Sandwich', price: 11.99, category: 'Main', description: 'Grilled chicken breast with mayo', image: '/api/placeholder/150/150' },
  { id: '3', name: 'French Fries', price: 4.99, category: 'Sides', description: 'Crispy golden fries', image: '/api/placeholder/150/150' },
  { id: '4', name: 'Onion Rings', price: 5.99, category: 'Sides', description: 'Beer-battered onion rings', image: '/api/placeholder/150/150' },
  { id: '5', name: 'Coca Cola', price: 2.99, category: 'Drinks', description: 'Classic soft drink', image: '/api/placeholder/150/150' },
  { id: '6', name: 'Coffee', price: 3.49, category: 'Drinks', description: 'Fresh brewed coffee', image: '/api/placeholder/150/150' },
];

const mockOrders = [
  { id: '1', items: [{ id: '1', quantity: 2 }, { id: '3', quantity: 1 }], status: 'preparing', timestamp: new Date().toISOString(), total: 30.97 },
  { id: '2', items: [{ id: '2', quantity: 1 }, { id: '5', quantity: 2 }], status: 'ready', timestamp: new Date(Date.now() - 300000).toISOString(), total: 17.97 },
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
}> = [
  { id: '1', name: 'Beef Patty (1/4 lb)', sku: 'BEEF_PATTY', quantity: 15, unit: 'pieces', lowStock: 20, reorderPoint: 20, parLevel: 50, category: 'Food - Perishable', cost: 2.45, price: 4.99, status: 'low-stock' as const },
  { id: '2', name: 'Hamburger Buns', sku: 'BURGER_BUNS', quantity: 8, unit: 'pieces', lowStock: 25, reorderPoint: 25, parLevel: 100, category: 'Food - Perishable', cost: 0.33, price: 0.75, status: 'low-stock' as const },
  { id: '3', name: 'Frozen French Fries', sku: 'FRIES_FROZEN', quantity: 45, unit: 'lbs', lowStock: 30, reorderPoint: 30, parLevel: 80, category: 'Food - Non-Perishable', cost: 1.25, price: 2.50, status: 'in-stock' as const },
  { id: '4', name: 'Fresh Lettuce', sku: 'LETTUCE', quantity: 12, unit: 'heads', lowStock: 15, reorderPoint: 15, parLevel: 40, category: 'Food - Perishable', cost: 0.75, price: 1.50, status: 'low-stock' as const },
  { id: '5', name: 'Tomatoes', sku: 'TOMATOES', quantity: 25, unit: 'lbs', lowStock: 20, reorderPoint: 20, parLevel: 60, category: 'Food - Perishable', cost: 1.85, price: 3.50, status: 'in-stock' as const },
  { id: '6', name: 'Cheese Slices', sku: 'CHEESE_SLICES', quantity: 40, unit: 'pieces', lowStock: 30, reorderPoint: 30, parLevel: 100, category: 'Food - Perishable', cost: 0.45, price: 0.95, status: 'in-stock' as const },
  { id: '7', name: 'Onions', sku: 'ONIONS', quantity: 18, unit: 'lbs', lowStock: 15, reorderPoint: 15, parLevel: 50, category: 'Food - Perishable', cost: 0.65, price: 1.25, status: 'in-stock' as const },
  { id: '8', name: 'Ketchup', sku: 'KETCHUP', quantity: 6, unit: 'bottles', lowStock: 8, reorderPoint: 8, parLevel: 20, category: 'Condiments', cost: 3.25, price: 5.99, status: 'low-stock' as const },
  { id: '9', name: 'Mustard', sku: 'MUSTARD', quantity: 4, unit: 'bottles', lowStock: 6, reorderPoint: 6, parLevel: 15, category: 'Condiments', cost: 2.85, price: 4.99, status: 'low-stock' as const },
  { id: '10', name: 'Cooking Oil', sku: 'COOKING_OIL', quantity: 3, unit: 'gallons', lowStock: 5, reorderPoint: 5, parLevel: 10, category: 'Cooking Supplies', cost: 8.50, price: 15.99, status: 'low-stock' as const }
];

const mockCustomers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', phone: '555-0123', orders: 15, totalSpent: 234.50 },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '555-0124', orders: 8, totalSpent: 156.75 },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', phone: '555-0125', orders: 22, totalSpent: 445.20 },
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

// Mock suppliers
const mockSuppliers = [
  { 
    id: '1', 
    name: 'Fresh Food Supply Co.', 
    code: 'FRESH123',
    contactPerson: 'John Smith',
    email: 'orders@freshfood.com',
    phone: '+201234567890',
    isActive: true 
  },
  { 
    id: '2', 
    name: 'Quality Meats Ltd.', 
    code: 'MEAT456',
    contactPerson: 'Sarah Johnson',
    email: 'sales@qualitymeats.com',
    phone: '+201987654321',
    isActive: true 
  },
];

let customersDb: any[] = [];
export const handlers = [
  // Category management
  ...categoryApiHandlers,
  
  // Inventory Transfer Management (before items to override search endpoint)
  ...inventoryTransferApiHandlers,
  ...countSheetsApiHandlers,
  
  // Enhanced Inventory Items  
  ...inventoryItemApiHandlers,
  
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

  // Suppliers endpoints
  http.get('/api/suppliers', () => {
    console.log('🏢 MSW: Suppliers API called, returning', mockSuppliers.length, 'suppliers');
    return HttpResponse.json(mockSuppliers);
  }),

  http.post('/api/suppliers', async ({ request }) => {
    const newSupplier = await request.json() as any;
    const supplier = {
      ...newSupplier,
      id: String(mockSuppliers.length + 1),
      isActive: true
    };
    mockSuppliers.push(supplier);
    console.log('🏢 MSW: Created new supplier:', supplier.name);
    return HttpResponse.json(supplier, { status: 201 });
  }),

  http.get('/api/suppliers/codes', () => {
    const codes = mockSuppliers
      .map(supplier => supplier.code)
      .filter(code => code); // Filter out empty codes
    console.log('🏢 MSW: Supplier codes called, returning', codes.length, 'codes');
    return HttpResponse.json({ codes });
  }),

  http.get('/api/suppliers/names', () => {
    const names = mockSuppliers.map(supplier => supplier.name);
    console.log('🏢 MSW: Supplier names called, returning', names.length, 'names');
    return HttpResponse.json({ names });
  }),

  http.get('/api/suppliers/check-name', ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    const exists = mockSuppliers.some(supplier => 
      supplier.name.toLowerCase() === name?.toLowerCase()
    );
    return HttpResponse.json({ exists });
  }),

  http.get('/api/suppliers/check-code', ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const exists = mockSuppliers.some(supplier => 
      supplier.code?.toLowerCase() === code?.toLowerCase()
    );
    return HttpResponse.json({ exists });
  }),
  
  // Menu items
  http.get('/api/menu', () => {
    return HttpResponse.json(mockMenuItems);
  }),

  http.post('/api/menu', async ({ request }) => {
    const newItem = await request.json() as any;
    const item = { ...newItem, id: String(mockMenuItems.length + 1) };
    mockMenuItems.push(item);
    console.log('🍔 MSW: Added new menu item:', item.name);
    return HttpResponse.json(item, { status: 201 });
  }),

  http.patch('/api/menu/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json() as any;
    const itemIndex = mockMenuItems.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
      mockMenuItems[itemIndex] = { ...mockMenuItems[itemIndex], ...updates };
      console.log('🍔 MSW: Updated menu item:', mockMenuItems[itemIndex].name);
      return HttpResponse.json(mockMenuItems[itemIndex]);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.delete('/api/menu/:id', async ({ params }) => {
    const { id } = params;
    const itemIndex = mockMenuItems.findIndex(item => item.id === id);
    if (itemIndex !== -1) {
      const deletedItem = mockMenuItems.splice(itemIndex, 1)[0];
      console.log('🍔 MSW: Deleted menu item:', deletedItem.name);
      return HttpResponse.json({ message: 'Menu item deleted successfully' });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Orders
  http.get('/api/orders', () => {
    return HttpResponse.json(mockOrders);
  }),

  http.post('/api/orders', async ({ request }) => {
    const newOrder = await request.json() as any;
    const order = {
      ...newOrder,
      id: String(mockOrders.length + 1),
      status: 'preparing',
      timestamp: new Date().toISOString()
    };
    mockOrders.push(order);
    return HttpResponse.json(order, { status: 201 });
  }),

  http.patch('/api/orders/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json() as any;
    const orderIndex = mockOrders.findIndex(order => order.id === id);
    if (orderIndex !== -1) {
      mockOrders[orderIndex] = { ...mockOrders[orderIndex], ...updates };
      return HttpResponse.json(mockOrders[orderIndex]);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Enhanced inventory endpoints
  http.get('/api/inventory/items', () => {
    console.log('📦 MSW: Enhanced inventory items API called, returning', mockInventory.length, 'items');
    // Return in enhanced format expected by Inventory-complete.tsx
    const enhancedItems = mockInventory.map(item => ({
      ...item,
      levels: {
        current: item.quantity,
        par: {
          reorderPoint: item.reorderPoint,
          max: item.parLevel
        }
      },
      costing: {
        averageCost: item.cost
      },
      uom: {
        base: item.unit
      },
      categoryId: item.category
    }));
    return HttpResponse.json({ items: enhancedItems, total: enhancedItems.length });
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
      supplierId: operation.generalData.supplierId,
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
        supplierId: 'supplier-1',
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
      customersDb = mockCustomers.map((c, idx) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        orders: typeof c.orders === 'number' ? c.orders : Math.floor(Math.random() * 30),
        totalSpent: typeof c.totalSpent === 'number' ? c.totalSpent : Number((Math.random() * 1000).toFixed(2)),
        visits: Math.floor(Math.random() * 50),
        points: Math.floor(Math.random() * 500),
        lastVisit: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 3600 * 1000).toISOString(),
        status: Math.random() > 0.2 ? 'active' : 'inactive',
        tags: Math.random() > 0.7 ? ['vip'] : [],
      }));
      // Generate additional mock customers to simulate scale
      const need = 500 - customersDb.length;
      for (let i = 0; i < Math.max(0, need); i++) {
        const id = String(customersDb.length + 1);
        const first = ['John', 'Jane', 'Alex', 'Sam', 'Chris', 'Taylor', 'Pat', 'Casey'][i % 8];
        const last = ['Doe', 'Smith', 'Johnson', 'Lee', 'Brown', 'Davis', 'Miller', 'Wilson'][i % 8];
        const status = Math.random() > 0.15 ? 'active' : 'inactive';
        const visits = Math.floor(Math.random() * 60);
        const spent = Number((Math.random() * 5000).toFixed(2));
        customersDb.push({
          id,
          name: `${first} ${last} ${i}`,
          email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
          phone: `555-${String(1000 + Math.floor(Math.random() * 9000))}`,
          orders: Math.floor(visits * (0.6 + Math.random() * 0.8)),
          totalSpent: spent,
          visits,
          points: Math.floor(spent / 10) + Math.floor(Math.random() * 100),
          lastVisit: new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 3600 * 1000).toISOString(),
          status,
          tags: status === 'active' && Math.random() > 0.8 ? ['vip'] : [],
        });
      }
    }

    const url = new URL(request.url);
    const hasQuery =
      url.searchParams.has('page') ||
      url.searchParams.has('pageSize') ||
      url.searchParams.has('sort') ||
      url.searchParams.has('filters') ||
      url.searchParams.has('search');

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
    const filtersRaw = url.searchParams.get('filters');

    let data = customersDb.slice();

    // Text search
    if (search) {
      data = data.filter((c: any) =>
        c.name.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        String(c.phone).toLowerCase().includes(search)
      );
    }

    // Facet filters
    try {
      if (filtersRaw) {
        const filters = JSON.parse(filtersRaw);
        if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
          data = data.filter((c: any) => filters.status.includes(c.status));
        }
        if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
          data = data.filter((c: any) => c.tags?.some((t: string) => filters.tags.includes(t)));
        }
        if (filters.spend && Array.isArray(filters.spend)) {
          const [min, max] = filters.spend;
          if (typeof min === 'number') data = data.filter((c: any) => c.totalSpent >= min);
          if (typeof max === 'number') data = data.filter((c: any) => c.totalSpent <= max);
        }
        if (filters.visitRecency) {
          // e.g., "30d", "90d"
          const m = String(filters.visitRecency).match(/(\d+)d/);
          if (m) {
            const days = parseInt(m[1], 10);
            const cutoff = Date.now() - days * 24 * 3600 * 1000;
            data = data.filter((c: any) => new Date(c.lastVisit).getTime() >= cutoff);
          }
        }
      }
    } catch {
      // ignore malformed filters
    }

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

  // Placeholder image endpoint
  http.get('/api/placeholder/:width/:height', ({ params }) => {
    const { width, height } = params;
    return HttpResponse.text(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af">${width}×${height}</text>
      </svg>`,
      {
        headers: {
          'Content-Type': 'image/svg+xml',
        },
      }
    );
  }),
];