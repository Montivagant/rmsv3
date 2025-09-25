import { bootstrapEventStore } from '../bootstrap/persist';
import { stableHash } from '../events/hash';
import { logger } from '../shared/logger';
import type { VersionedEvent } from '../events/validation';

// Types matching the existing inventory structure
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  categoryId: string;
  itemTypeId?: string;
  quantity?: number;
  unit?: string;
  reorderPoint?: number;
  parLevel?: number;
  cost?: number;
  price?: number;
  location?: string;
  lastReceived?: string;
  expiryDate?: string;
  lotNumber?: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'expired' | 'active' | 'inactive' | 'discontinued';
  levels?: {
    current: number;
    reserved?: number;
    available?: number;
    onOrder?: number;
    par?: {
      min: number;
      max: number;
      reorderPoint?: number;
      reorderQuantity?: number;
    };
  };
  costing?: {
    averageCost?: number;
    lastCost?: number;
    currency?: string;
    costMethod?: 'FIFO' | 'LIFO' | 'AVERAGE';
  };
  quality?: {
    shelfLifeDays?: number;
    allergens?: string[];
    certifications?: string[];
    hazmat?: boolean;
  };
  flags?: {
    isCritical?: boolean;
    isPerishable?: boolean;
    isControlled?: boolean;
    isRecipe?: boolean;
    isRawMaterial?: boolean;
    isFinishedGood?: boolean;
  };
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

