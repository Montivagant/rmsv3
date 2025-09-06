/**
 * Item Form Schema Tests
 * 
 * Tests validation logic for the simplified "Add Item" form
 */

import { describe, it, expect } from 'vitest';
import {
  type ItemFormData,
  validateItemForm,
  generateSKU,
  validateBarcode,
  EAN13_PATTERN,
  UPC_PATTERN,
} from '../../schemas/itemForm';

describe('Item Form Validation', () => {
  // Helper to create valid form data
  const createValidFormData = (): ItemFormData => ({
    name: 'Test Item',
    sku: 'TEST-001',
    categoryId: 'cat-1',
    storageUnitId: 'pieces',
    ingredientUnitId: 'pieces',
    barcode: '',
    cost: undefined,
    minimumLevel: undefined,
    parLevel: undefined,
    maximumLevel: undefined,
  });

  describe('Required Field Validation', () => {
    it('should validate all required fields are present', () => {
      const validData = createValidFormData();
      const result = validateItemForm(validData);
      
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should require name field', () => {
      const data = createValidFormData();
      data.name = '';
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Name is required');
    });

    it('should require name field not just whitespace', () => {
      const data = createValidFormData();
      data.name = '   ';
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Name is required');
    });

    it('should require SKU field', () => {
      const data = createValidFormData();
      data.sku = '';
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.sku).toBe('SKU is required');
    });

    it('should require category field', () => {
      const data = createValidFormData();
      data.categoryId = '';
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.categoryId).toBe('Category is required');
    });

    it('should require storage unit field', () => {
      const data = createValidFormData();
      data.storageUnitId = '';
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.storageUnitId).toBe('Storage unit is required');
    });

    it('should require ingredient unit field', () => {
      const data = createValidFormData();
      data.ingredientUnitId = '';
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.ingredientUnitId).toBe('Ingredient unit is required');
    });
  });

  describe('Name Validation', () => {
    it('should accept valid names', () => {
      const validNames = [
        'Tomatoes',
        'Extra Virgin Olive Oil',
        'Burger Buns (Sesame)',
        'A', // Minimum length
        'A'.repeat(120), // Maximum length
      ];

      validNames.forEach(name => {
        const data = createValidFormData();
        data.name = name;
        const result = validateItemForm(data);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject names that are too long', () => {
      const data = createValidFormData();
      data.name = 'A'.repeat(121); // Too long
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Name cannot exceed 120 characters');
    });
  });

  describe('SKU Validation', () => {
    it('should accept valid SKUs', () => {
      const validSKUs = [
        'ABC',      // Minimum length
        'ABCDEFGHIJ0123456789',  // Maximum length (20 chars)
        'BEEF-001',
        'CHKN_BREAST',
        'FRIES001',
        'A-B_C123',
      ];

      validSKUs.forEach(sku => {
        const data = createValidFormData();
        data.sku = sku;
        const result = validateItemForm(data);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject SKUs that are too short', () => {
      const data = createValidFormData();
      data.sku = 'AB'; // Too short
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.sku).toBe('SKU must be at least 3 characters');
    });

    it('should reject SKUs that are too long', () => {
      const data = createValidFormData();
      data.sku = 'A'.repeat(21); // Too long
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.sku).toBe('SKU cannot exceed 20 characters');
    });

    it('should reject SKUs with invalid characters', () => {
      const invalidSKUs = [
        'ABC 123',  // Space
        'ABC.123',  // Dot
        'ABC@123',  // Special character
        'ABC/123',  // Slash
        'ABC+123',  // Plus
      ];

      invalidSKUs.forEach(sku => {
        const data = createValidFormData();
        data.sku = sku;
        const result = validateItemForm(data);
        expect(result.isValid).toBe(false);
        expect(result.errors.sku).toBe('SKU can only contain letters, numbers, underscores, and hyphens');
      });
    });
  });

  describe('Optional Fields Validation', () => {
    it('should accept empty optional fields', () => {
      const data = createValidFormData();
      data.barcode = '';
      data.cost = undefined;
      data.minimumLevel = undefined;
      data.parLevel = undefined;
      data.maximumLevel = undefined;
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(true);
    });

    it('should validate barcode length', () => {
      const data = createValidFormData();
      data.barcode = 'A'.repeat(33); // Too long
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.barcode).toBe('Barcode cannot exceed 32 characters');
    });

    it('should reject negative cost', () => {
      const data = createValidFormData();
      data.cost = -1;
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.cost).toBe('Cost cannot be negative');
    });

    it('should reject negative levels', () => {
      const data = createValidFormData();
      data.minimumLevel = -1;
      data.parLevel = -1;
      data.maximumLevel = -1;
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.minimumLevel).toBe('Minimum level cannot be negative');
      expect(result.errors.parLevel).toBe('Par level cannot be negative');
      expect(result.errors.maximumLevel).toBe('Maximum level cannot be negative');
    });
  });

  describe('Cross-Field Validation', () => {
    it('should validate level hierarchy: max >= par >= min', () => {
      const data = createValidFormData();
      data.minimumLevel = 10;
      data.parLevel = 20;
      data.maximumLevel = 30;
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(true);
    });

    it('should reject par level less than minimum level', () => {
      const data = createValidFormData();
      data.minimumLevel = 20;
      data.parLevel = 10; // Less than min
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.parLevel).toBe('Par level must be greater than or equal to minimum level');
    });

    it('should reject maximum level less than par level', () => {
      const data = createValidFormData();
      data.parLevel = 20;
      data.maximumLevel = 10; // Less than par
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.maximumLevel).toBe('Maximum level must be greater than or equal to par level');
    });

    it('should reject maximum level less than minimum level', () => {
      const data = createValidFormData();
      data.minimumLevel = 20;
      data.maximumLevel = 10; // Less than min
      
      const result = validateItemForm(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.maximumLevel).toBe('Maximum level must be greater than or equal to minimum level');
    });

    it('should allow partial level definitions', () => {
      // Only min and max, no par
      const data1 = createValidFormData();
      data1.minimumLevel = 10;
      data1.maximumLevel = 30;
      
      const result1 = validateItemForm(data1);
      expect(result1.isValid).toBe(true);

      // Only min and par, no max
      const data2 = createValidFormData();
      data2.minimumLevel = 10;
      data2.parLevel = 20;
      
      const result2 = validateItemForm(data2);
      expect(result2.isValid).toBe(true);
    });
  });
});

