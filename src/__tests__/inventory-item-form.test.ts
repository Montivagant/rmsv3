/**
 * Comprehensive tests for inventory item form functionality
 * 
 * Tests schema validation, form interactions, data transformation,
 * and integration scenarios.
 */

import { describe, test, expect } from 'vitest';
import { 
  validateItemForm, 
  generateSKU, 
  validateBarcode,
  createDefaultFormData,
  type ItemFormData 
} from '../schemas/itemForm';
import { 
  mapFormDataToCreatePayload,
  mapItemToFormData,
  validateSKUUniqueness,
  mapAPIErrorsToFormErrors 
} from '../lib/inventory/mapItemForm';
import type { InventoryItem } from '../inventory/items/types';

describe('ItemForm Schema Validation', () => {
  test('validates required fields correctly', () => {
    const emptyData = {};
    const result = validateItemForm(emptyData);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.sku).toBeDefined();
    expect(result.errors.categoryId).toBeDefined();
    // Allow either storageUnit or storageUnitId depending on mapping
    expect(result.errors.storageUnit || (result.errors as any).storageUnitId).toBeDefined();
    expect(result.errors.ingredientUnit || (result.errors as any).ingredientUnitId).toBeDefined();
  });

  test('validates field length constraints', () => {
    const longName = 'a'.repeat(121); // Exceeds 120 char limit
    const shortSKU = 'AB'; // Below 3 char minimum
    
    const data = {
      name: longName,
      sku: shortSKU,
      categoryId: 'cat1',
      storageUnitId: 'kg',
      ingredientUnitId: 'g'
    };
    
    const result = validateItemForm(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toContain('cannot exceed 120 characters');
    expect(result.errors.sku).toContain('at least 3 characters');
  });

  test('validates SKU format', () => {
    const invalidSKUs = ['ABC@123', 'ABC 123', 'ABC#123'];
    
    invalidSKUs.forEach(sku => {
      const data = {
        name: 'Test Item',
        sku,
        categoryId: 'cat1',
        storageUnitId: 'kg',
        ingredientUnitId: 'g'
      };
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.sku).toContain('can only contain letters, numbers, underscores, and hyphens');
    });
  });

  test('validates cross-field level constraints', () => {
    const data = {
      name: 'Test Item',
      sku: 'TEST-123',
      categoryId: 'cat1',
      storageUnitId: 'kg',
      ingredientUnitId: 'g',
      minimumLevel: 10,
      parLevel: 5, // Invalid: par < min
      maximumLevel: 15
    };
    
    const result = validateItemForm(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.parLevel).toContain('greater than or equal to minimum level');
  });

  test('validates maximum level constraints', () => {
    const data = {
      name: 'Test Item',
      sku: 'TEST-123',
      categoryId: 'cat1',
      storageUnitId: 'kg',
      ingredientUnitId: 'g',
      parLevel: 10,
      maximumLevel: 5 // Invalid: max < par
    };
    
    const result = validateItemForm(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.maximumLevel).toContain('greater than or equal to par level');
  });

  test('accepts valid form data', () => {
    const validData = {
      name: 'Test Item',
      sku: 'TEST-123',
      categoryId: 'cat1',
      storageUnitId: 'kg',
      ingredientUnitId: 'g',
      barcode: '1234567890123',
      cost: 10.50,
      minimumLevel: 5,
      parLevel: 20,
      maximumLevel: 50
    };
    
    const result = validateItemForm(validData);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });
});

describe('SKU Generation', () => {
  test('generates SKU from item name', () => {
    const sku = generateSKU('Organic Tomatoes');
    expect(sku).toMatch(/^ITM-ORGA\d{4}$/);
  });

  test('handles names with special characters', () => {
    const sku = generateSKU('Test Item #1 @');
    expect(sku).toMatch(/^ITM-TEST\d{4}$/);
  });

  test('handles short names', () => {
    const sku = generateSKU('A');
    expect(sku).toMatch(/^ITM-A\d{4}$/);
  });

  test('avoids existing SKUs', () => {
    const existingSKUs = ['ITM-TEST0001', 'ITM-TEST0002'];
    const sku1 = generateSKU('Test Item', 'ITM', existingSKUs);
    const sku2 = generateSKU('Test Item', 'ITM', [...existingSKUs, sku1]);
    
    expect(existingSKUs).not.toContain(sku1);
    expect([...existingSKUs, sku1]).not.toContain(sku2);
    expect(sku1).not.toBe(sku2);
  });
});

describe('Barcode Validation', () => {
  test('accepts valid EAN-13 barcodes', () => {
    expect(validateBarcode('1234567890123')).toBe(true);
  });

  test('accepts valid UPC barcodes', () => {
    expect(validateBarcode('123456789012')).toBe(true);
  });

  test('accepts custom barcodes within length limit', () => {
    expect(validateBarcode('CUSTOM123')).toBe(true);
    expect(validateBarcode('a'.repeat(32))).toBe(true);
  });

  test('rejects barcodes exceeding length limit', () => {
    expect(validateBarcode('a'.repeat(33))).toBe(false);
  });

  test('allows empty barcode (optional field)', () => {
    expect(validateBarcode('')).toBe(true);
  });
});

