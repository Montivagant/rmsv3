/**
 * Menu Modifiers API Layer
 * RESTful API implementation with MSW handlers for development
 */

import { http, HttpResponse } from 'msw';
import {
  listModifierGroups,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  type CreateModifierGroupRequest,
  type UpdateModifierGroupRequest
} from './repository';


// MSW API Handlers
export const menuModifiersApiHandlers = [
  // GET /api/menu/modifiers - List modifier groups
  http.get('/api/menu/modifiers', async () => {
    try {
      const groups = await listModifierGroups();
      console.log(`📋 MSW: Returning ${groups.length} modifier groups from repository`);
      return HttpResponse.json(groups);
    } catch (error) {
      console.error('Error fetching modifier groups:', error);
      return HttpResponse.json([], { status: 500 });
    }
  }),
  
  // POST /api/menu/modifiers - Create modifier group
  http.post('/api/menu/modifiers', async ({ request }) => {
    try {
      const data = await request.json() as CreateModifierGroupRequest;
      const group = await createModifierGroup(data);
      
      console.log(`✅ MSW: Created modifier group ${group.name} via repository`);
      return HttpResponse.json(group, { status: 201 });
    } catch (error) {
      console.error('Error creating modifier group:', error);
      return HttpResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to create modifier group' 
      }, { status: 400 });
    }
  }),
  
  // PUT /api/menu/modifiers/:id - Update modifier group
  http.put('/api/menu/modifiers/:id', async ({ params, request }) => {
    const { id } = params;
    
    try {
      const data = await request.json() as UpdateModifierGroupRequest;
      const group = await updateModifierGroup(id as string, data);
      
      if (!group) {
        return HttpResponse.json({ error: 'Modifier group not found' }, { status: 404 });
      }
      
      console.log(`✅ MSW: Updated modifier group ${group.name} via repository`);
      return HttpResponse.json(group);
    } catch (error) {
      console.error('Error updating modifier group:', error);
      return HttpResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to update modifier group' 
      }, { status: 400 });
    }
  }),
  
  // DELETE /api/menu/modifiers/:id - Delete modifier group
  http.delete('/api/menu/modifiers/:id', async ({ params }) => {
    const { id } = params;
    
    try {
      await deleteModifierGroup(id as string, 'Deleted via UI');
      
      console.log(`✅ MSW: Deleted modifier group ${id} via repository`);
      return HttpResponse.json({ message: 'Modifier group deleted successfully' });
    } catch (error) {
      console.error('Error deleting modifier group:', error);
      return HttpResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to delete modifier group' 
      }, { status: 400 });
    }
  }),
];
