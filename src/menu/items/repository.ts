import { bootstrapEventStore } from '../../bootstrap/persist';
// Define menu item event types locally since they're not in events/types
interface MenuItemCreatedEvent {
  type: 'menu.item.created';
  payload: {
    id: string;
    sku: string;
    name: string;
    description?: string;
    categoryId: string;
    price: number;
    taxRate: number;
    isActive: boolean;
    isAvailable: boolean;
    branchIds: string[];
    image?: string;
    createdAt: number;
    updatedAt: number;
  };
}

interface MenuItemUpdatedEvent {
  type: 'menu.item.updated';
  payload: {
    id: string;
    changes: {
      sku?: string;
      name?: string;
      description?: string;
      categoryId?: string;
      price?: number;
      taxRate?: number;
      isActive?: boolean;
      isAvailable?: boolean;
      branchIds?: string[];
      image?: string;
    };
    updatedAt: number;
  };
}

interface MenuItemDeletedEvent {
  type: 'menu.item.deleted';
  payload: {
    id: string;
    deletedAt: number;
    reason?: string;
  };
}
import { stableHash } from '../../events/hash';
import type { CreateMenuItemRequest, MenuItem, MenuItemQuery, MenuItemsResponse, UpdateMenuItemRequest } from './types';
import { logger } from '../../shared/logger';

const AGGREGATE_TYPE = 'menu-item';

