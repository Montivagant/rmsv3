import type {
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  MenuItem,
  MenuItemsResponse,
  MenuItemQuery,
} from './types';
import {
  getMenuItems as repositoryGetMenuItems,
  createMenuItem as repositoryCreateMenuItem,
  updateMenuItem as repositoryUpdateMenuItem,
  deleteMenuItem as repositoryDeleteMenuItem,
} from './repository';

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
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to toggle availability');
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

export async function getMenuItemsByCategory(categoryId?: string, branchId?: string): Promise<MenuItem[]> {
  const response = await repositoryGetMenuItems({
    ...(categoryId && { categoryId }),
    ...(branchId && { branchId }),
    isActive: true,
    pageSize: 1000,
  });
  return response.items;
}

export async function getAvailableMenuItems(branchId?: string): Promise<MenuItem[]> {
  const response = await repositoryGetMenuItems({
    ...(branchId && { branchId }),
    isActive: true,
    isAvailable: true,
    pageSize: 1000,
    sortBy: 'category',
  });
  return response.items;
}

import { http, HttpResponse } from 'msw';

// MSW handlers for menu items using repository functions
export const menuItemsApiHandlers = [
  // GET /api/menu/items - List menu items
  http.get('/api/menu/items', async ({ request }) => {
    const url = new URL(request.url);
    const query: MenuItemQuery = {
      page: parseInt(url.searchParams.get('page') || '1'),
      pageSize: parseInt(url.searchParams.get('pageSize') || '25'),
      ...(url.searchParams.get('search') && { search: url.searchParams.get('search')! }),
      ...(url.searchParams.get('categoryId') && { categoryId: url.searchParams.get('categoryId')! }),
      ...(url.searchParams.get('branchId') && { branchId: url.searchParams.get('branchId')! }),
      ...(url.searchParams.get('isActive') === 'true' && { isActive: true }),
      ...(url.searchParams.get('isActive') === 'false' && { isActive: false }),
      ...(url.searchParams.get('isAvailable') === 'true' && { isAvailable: true }),
      ...(url.searchParams.get('isAvailable') === 'false' && { isAvailable: false }),
      sortBy: url.searchParams.get('sortBy') as any || 'name',
      sortOrder: url.searchParams.get('sortOrder') as 'asc' | 'desc' || 'asc'
    };

    try {
      const response = await repositoryGetMenuItems(query);
      console.log(`📋 MSW: Returning ${response.items.length} real menu items from repository`);
      return HttpResponse.json(response);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      return HttpResponse.json({
        items: [],
        total: 0,
        page: query.page || 1,
        pageSize: query.pageSize || 25
      });
    }
  }),

  // GET /api/menu/items/:id - Get single menu item
  http.get('/api/menu/items/:id', async ({ params }) => {
    const { id } = params;
    
    try {
      const { getMenuItemById } = await import('./repository');
      const item = await getMenuItemById(id as string);
      
      if (!item) {
        return HttpResponse.json({ error: 'Menu item not found' }, { status: 404 });
      }
      
      console.log(`📋 MSW: Returning real menu item ${item.name} from repository`);
      return HttpResponse.json(item);
    } catch (error) {
      console.error('Error fetching menu item:', error);
      return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }),

  // POST /api/menu/items - Create menu item
  http.post('/api/menu/items', async ({ request }) => {
    try {
      const data = await request.json() as CreateMenuItemRequest;
      const item = await repositoryCreateMenuItem(data);
      
      console.log(`✅ MSW: Created real menu item ${item.name} via repository`);
      return HttpResponse.json(item, { status: 201 });
    } catch (error) {
      console.error('Error creating menu item:', error);
      return HttpResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to create menu item' 
      }, { status: 400 });
    }
  }),

  // PUT /api/menu/items/:id - Update menu item
  http.put('/api/menu/items/:id', async ({ params, request }) => {
    const { id } = params;
    
    try {
      const data = await request.json() as UpdateMenuItemRequest;
      const item = await repositoryUpdateMenuItem(id as string, data);
      
      console.log(`✅ MSW: Updated real menu item ${item.name} via repository`);
      return HttpResponse.json(item);
    } catch (error) {
      console.error('Error updating menu item:', error);
      return HttpResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to update menu item' 
      }, { status: 400 });
    }
  }),

  // DELETE /api/menu/items/:id - Delete menu item
  http.delete('/api/menu/items/:id', async ({ params }) => {
    const { id } = params;
    
    try {
      await repositoryDeleteMenuItem(id as string, 'Deleted via UI');
      
      console.log(`✅ MSW: Deleted menu item ${id} via repository`);
      return HttpResponse.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
      console.error('Error deleting menu item:', error);
      return HttpResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to delete menu item' 
      }, { status: 400 });
    }
  }),

  // PATCH /api/menu/items/:id/availability - Toggle availability
  http.patch('/api/menu/items/:id/availability', async ({ params, request }) => {
    const { id } = params;
    
    try {
      const { isAvailable } = await request.json() as { isAvailable: boolean };
      const { toggleMenuItemAvailability } = await import('./repository');
      const item = await toggleMenuItemAvailability(id as string, isAvailable);
      
      console.log(`✅ MSW: Toggled menu item availability for ${item.name} via repository`);
      return HttpResponse.json(item);
    } catch (error) {
      console.error('Error toggling menu item availability:', error);
      return HttpResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to toggle availability' 
      }, { status: 400 });
    }
  })
];
