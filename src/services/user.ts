/**
 * User Management Service
 * 
 * API client for user CRUD operations
 */

import type { User, UserFormData } from '../types/user';
import { fetchJSON, postJSON, patchJSON, deleteJSON } from '../api/client';

const API_BASE = '/api/manage/users';

export const userService = {
  /**
   * Get all users
   */
  async getAll(): Promise<User[]> {
    return fetchJSON<User[]>(API_BASE);
  },

  /**
   * Get a single user by ID
   */
  async getById(id: string): Promise<User> {
    return fetchJSON<User>(`${API_BASE}/${id}`);
  },

  /**
   * Create a new user
   */
  async create(data: UserFormData): Promise<User> {
    return postJSON<User>(API_BASE, data);
  },

  /**
   * Update an existing user
   */
  async update(id: string, data: Partial<UserFormData>): Promise<User> {
    return patchJSON<User>(`${API_BASE}/${id}`, data);
  },

  /**
   * Delete a user
   */
  async delete(id: string): Promise<void> {
    await deleteJSON<void>(`${API_BASE}/${id}`);
  },

  /**
   * Toggle user active status
   */
  async toggleStatus(id: string, status: User['status']): Promise<User> {
    return this.update(id, { status });
  },

  /**
   * Assign roles to user
   */
  async assignRoles(id: string, roleIds: string[]): Promise<User> {
    return fetchJSON<User>(`${API_BASE}/${id}/roles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleIds }),
    } as RequestInit);
  },

  /**
   * Reset user password
   */
  async resetPassword(id: string): Promise<{ temporaryPassword: string }> {
    return postJSON<{ temporaryPassword: string }>(`${API_BASE}/${id}/reset-password`, {});
  },

  /**
   * Update user preferences
   */
  async updatePreferences(id: string, preferences: Partial<User['preferences']>): Promise<User> {
    return patchJSON<User>(`${API_BASE}/${id}/preferences`, preferences);
  },
};
