import type { CreateSupplierAPIPayload, SupplierAPIResponse } from '../lib/suppliers/mapSupplierForm';

/**
 * API service for supplier management
 */
export const supplierService = {
  /**
   * Create a new supplier
   */
  async createSupplier(payload: CreateSupplierAPIPayload): Promise<string> {

    // Validate required fields
    if (!payload.name?.trim()) {
      throw new Error('Supplier name is required');
    }

    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 409) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Supplier name or code already exists');
        }
        
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Invalid supplier data');
        }
        
        throw new Error('Failed to create supplier');
      }

      const result = await response.json();
      
      return result.id;

    } catch (error) {
      console.error('❌ Failed to create supplier:', error);
      throw error;
    }
  },

  /**
   * Check if supplier code is unique
   */
  async checkCodeUniqueness(code: string): Promise<boolean> {
    if (!code.trim()) return true;

    try {
      const response = await fetch(`/api/suppliers/check-code?code=${encodeURIComponent(code.trim())}`);
      
      if (!response.ok) {
        console.warn('Failed to check code uniqueness, assuming unique');
        return true;
      }
      
      const result = await response.json();
      return !result.exists; // Return true if code is unique (doesn't exist)
      
    } catch (error) {
      console.warn('Error checking code uniqueness:', error);
      return true; // Assume unique on error
    }
  },

  /**
   * Check if supplier name is unique
   */
  async checkNameUniqueness(name: string): Promise<boolean> {
    if (!name.trim()) return true;

    try {
      const response = await fetch(`/api/suppliers/check-name?name=${encodeURIComponent(name.trim())}`);
      
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
   * Generate a unique supplier code
   */
  async generateUniqueCode(baseName: string, prefix = 'SUP', maxAttempts = 10): Promise<string> {
    if (!baseName.trim()) return '';

    // Generate base code from name
    const cleanName = baseName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const baseCode = cleanName.substring(0, Math.min(4, cleanName.length)) || prefix;

    // Try base code first
    if (await this.checkCodeUniqueness(baseCode)) {
      return baseCode;
    }

    // Try with numeric suffixes
    for (let i = 1; i <= maxAttempts; i++) {
      const suffix = Math.floor(100 + Math.random() * 900); // 3-digit number
      const candidateCode = `${baseCode}${suffix}`;
      
      if (await this.checkCodeUniqueness(candidateCode)) {
        return candidateCode;
      }
    }

    // Fallback to timestamp-based code
    const timestamp = Date.now().toString().slice(-4);
    return `${baseCode}${timestamp}`;
  },

  /**
   * Get existing supplier codes for client-side validation
   */
  async getExistingCodes(): Promise<string[]> {
    try {
      const response = await fetch('/api/suppliers/codes');
      
      if (!response.ok) {
        console.warn('Failed to fetch existing codes');
        return [];
      }
      
      const result = await response.json();
      return Array.isArray(result.codes) ? result.codes : [];
      
    } catch (error) {
      console.warn('Error fetching existing codes:', error);
      return [];
    }
  },

  /**
   * Get existing supplier names for client-side validation
   */
  async getExistingNames(): Promise<string[]> {
    try {
      const response = await fetch('/api/suppliers/names');
      
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
