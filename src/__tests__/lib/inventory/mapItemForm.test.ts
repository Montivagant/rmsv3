/**
 * Item Form Data Adapter Tests
 * 
 * Tests the mapping between UI form data and API payload formats
 */

import { describe, it, expect } from 'vitest';
import {
  mapFormToAPI,
  mapAPIToForm,
  validateAPIPayload,
  createAPIError,
  createDefaultFormData,
  hasFormData,
} from '../../../lib/inventory/mapItemForm';
import type { ItemFormData } from '../../../schemas/itemForm';

describe('Item Form Data Adapters', () => {
  // Helper to create valid form data
  const createValidFormData = (): ItemFormData => ({
    name: 'Test Item',
    sku: 'TEST-001',
    categoryId: 'cat-1',
    storageUnitId: 'pieces',
    ingredientUnitId: 'grams',
    barcode: '1234567890123',
    cost: 5.99,
    minimumLevel: 10,
    parLevel: 20,
    maximumLevel: 50,
  });

  describe('mapFormToAPI', () => {
    it('should map required fields correctly', () => {
      const formData: ItemFormData = {
        name: 'Test Item',
        sku: 'TEST-001',
        categoryId: 'cat-1',
        storageUnitId: 'pieces',
        ingredientUnitId: 'grams',
      };

      const apiPayload = mapFormToAPI(formData);

      expect(apiPayload.name).toBe('Test Item');
      expect(apiPayload.sku).toBe('TEST-001');
      expect(apiPayload.categoryId).toBe('cat-1');
      expect(apiPayload.uom.base).toBe('pieces');
      expect(apiPayload.uom.purchase).toBe('pieces'); // Same as base in simplified form
      expect(apiPayload.uom.recipe).toBe('grams');
      expect(apiPayload.uom.conversions).toEqual([]);
      expect(apiPayload.status).toBe('active');
      expect(apiPayload.tracking).toEqual({
        lotTracking: false,
        expiryTracking: false,
        serialTracking: false,
        trackByLocation: false,
      });
    });

    it('should handle optional fields correctly', () => {
      const formData = createValidFormData();
      const apiPayload = mapFormToAPI(formData);

      expect(apiPayload.barcode).toBe('1234567890123');
      expect(apiPayload.costing).toEqual({
        averageCost: 5.99,
        lastCost: 5.99,
        currency: 'USD',
        costMethod: 'AVERAGE',
      });
      expect(apiPayload.levels).toEqual({
        par: {
          min: 10,
          max: 50,
          reorderPoint: 10, // Uses minimum level
          reorderQuantity: 10, // 20% of max level (50 * 0.2 = 10)
        },
      });
    });

    it('should trim whitespace in name and SKU', () => {
      const formData = createValidFormData();
      formData.name = '  Test Item  ';
      formData.sku = '  test-001  ';

      const apiPayload = mapFormToAPI(formData);

      expect(apiPayload.name).toBe('Test Item');
      expect(apiPayload.sku).toBe('TEST-001'); // Also uppercase
    });

    it('should convert SKU to uppercase', () => {
      const formData = createValidFormData();
      formData.sku = 'test-001';

      const apiPayload = mapFormToAPI(formData);
      expect(apiPayload.sku).toBe('TEST-001');
    });

    it('should omit barcode when empty', () => {
      const formData = createValidFormData();
      formData.barcode = '';

      const apiPayload = mapFormToAPI(formData);
      expect(apiPayload.barcode).toBeUndefined();
    });

    it('should omit costing when cost is not provided', () => {
      const formData = createValidFormData();
      formData.cost = undefined;

      const apiPayload = mapFormToAPI(formData);
      expect(apiPayload.costing).toBeUndefined();
    });

    it('should omit levels when none are provided', () => {
      const formData = createValidFormData();
      formData.minimumLevel = undefined;
      formData.parLevel = undefined;
      formData.maximumLevel = undefined;

      const apiPayload = mapFormToAPI(formData);
      expect(apiPayload.levels).toBeUndefined();
    });

    it('should use par level as reorder point when min is not provided', () => {
      const formData = createValidFormData();
      formData.minimumLevel = undefined;
      formData.parLevel = 25;

      const apiPayload = mapFormToAPI(formData);
      expect(apiPayload.levels?.par?.reorderPoint).toBe(25);
    });

    it('should calculate default reorder quantity when no max level', () => {
      const formData = createValidFormData();
      formData.maximumLevel = undefined;

      const apiPayload = mapFormToAPI(formData);
      expect(apiPayload.levels?.par?.reorderQuantity).toBe(10); // Default
    });

    it('should handle negative cost gracefully', () => {
      const formData = createValidFormData();
      formData.cost = -5;

      const apiPayload = mapFormToAPI(formData);
      expect(apiPayload.costing).toBeUndefined(); // Should omit invalid cost
    });
  });

  describe('mapAPIToForm', () => {
    it('should map API data to form format', () => {
      const apiData = {
        name: 'Test Item',
        sku: 'TEST-001',
        categoryId: 'cat-1',
        uom: {
          base: 'pieces',
          recipe: 'grams',
        },
        barcode: '1234567890123',
        costing: {
          averageCost: 5.99,
        },
        levels: {
          par: {
            min: 10,
            max: 50,
          },
        },
      };

      const formData = mapAPIToForm(apiData);

      expect(formData.name).toBe('Test Item');
      expect(formData.sku).toBe('TEST-001');
      expect(formData.categoryId).toBe('cat-1');
      expect(formData.storageUnitId).toBe('pieces');
      expect(formData.ingredientUnitId).toBe('grams');
      expect(formData.barcode).toBe('1234567890123');
      expect(formData.cost).toBe(5.99);
      expect(formData.minimumLevel).toBe(10);
      expect(formData.maximumLevel).toBe(50);
      expect(formData.parLevel).toBeUndefined(); // Not stored separately in API
    });

    it('should handle missing optional fields', () => {
      const apiData = {
        name: 'Test Item',
        sku: 'TEST-001',
        categoryId: 'cat-1',
        uom: {
          base: 'pieces',
          recipe: 'grams',
        },
      };

      const formData = mapAPIToForm(apiData);

      expect(formData.barcode).toBe('');
      expect(formData.cost).toBeUndefined();
      expect(formData.minimumLevel).toBeUndefined();
      expect(formData.parLevel).toBeUndefined();
      expect(formData.maximumLevel).toBeUndefined();
    });

    it('should prefer lastCost over averageCost', () => {
      const apiData = {
        name: 'Test Item',
        sku: 'TEST-001',
        categoryId: 'cat-1',
        uom: { base: 'pieces', recipe: 'grams' },
        costing: {
          averageCost: 5.99,
          lastCost: 6.50,
        },
      };

      const formData = mapAPIToForm(apiData);
      expect(formData.cost).toBe(6.50); // Should prefer lastCost
    });
  });

  describe('validateAPIPayload', () => {
    it('should validate complete payload', () => {
      const payload = mapFormToAPI(createValidFormData());
      const result = validateAPIPayload(payload);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require item name', () => {
      const payload = mapFormToAPI(createValidFormData());
      payload.name = '';

      const result = validateAPIPayload(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item name is required');
    });

    it('should require SKU', () => {
      const payload = mapFormToAPI(createValidFormData());
      payload.sku = '';

      const result = validateAPIPayload(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SKU is required');
    });

    it('should require category ID', () => {
      const payload = mapFormToAPI(createValidFormData());
      payload.categoryId = '';

      const result = validateAPIPayload(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Category ID is required');
    });

    it('should require storage unit', () => {
      const payload = mapFormToAPI(createValidFormData());
      payload.uom.base = '';

      const result = validateAPIPayload(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Storage unit is required');
    });

    it('should require ingredient unit', () => {
      const payload = mapFormToAPI(createValidFormData());
      payload.uom.recipe = '';

      const result = validateAPIPayload(payload);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ingredient unit is required');
    });
  });

  describe('createAPIError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error message');
      const result = createAPIError(error);

      expect(result.message).toBe('Test error message');
      expect(result.details).toBeDefined();
    });

    it('should handle string errors', () => {
      const error = 'Simple error message';
      const result = createAPIError(error);

      expect(result.message).toBe('Simple error message');
      expect(result.details).toBeUndefined();
    });

    it('should handle objects with message property', () => {
      const error = { message: 'Object error message', code: 400 };
      const result = createAPIError(error);

      expect(result.message).toBe('Object error message');
      expect(result.details).toBeDefined();
    });

    it('should handle unknown error types', () => {
      const error = 42;
      const result = createAPIError(error);

      expect(result.message).toBe('An unexpected error occurred');
      expect(result.details).toBe('42');
    });
  });

  describe('createDefaultFormData', () => {
    it('should create form data with empty values', () => {
      const formData = createDefaultFormData();

      expect(formData.name).toBe('');
      expect(formData.sku).toBe('');
      expect(formData.categoryId).toBe('');
      expect(formData.storageUnitId).toBe('');
      expect(formData.ingredientUnitId).toBe('');
      expect(formData.barcode).toBe('');
      expect(formData.cost).toBeUndefined();
      expect(formData.minimumLevel).toBeUndefined();
      expect(formData.parLevel).toBeUndefined();
      expect(formData.maximumLevel).toBeUndefined();
    });
  });

  describe('hasFormData', () => {
    it('should return false for empty form data', () => {
      const formData = createDefaultFormData();
      expect(hasFormData(formData)).toBe(false);
    });

    it('should return true when name is filled', () => {
      const formData = createDefaultFormData();
      formData.name = 'Test';
      expect(hasFormData(formData)).toBe(true);
    });

    it('should return true when SKU is filled', () => {
      const formData = createDefaultFormData();
      formData.sku = 'TEST';
      expect(hasFormData(formData)).toBe(true);
    });

    it('should return true when category is selected', () => {
      const formData = createDefaultFormData();
      formData.categoryId = 'cat-1';
      expect(hasFormData(formData)).toBe(true);
    });

    it('should return true when units are selected', () => {
      const formData = createDefaultFormData();
      formData.storageUnitId = 'pieces';
      expect(hasFormData(formData)).toBe(true);
    });

    it('should return true when optional fields are filled', () => {
      const formData = createDefaultFormData();
      formData.cost = 5.99;
      expect(hasFormData(formData)).toBe(true);
    });

    it('should ignore whitespace in text fields', () => {
      const formData = createDefaultFormData();
      formData.name = '   ';
      formData.barcode = '  ';
      expect(hasFormData(formData)).toBe(false);
    });

    it('should return true when numeric fields are zero', () => {
      const formData = createDefaultFormData();
      formData.cost = 0;
      expect(hasFormData(formData)).toBe(true);
    });
  });
});
