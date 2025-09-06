/**
 * Inventory Items Service
 * 
 * Handles API communication for inventory item operations.
 * Provides type-safe, error-handled service methods.
 */

import type { CreateItemAPIPayload } from '../lib/inventory/mapItemForm';
import type { InventoryItem } from '../inventory/items/types';

// API Response types
export interface CreateItemResponse {
  id: string;
  item: InventoryItem;
  message?: string;
}

export interface APIErrorResponse {
  message: string;
  errors?: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
  code?: string;
}

// Service class for inventory items
export class InventoryItemsService {
  private baseURL = '/api/inventory/items';

  /**
   * Create a new inventory item
   */
  async create(payload: CreateItemAPIPayload): Promise<CreateItemResponse> {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result = await response.json();
      return result;
      
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      
      // Wrap unexpected errors
      throw new ServiceError(
        'An unexpected error occurred while creating the item',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Check if SKU is unique
   */
  async checkSKUUniqueness(sku: string): Promise<{ isUnique: boolean; conflictId?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/check-sku?sku=${encodeURIComponent(sku)}`);
      
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json();
      
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      
      // For SKU checks, we can be more lenient and assume unique on error
      console.warn('SKU uniqueness check failed, assuming unique:', error);
      return { isUnique: true };
    }
  }

  /**
   * Get categories for form options
   */
  async getCategories(): Promise<Array<{ id: string; name: string; description?: string }>> {
    try {
      const response = await fetch('/api/inventory/categories');
      
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json();
      
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      
      throw new ServiceError(
        'Failed to load categories',
        'CATEGORIES_LOAD_FAILED',
        500,
        error
      );
    }
  }

  /**
   * Get units of measure for form options
   */
  async getUnits(): Promise<Array<{ id: string; name: string; abbreviation: string }>> {
    try {
      const response = await fetch('/api/inventory/units');
      
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json();
      
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      
      throw new ServiceError(
        'Failed to load units of measure',
        'UNITS_LOAD_FAILED',
        500,
        error
      );
    }
  }

  /**
   * Get existing SKUs for uniqueness validation
   */
  async getExistingSKUs(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}?fields=sku`);
      
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result = await response.json();
      return result.items?.map((item: { sku: string }) => item.sku) || [];
      
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      
      // For SKU lists, we can be more lenient and return empty array
      console.warn('Failed to load existing SKUs, continuing without uniqueness check:', error);
      return [];
    }
  }

  /**
   * Handle error responses from API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: APIErrorResponse;
    
    try {
      errorData = await response.json();
    } catch {
      // If we can't parse the error response, create a generic one
      throw new ServiceError(
        `Request failed with status ${response.status}`,
        'REQUEST_FAILED',
        response.status
      );
    }

    throw new ServiceError(
      errorData.message || `Request failed with status ${response.status}`,
      errorData.code || 'REQUEST_FAILED',
      response.status,
      errorData.errors
    );
  }
}

/**
 * Custom error class for service-level errors
 */
export class ServiceError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: any;

  constructor(
    message: string,
    code: string = 'SERVICE_ERROR',
    status: number = 500,
    details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /**
   * Check if this is a validation error
   */
  isValidationError(): boolean {
    return this.status === 400 || this.code === 'VALIDATION_ERROR';
  }

  /**
   * Check if this is a conflict error (e.g., SKU already exists)
   */
  isConflictError(): boolean {
    return this.status === 409 || this.code === 'CONFLICT';
  }

  /**
   * Get field-specific errors for form display
   */
  getFieldErrors(): Record<string, string> {
    if (!this.details || !Array.isArray(this.details)) {
      return {};
    }

    const fieldErrors: Record<string, string> = {};
    
    this.details.forEach((error: any) => {
      if (error.field && error.message) {
        fieldErrors[error.field] = error.message;
      }
    });

    return fieldErrors;
  }
}

// Create and export singleton instance
export const inventoryItemsService = new InventoryItemsService();

// Export types for consumers
export type { CreateItemAPIPayload };
export default inventoryItemsService;