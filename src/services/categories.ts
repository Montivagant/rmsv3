import type { CreateCategoryAPIPayload } from '../lib/categories/mapCategoryForm';
import { fetchJSON, postJSON } from '../api/client';

/**
 * API service for category management
 */
export const categoryService = {
  /**
   * Create a new menu category
   */
  async createCategory(payload: CreateCategoryAPIPayload): Promise<string> {

    // Validate required fields
    if (!payload.name?.trim()) {
      throw new Error('Category name is required');
    }

    try {
      const result = await postJSON<{ id: string }>('/api/menu/categories', payload);
      return result.id;

    } catch (error) {
      console.error('❌ Failed to create category:', error);
      throw error;
    }
  },

  /**
   * Check if category reference is unique
   */
  async checkReferenceUniqueness(reference: string): Promise<boolean> {
    if (!reference.trim()) return true;

    try {
      const result = await fetchJSON<{ exists: boolean }>(`/api/menu/categories/check-reference?reference=${encodeURIComponent(reference.trim())}`);
      return !result.exists; // Return true if reference is unique (doesn't exist)
      
    } catch (error) {
      console.warn('Error checking reference uniqueness:', error);
      return true; // Assume unique on error
    }
  },

  /**
   * Check if category name is unique
   */
  async checkNameUniqueness(name: string): Promise<boolean> {
    if (!name.trim()) return true;

    try {
      const result = await fetchJSON<{ exists: boolean }>(`/api/menu/categories/check-name?name=${encodeURIComponent(name.trim())}`);
      return !result.exists; // Return true if name is unique (doesn't exist)
      
    } catch (error) {
      console.warn('Error checking name uniqueness:', error);
      return true; // Assume unique on error
    }
  },

  /**
   * Generate a unique category reference
   */
  async generateUniqueReference(baseName: string, prefix = 'CAT', maxAttempts = 10): Promise<string> {
    if (!baseName.trim()) return '';

    // Generate base reference from name
    const cleanName = baseName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const baseRef = cleanName.substring(0, Math.min(6, cleanName.length)) || prefix;

    // Try base reference first
    if (await this.checkReferenceUniqueness(baseRef)) {
      return baseRef;
    }

    // Try with numeric suffixes
    for (let i = 1; i <= maxAttempts; i++) {
      const suffix = Math.floor(10 + Math.random() * 90); // 2-digit number
      const candidateRef = `${baseRef}${suffix}`;
      
      if (await this.checkReferenceUniqueness(candidateRef)) {
        return candidateRef;
      }
    }

    // Fallback to timestamp-based reference
    const timestamp = Date.now().toString().slice(-3);
    return `${baseRef}${timestamp}`;
  },

  /**
   * Get existing category references for client-side validation
   */
  async getExistingReferences(): Promise<string[]> {
    try {
      const result = await fetchJSON<{ references: string[] }>('/api/menu/categories/references');
      return Array.isArray(result.references) ? result.references : [];
      
    } catch (error) {
      console.warn('Error fetching existing references:', error);
      return [];
    }
  },

  /**
   * Get existing category names for client-side validation
   */
  async getExistingNames(): Promise<string[]> {
    try {
      const result = await fetchJSON<{ names: string[] }>('/api/menu/categories/names');
      return Array.isArray(result.names) ? result.names : [];
      
    } catch (error) {
      console.warn('Error fetching existing names:', error);
      return [];
    }
  }
};
