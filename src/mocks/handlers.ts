import { http, HttpResponse } from 'msw';
import { eventStore } from '../events/store';
import { handleWebhook } from '../payments/webhook';
import { categoryApiHandlers } from '../inventory/categories/api';
import { inventoryItemApiHandlers } from '../inventory/items/api';
import { recipeApiHandlers } from '../recipes/api';

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

const mockInventory = [
  { id: '1', name: 'Beef Patty (1/4 lb)', sku: 'BEEF_PATTY', quantity: 15, unit: 'pieces', lowStock: 20, category: 'Food - Perishable', cost: 2.45 },
  { id: '2', name: 'Hamburger Buns', sku: 'BURGER_BUNS', quantity: 8, unit: 'pieces', lowStock: 25, category: 'Food - Perishable', cost: 0.33 },
  { id: '3', name: 'Frozen French Fries', sku: 'FRIES_FROZEN', quantity: 45, unit: 'lbs', lowStock: 30, category: 'Food - Non-Perishable', cost: 1.25 },
  { id: '4', name: 'Fresh Lettuce', sku: 'LETTUCE', quantity: 12, unit: 'heads', lowStock: 15, category: 'Food - Perishable', cost: 0.75 },
  { id: '5', name: 'Tomatoes', sku: 'TOMATOES', quantity: 25, unit: 'lbs', lowStock: 20, category: 'Food - Perishable', cost: 1.85 },
  { id: '6', name: 'Cheese Slices', sku: 'CHEESE_SLICES', quantity: 40, unit: 'pieces', lowStock: 30, category: 'Food - Perishable', cost: 0.45 },
  { id: '7', name: 'Onions', sku: 'ONIONS', quantity: 18, unit: 'lbs', lowStock: 15, category: 'Food - Perishable', cost: 0.65 },
  { id: '8', name: 'Ketchup', sku: 'KETCHUP', quantity: 6, unit: 'bottles', lowStock: 8, category: 'Condiments', cost: 3.25 },
  { id: '9', name: 'Mustard', sku: 'MUSTARD', quantity: 4, unit: 'bottles', lowStock: 6, category: 'Condiments', cost: 2.85 },
  { id: '10', name: 'Cooking Oil', sku: 'COOKING_OIL', quantity: 3, unit: 'gallons', lowStock: 5, category: 'Cooking Supplies', cost: 8.50 }
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

export const handlers = [
  // Category management
  ...categoryApiHandlers,
  
  // Enhanced Inventory Items
  ...inventoryItemApiHandlers,
  
  // Recipe & BOM Management
  ...recipeApiHandlers,
  
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

  // Inventory
  http.get('/api/inventory', () => {
    console.log('📦 MSW: Inventory API called, returning', mockInventory.length, 'items');
    return HttpResponse.json(mockInventory);
  }),

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

  // Customers
  http.get('/api/customers', () => {
    return HttpResponse.json(mockCustomers);
  }),

  http.post('/api/customers', async ({ request }) => {
    const newCustomer = await request.json() as any;
    const customer = { ...newCustomer, id: String(mockCustomers.length + 1), orders: 0, totalSpent: 0 };
    mockCustomers.push(customer);
    return HttpResponse.json(customer, { status: 201 });
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