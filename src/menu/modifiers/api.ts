/**
 * Menu Modifiers API Layer
 * RESTful API implementation with MSW handlers for development
 */

import { http, HttpResponse } from 'msw';

// Modifier types (matching the component interface)
interface ModifierOption {
  id: string;
  name: string;
  priceAdjustment: number;
  isDefault?: boolean;
  isActive: boolean;
}

interface ModifierGroup {
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
  createdAt: string;
  updatedAt: string;
}

// In-memory storage for development (MSW)
const mockModifierGroups = new Map<string, ModifierGroup>();

// Initialize with some default modifier groups
const initializeDefaultModifiers = () => {
  if (mockModifierGroups.size === 0) {
    const defaultGroups: ModifierGroup[] = [
      {
        id: 'mod_size',
        name: 'Size',
        description: 'Choose your preferred size',
        type: 'single',
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        displayOrder: 1,
        isActive: true,
        options: [
          {
            id: 'opt_small',
            name: 'Small',
            priceAdjustment: 0,
            isDefault: true,
            isActive: true
          },
          {
            id: 'opt_medium',
            name: 'Medium',
            priceAdjustment: 2.00,
            isActive: true
          },
          {
            id: 'opt_large',
            name: 'Large',
            priceAdjustment: 4.00,
            isActive: true
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mod_addons',
        name: 'Add-ons',
        description: 'Customize your order with extras',
        type: 'multiple',
        isRequired: false,
        minSelections: 0,
        maxSelections: 5,
        displayOrder: 2,
        isActive: true,
        options: [
          {
            id: 'opt_cheese',
            name: 'Extra Cheese',
            priceAdjustment: 1.50,
            isActive: true
          },
          {
            id: 'opt_bacon',
            name: 'Bacon',
            priceAdjustment: 2.50,
            isActive: true
          },
          {
            id: 'opt_avocado',
            name: 'Avocado',
            priceAdjustment: 2.00,
            isActive: true
          },
          {
            id: 'opt_mushrooms',
            name: 'Mushrooms',
            priceAdjustment: 1.00,
            isActive: true
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mod_cooking',
        name: 'Cooking Style',
        description: 'How would you like it cooked?',
        type: 'single',
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        displayOrder: 3,
        isActive: true,
        options: [
          {
            id: 'opt_rare',
            name: 'Rare',
            priceAdjustment: 0,
            isActive: true
          },
          {
            id: 'opt_medium_rare',
            name: 'Medium Rare',
            priceAdjustment: 0,
            isDefault: true,
            isActive: true
          },
          {
            id: 'opt_medium',
            name: 'Medium',
            priceAdjustment: 0,
            isActive: true
          },
          {
            id: 'opt_well_done',
            name: 'Well Done',
            priceAdjustment: 0,
            isActive: true
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
    
    defaultGroups.forEach(group => {
      mockModifierGroups.set(group.id, group);
    });
  }
};

// Utility Functions
function generateModifierGroupId(): string {
  return `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// MSW API Handlers
export const menuModifiersApiHandlers = [
  // GET /api/menu/modifiers - List modifier groups
  http.get('/api/menu/modifiers', async ({ request }) => {
    initializeDefaultModifiers();
    
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    
    let groups = Array.from(mockModifierGroups.values());
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      groups = groups.filter(group => 
        group.name.toLowerCase().includes(searchLower) ||
        (group.description && group.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort by display order
    groups.sort((a, b) => a.displayOrder - b.displayOrder);
    
    return HttpResponse.json(groups);
  }),
  
  // POST /api/menu/modifiers - Create modifier group
  http.post('/api/menu/modifiers', async ({ request }) => {
    const requestData = await request.json();
    
    // Basic validation
    if (!requestData.name || requestData.name.trim().length === 0) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Group name is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check for duplicate names
    const existingGroups = Array.from(mockModifierGroups.values());
    const isDuplicate = existingGroups.some(group => 
      group.name.toLowerCase() === requestData.name.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Group name already exists' 
      }), { 
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create new modifier group
    const groupId = generateModifierGroupId();
    const now = new Date().toISOString();
    
    const newGroup: ModifierGroup = {
      id: groupId,
      name: requestData.name.trim(),
      description: requestData.description?.trim() || undefined,
      type: requestData.type || 'single',
      isRequired: requestData.isRequired || false,
      minSelections: requestData.minSelections || 1,
      maxSelections: requestData.maxSelections || 1,
      displayOrder: requestData.displayOrder || (existingGroups.length + 1),
      isActive: requestData.isActive ?? true,
      options: requestData.options || [],
      createdAt: now,
      updatedAt: now,
    };
    
    mockModifierGroups.set(groupId, newGroup);
    
    return HttpResponse.json(newGroup, { status: 201 });
  }),
  
  // DELETE /api/menu/modifiers/:id - Delete modifier group
  http.delete('/api/menu/modifiers/:id', ({ params }) => {
    const groupId = params.id as string;
    
    if (!mockModifierGroups.has(groupId)) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Modifier group not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    mockModifierGroups.delete(groupId);
    
    return HttpResponse.json({ success: true });
  }),
];

// Service Functions (for use in components)
export const menuModifiersApi = {
  async getAll(): Promise<ModifierGroup[]> {
    const response = await fetch('/api/menu/modifiers');
    if (!response.ok) {
      throw new Error('Failed to fetch modifier groups');
    }
    return response.json();
  },
  
  async create(data: any): Promise<ModifierGroup> {
    const response = await fetch('/api/menu/modifiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create modifier group');
    }
    
    return response.json();
  },
  
  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/menu/modifiers/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete modifier group');
    }
  },
};
