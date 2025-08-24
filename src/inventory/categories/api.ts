/**
 * Category Management API
 * 
 * HTTP handlers and utilities for category CRUD operations
 */

import { http, HttpResponse } from 'msw';
import { getCategoryService } from './service';
import type { CategoryCreateInput, CategoryUpdateInput, CategoryQuery } from './types';

// Mock data store for MSW
const mockCategories = new Map();
let nextId = 1;

// Helper to generate category ID
const generateId = () => `cat_${nextId++}`;

// Validation helpers
const validateCategoryName = (name: string): string | null => {
  if (!name || name.trim().length === 0) {
    return 'Category name is required';
  }
  if (name.trim().length < 2) {
    return 'Category name must be at least 2 characters';
  }
  if (name.trim().length > 50) {
    return 'Category name must be 50 characters or less';
  }
  return null;
};

// MSW API Handlers
export const categoryApiHandlers = [
  // GET /api/categories - List categories with optional filtering
  http.get('/api/categories', async ({ request }) => {
    const url = new URL(request.url);
    const parentId = url.searchParams.get('parentId');
    const level = url.searchParams.get('level');
    const search = url.searchParams.get('search');
    const includeInactive = url.searchParams.get('includeInactive') === 'true';
    const sortBy = url.searchParams.get('sortBy') || 'sortOrder';
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';

    // Initialize with default categories if empty
    if (mockCategories.size === 0) {
      await initializeMockCategories();
    }

    let categories = Array.from(mockCategories.values());

    // Apply filters
    if (parentId) {
      categories = categories.filter(cat => cat.parentId === parentId);
    }
    if (level !== null) {
      const levelNum = parseInt(level || '0');
      categories = categories.filter(cat => cat.level === levelNum);
    }
    if (!includeInactive) {
      categories = categories.filter(cat => cat.isActive);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      categories = categories.filter(cat => 
        cat.name.toLowerCase().includes(searchLower) ||
        cat.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    categories.sort((a, b) => {
      let valueA, valueB;
      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'createdAt':
          valueA = new Date(a.metadata.createdAt).getTime();
          valueB = new Date(b.metadata.createdAt).getTime();
          break;
        default:
          valueA = a.sortOrder;
          valueB = b.sortOrder;
      }
      
      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    console.log('📁 MSW: Categories API called, returning', categories.length, 'categories');
    return HttpResponse.json(categories);
  }),

  // GET /api/categories/hierarchy - Get category hierarchy
  http.get('/api/categories/hierarchy', async () => {
    if (mockCategories.size === 0) {
      await initializeMockCategories();
    }

    const categories = Array.from(mockCategories.values()).filter(cat => cat.isActive);
    const hierarchy = buildCategoryHierarchy(categories);
    
    console.log('🌳 MSW: Category hierarchy API called');
    return HttpResponse.json(hierarchy);
  }),

  // GET /api/categories/stats - Get category statistics
  http.get('/api/categories/stats', async () => {
    if (mockCategories.size === 0) {
      await initializeMockCategories();
    }

    const categories = Array.from(mockCategories.values());
    const stats = {
      totalCategories: categories.length,
      activeCategories: categories.filter(cat => cat.isActive).length,
      maxDepth: Math.max(...categories.map(cat => cat.level)) + 1,
      categoriesWithItems: 0, // Would be calculated with item integration
      categoriesWithoutItems: categories.filter(cat => cat.isActive).length,
      topLevelCategories: categories.filter(cat => cat.level === 0 && cat.isActive).length
    };

    console.log('📊 MSW: Category stats API called');
    return HttpResponse.json(stats);
  }),

  // GET /api/categories/:id - Get category by ID
  http.get('/api/categories/:id', async ({ params }) => {
    const { id } = params;
    const category = mockCategories.get(id);
    
    if (!category) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Category not found'
      });
    }

    console.log('📁 MSW: Category by ID API called for', id);
    return HttpResponse.json(category);
  }),

  // GET /api/categories/:id/path - Get category path/breadcrumb
  http.get('/api/categories/:id/path', async ({ params }) => {
    const { id } = params;
    const category = mockCategories.get(id);
    
    if (!category) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Category not found'
      });
    }

    const path = buildCategoryPath(id);
    console.log('🧭 MSW: Category path API called for', id);
    return HttpResponse.json(path);
  }),

  // POST /api/categories - Create new category
  http.post('/api/categories', async ({ request }) => {
    const input = await request.json() as CategoryCreateInput;
    
    // Validate input
    const nameError = validateCategoryName(input.name);
    if (nameError) {
      return new HttpResponse(JSON.stringify({ error: nameError }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (input.description && input.description.length > 200) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Description must be 200 characters or less' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if parent exists
    if (input.parentId && !mockCategories.has(input.parentId)) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Parent category not found' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for name conflicts at the same level
    const siblings = Array.from(mockCategories.values()).filter(cat => 
      cat.parentId === input.parentId && cat.isActive
    );
    const nameExists = siblings.some(cat => 
      cat.name.toLowerCase() === input.name.toLowerCase()
    );
    
    if (nameExists) {
      return new HttpResponse(JSON.stringify({ 
        error: `A category named "${input.name}" already exists at this level` 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create category
    const categoryId = generateId();
    const parentCategory = input.parentId ? mockCategories.get(input.parentId) : null;
    const path = parentCategory ? `${parentCategory.path}/${input.name}` : input.name;
    const level = parentCategory ? parentCategory.level + 1 : 0;
    const sortOrder = input.sortOrder ?? getNextSortOrder(siblings);

    const category = {
      id: categoryId,
      name: input.name.trim(),
      description: input.description?.trim(),
      parentId: input.parentId,
      path,
      level,
      isActive: true,
      sortOrder,
      rules: input.rules,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'current-user', // Would be actual user in real implementation
        itemCount: 0,
        childCount: 0
      }
    };

    mockCategories.set(categoryId, category);
    updateParentChildCounts();

    console.log('📁 MSW: Created new category:', category.name);
    return HttpResponse.json(category, { status: 201 });
  }),

  // PATCH /api/categories/:id - Update category
  http.patch('/api/categories/:id', async ({ params, request }) => {
    const { id } = params;
    const input = await request.json() as CategoryUpdateInput;
    
    const category = mockCategories.get(id);
    if (!category) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Category not found'
      });
    }

    if (!category.isActive) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Cannot update archived category' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate updates
    if (input.name !== undefined) {
      const nameError = validateCategoryName(input.name);
      if (nameError) {
        return new HttpResponse(JSON.stringify({ error: nameError }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Check for circular reference if changing parent
    if (input.parentId !== undefined && input.parentId !== category.parentId) {
      if (wouldCreateCircularReference(id, input.parentId)) {
        return new HttpResponse(JSON.stringify({ 
          error: 'Cannot set parent: would create circular reference' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Apply updates
    const updatedCategory = { ...category };
    if (input.name !== undefined) updatedCategory.name = input.name.trim();
    if (input.description !== undefined) updatedCategory.description = input.description?.trim();
    if (input.parentId !== undefined) updatedCategory.parentId = input.parentId;
    if (input.isActive !== undefined) updatedCategory.isActive = input.isActive;
    if (input.sortOrder !== undefined) updatedCategory.sortOrder = input.sortOrder;
    if (input.rules !== undefined) updatedCategory.rules = input.rules;
    updatedCategory.metadata.updatedAt = new Date().toISOString();

    // Update path if parent changed
    if (input.parentId !== undefined && input.parentId !== category.parentId) {
      const newParent = input.parentId ? mockCategories.get(input.parentId) : null;
      updatedCategory.path = newParent ? `${newParent.path}/${updatedCategory.name}` : updatedCategory.name;
      updatedCategory.level = newParent ? newParent.level + 1 : 0;
      
      // Update paths for descendants
      updateDescendantPaths(id, updatedCategory.path, updatedCategory.level);
    }

    mockCategories.set(id, updatedCategory);
    updateParentChildCounts();

    console.log('📁 MSW: Updated category:', updatedCategory.name);
    return HttpResponse.json(updatedCategory);
  }),

  // DELETE /api/categories/:id - Archive category
  http.delete('/api/categories/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason;
    
    const category = mockCategories.get(id);
    if (!category) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Category not found'
      });
    }

    if (!category.isActive) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Category is already archived' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if category has active children
    const children = Array.from(mockCategories.values()).filter(cat => 
      cat.parentId === id && cat.isActive
    );
    
    if (children.length > 0) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Cannot archive category with active subcategories' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Archive category
    const archivedCategory = { 
      ...category, 
      isActive: false,
      metadata: {
        ...category.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    mockCategories.set(id, archivedCategory);
    updateParentChildCounts();

    console.log('📁 MSW: Archived category:', category.name, reason ? `(${reason})` : '');
    return HttpResponse.json({ message: 'Category archived successfully' });
  })
];

// Helper functions
async function initializeMockCategories() {
  const defaultCategories = [
    {
      id: 'food',
      name: 'Food',
      description: 'All food items and ingredients',
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
      id: 'food-proteins',
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
      id: 'food-vegetables',
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
      id: 'beverages',
      name: 'Beverages',
      description: 'All beverages and drinks',
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
      id: 'supplies',
      name: 'Supplies',
      description: 'Non-food supplies and equipment',
      path: 'Supplies',
      level: 0,
      isActive: true,
      sortOrder: 3,
      rules: {
        requiresLotTracking: false,
        requiresExpiryTracking: false,
        defaultStorage: { location: 'dry' }
      }
    }
  ];

  for (const category of defaultCategories) {
    const fullCategory = {
      ...category,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        itemCount: 0,
        childCount: 0
      }
    };
    mockCategories.set(category.id, fullCategory);
  }

  updateParentChildCounts();
}

function getNextSortOrder(siblings: any[]): number {
  if (siblings.length === 0) return 1;
  return Math.max(...siblings.map(s => s.sortOrder)) + 1;
}

function wouldCreateCircularReference(categoryId: string, newParentId: string): boolean {
  if (categoryId === newParentId) return true;
  
  const getDescendants = (id: string): string[] => {
    const descendants: string[] = [];
    const children = Array.from(mockCategories.values()).filter(cat => cat.parentId === id);
    
    for (const child of children) {
      descendants.push(child.id);
      descendants.push(...getDescendants(child.id));
    }
    
    return descendants;
  };

  return getDescendants(categoryId).includes(newParentId);
}

function updateDescendantPaths(categoryId: string, newPath: string, newLevel: number) {
  const descendants = Array.from(mockCategories.values()).filter(cat => 
    cat.path.startsWith(mockCategories.get(categoryId)?.path + '/')
  );

  for (const descendant of descendants) {
    const oldPath = mockCategories.get(categoryId)?.path || '';
    const relativePath = descendant.path.substring(oldPath.length + 1);
    const updatedDescendant = {
      ...descendant,
      path: `${newPath}/${relativePath}`,
      level: newLevel + 1 + (relativePath.split('/').length - 1),
      metadata: {
        ...descendant.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    mockCategories.set(descendant.id, updatedDescendant);
  }
}

function updateParentChildCounts() {
  // Reset all child counts
  for (const [id, category] of mockCategories) {
    category.metadata.childCount = 0;
    mockCategories.set(id, category);
  }

  // Count children for each category
  for (const category of mockCategories.values()) {
    if (category.parentId) {
      const parent = mockCategories.get(category.parentId);
      if (parent) {
        parent.metadata.childCount = (parent.metadata.childCount || 0) + 1;
        mockCategories.set(category.parentId, parent);
      }
    }
  }
}

function buildCategoryHierarchy(categories: any[], rootId?: string) {
  const categoryMap = new Map();
  const childrenMap = new Map();

  for (const category of categories) {
    categoryMap.set(category.id, category);
    
    const parentId = category.parentId || 'root';
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId).push(category);
  }

  const buildNode = (category: any) => {
    const children = childrenMap.get(category.id) || [];
    return {
      category,
      children: children
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
        .map((child: any) => buildNode(child)),
      parent: category.parentId ? categoryMap.get(category.parentId) : undefined
    };
  };

  const rootCategories = rootId 
    ? [categoryMap.get(rootId)].filter(Boolean)
    : childrenMap.get('root') || [];

  return rootCategories
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
    .map((cat: any) => buildNode(cat));
}

function buildCategoryPath(categoryId: string) {
  const path = [];
  let current = mockCategories.get(categoryId);

  while (current) {
    path.unshift({
      id: current.id,
      name: current.name,
      level: current.level
    });

    if (current.parentId) {
      current = mockCategories.get(current.parentId);
    } else {
      current = null;
    }
  }

  return path;
}
