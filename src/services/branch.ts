/**
 * Branch Management Service
 * 
 * API client for branch/location CRUD operations
 */

import type { Branch, BranchFormData } from '../types/branch';
import { fetchJSON, postJSON, patchJSON } from '../api/client';

const API_BASE = '/api/manage/branches';

export const branchService = {
  /**
   * Get all branches
   */
  async getAll(): Promise<Branch[]> {
    return fetchJSON<Branch[]>(API_BASE);
  },

  /**
   * Get a single branch by ID
   */
  async getById(id: string): Promise<Branch> {
    return fetchJSON<Branch>(`${API_BASE}/${id}`);
  },

  /**
   * Create a new branch
   */
  async create(data: BranchFormData): Promise<Branch> {
    return postJSON<Branch>(API_BASE, {
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
    });
  },

  /**
   * Update an existing branch
   */
  async update(id: string, data: Partial<BranchFormData>): Promise<Branch> {
    return patchJSON<Branch>(`${API_BASE}/${id}`, {
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
    });
  },

  /**
   * Delete (deactivate) a branch
   */
  async delete(id: string): Promise<void> {
    await fetchJSON<void>(`${API_BASE}/${id}`, { method: 'DELETE' } as RequestInit);
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
    return postJSON<Branch>(`${API_BASE}/${id}/set-main`, {});
  },
};
