/**
 * Inventory Item Types API (MSW)
 *
 * Provides basic CRUD for item type taxonomy used to classify inventory items
 * and to scope inventory audits (e.g., Ready to Serve, Component, Normal Item).
 */

import { http, HttpResponse } from 'msw';
import type { ItemType } from './types';

const mockItemTypesByBranch: Record<string, ItemType[]> = {
  'main-restaurant': [
    { id: 'itemtype_1', name: 'Finished Good', description: 'Sellable product', isActive: true, itemCount: 12 },
    { id: 'itemtype_2', name: 'Raw Material', description: 'Ingredient or component', isActive: true, itemCount: 45 },
    { id: 'itemtype_3', name: 'Supply', description: 'Non-inventory consumable', isActive: true, itemCount: 8 },
  ],
  'downtown-location': [
    { id: 'itemtype_1', name: 'Finished Good', description: 'Sellable product', isActive: true, itemCount: 8 },
    { id: 'itemtype_2', name: 'Raw Material', description: 'Ingredient or component', isActive: true, itemCount: 30 },
  ],
  'warehouse': [
    { id: 'itemtype_2', name: 'Raw Material', description: 'Ingredient or component', isActive: true, itemCount: 150 },
    { id: 'itemtype_4', name: 'Waste', description: 'Waste tracking type', isActive: true, itemCount: 0 },
  ],
};

export const inventoryItemTypeApiHandlers = [
  // List item types
  http.get('/api/inventory/item-types', ({ request }) => {
    const url = new URL(request.url);
    const branchId = url.searchParams.get('branchId');
    if (branchId && mockItemTypesByBranch[branchId]) {
      return HttpResponse.json(mockItemTypesByBranch[branchId]);
    }
    if (branchId) {
      return HttpResponse.json([]);
    }
    const allTypes = Object.values(mockItemTypesByBranch).flat();
    const uniqueTypes = Array.from(new Map(allTypes.map(item => [item.id, item])).values());
    return HttpResponse.json(uniqueTypes);
  }),

  // Create item type
  http.post('/api/inventory/item-types', async ({ request }) => {
    const { name, description } = await request.json() as Partial<ItemType>;
    if (!name) {
      return new HttpResponse(JSON.stringify({ error: 'Name is required' }), { status: 400 });
    }
    const id = `itemtype_${Object.values(mockItemTypesByBranch).flat().length + 1}`;
    const newItemType: ItemType = {
      id,
      name,
      ...(description && { description }),
      isActive: true,
      itemCount: 0,
    };
    // Add to all branches for simplicity in mock
    Object.keys(mockItemTypesByBranch).forEach(branchId => {
      mockItemTypesByBranch[branchId].push(newItemType);
    });
    return HttpResponse.json(newItemType, { status: 201 });
  }),

  // Update item type
  http.patch('/api/inventory/item-types/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json() as Partial<ItemType>;
    
    Object.keys(mockItemTypesByBranch).forEach(branchId => {
      const itemTypes = mockItemTypesByBranch[branchId];
      const itemTypeIndex = itemTypes.findIndex(it => it.id === id);

      if (itemTypeIndex !== -1) {
        itemTypes[itemTypeIndex] = { ...itemTypes[itemTypeIndex], ...updates };
      }
    });

    // For simplicity, find and return the first updated one.
    const updatedItemType = Object.values(mockItemTypesByBranch).flat().find(it => it.id === id);

    if (!updatedItemType) {
      return new HttpResponse(null, { status: 404 });
    }
    
    return HttpResponse.json(updatedItemType);
  }),
];

