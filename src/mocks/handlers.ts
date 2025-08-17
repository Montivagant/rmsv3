import { http, HttpResponse } from 'msw';
import { eventStore } from '../events/store';
import { handleWebhook } from '../payments/webhook';

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
  { id: '1', name: 'Beef Patties', sku: 'BEEF-001', quantity: 50, unit: 'pieces', lowStock: 10, category: 'Meat', cost: 3.50 },
  { id: '2', name: 'Chicken Breast', sku: 'CHKN-001', quantity: 25, unit: 'pieces', lowStock: 5, category: 'Meat', cost: 4.25 },
  { id: '3', name: 'Potatoes', sku: 'VEG-001', quantity: 100, unit: 'lbs', lowStock: 20, category: 'Vegetables', cost: 0.75 },
  { id: '4', name: 'Onions', sku: 'VEG-002', quantity: 30, unit: 'lbs', lowStock: 10, category: 'Vegetables', cost: 0.85 },
  { id: '5', name: 'Coca Cola Syrup', sku: 'BEV-001', quantity: 5, unit: 'boxes', lowStock: 2, category: 'Beverages', cost: 12.99 },
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
  // Menu items
  http.get('/api/menu', () => {
    return HttpResponse.json(mockMenuItems);
  }),

  http.post('/api/menu', async ({ request }) => {
    const newItem = await request.json() as any;
    const item = { ...newItem, id: String(mockMenuItems.length + 1) };
    mockMenuItems.push(item);
    return HttpResponse.json(item, { status: 201 });
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
    return HttpResponse.json(mockInventory);
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