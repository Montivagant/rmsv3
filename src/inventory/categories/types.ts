/**
 * Inventory Category System Types
 * 
 * Supports hierarchical categories with parent-child relationships,
 * category paths, and comprehensive metadata for restaurant inventory management.
 */

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  path: string; // e.g., "Food/Proteins/Seafood"
  level: number; // 0 = root, 1 = first level, etc.
  isActive: boolean;
  sortOrder: number;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    itemCount?: number; // Number of items in this category
    childCount?: number; // Number of subcategories
  };
  // Business rules for this category
  rules?: {
    requiresLotTracking?: boolean;
    requiresExpiryTracking?: boolean;
    defaultShelfLifeDays?: number;
    defaultStorage?: StorageRequirements;
    taxCategory?: string;
  };
}

export interface StorageRequirements {
  location: 'dry' | 'refrigerated' | 'frozen' | 'ambient';
  tempRange?: {
    min: number; // Celsius
    max: number; // Celsius
  };
  humidity?: {
    min: number; // Percentage
    max: number; // Percentage
  };
}

export interface CategoryHierarchy {
  category: InventoryCategory;
  children: CategoryHierarchy[];
  parent?: InventoryCategory;
}

export interface CategoryPath {
  id: string;
  name: string;
  level: number;
}

// Event Types for Category Management
export interface CategoryCreatedEvent {
  type: 'inventory.category.created';
  payload: {
    categoryId: string;
    name: string;
    description?: string;
    parentId?: string;
    path: string;
    level: number;
    sortOrder: number;
    rules?: InventoryCategory['rules'];
    createdBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface CategoryUpdatedEvent {
  type: 'inventory.category.updated';
  payload: {
    categoryId: string;
    changes: {
      name?: string;
      description?: string;
      parentId?: string;
      isActive?: boolean;
      sortOrder?: number;
      rules?: InventoryCategory['rules'];
    };
    updatedBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface CategoryArchivedEvent {
  type: 'inventory.category.archived';
  payload: {
    categoryId: string;
    archivedBy: string;
    reason?: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface CategoryReorderedEvent {
  type: 'inventory.category.reordered';
  payload: {
    categoryId: string;
    oldSortOrder: number;
    newSortOrder: number;
    reorderedBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface CategoryDeletedEvent {
  type: 'inventory.category.deleted';
  payload: {
    categoryId: string;
    deletedBy: string;
    reason?: string;
  };
  timestamp: string;
  aggregateId: string;
}

// Validation and Business Rules
export interface CategoryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CategoryCreateInput {
  name: string;
  description?: string;
  parentId?: string;
  rules?: InventoryCategory['rules'];
  sortOrder?: number;
}

export interface CategoryUpdateInput {
  name?: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
  rules?: InventoryCategory['rules'];
  sortOrder?: number;
}

// Query interfaces for category operations
export interface CategoryQuery {
  parentId?: string;
  level?: number;
  isActive?: boolean;
  includeInactive?: boolean;
  search?: string;
  sortBy?: 'name' | 'sortOrder' | 'createdAt' | 'itemCount';
  sortOrder?: 'asc' | 'desc';
}

export interface CategoryStats {
  totalCategories: number;
  activeCategories: number;
  maxDepth: number;
  categoriesWithItems: number;
  categoriesWithoutItems: number;
  topLevelCategories: number;
}

// Default categories for restaurant inventory
export const DEFAULT_CATEGORIES: Omit<InventoryCategory, 'id' | 'metadata'>[] = [
  {
    name: 'Food',
    path: 'Food',
    level: 0,
    isActive: true,
    sortOrder: 1,
    rules: {
      requiresExpiryTracking: true,
      defaultStorage: { location: 'refrigerated' }
    }
  },
  {
    name: 'Proteins',
    parentId: 'food',
    path: 'Food/Proteins',
    level: 1,
    isActive: true,
    sortOrder: 1,
    rules: {
      requiresLotTracking: true,
      requiresExpiryTracking: true,
      defaultShelfLifeDays: 3,
      defaultStorage: { 
        location: 'refrigerated',
        tempRange: { min: 1, max: 4 }
      }
    }
  },
  {
    name: 'Vegetables',
    parentId: 'food',
    path: 'Food/Vegetables',
    level: 1,
    isActive: true,
    sortOrder: 2,
    rules: {
      requiresExpiryTracking: true,
      defaultShelfLifeDays: 7,
      defaultStorage: { location: 'refrigerated' }
    }
  },
  {
    name: 'Dairy',
    parentId: 'food',
    path: 'Food/Dairy',
    level: 1,
    isActive: true,
    sortOrder: 3,
    rules: {
      requiresLotTracking: true,
      requiresExpiryTracking: true,
      defaultShelfLifeDays: 5,
      defaultStorage: { 
        location: 'refrigerated',
        tempRange: { min: 1, max: 4 }
      }
    }
  },
  {
    name: 'Beverages',
    path: 'Beverages',
    level: 0,
    isActive: true,
    sortOrder: 2,
    rules: {
      requiresExpiryTracking: false,
      defaultStorage: { location: 'ambient' }
    }
  },
  {
    name: 'Alcohol',
    parentId: 'beverages',
    path: 'Beverages/Alcohol',
    level: 1,
    isActive: true,
    sortOrder: 1,
    rules: {
      requiresLotTracking: false,
      requiresExpiryTracking: false,
      taxCategory: 'alcohol',
      defaultStorage: { location: 'ambient' }
    }
  },
  {
    name: 'Non-Alcoholic',
    parentId: 'beverages',
    path: 'Beverages/Non-Alcoholic',
    level: 1,
    isActive: true,
    sortOrder: 2,
    rules: {
      requiresExpiryTracking: true,
      defaultShelfLifeDays: 30,
      defaultStorage: { location: 'ambient' }
    }
  },
  {
    name: 'Supplies',
    path: 'Supplies',
    level: 0,
    isActive: true,
    sortOrder: 3,
    rules: {
      requiresLotTracking: false,
      requiresExpiryTracking: false,
      defaultStorage: { location: 'dry' }
    }
  },
  {
    name: 'Kitchen Equipment',
    parentId: 'supplies',
    path: 'Supplies/Kitchen Equipment',
    level: 1,
    isActive: true,
    sortOrder: 1
  },
  {
    name: 'Cleaning Supplies',
    parentId: 'supplies',
    path: 'Supplies/Cleaning Supplies',
    level: 1,
    isActive: true,
    sortOrder: 2,
    rules: {
      requiresLotTracking: true,
      defaultStorage: { location: 'dry' }
    }
  }
];
