/**
 * User Management Service
 * 
 * API client for user CRUD operations
 */

import type { User, UserFormData } from '../types/user';

const API_BASE = '/api/manage/users';

export const userService = {
  /**
   * Get all users
   */
  async getAll(): Promise<User[]> {
    const response = await fetch(API_BASE);
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  },

  /**
   * Get a single user by ID
   */
  async getById(id: string): Promise<User> {
    const response = await fetch(`${API_BASE}/${id}`);
    if (!response.ok) {
      throw new Error('User not found');
    }
    return response.json();
  },

  /**
   * Create a new user
   */
  async create(data: UserFormData): Promise<User> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create user' }));
      throw new Error(error.error || 'Failed to create user');
    }
    
    return response.json();
  },

  /**
   * Update an existing user
   */
  async update(id: string, data: Partial<UserFormData>): Promise<User> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update user' }));
      throw new Error(error.error || 'Failed to update user');
    }
    
    return response.json();
  },

  /**
   * Delete a user
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete user' }));
      throw new Error(error.error || 'Failed to delete user');
    }
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
    const response = await fetch(`${API_BASE}/${id}/roles`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roleIds }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to assign roles' }));
      throw new Error(error.error || 'Failed to assign roles');
    }
    
    return response.json();
  },

  /**
   * Reset user password
   */
  async resetPassword(id: string): Promise<{ temporaryPassword: string }> {
    const response = await fetch(`${API_BASE}/${id}/reset-password`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to reset password' }));
      throw new Error(error.error || 'Failed to reset password');
    }
    
    return response.json();
  },

  /**
   * Update user preferences
   */
  async updatePreferences(id: string, preferences: Partial<User['preferences']>): Promise<User> {
    const response = await fetch(`${API_BASE}/${id}/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update preferences' }));
      throw new Error(error.error || 'Failed to update preferences');
    }
    
    return response.json();
  },
};