interface MenuItemState {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  taxRate: number;
  isActive: boolean;
  isAvailable: boolean;
  branchIds: string[];
  image?: string;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

function generateMenuItemId(): string {
  const cryptoRef = (globalThis as any).crypto;
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  return `menu_item_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toMenuItem(state: MenuItemState): MenuItem {
  const { deleted, ...rest } = state;
  return {
    ...rest,
    createdAt: new Date(state.createdAt),
    updatedAt: new Date(state.updatedAt),
  };
}

// Image handling simplified to use string (URL or base64)

async function loadMenuItemStates(): Promise<Map<string, MenuItemState>> {
  const { store } = await bootstrapEventStore();
  const events = store.getAll();
  const map = new Map<string, MenuItemState>();

  for (const event of events) {
    if (!event.type.startsWith('menu.item.')) continue;

    switch (event.type) {
      case 'menu.item.created': {
        const payload = (event as MenuItemCreatedEvent).payload;
        map.set(payload.id, {
          id: payload.id,
          sku: payload.sku,
          name: payload.name,
          description: payload.description || '',
          categoryId: payload.categoryId,
          price: payload.price,
          taxRate: payload.taxRate,
          isActive: payload.isActive,
          isAvailable: payload.isAvailable,
          branchIds: payload.branchIds,
          image: payload.image || '',
          createdAt: payload.createdAt,
          updatedAt: payload.updatedAt,
          deleted: false,
        });
        break;
      }
      case 'menu.item.updated': {
        const payload = (event as MenuItemUpdatedEvent).payload;
        const target = map.get(payload.id);
        if (!target) break;
        target.sku = payload.changes.sku ?? target.sku;
        target.name = payload.changes.name ?? target.name;
        target.description = payload.changes.description ?? target.description ?? '';
        target.categoryId = payload.changes.categoryId ?? target.categoryId;
        target.price = payload.changes.price ?? target.price;
        target.taxRate = payload.changes.taxRate ?? target.taxRate;
        target.isActive = payload.changes.isActive ?? target.isActive;
        target.isAvailable = payload.changes.isAvailable ?? target.isAvailable;
        target.branchIds = payload.changes.branchIds ?? target.branchIds;
        if (payload.changes.image !== undefined) {
          target.image = payload.changes.image ?? undefined;
        }
        target.updatedAt = payload.updatedAt;
        break;
      }
      case 'menu.item.deleted': {
        const payload = (event as MenuItemDeletedEvent).payload;
        const target = map.get(payload.id);
        if (!target) break;
        target.deleted = true;
        target.updatedAt = Math.max(target.updatedAt, payload.deletedAt);
        break;
      }
      default: {
        logger.warn('Unhandled menu item event', { eventType: event.type });
      }
    }
  }

  return map;
}

function applyQuery(items: MenuItem[], query: MenuItemQuery = {}): MenuItem[] {
  let result = items.slice();
  const { search, categoryId, branchId, isActive, isAvailable, sortBy = 'name', sortOrder = 'asc' } = query;

  if (search) {
    const term = search.toLowerCase();
    result = result.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) ||
      (item.description ?? '').toLowerCase().includes(term)
    );
  }

  if (categoryId) {
    result = result.filter(item => item.categoryId === categoryId);
  }

  if (branchId) {
    result = result.filter(item => item.branchIds.includes(branchId));
  }

  if (typeof isActive === 'boolean') {
    result = result.filter(item => item.isActive === isActive);
  }

  if (typeof isAvailable === 'boolean') {
    result = result.filter(item => item.isAvailable === isAvailable);
  }

  result.sort((a, b) => {
    const direction = sortOrder === 'desc' ? -1 : 1;
    switch (sortBy) {
      case 'price':
        return (a.price - b.price) * direction;
      case 'category':
        return a.categoryId.localeCompare(b.categoryId) * direction;
      case 'createdAt':
        return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
      case 'updatedAt':
        return (a.updatedAt.getTime() - b.updatedAt.getTime()) * direction;
      case 'name':
      default:
        return a.name.localeCompare(b.name) * direction;
    }
  });

  return result;
}

export async function getMenuItems(query: MenuItemQuery = {}): Promise<MenuItemsResponse> {
  const state = await loadMenuItemStates();
  const items = Array.from(state.values())
    .filter(item => !item.deleted)
    .map(toMenuItem);

  const filtered = applyQuery(items, query);
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 25;
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return {
    items: paginated,
    total: filtered.length,
    page,
    pageSize,
  };
}

export async function getMenuItemById(id: string): Promise<MenuItem | null> {
  const state = await loadMenuItemStates();
  const item = state.get(id);
  if (!item || item.deleted) return null;
  return toMenuItem(item);
}

export async function createMenuItem(request: CreateMenuItemRequest): Promise<MenuItem> {
  const { store } = await bootstrapEventStore();
  const id = request.sku ? `item_${stableHash(request.sku)}_${Date.now()}` : generateMenuItemId();
  const now = Date.now();
  const image = request.image;

  const payload: MenuItemCreatedEvent['payload'] = {
    id,
    sku: request.sku,
    name: request.name,
      description: request.description || '',
    categoryId: request.categoryId,
    price: request.price,
    taxRate: request.taxRate ?? 0,
    isActive: request.isActive ?? true,
    isAvailable: request.isAvailable ?? true,
    branchIds: request.branchIds ?? [],
    image: image || '',
    createdAt: now,
    updatedAt: now,
  };

  store.append('menu.item.created', payload, {
    key: `menu.item:create:${id}`,
    params: payload,
    aggregate: { id, type: AGGREGATE_TYPE },
  });

  const state = await loadMenuItemStates();
  const created = state.get(id);
  if (!created) {
    return toMenuItem({ ...payload, deleted: false });
  }
  return toMenuItem(created);
}

export async function updateMenuItem(id: string, request: UpdateMenuItemRequest): Promise<MenuItem> {
  const { store } = await bootstrapEventStore();
  const now = Date.now();
  const changes = { ...request } as UpdateMenuItemRequest;
  if (request.image !== undefined) {
    changes.image = request.image;
  }

  const payload: MenuItemUpdatedEvent['payload'] = {
    id,
    changes: {
      ...(changes.sku && { sku: changes.sku }),
      ...(changes.name && { name: changes.name }),
      ...(changes.description !== undefined && { description: changes.description }),
      ...(changes.categoryId && { categoryId: changes.categoryId }),
      ...(changes.price !== undefined && { price: changes.price }),
      ...(changes.taxRate !== undefined && { taxRate: changes.taxRate }),
      ...(changes.isActive !== undefined && { isActive: changes.isActive }),
      ...(changes.isAvailable !== undefined && { isAvailable: changes.isAvailable }),
      ...(changes.branchIds && { branchIds: changes.branchIds }),
      ...(changes.image !== undefined && { image: changes.image }),
    },
    updatedAt: now,
  };

  store.append('menu.item.updated', payload, {
    key: `menu.item:update:${id}:${now}`,
    params: payload,
    aggregate: { id, type: AGGREGATE_TYPE },
  });

  const state = await loadMenuItemStates();
  const updated = state.get(id);
  if (!updated || updated.deleted) {
    throw new Error('Menu item not found after update');
  }
  return toMenuItem(updated);
}

export async function deleteMenuItem(id: string, reason?: string): Promise<void> {
  const { store } = await bootstrapEventStore();
  const now = Date.now();
  const payload: MenuItemDeletedEvent['payload'] = {
    id,
    deletedAt: now,
    ...(reason && { reason }),
  };
  store.append('menu.item.deleted', payload, {
    key: `menu.item:delete:${id}`,
    params: payload,
    aggregate: { id, type: AGGREGATE_TYPE },
  });
}

/**
 * Toggle availability of a menu item
 */
export async function toggleMenuItemAvailability(id: string, isAvailable: boolean): Promise<MenuItem> {
  const { store } = await bootstrapEventStore();
  const now = Date.now();

  store.append('menu.item.updated', {
    id,
    changes: { isAvailable },
    updatedAt: now
  }, {
    key: `toggle-availability-${id}-${isAvailable}`,
    params: { id, isAvailable },
    aggregate: { id, type: AGGREGATE_TYPE }
  });

  // Return updated item
  const states = await loadMenuItemStates();
  const updated = states.get(id);
  if (!updated) {
    throw new Error('Menu item not found after availability toggle');
  }
  
  logger.info(`Menu item availability toggled: ${id}`, { id, isAvailable });
  return toMenuItem(updated);
}
