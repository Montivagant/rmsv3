import { describe, it, expect } from 'vitest';
import { 
  validateCategoryForm,
  generateCategoryReference,
  createDefaultCategoryFormData,
  type CategoryFormData 
} from '../schemas/categoryForm';
import { mapCategoryFormToCreatePayload } from '../lib/categories/mapCategoryForm';

describe('Category Form Validation', () => {
  describe('validateCategoryForm', () => {
    it('should validate required fields', () => {
      const emptyData = createDefaultCategoryFormData();
      const { isValid, errors } = validateCategoryForm(emptyData);
      
      expect(isValid).toBe(false);
      expect(errors.name).toBeDefined();
      expect(errors.name).toContain('Category name must be at least 2 characters');
    });

    it('should pass validation with valid required data', () => {
      const validData: CategoryFormData = {
        name: 'Appetizers',
        reference: ''
      };
      
      const { isValid, errors } = validateCategoryForm(validData);
      
      expect(isValid).toBe(true);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should validate name length constraints', () => {
      const shortName = { ...createDefaultCategoryFormData(), name: 'A' };
      const { isValid: shortValid, errors: shortErrors } = validateCategoryForm(shortName);
      
      expect(shortValid).toBe(false);
      expect(shortErrors.name).toContain('at least 2 characters');
      
      const longName = { ...createDefaultCategoryFormData(), name: 'A'.repeat(41) };
      const { isValid: longValid, errors: longErrors } = validateCategoryForm(longName);
      
      expect(longValid).toBe(false);
      expect(longErrors.name).toContain('cannot exceed 40 characters');
    });

    it('should validate reference code format', () => {
      const invalidReference = { 
        ...createDefaultCategoryFormData(), 
        name: 'Valid Category',
        reference: 'invalid reference!' 
      };
      const { isValid, errors } = validateCategoryForm(invalidReference);
      
      expect(isValid).toBe(false);
      expect(errors.reference).toContain('can only contain letters, numbers, underscores, and hyphens (no spaces)');
    });

    it('should validate reference code length', () => {
      const longReference = { 
        ...createDefaultCategoryFormData(), 
        name: 'Valid Category',
        reference: 'A'.repeat(25) 
      };
      const { isValid, errors } = validateCategoryForm(longReference);
      
      expect(isValid).toBe(false);
      expect(errors.reference).toContain('cannot exceed 24 characters');
    });

    it('should reject spaces in reference code', () => {
      const spaceReference = { 
        ...createDefaultCategoryFormData(), 
        name: 'Valid Category',
        reference: 'MAIN COURSE' 
      };
      const { isValid, errors } = validateCategoryForm(spaceReference);
      
      expect(isValid).toBe(false);
      expect(errors.reference).toContain('no spaces');
    });

    it('should accept valid reference codes', () => {
      const validCodes = ['APPETIZERS', 'MAIN_COURSE', 'DRINKS-01', 'CAT123'];
      
      validCodes.forEach(code => {
        const data = { 
          ...createDefaultCategoryFormData(), 
          name: 'Valid Category',
          reference: code
        };
        const { isValid } = validateCategoryForm(data);
        expect(isValid).toBe(true);
      });
    });

    it('should handle empty optional reference', () => {
      const dataWithEmptyReference: CategoryFormData = {
        name: 'Valid Category',
        reference: ''
      };
      
      const { isValid, errors } = validateCategoryForm(dataWithEmptyReference);
      
      expect(isValid).toBe(true);
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('generateCategoryReference', () => {
    it('should generate reference from category name', () => {
      const reference = generateCategoryReference('Main Course Items');
      
      expect(reference).toMatch(/^[A-Z0-9]+$/);
      expect(reference.length).toBeGreaterThan(0);
      expect(reference.length).toBeLessThanOrEqual(24);
    });

    it('should return empty string for empty name', () => {
      const reference = generateCategoryReference('');
      expect(reference).toBe('');
    });

    it('should avoid existing references', () => {
      const existingReferences = ['MAIN', 'MAIN01', 'MAIN02'];
      const reference = generateCategoryReference('Main Course Items', existingReferences);
      
      expect(existingReferences).not.toContain(reference);
      expect(reference).toMatch(/^[A-Z0-9]+$/);
    });

    it('should handle special characters in name', () => {
      const reference = generateCategoryReference('Drinks & Beverages (Hot)');
      
      expect(reference).toMatch(/^[A-Z0-9]+$/);
      expect(reference).not.toContain('&');
      expect(reference).not.toContain(' ');
      expect(reference).not.toContain('(');
      expect(reference).not.toContain(')');
    });

    it('should use base reference if unique', () => {
      const reference = generateCategoryReference('Appetizers');
      
      expect(reference).toBe('APPETI'); // First 6 chars
    });

    it('should add numeric suffix when base is taken', () => {
      const existingReferences = ['APPETI'];
      const reference = generateCategoryReference('Appetizers', existingReferences);
      
      expect(reference).toMatch(/^APPETI\d{2}$/);
    });
  });

  describe('mapCategoryFormToCreatePayload', () => {
    it('should map required fields correctly', () => {
      const formData: CategoryFormData = {
        name: 'Test Category',
        reference: ''
      };
      
      const payload = mapCategoryFormToCreatePayload(formData);
      
      expect(payload.name).toBe('Test Category');
      expect(payload.reference).toBeUndefined();
    });

    it('should map all fields when provided', () => {
      const formData: CategoryFormData = {
        name: 'Test Category',
        reference: 'testcat'
      };
      
      const payload = mapCategoryFormToCreatePayload(formData);
      
      expect(payload.name).toBe('Test Category');
      expect(payload.reference).toBe('TESTCAT'); // Should be uppercased
    });

    it('should trim whitespace from all fields', () => {
      const formData: CategoryFormData = {
        name: '  Test Category  ',
        reference: '  testcat  '
      };
      
      const payload = mapCategoryFormToCreatePayload(formData);
      
      expect(payload.name).toBe('Test Category');
      expect(payload.reference).toBe('TESTCAT');
    });

    it('should handle empty reference field', () => {
      const formData: CategoryFormData = {
        name: 'Test Category',
        reference: '   ' // Whitespace only
      };
      
      const payload = mapCategoryFormToCreatePayload(formData);
      
      expect(payload.name).toBe('Test Category');
      expect(payload.reference).toBeUndefined();
    });
  });
});
