# Migration Guide: useApi → Typed Repositories

## Overview

This guide outlines the systematic migration from raw `useApi` hooks to typed, event-store-backed repositories for better offline-first functionality and type safety.

## Migration Pattern

### Before (useApi Pattern)
```typescript
// ❌ Old Pattern - Direct API calls
import { useApi, apiPost, apiPatch, apiDelete } from '../hooks/useApi';

const { data, loading, error, refetch } = useApi<ResponseType>('/api/endpoint');

// Manual mutation with error handling
const handleCreate = async (input) => {
  try {
    await apiPost('/api/endpoint', input);
    refetch();
    showToast({ title: 'Success' });
  } catch (error) {
    showToast({ title: 'Error', description: error.message });
  }
};
```

### After (Repository Pattern)
```typescript
// ✅ New Pattern - Typed repositories
import { useRepository, useRepositoryMutation } from '../hooks/useRepository';
import { listItems, createItem, updateItem, deleteItem } from '../repositories/itemRepository';

// Type-safe data fetching
const { data, loading, error, refetch } = useRepository(listItems, []);

// Type-safe mutations
const createMutation = useRepositoryMutation(createItem);

const handleCreate = async (input: CreateItemInput) => {
  try {
    await createMutation.mutate(input);
    refetch();
    showToast({ title: 'Success' });
  } catch (error) {
    showToast({ title: 'Error', description: error.message });
  }
};
```

## Repository Template

### 1. Create Repository Interface
```typescript
// src/domain/items/repository.ts
import { bootstrapEventStore } from '../../bootstrap/persist';
import type { Event } from '../../events/types';

export interface Item {
  id: string;
  name: string;
  // ... other fields
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

// Event types
interface ItemCreatedEvent extends Event {
  type: 'item.created';
  payload: {
    id: string;
    name: string;
    // ... creation fields
  };
}
```

### 2. Implement Event Sourcing Logic
```typescript
async function loadItemMap(): Promise<Map<string, Item>> {
  const { store } = await bootstrapEventStore();
  const events = store.getAll();
  const map = new Map<string, Item>();

  for (const event of events) {
    if (event.type === 'item.created') {
      const payload = (event as ItemCreatedEvent).payload;
      // Create item state from event
      const item: Item = {
        id: payload.id,
        name: payload.name,
        createdAt: event.at,
        updatedAt: event.at,
        deleted: false
      };
      map.set(payload.id, item);
    }
    // Handle other event types...
  }

  return map;
}
```

### 3. Implement Repository Operations
```typescript
export async function listItems(): Promise<Item[]> {
  const map = await loadItemMap();
  return Array.from(map.values())
    .filter(item => !item.deleted)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  const { store } = await bootstrapEventStore();
  const id = `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const result = store.append('item.created', {
    id,
    ...input
  }, {
    key: `create-item-${id}`,
    params: input,
    aggregate: { id, type: 'item' }
  });

  return {
    id,
    ...input,
    createdAt: result.event.at,
    updatedAt: result.event.at,
    deleted: false
  };
}
```

## Migration Checklist by File

### High Priority (Core Business Logic)
- [ ] `src/pages/Customers.tsx` - ✅ Already has repository
- [x] `src/pages/menu/Categories.tsx` - ✅ COMPLETED
- [ ] `src/pages/menu/Items.tsx` - Has repository, needs hook migration
- [ ] `src/pages/inventory/Items.tsx` - Needs full repository
- [ ] `src/pages/manage/Users.tsx` - Needs repository
- [ ] `src/pages/manage/Branches.tsx` - Needs repository

### Medium Priority (Management Features)  
- [ ] `src/pages/inventory/Counts.tsx`
- [ ] `src/pages/inventory/Transfers.tsx`
- [ ] `src/pages/manage/Roles.tsx`
- [ ] `src/components/MenuManagement.tsx`
- [ ] `src/components/CategoryManagement.tsx`
- [ ] `src/components/RecipeManagement.tsx`

### Lower Priority (Reports & Settings)
- [ ] `src/pages/reports/InventoryReports.tsx`
- [ ] `src/pages/reports/TransfersReport.tsx`
- [ ] `src/pages/settings/ItemTypes.tsx`
- [ ] `src/pages/account/PreferencesPage.tsx`

### Components
- [ ] `src/components/inventory/InventoryItemCreateModal.tsx`
- [ ] `src/components/menu/CategoryCreateModal.tsx`
- [ ] `src/components/inventory/counts/NewCountWizard.tsx`

## Migration Steps per File

### Step 1: Identify Data Patterns
```bash
# Find useApi usage in target file
grep -n "useApi\|apiPost\|apiPatch\|apiDelete" src/pages/target-file.tsx
```

### Step 2: Create/Verify Repository
- Check if repository exists in domain folder
- If not, create using template above
- Ensure event types are properly defined

### Step 3: Update Imports
```typescript
// Remove
import { useApi, apiPost, apiPatch } from '../hooks/useApi';

