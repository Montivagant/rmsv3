import { bootstrapEventStore } from '../../bootstrap/persist';
import { stableHash } from '../../events/hash';
import { logger } from '../../shared/logger';
import type { VersionedEvent } from '../../events/validation';

//=============================================================================
// MENU MODIFIERS REPOSITORY FUNCTIONS
//=============================================================================

export interface ModifierOption {
  id: string;
  name: string;
  priceAdjustment: number;
  isDefault?: boolean;
  isActive: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  description: string;
  type: 'single' | 'multiple';
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  isActive: boolean;
  options: ModifierOption[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateModifierGroupRequest {
  name: string;
  description?: string;
  type: 'single' | 'multiple';
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder?: number;
  options: Omit<ModifierOption, 'id'>[];
}

export interface UpdateModifierGroupRequest {
  name?: string;
  description?: string;
  type?: 'single' | 'multiple';
  isRequired?: boolean;
  minSelections?: number;
  maxSelections?: number;
  displayOrder?: number;
  isActive?: boolean;
  options?: Omit<ModifierOption, 'id'>[];
}

// Event types for modifier operations
interface ModifierGroupCreatedEvent extends VersionedEvent {
  type: 'modifier-group.created.v1';
  payload: {
    id: string;
    name: string;
    description?: string;
    type: 'single' | 'multiple';
    isRequired: boolean;
    minSelections: number;
    maxSelections: number;
    displayOrder: number;
    options: ModifierOption[];
  };
}

interface ModifierGroupUpdatedEvent extends VersionedEvent {
  type: 'modifier-group.updated.v1';
  payload: {
    id: string;
    changes: Partial<{
      name: string;
      description?: string;
      type: 'single' | 'multiple';
      isRequired: boolean;
      minSelections: number;
      maxSelections: number;
      displayOrder: number;
      isActive: boolean;
      options: ModifierOption[];
    }>;
  };
}

interface ModifierGroupDeletedEvent extends VersionedEvent {
  type: 'modifier-group.deleted.v1';
  payload: {
    id: string;
    reason?: string;
  };
}

interface ModifierGroupState {
  id: string;
  name: string;
  description?: string;
  type: 'single' | 'multiple';
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  isActive: boolean;
  options: ModifierOption[];
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

async function loadModifierGroupsMap(): Promise<Map<string, ModifierGroupState>> {
  const { store } = await bootstrapEventStore();
  const events = store.getAll();
  const map = new Map<string, ModifierGroupState>();

  for (const event of events) {
    if (event.type === 'modifier-group.created.v1' || event.type === 'modifier-group.created') {
      const payload = (event as ModifierGroupCreatedEvent).payload;
      const state: ModifierGroupState = {
        id: payload.id,
        name: payload.name,
        description: payload.description || '',
        type: payload.type,
        isRequired: payload.isRequired,
        minSelections: payload.minSelections,
        maxSelections: payload.maxSelections,
        displayOrder: payload.displayOrder,
        isActive: true,
        options: payload.options,
        createdAt: event.at,
        updatedAt: event.at,
        deleted: false
      };
      map.set(payload.id, state);
      continue;
    }

    if (event.type === 'modifier-group.updated.v1' || event.type === 'modifier-group.updated') {
      const payload = (event as ModifierGroupUpdatedEvent).payload;
      const group = map.get(payload.id);
      if (!group) continue;
      
      Object.assign(group, payload.changes);
      group.updatedAt = event.at;
      continue;
    }

    if (event.type === 'modifier-group.deleted.v1' || event.type === 'modifier-group.deleted') {
      const payload = (event as ModifierGroupDeletedEvent).payload;
      const group = map.get(payload.id);
      if (!group) continue;
      
      group.deleted = true;
      group.updatedAt = event.at;
      continue;
    }
  }

  return map;
}

export async function listModifierGroups(): Promise<ModifierGroup[]> {
  const groupsMap = await loadModifierGroupsMap();
  const groups = Array.from(groupsMap.values())
    .filter(group => !group.deleted)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Return empty array if no groups exist (data should be seeded via script)

  return groups.map(group => ({
    id: group.id,
    name: group.name,
    description: group.description || '',
    type: group.type,
    isRequired: group.isRequired,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    displayOrder: group.displayOrder,
    isActive: group.isActive,
    options: group.options,
    createdAt: new Date(group.createdAt).toISOString(),
    updatedAt: new Date(group.updatedAt).toISOString(),
  }));
}

export async function createModifierGroup(request: CreateModifierGroupRequest): Promise<ModifierGroup> {
  const { store } = await bootstrapEventStore();
  const id = `mod_grp_${stableHash(request.name)}_${Date.now()}`;
  
  // Generate IDs for options
  const options: ModifierOption[] = request.options.map((opt, index) => ({
    ...opt,
    id: `opt_${id}_${index}`,
  }));
  
  const payload = {
    id,
    name: request.name.trim(),
    description: request.description?.trim(),
    type: request.type,
    isRequired: request.isRequired,
    minSelections: request.minSelections,
    maxSelections: request.maxSelections,
    displayOrder: request.displayOrder || 0,
    options,
  };
  
  const result = store.append('modifier-group.created.v1', payload, {
    key: `create-modifier-group-${id}`,
    params: request,
    aggregate: { id, type: 'modifier-group' }
  });

  logger.info('Created modifier group', { id, name: request.name });

  return {
    id,
    name: payload.name,
    description: payload.description || '',
    type: payload.type,
    isRequired: payload.isRequired,
    minSelections: payload.minSelections,
    maxSelections: payload.maxSelections,
    displayOrder: payload.displayOrder,
    isActive: true,
    options: payload.options,
    createdAt: new Date(result.event.at).toISOString(),
    updatedAt: new Date(result.event.at).toISOString(),
  };
}

export async function updateModifierGroup(id: string, request: UpdateModifierGroupRequest): Promise<ModifierGroup | null> {
  const { store } = await bootstrapEventStore();
  const groupsMap = await loadModifierGroupsMap();
  const existingGroup = groupsMap.get(id);
  
  if (!existingGroup || existingGroup.deleted) {
    throw new Error('Modifier group not found');
  }

  // Generate IDs for new options if provided
  let options = request.options;
  if (options) {
    options = options.map((opt, index) => ({
      ...opt,
      id: `opt_${id}_${index}_${Date.now()}`,
    })) as ModifierOption[];
  }

  const changes = {
    ...request,
    options,
  };

  const result = store.append('modifier-group.updated.v1', {
    id,
    changes,
  }, {
    key: `update-modifier-group-${id}-${Date.now()}`,
    params: { id, request },
    aggregate: { id, type: 'modifier-group' }
  });

  logger.info('Updated modifier group', { id });

  // Return the updated group
  const updatedGroup = { ...existingGroup, ...changes, updatedAt: result.event.at };
  
  return {
    id: updatedGroup.id,
    name: updatedGroup.name,
    description: updatedGroup.description || '',
    type: updatedGroup.type,
    isRequired: updatedGroup.isRequired,
    minSelections: updatedGroup.minSelections,
    maxSelections: updatedGroup.maxSelections,
    displayOrder: updatedGroup.displayOrder,
    isActive: updatedGroup.isActive,
    options: (updatedGroup.options as ModifierOption[]) || [],
    createdAt: new Date(updatedGroup.createdAt).toISOString(),
    updatedAt: new Date(updatedGroup.updatedAt).toISOString(),
  };
}

export async function deleteModifierGroup(id: string, reason?: string): Promise<boolean> {
  const { store } = await bootstrapEventStore();
  
  store.append('modifier-group.deleted.v1', {
    id,
    reason,
  }, {
    key: `delete-modifier-group-${id}`,
    params: { id, reason },
    aggregate: { id, type: 'modifier-group' }
  });

  logger.info('Deleted modifier group', { id, reason });
  return true;
}

