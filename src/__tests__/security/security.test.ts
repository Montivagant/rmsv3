import { describe, it, expect } from 'vitest';
import { 
  sanitizeInput, 
  sanitizeSQL, 
  RateLimiter,
  validatePasswordStrength 
} from '../../security/validation';

describe('Security Validation', () => {
  describe('XSS Protection', () => {
    it('should remove script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).toBe('Hello');
    });

    it('should remove javascript: protocols', () => {
      const maliciousInput = 'javascript:alert("xss")';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const maliciousInput = 'onclick="alert(1)" Hello';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).toBe('Hello');
    });
  });

  describe('SQL Injection Protection', () => {
    it('should remove SQL keywords', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const sanitized = sanitizeSQL(maliciousInput);
      expect(sanitized).not.toContain('DROP');
    });

    it('should remove dangerous characters', () => {
      const maliciousInput = "admin'; --";
      const sanitized = sanitizeSQL(maliciousInput);
      expect(sanitized).toBe('admin');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limits', () => {
      const limiter = new RateLimiter(5, 60000);
      
      for (let i = 0; i < 5; i++) {
        expect(limiter.isAllowed('user1')).toBe(true);
      }
      
      expect(limiter.isAllowed('user1')).toBe(false);
    });

    it('should handle multiple users independently', () => {
      const limiter = new RateLimiter(3, 60000);
      
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user2')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
    });
  });

  describe('Password Security', () => {
    it('should validate strong passwords', () => {
      const result = validatePasswordStrength('MySecure123!');
      expect(result.isSecure).toBe(true);
      expect(result.score).toBe(5);
      expect(result.feedback).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const result = validatePasswordStrength('123');
      expect(result.isSecure).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
    });
  });
});
