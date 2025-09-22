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
    return repositoryGetMenuItems(query);
  },

  async create(data: CreateMenuItemRequest): Promise<MenuItem> {
    return repositoryCreateMenuItem(data);
  },

  async update(id: string, data: UpdateMenuItemRequest): Promise<MenuItem> {
    return repositoryUpdateMenuItem(id, data);
  },

  async toggleAvailability(id: string, isAvailable: boolean): Promise<MenuItem> {
    return repositoryUpdateMenuItem(id, { isAvailable });
  },

  async delete(id: string): Promise<void> {
    await repositoryDeleteMenuItem(id, 'Removed via UI');
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

// MSW handlers stub (no longer used with repository-based data)
export const menuItemsApiHandlers = [];
