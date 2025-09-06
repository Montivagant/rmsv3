import { describe, it, expect, beforeEach } from 'vitest';
import { 
  validateSupplierForm,
  generateSupplierCode,
  createDefaultSupplierFormData,
  type SupplierFormData 
} from '../schemas/supplierForm';
import { mapSupplierFormToCreatePayload } from '../lib/suppliers/mapSupplierForm';

describe('Supplier Form Validation', () => {
  describe('validateSupplierForm', () => {
    it('should validate required fields', () => {
      const emptyData = createDefaultSupplierFormData();
      const { isValid, errors } = validateSupplierForm(emptyData);
      
      expect(isValid).toBe(false);
      expect(errors.name).toBeDefined();
      expect(errors.name).toContain('Supplier name must be at least 2 characters');
    });

    it('should pass validation with valid required data', () => {
      const validData: SupplierFormData = {
        name: 'Test Supplier',
        code: '',
        contactName: '',
        phone: '',
        primaryEmail: '',
        additionalEmails: []
      };
      
      const { isValid, errors } = validateSupplierForm(validData);
      
      expect(isValid).toBe(true);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should validate name length constraints', () => {
      const shortName = { ...createDefaultSupplierFormData(), name: 'A' };
      const { isValid: shortValid, errors: shortErrors } = validateSupplierForm(shortName);
      
      expect(shortValid).toBe(false);
      expect(shortErrors.name).toContain('at least 2 characters');
      
      const longName = { ...createDefaultSupplierFormData(), name: 'A'.repeat(81) };
      const { isValid: longValid, errors: longErrors } = validateSupplierForm(longName);
      
      expect(longValid).toBe(false);
      expect(longErrors.name).toContain('cannot exceed 80 characters');
    });

    it('should validate supplier code format', () => {
      const invalidCode = { 
        ...createDefaultSupplierFormData(), 
        name: 'Valid Supplier',
        code: 'invalid code!' 
      };
      const { isValid, errors } = validateSupplierForm(invalidCode);
      
      expect(isValid).toBe(false);
      expect(errors.code).toContain('can only contain letters, numbers, underscores, and hyphens');
    });

    it('should validate supplier code length', () => {
      const longCode = { 
        ...createDefaultSupplierFormData(), 
        name: 'Valid Supplier',
        code: 'A'.repeat(17) 
      };
      const { isValid, errors } = validateSupplierForm(longCode);
      
      expect(isValid).toBe(false);
      expect(errors.code).toContain('Code must be 1-16 characters if provided');
    });

    it('should validate E.164 phone format', () => {
      const invalidPhone = { 
        ...createDefaultSupplierFormData(), 
        name: 'Valid Supplier',
        phone: '123-456-7890' 
      };
      const { isValid, errors } = validateSupplierForm(invalidPhone);
      
      expect(isValid).toBe(false);
      expect(errors.phone).toContain('must be in E.164 format');

      const validPhone = { 
        ...createDefaultSupplierFormData(), 
        name: 'Valid Supplier',
        phone: '+201234567890' 
      };
      const { isValid: validPhoneResult } = validateSupplierForm(validPhone);
      
      expect(validPhoneResult).toBe(true);
    });

    it('should validate email format', () => {
      const invalidEmail = { 
        ...createDefaultSupplierFormData(), 
        name: 'Valid Supplier',
        primaryEmail: 'invalid-email' 
      };
      const { isValid, errors } = validateSupplierForm(invalidEmail);
      
      expect(isValid).toBe(false);
      expect(errors.primaryEmail).toContain('valid email address');

      const validEmail = { 
        ...createDefaultSupplierFormData(), 
        name: 'Valid Supplier',
        primaryEmail: 'test@example.com' 
      };
      const { isValid: validEmailResult } = validateSupplierForm(validEmail);
      
      expect(validEmailResult).toBe(true);
    });

    it('should validate additional emails array', () => {
      const invalidAdditionalEmails = { 
        ...createDefaultSupplierFormData(), 
        name: 'Valid Supplier',
        additionalEmails: ['valid@example.com', 'invalid-email', 'another@example.com']
      };
      const { isValid, errors } = validateSupplierForm(invalidAdditionalEmails);
      
      expect(isValid).toBe(false);
      expect(errors.additionalEmails).toContain('must be valid email addresses');
    });

    it('should handle empty optional fields', () => {
      const dataWithEmptyOptionals: SupplierFormData = {
        name: 'Valid Supplier',
        code: '',
        contactName: '',
        phone: '',
        primaryEmail: '',
        additionalEmails: []
      };
      
      const { isValid, errors } = validateSupplierForm(dataWithEmptyOptionals);
      
      expect(isValid).toBe(true);
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('generateSupplierCode', () => {
    it('should generate code from supplier name', () => {
      const code = generateSupplierCode('Premium Meat Supply Co.');
      
      expect(code).toMatch(/^[A-Z0-9]+$/);
      expect(code.length).toBeGreaterThan(3);
      expect(code.length).toBeLessThanOrEqual(16);
    });

    it('should return empty string for empty name', () => {
      const code = generateSupplierCode('');
      expect(code).toBe('');
    });

    it('should avoid existing codes', () => {
      const existingCodes = ['PREM123', 'PREM456', 'PREM789'];
      const code = generateSupplierCode('Premium Meat Supply Co.', existingCodes);
      
      expect(existingCodes).not.toContain(code);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should handle special characters in name', () => {
      const code = generateSupplierCode('Fresh & Clean Supplies Ltd.');
      
      expect(code).toMatch(/^[A-Z0-9]+$/);
      expect(code).not.toContain('&');
      expect(code).not.toContain(' ');
    });
  });

  describe('mapSupplierFormToCreatePayload', () => {
    it('should map required fields correctly', () => {
      const formData: SupplierFormData = {
        name: 'Test Supplier',
        code: '',
        contactName: '',
        phone: '',
        primaryEmail: '',
        additionalEmails: []
      };
      
      const payload = mapSupplierFormToCreatePayload(formData);
      
      expect(payload.name).toBe('Test Supplier');
      expect(payload.code).toBeUndefined();
      expect(payload.contactName).toBeUndefined();
      expect(payload.phone).toBeUndefined();
      expect(payload.primaryEmail).toBeUndefined();
      expect(payload.additionalEmails).toBeUndefined();
    });

    it('should map all fields when provided', () => {
      const formData: SupplierFormData = {
        name: 'Test Supplier',
        code: 'test123',
        contactName: 'John Doe',
        phone: '+201234567890',
        primaryEmail: 'orders@test.com',
        additionalEmails: ['sales@test.com', 'support@test.com']
      };
      
      const payload = mapSupplierFormToCreatePayload(formData);
      
      expect(payload.name).toBe('Test Supplier');
      expect(payload.code).toBe('TEST123'); // Should be uppercased
      expect(payload.contactName).toBe('John Doe');
      expect(payload.phone).toBe('+201234567890');
      expect(payload.primaryEmail).toBe('orders@test.com');
      expect(payload.additionalEmails).toEqual(['sales@test.com', 'support@test.com']);
    });

    it('should trim whitespace from all fields', () => {
      const formData: SupplierFormData = {
        name: '  Test Supplier  ',
        code: '  test123  ',
        contactName: '  John Doe  ',
        phone: '  +201234567890  ',
        primaryEmail: '  Orders@Test.com  ',
        additionalEmails: ['  Sales@Test.com  ', '  Support@Test.com  ']
      };
      
      const payload = mapSupplierFormToCreatePayload(formData);
      
      expect(payload.name).toBe('Test Supplier');
      expect(payload.code).toBe('TEST123');
      expect(payload.contactName).toBe('John Doe');
      expect(payload.phone).toBe('+201234567890');
      expect(payload.primaryEmail).toBe('orders@test.com');
      expect(payload.additionalEmails).toEqual(['sales@test.com', 'support@test.com']);
    });

    it('should filter out empty additional emails', () => {
      const formData: SupplierFormData = {
        name: 'Test Supplier',
        code: '',
        contactName: '',
        phone: '',
        primaryEmail: '',
        additionalEmails: ['valid@test.com', '', '  ', 'another@test.com']
      };
      
      const payload = mapSupplierFormToCreatePayload(formData);
      
      expect(payload.additionalEmails).toEqual(['valid@test.com', 'another@test.com']);
    });
  });
});
