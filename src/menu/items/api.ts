/**
 * Menu Items API Layer
 * RESTful API implementation with MSW handlers for development
 */

import { http, HttpResponse } from 'msw';
import type { 
  MenuItem, 
  CreateMenuItemRequest, 
  UpdateMenuItemRequest,
  MenuItemsResponse,
  MenuItemQuery 
} from './types';

// In-memory storage for development (MSW)
const mockMenuItems = new Map<string, MenuItem>();

// Initialize with some default menu items
const initializeDefaultMenuItems = () => {
  if (mockMenuItems.size === 0) {
    const defaultItems: MenuItem[] = [
      {
        id: 'item_burger_classic',
        sku: 'APP-BURG',
        name: 'Classic Burger',
        description: 'Juicy beef patty with lettuce, tomato, and special sauce',
        categoryId: 'cat_mains',
        price: 12.99,
        taxRate: 0.15,
        isActive: true,
        isAvailable: true,
        branchIds: ['main-restaurant'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'item_caesar_salad',
        sku: 'APP-CAES',
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with parmesan and croutons',
        categoryId: 'cat_appetizers',
        price: 8.99,
        taxRate: 0.15,
        isActive: true,
        isAvailable: true,
        branchIds: ['main-restaurant'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'item_cappuccino',
        sku: 'BEV-CAPP',
        name: 'Cappuccino',
        description: 'Rich espresso with steamed milk and foam',
        categoryId: 'cat_beverages',
        price: 4.50,
        taxRate: 0.15,
        isActive: true,
        isAvailable: true,
        branchIds: ['main-restaurant'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'item_tiramisu',
        sku: 'DES-TIRA',
        name: 'Tiramisu',
        description: 'Classic Italian dessert with coffee and mascarpone',
        categoryId: 'cat_desserts',
        price: 6.99,
        taxRate: 0.15,
        isActive: true,
        isAvailable: false, // Example of unavailable item
        branchIds: ['main-restaurant'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    defaultItems.forEach(item => {
      mockMenuItems.set(item.id, item);
    });
  }
};

// Utility Functions
function generateMenuItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function applyFilters(items: MenuItem[], query: MenuItemQuery): MenuItem[] {
  let filtered = Array.from(items);
  
  // Search filter (name and description)
  if (query.search) {
    const searchLower = query.search.toLowerCase();
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(searchLower) ||
      (item.description && item.description.toLowerCase().includes(searchLower)) ||
      item.sku.toLowerCase().includes(searchLower)
    );
  }
  
  // Category filter
  if (query.categoryId) {
    filtered = filtered.filter(item => item.categoryId === query.categoryId);
  }
  
  // Branch filter
  if (query.branchId) {
    filtered = filtered.filter(item => 
      item.branchIds.includes(query.branchId!)
    );
  }
  
  // Active status filter
  if (query.isActive !== undefined) {
    filtered = filtered.filter(item => item.isActive === query.isActive);
  }
  
  // Available status filter
  if (query.isAvailable !== undefined) {
    filtered = filtered.filter(item => item.isAvailable === query.isAvailable);
  }
  
  // Sorting
  const sortBy = query.sortBy || 'name';
  const sortOrder = query.sortOrder || 'asc';
  
  filtered.sort((a, b) => {
    let aVal: any = a[sortBy as keyof MenuItem];
    let bVal: any = b[sortBy as keyof MenuItem];
    
    // Handle date fields
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    if (sortOrder === 'desc') {
      [aVal, bVal] = [bVal, aVal];
    }
    
    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
  });
  
  return filtered;
}

function paginateResults(items: MenuItem[], page: number, pageSize: number) {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    items: items.slice(startIndex, endIndex),
    total: items.length,
    page,
    pageSize,
  };
}

// MSW API Handlers
export const menuItemsApiHandlers = [
  // GET /api/menu/items - List menu items
  http.get('/api/menu/items', async ({ request }) => {
    initializeDefaultMenuItems();
    
    const url = new URL(request.url);
    const query: MenuItemQuery = {
      page: parseInt(url.searchParams.get('page') || '1'),
      pageSize: parseInt(url.searchParams.get('pageSize') || '25'),
      search: url.searchParams.get('search') || undefined,
      categoryId: url.searchParams.get('categoryId') || undefined,
      branchId: url.searchParams.get('branchId') || undefined,
      isActive: url.searchParams.get('isActive') ? 
        url.searchParams.get('isActive') === 'true' : undefined,
      isAvailable: url.searchParams.get('isAvailable') ? 
        url.searchParams.get('isAvailable') === 'true' : undefined,
      sortBy: (url.searchParams.get('sortBy') as any) || 'name',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
    };
    
    const items = Array.from(mockMenuItems.values());
    const filtered = applyFilters(items, query);
    const paginated = paginateResults(filtered, query.page!, query.pageSize!);
    
    const response: MenuItemsResponse = {
      items: paginated.items,
      total: paginated.total,
      page: paginated.page,
      pageSize: paginated.pageSize,
    };
    
    return HttpResponse.json(response);
  }),
  
  // POST /api/menu/items - Create menu item
  http.post('/api/menu/items', async ({ request }) => {
    const requestData = await request.json() as CreateMenuItemRequest;
    
    // Basic validation
    if (!requestData.name || requestData.name.trim().length === 0) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Item name is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!requestData.sku || requestData.sku.trim().length === 0) {
      return new HttpResponse(JSON.stringify({ 
        error: 'SKU is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!requestData.categoryId) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Category is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!requestData.price || requestData.price <= 0) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Price must be greater than 0' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check for duplicate SKU
    const existingItems = Array.from(mockMenuItems.values());
    const isDuplicateSKU = existingItems.some(item => 
      item.sku.toUpperCase() === requestData.sku.trim().toUpperCase()
    );
    
    if (isDuplicateSKU) {
      return new HttpResponse(JSON.stringify({ 
        error: 'SKU already exists' 
      }), { 
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create new menu item
    const itemId = generateMenuItemId();
    const now = new Date();
    
    const newItem: MenuItem = {
      id: itemId,
      sku: requestData.sku.trim().toUpperCase(),
      name: requestData.name.trim(),
      description: requestData.description?.trim() || undefined,
      categoryId: requestData.categoryId,
      price: requestData.price,
      taxRate: requestData.taxRate || 0.15,
      isActive: requestData.isActive ?? true,
      isAvailable: requestData.isAvailable ?? true,
      branchIds: requestData.branchIds || ['main-restaurant'],
      createdAt: now,
      updatedAt: now,
    };
    
    mockMenuItems.set(itemId, newItem);
    
    return HttpResponse.json(newItem, { status: 201 });
  }),
  
  // GET /api/menu/items/:id - Get menu item by ID  
  http.get('/api/menu/items/:id', ({ params }) => {
    const itemId = params.id as string;
    const item = mockMenuItems.get(itemId);
    
    if (!item) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Menu item not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return HttpResponse.json(item);
  }),
  
  // PUT /api/menu/items/:id - Update menu item
  http.put('/api/menu/items/:id', async ({ params, request }) => {
    const itemId = params.id as string;
    const requestData = await request.json() as UpdateMenuItemRequest;
    
    const existingItem = mockMenuItems.get(itemId);
    if (!existingItem) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Menu item not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check for duplicate SKU if SKU is being updated
    if (requestData.sku && requestData.sku !== existingItem.sku) {
      const otherItems = Array.from(mockMenuItems.values())
        .filter(item => item.id !== itemId);
      const isDuplicateSKU = otherItems.some(item => 
        item.sku.toUpperCase() === requestData.sku!.trim().toUpperCase()
      );
      
      if (isDuplicateSKU) {
        return new HttpResponse(JSON.stringify({ 
          error: 'SKU already exists' 
        }), { 
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Update menu item
    const updatedItem: MenuItem = {
      ...existingItem,
      ...requestData,
      sku: requestData.sku ? requestData.sku.trim().toUpperCase() : existingItem.sku,
      name: requestData.name ? requestData.name.trim() : existingItem.name,
      description: requestData.description?.trim() || existingItem.description,
      updatedAt: new Date(),
    };
    
    mockMenuItems.set(itemId, updatedItem);
    
    return HttpResponse.json(updatedItem);
  }),
  
  // POST /api/menu/items/:id/availability - Toggle availability
  http.post('/api/menu/items/:id/availability', async ({ params, request }) => {
    const itemId = params.id as string;
    const { isAvailable } = await request.json() as { isAvailable: boolean };
    
    const existingItem = mockMenuItems.get(itemId);
    if (!existingItem) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Menu item not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Update availability
    const updatedItem: MenuItem = {
      ...existingItem,
      isAvailable,
      updatedAt: new Date(),
    };
    
    mockMenuItems.set(itemId, updatedItem);
    
    return HttpResponse.json(updatedItem);
  }),
  
  // DELETE /api/menu/items/:id - Delete menu item
  http.delete('/api/menu/items/:id', ({ params }) => {
    const itemId = params.id as string;
    
    if (!mockMenuItems.has(itemId)) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Menu item not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    mockMenuItems.delete(itemId);
    
    return HttpResponse.json({ success: true });
  }),
];

// Service Functions (for use in components)
export const menuItemsApi = {
  async getAll(query: MenuItemQuery = {}): Promise<MenuItemsResponse> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
    
    const response = await fetch(`/api/menu/items?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch menu items');
    }
    
    return response.json();
  },
  
  async create(data: CreateMenuItemRequest): Promise<MenuItem> {
    const response = await fetch('/api/menu/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create menu item');
    }
    
    return response.json();
  },
  
  async update(id: string, data: UpdateMenuItemRequest): Promise<MenuItem> {
    const response = await fetch(`/api/menu/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update menu item');
    }
    
    return response.json();
  },
  
  async toggleAvailability(id: string, isAvailable: boolean): Promise<MenuItem> {
    const response = await fetch(`/api/menu/items/${id}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update availability');
    }
    
    return response.json();
  },
  
  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/menu/items/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete menu item');
    }
  },
};

// Helper function to get items by category for POS
export async function getMenuItemsByCategory(categoryId?: string, branchId?: string): Promise<MenuItem[]> {
  const query: MenuItemQuery = {
    categoryId,
    branchId,
    isActive: true, // Only active items for POS
    pageSize: 1000, // Get all for POS
  };
  
  const response = await menuItemsApi.getAll(query);
  return response.items;
}

// Helper function to get all available items for POS
export async function getAvailableMenuItems(branchId?: string): Promise<MenuItem[]> {
  const query: MenuItemQuery = {
    branchId,
    isActive: true,
    isAvailable: true, // Only available items for POS
    pageSize: 1000, // Get all for POS
    sortBy: 'categoryId', // Group by category
  };
  
  const response = await menuItemsApi.getAll(query);
  return response.items;
}