export interface InventoryCategory {
  id: string;
  name: string;
  itemCount: number;
  description?: string;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

export interface InventoryUnit {
  id: string;
  name: string;
  abbreviation: string;
  type: 'weight' | 'volume' | 'length' | 'count' | 'time';
  baseUnit?: string;
  conversionFactor?: number;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

export interface InventoryItemType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  itemCount: number;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

// Event types
interface InventoryItemCreatedEvent extends VersionedEvent {
  type: 'inventory.item.created.v1';
  version: 1;
  payload: {
    id: string;
    sku: string;
    name: string;
    description?: string;
    categoryId: string;
    unit?: string;
    reorderPoint?: number;
    parLevel?: number;
    cost?: number;
    price?: number;
    levels?: InventoryItem['levels'];
    costing?: InventoryItem['costing'];
    quality?: InventoryItem['quality'];
    flags?: InventoryItem['flags'];
  };
}

interface InventoryItemUpdatedEvent extends VersionedEvent {
  type: 'inventory.item.updated.v1';
  version: 1;
  payload: {
    id: string;
    changes: Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'deleted'>>;
  };
}

interface InventoryItemDeletedEvent extends VersionedEvent {
  type: 'inventory.item.deleted.v1';
  version: 1;
  payload: {
    id: string;
    reason?: string;
  };
}

interface InventoryAdjustedEvent extends VersionedEvent {
  type: 'inventory.adjusted.v1';
  version: 1;
  payload: {
    sku: string;
    oldQty: number;
    newQty: number;
    delta: number;
    reason: string;
    reference?: string;
    actorId?: string;
  };
}

interface InventoryCategoryCreatedEvent extends VersionedEvent {
  type: 'inventory.category.created.v1';
  version: 1;
  payload: {
    id: string;
    name: string;
    description?: string;
  };
}

interface InventoryUnitCreatedEvent extends VersionedEvent {
  type: 'inventory.unit.created.v1';
  version: 1;
  payload: {
    id: string;
    name: string;
    abbreviation: string;
    type: InventoryUnit['type'];
    baseUnit?: string;
    conversionFactor?: number;
  };
}

// State management
type InventoryItemState = InventoryItem;
type InventoryCategoryState = InventoryCategory;
type InventoryUnitState = InventoryUnit;
type InventoryItemTypeState = InventoryItemType;

function ensureItemState(map: Map<string, InventoryItemState>, id: string): InventoryItemState {
  const existing = map.get(id);
  if (existing) return existing;
  
  const fallback: InventoryItemState = {
    id,
    sku: id,
    name: `Item ${id}`,
    categoryId: 'default',
    status: 'active',
    quantity: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deleted: false
  };
  map.set(id, fallback);
  return fallback;
}



// Load functions
async function loadInventoryItemsMap(): Promise<Map<string, InventoryItemState>> {
  const { store } = await bootstrapEventStore();
  const events = store.getAll();
  const map = new Map<string, InventoryItemState>();

  for (const event of events) {
    if (event.type === 'inventory.item.created.v1' || event.type === 'inventory.item.created') {
      const payload = (event as InventoryItemCreatedEvent).payload;
      const state: InventoryItemState = {
        id: payload.id,
        sku: payload.sku,
        name: payload.name,
        ...(payload.description && { description: payload.description }),
        categoryId: payload.categoryId,
        ...(payload.unit && { unit: payload.unit }),
        ...(payload.reorderPoint != null && { reorderPoint: payload.reorderPoint }),
        ...(payload.parLevel != null && { parLevel: payload.parLevel }),
        ...(payload.cost != null && { cost: payload.cost }),
        ...(payload.price != null && { price: payload.price }),
        quantity: payload.levels?.current || 0,
        status: 'active',
        ...(payload.levels && { levels: payload.levels }),
        ...(payload.costing && { costing: payload.costing }),
        ...(payload.quality && { quality: payload.quality }),
        ...(payload.flags && { flags: payload.flags }),
        createdAt: event.at,
        updatedAt: event.at,
        deleted: false
      };
      map.set(payload.id, state);
      continue;
    }

    if (event.type === 'inventory.item.updated.v1' || event.type === 'inventory.item.updated') {
      const payload = (event as InventoryItemUpdatedEvent).payload;
      const record = ensureItemState(map, payload.id);
      Object.assign(record, payload.changes);
      record.updatedAt = event.at;
      continue;
    }

    if (event.type === 'inventory.item.deleted.v1' || event.type === 'inventory.item.deleted') {
      const payload = (event as InventoryItemDeletedEvent).payload;
      const record = ensureItemState(map, payload.id);
      record.deleted = true;
      record.updatedAt = event.at;
      continue;
    }

    if (event.type === 'inventory.adjusted.v1' || event.type === 'inventory.adjusted') {
      const payload = (event as InventoryAdjustedEvent).payload;
      // Find item by SKU
      const item = Array.from(map.values()).find(item => item.sku === payload.sku);
      if (item) {
        item.quantity = payload.newQty;
        item.updatedAt = event.at;
        // Update status based on quantity
        if (item.quantity === 0) {
          item.status = 'out-of-stock';
        } else if (item.reorderPoint && item.quantity <= item.reorderPoint) {
          item.status = 'low-stock';
        } else {
          item.status = 'in-stock';
        }
      }
      continue;
    }
  }

  return map;
}

async function loadInventoryCategoriesMap(): Promise<Map<string, InventoryCategoryState>> {
  const { store } = await bootstrapEventStore();
  const events = store.getAll();
  const map = new Map<string, InventoryCategoryState>();

  for (const event of events) {
    if (event.type === 'inventory.category.created.v1' || event.type === 'inventory.category.created') {
      const payload = (event as InventoryCategoryCreatedEvent).payload;
      const state: InventoryCategoryState = {
        id: payload.id,
        name: payload.name,
        ...(payload.description && { description: payload.description }),
        itemCount: 0,
        createdAt: event.at,
        updatedAt: event.at,
        deleted: false
      };
      map.set(payload.id, state);
      continue;
    }

    if (event.type === 'inventory.category.updated.v1' || event.type === 'inventory.category.updated') {
      const payload = (event as any).payload;
      const existing = map.get(payload.id);
      if (existing) {
        existing.name = payload.name;
        if (payload.description !== undefined) {
          existing.description = payload.description;
        }
        existing.updatedAt = event.at;
      }
      continue;
    }

    if (event.type === 'inventory.category.deleted.v1' || event.type === 'inventory.category.deleted') {
      const payload = (event as any).payload;
      const existing = map.get(payload.id);
      if (existing) {
        existing.deleted = true;
        existing.updatedAt = event.at;
      }
      continue;
    }
  }

  // Count items in each category
  const itemsMap = await loadInventoryItemsMap();
  for (const item of itemsMap.values()) {
    if (!item.deleted) {
      const category = map.get(item.categoryId);
      if (category) {
        category.itemCount++;
      }
    }
  }

  return map;
}

async function loadInventoryUnitsMap(): Promise<Map<string, InventoryUnitState>> {
  const { store } = await bootstrapEventStore();
  const events = store.getAll();
  const map = new Map<string, InventoryUnitState>();

  // Add default units if none exist
  const defaultUnits: InventoryUnitState[] = [
    { id: 'ea', name: 'Each', abbreviation: 'ea', type: 'count', createdAt: Date.now(), updatedAt: Date.now(), deleted: false },
    { id: 'lb', name: 'Pound', abbreviation: 'lb', type: 'weight', createdAt: Date.now(), updatedAt: Date.now(), deleted: false },
    { id: 'oz', name: 'Ounce', abbreviation: 'oz', type: 'weight', baseUnit: 'lb', conversionFactor: 16, createdAt: Date.now(), updatedAt: Date.now(), deleted: false },
    { id: 'gal', name: 'Gallon', abbreviation: 'gal', type: 'volume', createdAt: Date.now(), updatedAt: Date.now(), deleted: false },
    { id: 'qt', name: 'Quart', abbreviation: 'qt', type: 'volume', baseUnit: 'gal', conversionFactor: 4, createdAt: Date.now(), updatedAt: Date.now(), deleted: false },
    { id: 'case', name: 'Case', abbreviation: 'case', type: 'count', createdAt: Date.now(), updatedAt: Date.now(), deleted: false }
  ];

  for (const unit of defaultUnits) {
    map.set(unit.id, unit);
  }

  for (const event of events) {
    if (event.type === 'inventory.unit.created.v1' || event.type === 'inventory.unit.created') {
      const payload = (event as InventoryUnitCreatedEvent).payload;
      const state: InventoryUnitState = {
        id: payload.id,
        name: payload.name,
        abbreviation: payload.abbreviation,
        type: payload.type,
        ...(payload.baseUnit && { baseUnit: payload.baseUnit }),
        ...(payload.conversionFactor != null && { conversionFactor: payload.conversionFactor }),
        createdAt: event.at,
        updatedAt: event.at,
        deleted: false
      };
      map.set(payload.id, state);
      continue;
    }
  }

  return map;
}

// Repository functions
export async function listInventoryItems(): Promise<InventoryItem[]> {
  const map = await loadInventoryItemsMap();
  return Array.from(map.values())
    .filter(item => !item.deleted)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
  const map = await loadInventoryItemsMap();
  const item = map.get(id);
  return item && !item.deleted ? item : null;
}

export async function listInventoryCategories(): Promise<InventoryCategory[]> {
  const map = await loadInventoryCategoriesMap();
  return Array.from(map.values())
    .filter(category => !category.deleted)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listInventoryUnits(): Promise<InventoryUnit[]> {
  const map = await loadInventoryUnitsMap();
  return Array.from(map.values())
    .filter(unit => !unit.deleted)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Create operations
export interface CreateInventoryItemInput {
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  itemTypeId?: string;
  unit?: string;
  reorderPoint?: number;
  parLevel?: number;
  cost?: number;
  price?: number;
  levels?: InventoryItem['levels'];
  costing?: InventoryItem['costing'];
  quality?: InventoryItem['quality'];
  flags?: InventoryItem['flags'];
}

export async function createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
  const { store } = await bootstrapEventStore();
  const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const result = store.append('inventory.item.created.v1', {
    id,
    sku: input.sku,
    name: input.name,
    description: input.description,
    categoryId: input.categoryId,
    unit: input.unit,
    reorderPoint: input.reorderPoint,
    parLevel: input.parLevel,
    cost: input.cost,
    price: input.price,
    levels: input.levels,
    costing: input.costing,
    quality: input.quality,
    flags: input.flags
  }, {
    key: `create-inventory-item-${id}`,
    params: input,
    aggregate: { id, type: 'inventory-item' }
  });

  return {
    id,
    sku: input.sku,
    name: input.name,
    ...(input.description && { description: input.description }),
    categoryId: input.categoryId,
    ...(input.unit && { unit: input.unit }),
    ...(input.reorderPoint != null && { reorderPoint: input.reorderPoint }),
    ...(input.parLevel != null && { parLevel: input.parLevel }),
    ...(input.cost != null && { cost: input.cost }),
    ...(input.price != null && { price: input.price }),
    quantity: input.levels?.current || 0,
    status: 'active',
    ...(input.levels && { levels: input.levels }),
    ...(input.costing && { costing: input.costing }),
    ...(input.quality && { quality: input.quality }),
    ...(input.flags && { flags: input.flags }),
    createdAt: result.event.at,
    updatedAt: result.event.at,
    deleted: false
  };
}

export interface UpdateInventoryItemInput {
  name?: string;
  description?: string;
  categoryId?: string;
  itemTypeId?: string;
  unit?: string;
  reorderPoint?: number;
  parLevel?: number;
  cost?: number;
  price?: number;
  levels?: InventoryItem['levels'];
  costing?: InventoryItem['costing'];
  quality?: InventoryItem['quality'];
  flags?: InventoryItem['flags'];
  status?: InventoryItem['status'];
}

export async function updateInventoryItem(id: string, input: UpdateInventoryItemInput): Promise<InventoryItem | null> {
  const existing = await getInventoryItemById(id);
  if (!existing) return null;

  const { store } = await bootstrapEventStore();
  const changes = Object.fromEntries(
    Object.entries(input).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(changes).length === 0) return existing;

  const updatedBy = 'dev-admin'; // TODO: replace with real user context when available

  store.append('inventory.item.updated.v1', {
    id,
    changes,
    updatedBy
  }, {
    key: `update-inventory-item-${id}-${stableHash(input)}`,
    params: input,
    aggregate: { id, type: 'inventory-item' }
  });

  return {
    ...existing,
    ...changes,
    updatedAt: Date.now()
  };
}

export async function deleteInventoryItem(id: string, reason?: string): Promise<boolean> {
  const existing = await getInventoryItemById(id);
  if (!existing) return false;

  const { store } = await bootstrapEventStore();
  store.append('inventory.item.deleted.v1', {
    id,
    reason
  }, {
    key: `delete-inventory-item-${id}`,
    params: { id, reason },
    aggregate: { id, type: 'inventory-item' }
  });

  return true;
}

export async function adjustInventoryQuantity(
  sku: string, 
  newQty: number, 
  reason: string, 
  reference?: string,
  actorId?: string
): Promise<void> {
  const items = await listInventoryItems();
  const item = items.find(i => i.sku === sku);
  if (!item) throw new Error(`Item with SKU ${sku} not found`);

  const { store } = await bootstrapEventStore();
  const oldQty = item.quantity || 0;
  const delta = newQty - oldQty;

  store.append('inventory.adjusted.v1', {
    sku,
    oldQty,
    newQty,
    delta,
    reason,
    reference,
    actorId
  }, {
    key: `adjust-inventory-${sku}-${Date.now()}`,
    params: { sku, newQty, reason, reference, actorId },
    aggregate: { id: item.id, type: 'inventory-item' }
  });

  logger.info(`Inventory adjusted for ${sku}`, { 
    sku, oldQty, newQty, delta, reason, reference, actorId 
  });
}

// Batch inventory adjustments interface
export interface InventoryAdjustment {
  sku: string;
  oldQty: number;
  newQty: number;
  reason: string;
  reference?: string;
  actorId?: string;
}

export async function recordInventoryAdjustments(
  adjustments: InventoryAdjustment[]
): Promise<void> {
  const { store } = await bootstrapEventStore();
  
  for (const adjustment of adjustments) {
    const delta = adjustment.newQty - adjustment.oldQty;
    
    store.append('inventory.adjusted.v1', {
      sku: adjustment.sku,
      oldQty: adjustment.oldQty,
      newQty: adjustment.newQty,
      delta,
      reason: adjustment.reason,
      reference: adjustment.reference,
      actorId: adjustment.actorId
    }, {
      key: `adjust-inventory-${adjustment.sku}-${Date.now()}`,
      params: adjustment,
      aggregate: { id: `inv_${adjustment.sku}`, type: 'inventory-item' }
    });
    
    logger.info(`Inventory adjusted for ${adjustment.sku}`, { 
      sku: adjustment.sku, 
      oldQty: adjustment.oldQty, 
      newQty: adjustment.newQty, 
      delta, 
      reason: adjustment.reason 
    });
  }
}

export async function getInventoryCategoryById(id: string): Promise<InventoryCategory | null> {
  const map = await loadInventoryCategoriesMap();
  const state = map.get(id);
  if (!state || state.deleted) return null;
  
  return {
    id: state.id,
    name: state.name,
    ...(state.description && { description: state.description }),
    itemCount: state.itemCount,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    deleted: state.deleted
  };
}

export async function createInventoryCategory(name: string, description?: string): Promise<InventoryCategory> {
  const { store } = await bootstrapEventStore();
  const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const result = store.append('inventory.category.created.v1', {
    id,
    name: name.trim(),
    description: description?.trim()
  }, {
    key: `create-inventory-category-${id}`,
    params: { name, description },
    aggregate: { id, type: 'inventory-category' }
  });

  return {
    id,
    name: name.trim(),
    ...(description?.trim() && { description: description.trim() }),
    itemCount: 0,
    createdAt: result.event.at,
    updatedAt: result.event.at,
    deleted: false
  };
}

export async function updateInventoryCategory(id: string, name: string, description?: string): Promise<InventoryCategory | null> {
  const existing = await getInventoryCategoryById(id);
  if (!existing) return null;

  const { store } = await bootstrapEventStore();
  
  const result = store.append('inventory.category.updated.v1', {
    id,
    name: name.trim(),
    description: description?.trim(),
    updatedAt: Date.now()
  }, {
    key: `update-inventory-category-${id}-${Date.now()}`,
    params: { id, name, description },
    aggregate: { id, type: 'inventory-category' }
  });

  return {
    ...existing,
    name: name.trim(),
    ...(description !== undefined && { description: description.trim() }),
    updatedAt: result.event.at
  };
}

export async function deleteInventoryCategory(id: string): Promise<boolean> {
  const existing = await getInventoryCategoryById(id);
  if (!existing) return false;
  
  // Check if category has items
  if (existing.itemCount > 0) {
    throw new Error('Cannot delete category with items');
  }

  const { store } = await bootstrapEventStore();
  
  store.append('inventory.category.deleted.v1', {
    id,
    deletedAt: Date.now()
  }, {
    key: `delete-inventory-category-${id}`,
    params: { id },
    aggregate: { id, type: 'inventory-category' }
  });

  return true;
}

export async function createInventoryUnit(
  name: string, 
  abbreviation: string, 
  type: InventoryUnit['type'], 
  baseUnit?: string, 
  conversionFactor?: number
): Promise<InventoryUnit> {
  const { store } = await bootstrapEventStore();
  const id = `unit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const result = store.append('inventory.unit.created.v1', {
    id,
    name: name.trim(),
    abbreviation: abbreviation.trim(),
    type,
    baseUnit,
    conversionFactor
  }, {
    key: `create-inventory-unit-${id}`,
    params: { name, abbreviation, type, baseUnit, conversionFactor },
    aggregate: { id, type: 'inventory-unit' }
  });

  return {
    id,
    name: name.trim(),
    abbreviation: abbreviation.trim(),
    type,
    ...(baseUnit && { baseUnit }),
    ...(conversionFactor != null && { conversionFactor }),
    createdAt: result.event.at,
    updatedAt: result.event.at,
    deleted: false
  };
}

async function loadInventoryItemTypesMap(): Promise<Map<string, InventoryItemTypeState>> {
  const { store } = await bootstrapEventStore();
  const events = store.getAll();
  const map = new Map<string, InventoryItemTypeState>();

  for (const event of events) {
    if (event.type === 'inventory.item-type.created.v1' || event.type === 'inventory.item-type.created') {
      const payload = (event as any).payload;
      const state: InventoryItemTypeState = {
        id: payload.id,
        name: payload.name,
        ...(payload.description && { description: payload.description }),
        isActive: payload.isActive ?? true,
        itemCount: 0,
        createdAt: event.at,
        updatedAt: event.at,
        deleted: false
      };
      map.set(payload.id, state);
      continue;
    }

    if (event.type === 'inventory.item-type.updated.v1' || event.type === 'inventory.item-type.updated') {
      const payload = (event as any).payload;
      const existing = map.get(payload.id);
      if (existing && payload.changes) {
        if (payload.changes.name !== undefined) existing.name = payload.changes.name;
        if (payload.changes.description !== undefined) existing.description = payload.changes.description;
        if (payload.changes.isActive !== undefined) existing.isActive = payload.changes.isActive;
        existing.updatedAt = event.at;
      }
      continue;
    }

    if (event.type === 'inventory.item-type.deleted.v1' || event.type === 'inventory.item-type.deleted') {
      const payload = (event as any).payload;
      const existing = map.get(payload.id);
      if (existing) {
        existing.deleted = true;
        existing.updatedAt = event.at;
      }
      continue;
    }
  }

  // TODO: Count items for each item type
  
  return map;
}

// List inventory item types
export async function listInventoryItemTypes(): Promise<InventoryItemType[]> {
  const map = await loadInventoryItemTypesMap();
  return Array.from(map.values())
    .filter(itemType => !itemType.deleted)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createInventoryItemType(name: string, description?: string): Promise<InventoryItemType> {
  const { store } = await bootstrapEventStore();
  const id = `itemtype_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const payload = {
    id,
    name: name.trim(),
    description: description?.trim(),
    isActive: true,
    itemCount: 0,
  };
  
  const result = store.append('inventory.item-type.created.v1', payload, {
    key: `create-item-type-${id}`,
    params: { name, description },
    aggregate: { id, type: 'inventory-item-type' }
  });
  
  return {
    id,
    name: payload.name,
    ...(payload.description && { description: payload.description }),
    isActive: payload.isActive,
    itemCount: payload.itemCount,
    createdAt: result.event.at,
    updatedAt: result.event.at,
    deleted: false
  };
}

export async function updateInventoryItemType(id: string, name: string, description?: string, isActive?: boolean): Promise<InventoryItemType | null> {
  const { store } = await bootstrapEventStore();
  
  const payload = {
    id,
    changes: {
      name: name.trim(),
      description: description?.trim(),
      isActive,
      updatedAt: Date.now(),
    }
  };
  
  const result = store.append('inventory.item-type.updated.v1', payload, {
    key: `update-item-type-${id}-${Date.now()}`,
    params: { id, name, description, isActive },
    aggregate: { id, type: 'inventory-item-type' }
  });
  
  // Return updated item type (in a real implementation, you'd retrieve from the event store)
  return {
    id,
    name: payload.changes.name,
    ...(payload.changes.description && { description: payload.changes.description }),
    isActive: payload.changes.isActive ?? true,
    itemCount: 0,
    createdAt: Date.now() - 10000, // Simulated earlier creation
    updatedAt: result.event.at,
    deleted: false
  };
}

export async function getInventoryItemTypeById(id: string): Promise<InventoryItemType | null> {
  const map = await loadInventoryItemTypesMap();
  const state = map.get(id);
  if (!state || state.deleted) return null;
  
  return {
    id: state.id,
    name: state.name,
    ...(state.description && { description: state.description }),
    isActive: state.isActive,
    itemCount: state.itemCount,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    deleted: state.deleted
  };
}

export async function deleteInventoryItemType(id: string): Promise<boolean> {
  const existing = await getInventoryItemTypeById(id);
  if (!existing) return false;
  
  // Check if item type has items
  if (existing.itemCount > 0) {
    throw new Error('Cannot delete item type with items');
  }

  const { store } = await bootstrapEventStore();
  
  store.append('inventory.item-type.deleted.v1', {
    id,
    deletedAt: Date.now()
  }, {
    key: `delete-item-type-${id}`,
    params: { id },
    aggregate: { id, type: 'inventory-item-type' }
  });

  return true;
}

//=============================================================================
// INVENTORY COUNTS/AUDITS REPOSITORY FUNCTIONS
//=============================================================================

import type { 
  InventoryCount, 
  InventoryAudit, 
  CountItem, 
  AuditItem, 
  CreateCountRequest,
  CreateAuditRequest,
  CountsResponse,
  AuditsResponse,
  CountQuery,
  AuditQuery,
  UpdateCountItemRequest,
  UpdateAuditItemRequest,
} from './counts/types';

// Event types for audit operations
interface InventoryAuditCreatedEvent extends Event {
  type: 'inventory.audit.created.v1';
  payload: {
    auditId: string;
    branchId: string;
    scope: any;
    itemCount: number;
    createdBy: string;
  };
}

interface InventoryAuditUpdatedEvent extends Event {
  type: 'inventory.audit.updated.v1';
  payload: {
    auditId: string;
    itemsUpdated: Array<{
      itemId: string;
      auditedQty: number;
      previousAuditedQty: number | null;
      notes?: string;
    }>;
    updatedBy: string;
  };
}
interface InventoryAuditSubmittedEvent extends Event {
  type: 'inventory.audit.submitted.v1';
  payload: {
    auditId: string;
    branchId: string;
    adjustmentBatchId: string;
    totalVarianceValue: number;
    adjustmentCount: number;
    submittedBy: string;
  };
}

interface InventoryAuditState {
  id: string;
  branchId: string;
  status: 'draft' | 'open' | 'closed' | 'cancelled';
  createdBy: string;
  createdAt: number;
  closedBy?: string;
  closedAt?: number;
  scope: any;
  items: Map<string, AuditItemState>;
  totals: {
    varianceQty: number;
    varianceValue: number;
    itemsCountedCount: number;
    totalItemsCount: number;
    positiveVarianceValue: number;
    negativeVarianceValue: number;
  };
  metadata: {
    lastSavedAt?: number;
    submittedAt?: number;
    adjustmentBatchId?: string;
    notes?: string;
  };
  deleted: boolean;
}

interface AuditItemState {
  id: string;
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  categoryName?: string;
  snapshotQty: number;
  snapshotAvgCost: number;
  snapshotTimestamp: number;
  auditedQty: number | null;
  auditedBy?: string;
  auditedAt?: number;
  varianceQty: number;
  varianceValue: number;
  variancePercentage: number;
  notes?: string;
  lotNumber?: string;
  isActive: boolean;
  hasDiscrepancy: boolean;
}

async function loadInventoryAuditsMap(): Promise<Map<string, InventoryAuditState>> {
  const { store } = await bootstrapEventStore();
  const events = store.getAll();
  const map = new Map<string, InventoryAuditState>();
  const itemsMap = await loadInventoryItemsMap();

  for (const event of events) {
    if (event.type === 'inventory.audit.created.v1' || event.type === 'inventory.audit.created') {
      const payload = (event as any as InventoryAuditCreatedEvent).payload;
      
      // Generate audit items based on scope and current inventory
      const auditItems = new Map<string, AuditItemState>();
      const allItems = Array.from(itemsMap.values()).filter(item => !item.deleted);
      const scopedItems = filterItemsByAuditScope(allItems, payload.scope);
      
      for (const item of scopedItems) {
        const auditItem: AuditItemState = {
          id: `${payload.auditId}_${item.id}`,
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          unit: item.unit || 'ea',
          ...(item.category && { categoryName: item.category }),
          snapshotQty: item.quantity || 0,
          snapshotAvgCost: item.cost || 0,
          snapshotTimestamp: event.at,
          auditedQty: null,
          varianceQty: 0,
          varianceValue: 0,
          variancePercentage: 0,
          isActive: item.status === 'active',
          hasDiscrepancy: false,
        };
        auditItems.set(item.id, auditItem);
      }
      
      const state: InventoryAuditState = {
        id: payload.auditId,
        branchId: payload.branchId,
        status: 'draft',
        createdBy: payload.createdBy,
        createdAt: event.at,
        scope: payload.scope,
        items: auditItems,
        totals: {
          varianceQty: 0,
          varianceValue: 0,
          itemsCountedCount: 0,
          totalItemsCount: auditItems.size,
          positiveVarianceValue: 0,
          negativeVarianceValue: 0,
        },
        metadata: {},
        deleted: false
      };
      map.set(payload.auditId, state);
      continue;
    }

    if (event.type === 'inventory.audit.updated.v1' || event.type === 'inventory.audit.updated') {
      const payload = (event as any as InventoryAuditUpdatedEvent).payload;
      const audit = map.get(payload.auditId);
      if (!audit) continue;
      
      // Update items and recalculate totals
      for (const update of payload.itemsUpdated) {
        const item = audit.items.get(update.itemId);
        if (item) {
          item.auditedQty = update.auditedQty;
          item.auditedBy = payload.updatedBy;
          item.auditedAt = event.at;
          if (update.notes !== undefined) {
            item.notes = update.notes;
          }

          // Recalculate variances
          const varianceQty = update.auditedQty - item.snapshotQty;
          const varianceValue = varianceQty * item.snapshotAvgCost;
          const variancePercentage = item.snapshotQty === 0
            ? (update.auditedQty > 0 ? 100 : 0)
            : ((update.auditedQty - item.snapshotQty) / item.snapshotQty) * 100;

          item.varianceQty = Math.round(varianceQty * 100) / 100;
          item.varianceValue = Math.round(varianceValue * 100) / 100;
          item.variancePercentage = Math.round(variancePercentage * 100) / 100;
          item.hasDiscrepancy = Math.abs(variancePercentage) > 10;
        }
      }
      
      // Recalculate totals
      recalculateAuditTotals(audit);
      audit.metadata.lastSavedAt = event.at;
      continue;
    }

    if (event.type === 'inventory.audit.submitted.v1' || event.type === 'inventory.audit.submitted') {
      const payload = (event as any as InventoryAuditSubmittedEvent).payload;
      const audit = map.get(payload.auditId);
      if (!audit) continue;
      
      audit.status = 'closed';
      audit.closedAt = event.at;
      audit.metadata.submittedAt = event.at;
      audit.metadata.adjustmentBatchId = payload.adjustmentBatchId;
      continue;
    }
  }

  return map;
}

function filterItemsByAuditScope(items: InventoryItemState[], scope: any): InventoryItemState[] {
  const includeInactive = Boolean(scope?.filters?.includeInactive);
  const baseItems = includeInactive
    ? items
    : items.filter(item => item.status === 'active');

  if (!scope || scope.all) {
    return baseItems;
  }

  let filtered = baseItems;

  if (scope.byCategory && Array.isArray(scope.filters?.categoryIds) && scope.filters.categoryIds.length > 0) {
    filtered = filtered.filter(item => item.categoryId && scope.filters.categoryIds.includes(item.categoryId));
  }

  if (scope.byItemType && Array.isArray(scope.filters?.itemTypeIds) && scope.filters.itemTypeIds.length > 0) {
    filtered = filtered.filter(item => item.itemTypeId && scope.filters.itemTypeIds.includes(item.itemTypeId));
  }

  return filtered;
}
function recalculateAuditTotals(audit: InventoryAuditState): void {
  let varianceQty = 0;
  let varianceValue = 0;
  let itemsCountedCount = 0;
  let positiveVarianceValue = 0;
  let negativeVarianceValue = 0;

  for (const item of audit.items.values()) {
    if (item.auditedQty !== null) {
      itemsCountedCount++;
      varianceQty += item.varianceQty;
      varianceValue += item.varianceValue;
      
      if (item.varianceValue > 0) {
        positiveVarianceValue += item.varianceValue;
      } else {
        negativeVarianceValue += Math.abs(item.varianceValue);
      }
    }
  }

  audit.totals = {
    varianceQty,
    varianceValue,
    itemsCountedCount,
    totalItemsCount: audit.items.size,
    positiveVarianceValue,
    negativeVarianceValue,
  };
}

export async function createInventoryAudit(request: CreateAuditRequest): Promise<InventoryAudit> {
  const { store } = await bootstrapEventStore();
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  // Get inventory items based on scope to calculate item count
  const allItems = await listInventoryItems();
  const scopedItems = filterItemsByAuditScope(allItems as InventoryItemState[], request.scope ?? { all: true });
  
  const payload = {
    auditId,
    branchId: request.branchId,
    scope: request.scope,
    itemCount: scopedItems.length,
    createdBy: 'dev-admin', // TODO: get from auth context
  };
  
  const result = store.append('inventory.audit.created.v1', payload, {
    key: `create-audit-${auditId}`,
    params: request,
    aggregate: { id: auditId, type: 'inventory-audit' }
  });

  return {
    id: auditId,
    branchId: request.branchId,
    status: 'draft',
    createdBy: payload.createdBy,
    createdAt: new Date(result.event.at).toISOString(),
    scope: request.scope,
    totals: {
      varianceQty: 0,
      varianceValue: 0,
      itemsCountedCount: 0,
      totalItemsCount: scopedItems.length,
      positiveVarianceValue: 0,
      negativeVarianceValue: 0,
    },
    metadata: {
      ...(request.notes && { notes: request.notes }),
      ...(request.estimatedDurationMinutes != null && { estimatedDurationMinutes: request.estimatedDurationMinutes }),
    }
  };
}

// Legacy alias for backward compatibility
export async function createInventoryCount(request: CreateCountRequest): Promise<InventoryCount> {
  return await createInventoryAudit(request);
}

export async function getInventoryAuditById(auditId: string): Promise<{ count: InventoryAudit; items: AuditItem[] } | null> {
  const auditsMap = await loadInventoryAuditsMap();
  const audit = auditsMap.get(auditId);
  
  if (!audit || audit.deleted) {
    return null;
  }

  const auditItems = Array.from(audit.items.values()).map(item => ({
    id: item.id,
    itemId: item.itemId,
    sku: item.sku,
    name: item.name,
    unit: item.unit,
    ...(item.categoryName && { categoryName: item.categoryName }),
    snapshotQty: item.snapshotQty,
    snapshotAvgCost: item.snapshotAvgCost,
    snapshotTimestamp: new Date(item.snapshotTimestamp).toISOString(),
    auditedQty: item.auditedQty,
    countedQty: item.auditedQty, // Legacy compatibility
    ...(item.auditedBy && { auditedBy: item.auditedBy }),
    ...(item.auditedAt && { auditedAt: new Date(item.auditedAt).toISOString() }),
    ...(item.auditedBy && { countedBy: item.auditedBy }), // Legacy compatibility
    ...(item.auditedAt && { countedAt: new Date(item.auditedAt).toISOString() }),
    varianceQty: item.varianceQty,
    varianceValue: item.varianceValue,
    variancePercentage: item.variancePercentage,
    ...(item.notes && { notes: item.notes }),
    ...(item.lotNumber && { lotNumber: item.lotNumber }),
    isActive: item.isActive,
    hasDiscrepancy: item.hasDiscrepancy,
  }));

  const auditData: InventoryAudit = {
    id: audit.id,
    branchId: audit.branchId,
    status: audit.status,
    createdBy: audit.createdBy,
    createdAt: new Date(audit.createdAt).toISOString(),
    ...(audit.closedBy && { closedBy: audit.closedBy }),
    ...(audit.closedAt && { closedAt: new Date(audit.closedAt).toISOString() }),
    scope: audit.scope,
    totals: audit.totals,
    metadata: {
      ...(audit.metadata.lastSavedAt && { lastSavedAt: new Date(audit.metadata.lastSavedAt).toISOString() }),
      ...(audit.metadata.submittedAt && { submittedAt: new Date(audit.metadata.submittedAt).toISOString() }),
      ...(audit.metadata.adjustmentBatchId && { adjustmentBatchId: audit.metadata.adjustmentBatchId }),
      ...(audit.metadata.notes && { notes: audit.metadata.notes }),
    }
  };

  return {
    count: auditData,
    items: auditItems
  };
}

// Legacy alias for backward compatibility
export async function getInventoryCountById(countId: string): Promise<{ count: InventoryCount; items: CountItem[] } | null> {
  return await getInventoryAuditById(countId);
}

export async function listInventoryAudits(query: AuditQuery = {}): Promise<AuditsResponse> {
  const auditsMap = await loadInventoryAuditsMap();
  let audits = Array.from(auditsMap.values()).filter(audit => !audit.deleted);
  
  // Apply filters
  if (query.branchId) {
    audits = audits.filter(audit => audit.branchId === query.branchId);
  }
  
  if (query.status) {
    const statuses = Array.isArray(query.status) ? query.status : [query.status];
    audits = audits.filter(audit => statuses.includes(audit.status));
  }
  
  if (query.createdBy) {
    audits = audits.filter(audit => audit.createdBy === query.createdBy);
  }

  // Convert to response format
  const auditData: InventoryAudit[] = audits.map(audit => ({
    id: audit.id,
    branchId: audit.branchId,
    status: audit.status,
    createdBy: audit.createdBy,
    createdAt: new Date(audit.createdAt).toISOString(),
    ...(audit.closedBy && { closedBy: audit.closedBy }),
    ...(audit.closedAt && { closedAt: new Date(audit.closedAt).toISOString() }),
    scope: audit.scope,
    totals: audit.totals,
    metadata: {
      ...(audit.metadata.lastSavedAt && { lastSavedAt: new Date(audit.metadata.lastSavedAt).toISOString() }),
      ...(audit.metadata.submittedAt && { submittedAt: new Date(audit.metadata.submittedAt).toISOString() }),
      ...(audit.metadata.adjustmentBatchId && { adjustmentBatchId: audit.metadata.adjustmentBatchId }),
      ...(audit.metadata.notes && { notes: audit.metadata.notes }),
    }
  }));

  // Pagination
  const page = query.page || 1;
  const pageSize = Math.min(query.pageSize || 25, 100);
  const offset = (page - 1) * pageSize;
  const paginatedData = auditData.slice(offset, offset + pageSize);

  return {
    data: paginatedData,
    total: auditData.length,
    page,
    pageSize,
    hasMore: offset + pageSize < auditData.length
  };
}

// Legacy alias for backward compatibility  
export async function listInventoryCounts(query: CountQuery = {}): Promise<CountsResponse> {
  const result = await listInventoryAudits(query);
  return {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.hasMore
  };
}

export async function updateInventoryAuditItems(
  auditId: string, 
  updates: UpdateAuditItemRequest[]
): Promise<void> {
  if (!updates.length) {
    return;
  }

  const { store } = await bootstrapEventStore();
  const auditsMap = await loadInventoryAuditsMap();
  const audit = auditsMap.get(auditId);

  if (!audit || audit.deleted) {
    throw new Error(`Inventory audit ${auditId} not found`);
  }

  const itemsUpdated: Array<{ itemId: string; auditedQty: number; previousAuditedQty: number | null; notes?: string }> = [];

  for (const update of updates) {
    const item = audit.items.get(update.itemId);
    if (!item) {
      logger.warn('Attempted to update audit item that does not exist in audit', { auditId, itemId: update.itemId });
      continue;
    }

    itemsUpdated.push({
      itemId: update.itemId,
      auditedQty: update.auditedQty,
      previousAuditedQty: item.auditedQty ?? null,
      ...(update.notes !== undefined ? { notes: update.notes } : {})
    });
  }

  if (!itemsUpdated.length) {
    return;
  }

  const payload = {
    auditId,
    itemsUpdated,
    updatedBy: 'dev-admin', // TODO: get from auth context
  };

  store.append('inventory.audit.updated.v1', payload, {
    key: `update-audit-items-${auditId}-${Date.now()}`,
    params: { auditId, updates },
    aggregate: { id: auditId, type: 'inventory-audit' }
  });

  logger.info(`Updated ${itemsUpdated.length} audit items`, { auditId, itemCount: itemsUpdated.length });
}

// Legacy alias for backward compatibility
export async function updateInventoryCountItems(
  countId: string, 
  updates: UpdateCountItemRequest[]
): Promise<void> {
  const auditUpdates: UpdateAuditItemRequest[] = updates.map(update => ({
    itemId: update.itemId,
    auditedQty: update.countedQty || update.auditedQty || 0,
    ...(update.notes && { notes: update.notes }),
  }));
  
  await updateInventoryAuditItems(countId, auditUpdates);
}

//=============================================================================
// STORAGE AREAS/LOCATIONS REPOSITORY FUNCTIONS
//=============================================================================

export interface StorageArea {
  id: string;
  name: string;
  type: 'dry-storage' | 'cold-storage' | 'freezer' | 'prep-area' | 'bar' | 'office' | 'other';
  description?: string;
  branchId?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export async function listStorageAreas(): Promise<StorageArea[]> {
  // Default storage areas for the system
  const defaultAreas: StorageArea[] = [
    {
      id: 'dry-storage',
      name: 'Dry Storage',
      type: 'dry-storage',
      description: 'Room temperature storage for dry goods',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'walk-in-cooler',
      name: 'Walk-in Cooler',
      type: 'cold-storage',
      description: 'Refrigerated storage area',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'freezer',
      name: 'Freezer',
      type: 'freezer',
      description: 'Frozen storage area',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'prep-kitchen',
      name: 'Prep Kitchen',
      type: 'prep-area',
      description: 'Kitchen preparation area',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'bar-storage',
      name: 'Bar Storage',
      type: 'bar',
      description: 'Bar and beverage storage area',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'back-office',
      name: 'Back Office',
      type: 'office',
      description: 'Administrative storage area',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  ];
  
  return defaultAreas;
}