describe('Data Transformation', () => {
  test('maps form data to API payload correctly', () => {
    const formData: ItemFormData = {
      name: 'Test Item',
      sku: 'TEST-123',
      categoryId: 'cat1',
      storageUnitId: 'kg',
      ingredientUnitId: 'g',
      barcode: '1234567890123',
      cost: 10.50,
      minimumLevel: 5,
      parLevel: 20,
      maximumLevel: 50
    };
    
    const payload = mapFormDataToCreatePayload(formData);
    
    expect(payload).toEqual({
      name: 'Test Item',
      sku: 'TEST-123',
      categoryId: 'cat1',
      uom: {
        base: 'kg',
        purchase: 'kg',
        recipe: 'g',
        conversions: []
      },
      barcode: '1234567890123',
      costing: {
        averageCost: 10.50,
        currency: 'USD',
        costMethod: 'AVERAGE'
      },
      levels: {
        par: {
          min: 5,
          max: 50,
          reorderPoint: 5
        }
      }
    });
  });

  test('handles optional fields correctly', () => {
    const minimalData: ItemFormData = {
      name: 'Test Item',
      sku: 'TEST-123',
      categoryId: 'cat1',
      storageUnitId: 'kg',
      ingredientUnitId: 'g'
    };
    
    const payload = mapFormDataToCreatePayload(minimalData);
    
    expect(payload).toEqual({
      name: 'Test Item',
      sku: 'TEST-123',
      categoryId: 'cat1',
      uom: {
        base: 'kg',
        purchase: 'kg',
        recipe: 'g',
        conversions: []
      },
      barcode: null
    });
    
    expect(payload.costing).toBeUndefined();
    expect(payload.levels).toBeUndefined();
  });

  test('always uses AVERAGE costing method', () => {
    const formData: ItemFormData = {
      name: 'Test Item',
      sku: 'TEST-123',
      categoryId: 'cat1',
      storageUnitId: 'kg',
      ingredientUnitId: 'g',
      cost: 10.50
    };
    
    const payload = mapFormDataToCreatePayload(formData);
    
    expect(payload.costing?.costMethod).toBe('AVERAGE');
  });
});

describe('SKU Uniqueness Validation', () => {
  test('detects existing SKUs', () => {
    const existingItems = [
      { sku: 'TEST-123' },
      { sku: 'ITEM-456' }
    ];
    
    const result = validateSKUUniqueness('TEST-123', existingItems);
    expect(result.isUnique).toBe(false);
    expect(result.conflictingSKU).toBe('TEST-123');
  });

  test('confirms unique SKUs', () => {
    const existingItems = [
      { sku: 'TEST-123' },
      { sku: 'ITEM-456' }
    ];
    
    const result = validateSKUUniqueness('NEW-789', existingItems);
    expect(result.isUnique).toBe(true);
    expect(result.conflictingSKU).toBeUndefined();
  });

  test('handles case-insensitive comparison', () => {
    const existingItems = [
      { sku: 'test-123' }
    ];
    
    const result = validateSKUUniqueness('TEST-123', existingItems);
    expect(result.isUnique).toBe(false);
  });
});

describe('API Error Mapping', () => {
  test('maps field-specific errors correctly', () => {
    const apiErrors = [
      { field: 'name', message: 'Name is required' },
      { field: 'sku', message: 'SKU already exists' }
    ];
    
    const formErrors = mapAPIErrorsToFormErrors(apiErrors);
    
    expect(formErrors).toEqual({
      name: 'Name is required',
      sku: 'SKU already exists'
    });
  });

  test('maps nested field paths', () => {
    const apiErrors = [
      { field: 'uom.base', message: 'Storage unit is required' },
      { field: 'levels.par.min', message: 'Minimum level must be positive' }
    ];
    
    const formErrors = mapAPIErrorsToFormErrors(apiErrors);
    
    expect(formErrors).toEqual({
      storageUnitId: 'Storage unit is required',
      minimumLevel: 'Minimum level must be positive'
    });
  });

  test('handles general errors without field', () => {
    const apiErrors = [
      { message: 'Server error occurred' }
    ];
    
    const formErrors = mapAPIErrorsToFormErrors(apiErrors);
    
    expect(formErrors).toEqual({
      _form: 'Server error occurred'
    });
  });
});

describe('Form State Management', () => {
  test('creates default form data', () => {
    const defaultData = createDefaultFormData();
    
    expect(defaultData).toEqual({
      name: '',
      sku: '',
      categoryId: '',
      storageUnitId: '',
      ingredientUnitId: '',
      barcode: '',
      cost: undefined,
      minimumLevel: undefined,
      parLevel: undefined,
      maximumLevel: undefined
    });
  });

  test('maps inventory item back to form data', () => {
    const mockItem: Partial<InventoryItem> = {
      id: 'item-1',
      name: 'Test Item',
      sku: 'TEST-123',
      categoryId: 'cat1',
      costing: {
        averageCost: 10.50,
        lastCost: 10.50,
        currency: 'USD',
        costMethod: 'AVERAGE'
      },
      levels: {
        current: 25,
        reserved: 0,
        available: 25,
        onOrder: 0,
        par: {
          min: 5,
          max: 50,
          reorderPoint: 5,
          reorderQuantity: 20
        }
      }
    };
    
    const formData = mapItemToFormData(mockItem as InventoryItem);
    
    expect(formData).toEqual({
      name: 'Test Item',
      sku: 'TEST-123',
      categoryId: 'cat1',
      storageUnitId: 'kg',
      ingredientUnitId: 'g',
      barcode: '1234567890123',
      cost: 10.50,
      minimumLevel: 5,
      parLevel: undefined,
      maximumLevel: 50
    });
  });
});
