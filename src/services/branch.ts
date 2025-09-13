/**
 * Branch Management Service
 * 
 * API client for branch/location CRUD operations
 */

import type { Branch, BranchFormData } from '../types/branch';

const API_BASE = '/api/manage/branches';

export const branchService = {
  /**
   * Get all branches
   */
  async getAll(): Promise<Branch[]> {
    const response = await fetch(API_BASE);
    if (!response.ok) {
      throw new Error('Failed to fetch branches');
    }
    return response.json();
  },

  /**
   * Get a single branch by ID
   */
  async getById(id: string): Promise<Branch> {
    const response = await fetch(`${API_BASE}/${id}`);
    if (!response.ok) {
      throw new Error('Branch not found');
    }
    return response.json();
  },

  /**
   * Create a new branch
   */
  async create(data: BranchFormData): Promise<Branch> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
        },
        contact: {
          phone: data.phone,
          email: data.email,
          manager: data.manager,
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create branch' }));
      throw new Error(error.error || 'Failed to create branch');
    }
    
    return response.json();
  },

  /**
   * Update an existing branch
   */
  async update(id: string, data: Partial<BranchFormData>): Promise<Branch> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        address: data.street || data.city ? {
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
        } : undefined,
        contact: data.phone || data.email || data.manager ? {
          phone: data.phone,
          email: data.email,
          manager: data.manager,
        } : undefined,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update branch' }));
      throw new Error(error.error || 'Failed to update branch');
    }
    
    return response.json();
  },

  /**
   * Delete (deactivate) a branch
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete branch' }));
      throw new Error(error.error || 'Failed to delete branch');
    }
  },

  /**
   * Toggle branch active status
   */
  async toggleActive(id: string, isActive: boolean): Promise<Branch> {
    return this.update(id, { isActive });
  },

  /**
   * Set branch as main
   */
  async setAsMain(id: string): Promise<Branch> {
    const response = await fetch(`${API_BASE}/${id}/set-main`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to set as main branch' }));
      throw new Error(error.error || 'Failed to set as main branch');
    }
    
    return response.json();
  },
};
