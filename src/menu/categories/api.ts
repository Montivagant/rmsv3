/**
 * Menu Categories API Layer
 * RESTful API implementation with MSW handlers for development
 */

import { http, HttpResponse } from 'msw';
import type { 
  MenuCategory, 
  CreateCategoryRequest, 
  UpdateCategoryRequest,
  CategoriesResponse,
  CategoryQuery 
} from './types';

// In-memory storage for development (MSW)
const mockCategories = new Map<string, MenuCategory>();

// Initialize with some default categories
const initializeDefaultCategories = () => {
  if (mockCategories.size === 0) {
    const defaultCategories: MenuCategory[] = [
      {
        id: 'cat_appetizers',
        name: 'Appetizers',
        displayOrder: 1,
        isActive: true,
        branchIds: ['main-restaurant'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cat_mains',
        name: 'Main Courses',
        displayOrder: 2,
        isActive: true,
        branchIds: ['main-restaurant'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cat_beverages',
        name: 'Beverages',
        displayOrder: 3,
        isActive: true,
        branchIds: ['main-restaurant'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cat_desserts',
        name: 'Desserts',
        displayOrder: 4,
        isActive: true,
        branchIds: ['main-restaurant'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    defaultCategories.forEach(category => {
      mockCategories.set(category.id, category);
    });
  }
};

// Utility Functions
function generateCategoryId(): string {
  return `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function applyFilters(categories: MenuCategory[], query: CategoryQuery): MenuCategory[] {
  let filtered = Array.from(categories);
  
  // Search filter
  if (query.search) {
    const searchLower = query.search.toLowerCase();
    filtered = filtered.filter(cat => 
      cat.name.toLowerCase().includes(searchLower)
    );
  }
  
  // Branch filter
  if (query.branchId) {
    filtered = filtered.filter(cat => 
      cat.branchIds.includes(query.branchId!)
    );
  }
  
  // Active status filter
  if (query.isActive !== undefined) {
    filtered = filtered.filter(cat => cat.isActive === query.isActive);
  }
  
  // Sorting
  const sortBy = query.sortBy || 'displayOrder';
  const sortOrder = query.sortOrder || 'asc';
  
  filtered.sort((a, b) => {
    let aVal: any = a[sortBy as keyof MenuCategory];
    let bVal: any = b[sortBy as keyof MenuCategory];
    
    // Handle date fields
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    if (sortOrder === 'desc') {
      [aVal, bVal] = [bVal, aVal];
    }
    
    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
  });
  
  return filtered;
}

function paginateResults(items: MenuCategory[], page: number, pageSize: number) {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    items: items.slice(startIndex, endIndex),
    total: items.length,
    page,
    pageSize,
  };
}

// MSW API Handlers
export const menuCategoriesApiHandlers = [
  // GET /api/menu/categories - List categories
  http.get('/api/menu/categories', async ({ request }) => {
    initializeDefaultCategories();
    
    const url = new URL(request.url);
    const query: CategoryQuery = {
      page: parseInt(url.searchParams.get('page') || '1'),
      pageSize: parseInt(url.searchParams.get('pageSize') || '25'),
      search: url.searchParams.get('search') || undefined,
      branchId: url.searchParams.get('branchId') || undefined,
      isActive: url.searchParams.get('isActive') ? 
        url.searchParams.get('isActive') === 'true' : undefined,
      sortBy: (url.searchParams.get('sortBy') as any) || 'displayOrder',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
    };
    
    const categories = Array.from(mockCategories.values());
    const filtered = applyFilters(categories, query);
    const paginated = paginateResults(filtered, query.page!, query.pageSize!);
    
    const response: CategoriesResponse = {
      categories: paginated.items,
      total: paginated.total,
      page: paginated.page,
      pageSize: paginated.pageSize,
    };
    
    return HttpResponse.json(response);
  }),
  
  // POST /api/menu/categories - Create category
  http.post('/api/menu/categories', async ({ request }) => {
    const requestData = await request.json() as CreateCategoryRequest;
    
    // Validation
    if (!requestData.name || requestData.name.trim().length === 0) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Category name is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check for duplicate names (case-insensitive)
    const existingCategories = Array.from(mockCategories.values());
    const isDuplicate = existingCategories.some(cat => 
      cat.name.toLowerCase() === requestData.name.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Category name already exists' 
      }), { 
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create new category
    const categoryId = generateCategoryId();
    const now = new Date();
    
    const newCategory: MenuCategory = {
      id: categoryId,
      name: requestData.name.trim(),
      displayOrder: requestData.displayOrder || (existingCategories.length + 1),
      isActive: requestData.isActive ?? true,
      branchIds: requestData.branchIds || ['main-restaurant'],
      createdAt: now,
      updatedAt: now,
    };
    
    mockCategories.set(categoryId, newCategory);
    
    return HttpResponse.json(newCategory, { status: 201 });
  }),
  
  // GET /api/menu/categories/:id - Get category by ID
  http.get('/api/menu/categories/:id', ({ params }) => {
    const categoryId = params.id as string;
    const category = mockCategories.get(categoryId);
    
    if (!category) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Category not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return HttpResponse.json(category);
  }),
  
  // PUT /api/menu/categories/:id - Update category
  http.put('/api/menu/categories/:id', async ({ params, request }) => {
    const categoryId = params.id as string;
    const requestData = await request.json() as UpdateCategoryRequest;
    
    const existingCategory = mockCategories.get(categoryId);
    if (!existingCategory) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Category not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check for duplicate names if name is being updated
    if (requestData.name && requestData.name !== existingCategory.name) {
      const otherCategories = Array.from(mockCategories.values())
        .filter(cat => cat.id !== categoryId);
      const isDuplicate = otherCategories.some(cat => 
        cat.name.toLowerCase() === requestData.name!.trim().toLowerCase()
      );
      
      if (isDuplicate) {
        return new HttpResponse(JSON.stringify({ 
          error: 'Category name already exists' 
        }), { 
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Update category
    const updatedCategory: MenuCategory = {
      ...existingCategory,
      ...requestData,
      name: requestData.name ? requestData.name.trim() : existingCategory.name,
      updatedAt: new Date(),
    };
    
    mockCategories.set(categoryId, updatedCategory);
    
    return HttpResponse.json(updatedCategory);
  }),
  
  // DELETE /api/menu/categories/:id - Delete category
  http.delete('/api/menu/categories/:id', ({ params }) => {
    const categoryId = params.id as string;
    
    if (!mockCategories.has(categoryId)) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Category not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    mockCategories.delete(categoryId);
    
    return HttpResponse.json({ success: true });
  }),
];

// Service Functions (for use in components)
export const menuCategoriesApi = {
  async getAll(query: CategoryQuery = {}): Promise<CategoriesResponse> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
    
    const response = await fetch(`/api/menu/categories?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    
    return response.json();
  },
  
  async create(data: CreateCategoryRequest): Promise<MenuCategory> {
    const response = await fetch('/api/menu/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create category');
    }
    
    return response.json();
  },
  
  async update(id: string, data: UpdateCategoryRequest): Promise<MenuCategory> {
    const response = await fetch(`/api/menu/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update category');
    }
    
    return response.json();
  },
  
  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/menu/categories/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete category');
    }
  },
};
