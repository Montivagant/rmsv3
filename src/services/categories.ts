import type { CreateCategoryAPIPayload, CategoryAPIResponse } from '../lib/categories/mapCategoryForm';

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
      const response = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 409) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Category name or reference already exists');
        }
        
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Invalid category data');
        }
        
        throw new Error('Failed to create category');
      }

      const result = await response.json();
      
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
      const response = await fetch(`/api/menu/categories/check-reference?reference=${encodeURIComponent(reference.trim())}`);
      
      if (!response.ok) {
        console.warn('Failed to check reference uniqueness, assuming unique');
        return true;
      }
      
      const result = await response.json();
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
      const response = await fetch(`/api/menu/categories/check-name?name=${encodeURIComponent(name.trim())}`);
      
      if (!response.ok) {
        console.warn('Failed to check name uniqueness, assuming unique');
        return true;
      }
      
      const result = await response.json();
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
      const response = await fetch('/api/menu/categories/references');
      
      if (!response.ok) {
        console.warn('Failed to fetch existing references');
        return [];
      }
      
      const result = await response.json();
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
      const response = await fetch('/api/menu/categories/names');
      
      if (!response.ok) {
        console.warn('Failed to fetch existing names');
        return [];
      }
      
      const result = await response.json();
      return Array.isArray(result.names) ? result.names : [];
      
    } catch (error) {
      console.warn('Error fetching existing names:', error);
      return [];
    }
  }
};