describe('SKU Generation', () => {
  it('should generate SKU with default prefix', () => {
    const sku = generateSKU('Test Item');
    expect(sku).toMatch(/^ITM-[A-Z0-9]{3}\d{3}$/);
  });

  it('should generate SKU with custom prefix', () => {
    const sku = generateSKU('Test Item', { prefix: 'PROD' });
    expect(sku).toMatch(/^PROD-[A-Z0-9]{3}\d{3}$/);
  });

  it('should use first 3 characters of name', () => {
    const sku = generateSKU('Tomatoes Fresh Red', { prefix: 'ITM' });
    expect(sku).toMatch(/^ITM-TOM\d{3}$/);
  });

  it('should pad short names', () => {
    const sku = generateSKU('AB', { prefix: 'ITM' });
    expect(sku).toMatch(/^ITM-ABX\d{3}$/);
  });

  it('should handle names with special characters', () => {
    const sku = generateSKU('Olive Oil (Extra Virgin)', { prefix: 'ITM' });
    expect(sku).toMatch(/^ITM-OLI\d{3}$/);
  });

  it('should avoid existing SKUs', () => {
    const existingSKUs = ['ITM-TOM001', 'ITM-TOM002'];
    const sku = generateSKU('Tomatoes', { prefix: 'ITM', existingSKUs });
    
    expect(existingSKUs).not.toContain(sku);
    expect(sku).toMatch(/^ITM-TOM\d{3}$/);
  });
});

describe('Barcode Validation', () => {
  it('should accept empty barcode', () => {
    const result = validateBarcode('');
    expect(result.isValid).toBe(true);
  });

  it('should accept valid EAN-13 barcode', () => {
    const result = validateBarcode('1234567890123');
    expect(result.isValid).toBe(true);
  });

  it('should accept valid UPC barcode', () => {
    const result = validateBarcode('123456789012');
    expect(result.isValid).toBe(true);
  });

  it('should warn about short barcodes', () => {
    const result = validateBarcode('1234567');
    expect(result.isValid).toBe(true);
    expect(result.message).toBe('Barcode seems short. Verify it\'s correct.');
  });

  it('should reject overly long barcodes', () => {
    const result = validateBarcode('A'.repeat(33));
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Barcode cannot exceed 32 characters');
  });

  it('should validate EAN-13 pattern', () => {
    expect(EAN13_PATTERN.test('1234567890123')).toBe(true);
    expect(EAN13_PATTERN.test('12345678901234')).toBe(false); // Too long
    expect(EAN13_PATTERN.test('123456789012')).toBe(false); // Too short
    expect(EAN13_PATTERN.test('123456789012A')).toBe(false); // Not all digits
  });

  it('should validate UPC pattern', () => {
    expect(UPC_PATTERN.test('123456789012')).toBe(true);
    expect(UPC_PATTERN.test('1234567890123')).toBe(false); // Too long
    expect(UPC_PATTERN.test('12345678901')).toBe(false); // Too short
    expect(UPC_PATTERN.test('12345678901A')).toBe(false); // Not all digits
  });
});