// Add
import { useRepository, useRepositoryMutation } from '../hooks/useRepository';
import { listItems, createItem, updateItem } from '../domain/items/repository';
```

### Step 4: Replace Data Fetching
```typescript
// Replace useApi calls
const { data, loading, error, refetch } = useRepository(listItems, []);

// Add mutations as needed
const createMutation = useRepositoryMutation(createItem);
const updateMutation = useRepositoryMutation(updateItem);
const deleteMutation = useRepositoryMutation(deleteItem);
```

### Step 5: Update Event Handlers
```typescript
// Replace manual API calls with mutations
const handleCreate = async (input: CreateInput) => {
  try {
    await createMutation.mutate(input);
    refetch();
    showToast({ title: 'Success' });
  } catch (error) {
    showToast({ title: 'Error', description: error.message });
  }
};
```

### Step 6: Test & Verify
- Ensure data loads correctly
- Verify mutations work
- Check offline functionality
- Confirm type safety

## Benefits of Migration

### Developer Experience
- ✅ **Full Type Safety**: No more `any` types or runtime errors
- ✅ **IntelliSense**: Autocomplete for all operations
- ✅ **Compile-time Validation**: Catch errors before runtime
- ✅ **Consistent Patterns**: Same approach across all features

### Offline-First Functionality  
- ✅ **Local-First Writes**: Immediate UI updates
- ✅ **Automatic Sync**: Background upload when online
- ✅ **Conflict Resolution**: Built-in event ordering
- ✅ **Durable Storage**: PouchDB/IndexedDB persistence

### Performance
- ✅ **Optimized Queries**: Event store indexing and caching
- ✅ **Reduced Network**: Only sync when necessary
- ✅ **Better UX**: No loading states for cached data
- ✅ **Efficient Updates**: Event-based state updates

## Testing Migration

### Unit Tests
```typescript
describe('ItemRepository', () => {
  it('should create item and emit event', async () => {
    const input = { name: 'Test Item' };
    const result = await createItem(input);
    
    expect(result.name).toBe('Test Item');
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
  });
});
```

### Integration Tests
```typescript
describe('ItemsPage', () => {
  it('should load items from repository', async () => {
    render(<ItemsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
  });
});
```

## Common Pitfalls

### 1. Event Type Definitions
```typescript
// ❌ Wrong - Generic event type
interface ItemEvent extends Event {
  payload: any; // Too generic
}

// ✅ Correct - Specific payload type
interface ItemCreatedEvent extends Event {
  type: 'item.created';
  payload: {
    id: string;
    name: string;
    categoryId: string;
  };
}
```

### 2. State Management
```typescript
// ❌ Wrong - Mutating existing state
const existing = map.get(id);
existing.name = newName; // Mutates cached state

// ✅ Correct - Creating new state
const existing = map.get(id);
const updated = { ...existing, name: newName, updatedAt: Date.now() };
map.set(id, updated);
```

### 3. Error Handling
```typescript
// ❌ Wrong - Swallowing errors
try {
  await mutation.mutate(input);
} catch (error) {
  // Silent failure
}

// ✅ Correct - Proper error handling
try {
  await mutation.mutate(input);
  refetch();
  showToast({ title: 'Success' });
} catch (error) {
  showToast({ 
    title: 'Error', 
    description: error.message,
    variant: 'error' 
  });
}
```

## Next Steps

1. **Complete High Priority** - Focus on core business logic first
2. **Add Event Types** - Ensure all domain events are properly typed
3. **Test Coverage** - Add tests for each migrated repository
4. **Remove useApi** - Delete old useApi hook when migration complete
5. **Documentation** - Update component documentation with new patterns

The goal is to have zero `useApi` usage and complete offline-first functionality across the application.
