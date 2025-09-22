import { bootstrapEventStore } from '../../bootstrap/persist';
import { stableHash } from '../../events/hash';
import type { VersionedEvent } from '../../events/validation';

export interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  branchIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Internal state includes additional fields for repository management
interface MenuCategoryState {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  branchIds: string[];
  itemCount: number;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

interface MenuCategoryCreatedEvent extends VersionedEvent {
  type: 'menu.category.created.v1';
  version: 1;
  payload: {
    id: string;
    name: string;
    displayOrder: number;
    isActive: boolean;
    branchIds: string[];
  };
}

interface MenuCategoryUpdatedEvent extends VersionedEvent {
  type: 'menu.category.updated.v1';
  version: 1;
  payload: {
    id: string;
    changes: Partial<Pick<MenuCategoryState, 'name' | 'displayOrder' | 'isActive' | 'branchIds'>>;
  };
}

interface MenuCategoryDeletedEvent extends VersionedEvent {
  type: 'menu.category.deleted.v1';
  version: 1;
  payload: {
    id: string;
  };
}

function ensureState(map: Map<string, MenuCategoryState>, id: string): MenuCategoryState {
  const existing = map.get(id);
  if (existing) return existing;
  
  const fallback: MenuCategoryState = {
    id,
    name: `Category ${id}`,
    displayOrder: 0,
    isActive: true,
    branchIds: [],
    itemCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deleted: false
  };
  map.set(id, fallback);
  return fallback;
}

async function loadCategoryMap(): Promise<Map<string, MenuCategoryState>> {
  const { store } = await bootstrapEventStore();
  const events = store.getAll();
  const map = new Map<string, MenuCategoryState>();

  for (const event of events) {
    if (event.type === 'menu.category.created.v1' || event.type === 'menu.category.created') {
      const payload = (event as MenuCategoryCreatedEvent).payload;
      const state: MenuCategoryState = {
        id: payload.id,
        name: payload.name,
        displayOrder: payload.displayOrder,
        isActive: payload.isActive,
        branchIds: payload.branchIds,
        itemCount: 0,
        createdAt: event.at,
        updatedAt: event.at,
        deleted: false
      };
      map.set(payload.id, state);
      continue;
    }

    if (event.type === 'menu.category.updated.v1' || event.type === 'menu.category.updated') {
      const payload = (event as MenuCategoryUpdatedEvent).payload;
      const record = ensureState(map, payload.id);
      Object.assign(record, payload.changes);
      record.updatedAt = event.at;
      continue;
    }

    if (event.type === 'menu.category.deleted.v1' || event.type === 'menu.category.deleted') {
      const payload = (event as MenuCategoryDeletedEvent).payload;
      const record = ensureState(map, payload.id);
      record.deleted = true;
      record.updatedAt = event.at;
      continue;
    }

    // Count menu items for each category
    if (event.type === 'menu.item.created') {
      const payload = (event as any).payload;
      if (payload.categoryId) {
        const record = map.get(payload.categoryId);
        if (record) record.itemCount++;
      }
    }
  }

  return map;
}

export async function listCategories(): Promise<MenuCategory[]> {
  const map = await loadCategoryMap();
  return Array.from(map.values())
    .filter(category => !category.deleted)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
    .map(state => ({
      id: state.id,
      name: state.name,
      displayOrder: state.displayOrder,
      isActive: state.isActive,
      branchIds: state.branchIds,
      createdAt: new Date(state.createdAt),
      updatedAt: new Date(state.updatedAt),
    }));
}

export async function getCategory(id: string): Promise<MenuCategory | null> {
  const map = await loadCategoryMap();
  const state = map.get(id);
  if (!state || state.deleted) return null;
  
  return {
    id: state.id,
    name: state.name,
    displayOrder: state.displayOrder,
    isActive: state.isActive,
    branchIds: state.branchIds,
    createdAt: new Date(state.createdAt),
    updatedAt: new Date(state.updatedAt),
  };
}

export interface CreateCategoryInput {
  name: string;
  displayOrder?: number;
  isActive?: boolean;
  branchIds?: string[];
}

export async function createCategory(input: CreateCategoryInput): Promise<MenuCategory> {
  const { store } = await bootstrapEventStore();
  const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const result = store.append('menu.category.created.v1', {
    id,
    name: input.name.trim(),
    displayOrder: input.displayOrder ?? 0,
    isActive: input.isActive ?? true,
    branchIds: input.branchIds ?? []
  }, {
    key: `create-category-${id}`,
    params: input,
    aggregate: { id, type: 'menu-category' }
  });

  // Return the created category
  return {
    id,
    name: input.name.trim(),
    displayOrder: input.displayOrder ?? 0,
    isActive: input.isActive ?? true,
    branchIds: input.branchIds ?? [],
    createdAt: new Date(result.event.at),
    updatedAt: new Date(result.event.at),
  };
}

export interface UpdateCategoryInput {
  name?: string;
  displayOrder?: number;
  isActive?: boolean;
  branchIds?: string[];
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<MenuCategory | null> {
  const existing = await getCategory(id);
  if (!existing) return null;

  const { store } = await bootstrapEventStore();
  const changes = Object.fromEntries(
    Object.entries(input).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(changes).length === 0) return existing;

  store.append('menu.category.updated.v1', {
    id,
    changes
  }, {
    key: `update-category-${id}-${stableHash(input)}`,
    params: input,
    aggregate: { id, type: 'menu-category' }
  });

  return {
    ...existing,
    ...changes,
    updatedAt: new Date()
  };
}

export async function deleteCategory(id: string): Promise<boolean> {
  const existing = await getCategory(id);
  if (!existing) return false;

  const { store } = await bootstrapEventStore();
  store.append('menu.category.deleted.v1', {
    id
  }, {
    key: `delete-category-${id}`,
    params: { id },
    aggregate: { id, type: 'menu-category' }
  });

  return true;
}

export async function checkCategoryNameExists(name: string, excludeId?: string): Promise<boolean> {
  const categories = await listCategories();
  return categories.some(cat => 
    cat.name.toLowerCase() === name.toLowerCase() && 
    cat.id !== excludeId
  );
}

// Reference validation removed since we're using displayOrder instead of reference
