/**
 * Category Management Service
 * 
 * Handles all category operations including CRUD, hierarchy management,
 * validation, and business rule enforcement for restaurant inventory categories.
 */

import { getCurrentUser } from '../../rbac/roles';
import type { EventStore } from '../../events/types';
import { generateEventId } from '../../events/hash';
import type {
  InventoryCategory,
  CategoryHierarchy,
  CategoryPath,
  CategoryCreatedEvent,
  CategoryUpdatedEvent,
  CategoryValidationResult,
  CategoryCreateInput,
  CategoryUpdateInput,
  CategoryQuery,
  CategoryStats,
} from './types';
export type { CategoryHierarchy } from './types';

class CategoryService {
  private eventStore: EventStore;
  
  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
  }

  // Create a new category
  async createCategory(input: CategoryCreateInput): Promise<string> {
    const validation = this.validateCategoryInput(input);
    if (!validation.isValid) {
      throw new Error(`Category validation failed: ${validation.errors.join(', ')}`);
    }

    const categoryId = generateEventId();
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    const parentCategory = input.parentId ? await this.getCategoryById(input.parentId) : null;
    
    // Calculate path and level
    const path = parentCategory 
      ? `${parentCategory.path}/${input.name}`
      : input.name;
    const level = parentCategory ? parentCategory.level + 1 : 0;

    // Check for name conflicts at the same level
    const siblings = await this.getCategoriesByParent(input.parentId);
    const nameExists = siblings.some(cat => 
      cat.name.toLowerCase() === input.name.toLowerCase() && cat.isActive
    );
    
    if (nameExists) {
      throw new Error(`A category named "${input.name}" already exists at this level`);
    }

    const payload: CategoryCreatedEvent['payload'] = {
      categoryId,
      name: input.name.trim(),
      ...(input.parentId !== undefined && { parentId: input.parentId }),
      path,
      level,
      sortOrder: input.sortOrder ?? this.getNextSortOrder(siblings),
      rules: input.rules,
      createdBy: currentUser.id,
    };
    if (input.description) {
      payload.description = input.description.trim();
    }
    if (input.parentId) {
      payload.parentId = input.parentId;
    }

    const event: CategoryCreatedEvent = {
      type: 'inventory.category.created',
      payload,
      timestamp: new Date().toISOString(),
      aggregateId: categoryId
    };

    await this.eventStore.append(event.type, event.payload, {
      key: `category-created-${categoryId}`,
      aggregate: { id: categoryId, type: 'category' }
    });

    return categoryId;
  }

  // Update an existing category
  async updateCategory(categoryId: string, input: CategoryUpdateInput): Promise<void> {
    const existingCategory = await this.getCategoryById(categoryId);
    if (!existingCategory) {
      throw new Error(`Category ${categoryId} not found`);
    }

    if (!existingCategory.isActive) {
      throw new Error('Cannot update archived category');
    }

    // Validate the update
    const validation = this.validateCategoryUpdate(categoryId, input);
    if (!validation.isValid) {
      throw new Error(`Category validation failed: ${validation.errors.join(', ')}`);
    }

    // Check for circular references if changing parent
    if (input.parentId && input.parentId !== existingCategory.parentId) {
      const wouldCreateCircle = await this.wouldCreateCircularReference(categoryId, input.parentId);
      if (wouldCreateCircle) {
        throw new Error('Cannot set parent: would create circular reference');
      }
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    const event: CategoryUpdatedEvent = {
      type: 'inventory.category.updated',
      payload: {
        categoryId,
        changes: input,
        updatedBy: currentUser.id
      },
      timestamp: new Date().toISOString(),
      aggregateId: categoryId
    };

    await this.eventStore.append(event.type, event.payload, {
      key: `category-updated-${categoryId}`,
      aggregate: { id: categoryId, type: 'category' }
    });

    // If parent changed, update paths for all descendants
    if (input.parentId !== undefined && input.parentId !== existingCategory.parentId) {
      await this.updateDescendantPaths(categoryId);
    }
  }

  // Archive a category (soft delete)
  async archiveCategory(categoryId: string, reason?: string): Promise<void> {
    const category = await this.getCategoryById(categoryId);
    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    if (!category.isActive) {
      throw new Error('Category is already archived');
    }

    // Check if category has active children
    const children = await this.getCategoriesByParent(categoryId);
    const activeChildren = children.filter(child => child.isActive);
    if (activeChildren.length > 0) {
      throw new Error('Cannot archive category with active subcategories');
    }

    // Check if category has inventory items (would need integration with item service)
    // This would be implemented when we add the item service

    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    const event = {
      type: 'inventory.category.archived',
      payload: {
        categoryId,
        archivedBy: currentUser.id,
        reason
      },
      timestamp: new Date().toISOString(),
      aggregateId: categoryId
    };

    await this.eventStore.append(event.type, event.payload, {
      key: `category-archived-${categoryId}`,
      aggregate: { id: categoryId, type: 'category' }
    });
  }

  // Get category by ID
  async getCategoryById(_categoryId: string): Promise<InventoryCategory | null> {
    const events = this.eventStore.getEventsForAggregate(_categoryId);
    return this.buildCategoryFromEvents(events);
  }

  // Get categories by parent
  async getCategoriesByParent(parentId?: string): Promise<InventoryCategory[]> {
    const allCategories = await this.getAllCategories();
    return allCategories.filter(cat => cat.parentId === parentId);
  }

  // Get all categories
  async getAllCategories(query: CategoryQuery = {}): Promise<InventoryCategory[]> {
    const createdEvents = this.eventStore.query({ type: 'inventory.category.created' });
    const updatedEvents = this.eventStore.query({ type: 'inventory.category.updated' });
    const archivedEvents = this.eventStore.query({ type: 'inventory.category.archived' });
    const allEvents = [...createdEvents, ...updatedEvents, ...archivedEvents];

    // Group events by category ID
    const categoryEvents = new Map<string, any[]>();
    for (const event of allEvents) {
      const categoryId = event.aggregate?.id;
      if (!categoryId) continue;
      if (!categoryEvents.has(categoryId)) {
        categoryEvents.set(categoryId, []);
      }
      categoryEvents.get(categoryId)!.push(event);
    }

    // Build categories from events
    const categories: InventoryCategory[] = [];
    for (const [, events] of categoryEvents) {
      const category = this.buildCategoryFromEvents(events);
      if (category) {
        categories.push(category);
      }
    }

    // Apply filters
    return this.filterCategories(categories, query);
  }

  // Get category hierarchy
  async getCategoryHierarchy(rootId?: string): Promise<CategoryHierarchy[]> {
    const allCategories = await this.getAllCategories({ isActive: true });
    return this.buildHierarchy(allCategories, rootId);
  }

  // Get category path (breadcrumb)
  async getCategoryPath(categoryId: string): Promise<CategoryPath[]> {
    const category = await this.getCategoryById(categoryId);
    if (!category) return [];

    const path: CategoryPath[] = [];
    let current: InventoryCategory | null = category;

    while (current) {
      path.unshift({
        id: current.id,
        name: current.name,
        level: current.level
      });

      if (current.parentId) {
        current = await this.getCategoryById(current.parentId);
      } else {
        current = null;
      }
    }

    return path;
  }

  // Get category statistics
  async getCategoryStats(): Promise<CategoryStats> {
    const categories = await this.getAllCategories({ includeInactive: true });
    const activeCategories = categories.filter(cat => cat.isActive);
    
    return {
      totalCategories: categories.length,
      activeCategories: activeCategories.length,
      maxDepth: Math.max(...categories.map(cat => cat.level)) + 1,
      categoriesWithItems: 0, // Would be calculated with item integration
      categoriesWithoutItems: activeCategories.length,
      topLevelCategories: activeCategories.filter(cat => cat.level === 0).length
    };
  }

  // Reorder categories
  async reorderCategory(categoryId: string, newSortOrder: number): Promise<void> {
    const category = await this.getCategoryById(categoryId);
    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    const event = {
      type: 'inventory.category.reordered',
      payload: {
        categoryId,
        oldSortOrder: category.sortOrder,
        newSortOrder,
        reorderedBy: currentUser.id
      },
      timestamp: new Date().toISOString(),
      aggregateId: categoryId
    };

    await this.eventStore.append(event.type, event.payload, {
      key: `category-reordered-${categoryId}`,
      aggregate: { id: categoryId, type: 'category' }
    });
  }

  // Initialize default categories
  async initializeDefaultCategories(): Promise<void> {
    const existingCategories = await this.getAllCategories();
    if (existingCategories.length > 0) {
      return; // Already initialized
    }
  }

  // Private helper methods
  private validateCategoryInput(input: CategoryCreateInput): CategoryValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Category name is required');
    } else if (input.name.trim().length < 2) {
      errors.push('Category name must be at least 2 characters');
    } else if (input.name.trim().length > 50) {
      errors.push('Category name must be 50 characters or less');
    }

    if (input.description && input.description.length > 200) {
      errors.push('Description must be 200 characters or less');
    }

    // Validate parent exists (this would be an async check in a real implementation)
    if (input.parentId) {
      // In a real implementation, we'd check if the parent exists and is active
      warnings.push('Parent category existence will be validated');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateCategoryUpdate(_categoryId: string, input: CategoryUpdateInput): CategoryValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        errors.push('Category name cannot be empty');
      } else if (input.name.trim().length < 2) {
        errors.push('Category name must be at least 2 characters');
      } else if (input.name.trim().length > 50) {
        errors.push('Category name must be 50 characters or less');
      }
    }

    if (input.description !== undefined && input.description && input.description.length > 200) {
      errors.push('Description must be 200 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async wouldCreateCircularReference(categoryId: string, newParentId: string): Promise<boolean> {
    if (categoryId === newParentId) return true;

    const descendants = await this.getDescendants(categoryId);
    return descendants.some(desc => desc.id === newParentId);
  }

  private async getDescendants(categoryId: string): Promise<InventoryCategory[]> {
    const allCategories = await this.getAllCategories();
    const result: InventoryCategory[] = [];
    
    const findDescendants = (parentId: string) => {
      const children = allCategories.filter(cat => cat.parentId === parentId);
      for (const child of children) {
        result.push(child);
        findDescendants(child.id);
      }
    };

    findDescendants(categoryId);
    return result;
  }

  private async updateDescendantPaths(_categoryId: string): Promise<void> {
    // This would trigger path updates for all descendants
    // Implementation would involve generating update events for each descendant
    // const descendants = await this.getDescendants(categoryId);
    // Generate update events for each descendant to recalculate paths
    // This is a simplified placeholder
  }

  private getNextSortOrder(siblings: InventoryCategory[]): number {
    if (siblings.length === 0) return 1;
    return Math.max(...siblings.map(s => s.sortOrder)) + 1;
  }

  private buildCategoryFromEvents(events: any[]): InventoryCategory | null {
    if (events.length === 0) return null;

    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let category: InventoryCategory | null = null;

    for (const event of sortedEvents) {
      switch (event.type) {
        case 'inventory.category.created': {
          category = {
            id: event.payload.categoryId,
            name: event.payload.name,
            description: event.payload.description,
            parentId: event.payload.parentId,
            path: event.payload.path,
            level: event.payload.level,
            isActive: true,
            sortOrder: event.payload.sortOrder,
            rules: event.payload.rules,
            metadata: {
              createdAt: event.timestamp,
              updatedAt: event.timestamp,
              createdBy: event.payload.createdBy
            }
          };
          break;
        }
        case 'inventory.category.updated': {
          if (category) {
            const changes = event.payload.changes;
            if (changes.name !== undefined) category.name = changes.name;
            if (changes.description !== undefined) category.description = changes.description;
            if (changes.parentId !== undefined) category.parentId = changes.parentId;
            if (changes.isActive !== undefined) category.isActive = changes.isActive;
            if (changes.sortOrder !== undefined) category.sortOrder = changes.sortOrder;
            if (changes.rules !== undefined) category.rules = changes.rules;
            category.metadata.updatedAt = event.timestamp;
          }
          break;
        }
        case 'inventory.category.archived': {
          if (category) {
            category.isActive = false;
            category.metadata.updatedAt = event.timestamp;
          }
          break;
        }
        case 'inventory.category.reordered': {
          if (category) {
            category.sortOrder = event.payload.newSortOrder;
            category.metadata.updatedAt = event.timestamp;
          }
          break;
        }
      }
    }

    return category;
  }

  private filterCategories(categories: InventoryCategory[], query: CategoryQuery): InventoryCategory[] {
    let filtered = categories;

    if (query.parentId !== undefined) {
      filtered = filtered.filter(cat => cat.parentId === query.parentId);
    }

    if (query.level !== undefined) {
      filtered = filtered.filter(cat => cat.level === query.level);
    }

    if (query.isActive !== undefined && !query.includeInactive) {
      filtered = filtered.filter(cat => cat.isActive === query.isActive);
    } else if (!query.includeInactive) {
      filtered = filtered.filter(cat => cat.isActive);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(cat => 
        cat.name.toLowerCase().includes(searchLower) ||
        cat.description?.toLowerCase().includes(searchLower) ||
        cat.path.toLowerCase().includes(searchLower)
      );
    }

    // Sort results
    const sortBy = query.sortBy || 'sortOrder';
    const sortOrder = query.sortOrder || 'asc';
    
    filtered.sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'createdAt':
          valueA = new Date(a.metadata.createdAt).getTime();
          valueB = new Date(b.metadata.createdAt).getTime();
          break;
        case 'itemCount':
          valueA = a.metadata.itemCount || 0;
          valueB = b.metadata.itemCount || 0;
          break;
        default:
          valueA = a.sortOrder;
          valueB = b.sortOrder;
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  private buildHierarchy(categories: InventoryCategory[], rootId?: string): CategoryHierarchy[] {
    const categoryMap = new Map<string, InventoryCategory>();
    const childrenMap = new Map<string, InventoryCategory[]>();

    // Build maps
    for (const category of categories) {
      categoryMap.set(category.id, category);
      
      const parentId = category.parentId || 'root';
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(category);
    }

    // Build hierarchy recursively
    const buildNode = (category: InventoryCategory): CategoryHierarchy => {
      const children = childrenMap.get(category.id) || [];
      const node: CategoryHierarchy = {
        category,
        children: children
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(child => buildNode(child)),
      };

      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          node.parent = parent;
        }
      }

      return node;
    };

    // Get root categories
    const rootCategories = rootId 
      ? [categoryMap.get(rootId)].filter(Boolean) as InventoryCategory[]
      : childrenMap.get('root') || [];

    return rootCategories
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(cat => buildNode(cat));
  }
}

// Create singleton instance
let categoryService: CategoryService | null = null;

export function createCategoryService(eventStore: EventStore): CategoryService {
  if (!categoryService) {
    categoryService = new CategoryService(eventStore);
  }
  return categoryService;
}

export function getCategoryService(): CategoryService {
  if (!categoryService) {
    throw new Error('Category service not initialized. Call createCategoryService first.');
  }
  return categoryService;
}
export { CategoryService };
