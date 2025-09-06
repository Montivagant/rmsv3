import { describe, it, expect } from 'vitest';
import { CountSheetUtils, COUNT_SHEET_CONFIG } from '../../../inventory/count-sheets/types';
import type { CreateCountSheetRequest } from '../../../inventory/count-sheets/types';

describe('Count Sheet Validation', () => {
  describe('validateCountSheet', () => {
    it('should pass validation for valid request', () => {
      const request: CreateCountSheetRequest = {
        name: 'Test Count Sheet',
        branchScope: { type: 'all' },
        criteria: {
          categoryIds: ['produce', 'meat'],
          includeZeroStock: true
        }
      };

      const result = CountSheetUtils.validateCountSheet(request);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if name is empty', () => {
      const request: CreateCountSheetRequest = {
        name: '',
        branchScope: { type: 'all' },
        criteria: {
          categoryIds: ['produce']
        }
      };

      const result = CountSheetUtils.validateCountSheet(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should fail if name is too long', () => {
      const request: CreateCountSheetRequest = {
        name: 'a'.repeat(COUNT_SHEET_CONFIG.MAX_NAME_LENGTH + 1),
        branchScope: { type: 'all' },
        criteria: {
          categoryIds: ['produce']
        }
      };

      const result = CountSheetUtils.validateCountSheet(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Name must be ${COUNT_SHEET_CONFIG.MAX_NAME_LENGTH} characters or less`);
    });

    it('should fail if specific branch scope has no branch ID', () => {
      const request: CreateCountSheetRequest = {
        name: 'Test Sheet',
        branchScope: { type: 'specific', branchId: '' },
        criteria: {
          categoryIds: ['produce']
        }
      };

      const result = CountSheetUtils.validateCountSheet(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Branch is required for specific branch scope');
    });

    it('should fail if no criteria is provided', () => {
      const request: CreateCountSheetRequest = {
        name: 'Test Sheet',
        branchScope: { type: 'all' },
        criteria: {}
      };

      const result = CountSheetUtils.validateCountSheet(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one filter criteria or item selection is required');
    });

    it('should fail if too many categories are selected', () => {
      const categoryIds = Array.from({ length: COUNT_SHEET_CONFIG.MAX_CATEGORY_FILTERS + 1 }, (_, i) => `cat-${i}`);
      
      const request: CreateCountSheetRequest = {
        name: 'Test Sheet',
        branchScope: { type: 'all' },
        criteria: { categoryIds }
      };

      const result = CountSheetUtils.validateCountSheet(request);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Maximum ${COUNT_SHEET_CONFIG.MAX_CATEGORY_FILTERS} categories allowed`);
    });

    it('should pass with mixed criteria types', () => {
      const request: CreateCountSheetRequest = {
        name: 'Complex Sheet',
        branchScope: { type: 'specific', branchId: 'branch-1' },
        criteria: {
          categoryIds: ['produce'],
          supplierIds: ['supplier-1', 'supplier-2'],
          storageAreaIds: ['freezer'],
          itemIds: ['item-1', 'item-2'],
          includeTags: ['organic'],
          excludeTags: ['discontinued'],
          includeZeroStock: false
        }
      };

      const result = CountSheetUtils.validateCountSheet(request);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Utility Functions', () => {
    const mockBranches = [
      { id: 'branch-1', name: 'Main Restaurant' },
      { id: 'branch-2', name: 'Downtown Branch' }
    ];

    const mockCategories = [
      { id: 'produce', name: 'Produce' },
      { id: 'meat', name: 'Meat & Seafood' }
    ];

    const mockSuppliers = [
      { id: 'supplier-1', name: 'Fresh Farms' },
      { id: 'supplier-2', name: 'Quality Meats' }
    ];

    const mockStorageAreas = [
      { id: 'freezer', name: 'Walk-in Freezer' },
      { id: 'cooler', name: 'Walk-in Cooler' }
    ];

    describe('formatBranchScope', () => {
      it('should format all branches scope', () => {
        const scope = { type: 'all' as const };
        const result = CountSheetUtils.formatBranchScope(scope, mockBranches);
        expect(result).toBe('All Branches');
      });

      it('should format specific branch scope', () => {
        const scope = { type: 'specific' as const, branchId: 'branch-1' };
        const result = CountSheetUtils.formatBranchScope(scope, mockBranches);
        expect(result).toBe('Main Restaurant');
      });

      it('should fallback to branch ID if not found', () => {
        const scope = { type: 'specific' as const, branchId: 'unknown-branch' };
        const result = CountSheetUtils.formatBranchScope(scope, mockBranches);
        expect(result).toBe('unknown-branch');
      });
    });

    describe('formatScopeSummary', () => {
      it('should format categories only', () => {
        const criteria = { categoryIds: ['produce', 'meat'] };
        const result = CountSheetUtils.formatScopeSummary(criteria, {
          categories: mockCategories
        });
        
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('category');
        expect(result[0].label).toBe('Categories: Produce, Meat & Seafood');
      });

      it('should format suppliers with truncation', () => {
        const criteria = { supplierIds: ['supplier-1', 'supplier-2', 'supplier-3'] };
        const result = CountSheetUtils.formatScopeSummary(criteria, {
          suppliers: mockSuppliers
        });
        
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('supplier');
        expect(result[0].label).toBe('Suppliers: Fresh Farms, Quality Meats +1 more');
      });

      it('should format mixed criteria', () => {
        const criteria = {
          categoryIds: ['produce'],
          storageAreaIds: ['freezer'],
          itemIds: ['item-1', 'item-2', 'item-3'],
          includeZeroStock: false
        };
        
        const result = CountSheetUtils.formatScopeSummary(criteria, {
          categories: mockCategories,
          storageAreas: mockStorageAreas
        });
        
        expect(result).toHaveLength(4);
        expect(result.find(r => r.type === 'category')?.label).toBe('Categories: Produce');
        expect(result.find(r => r.type === 'storage')?.label).toBe('Storage: Walk-in Freezer');
        expect(result.find(r => r.type === 'items')?.label).toBe('3 specific items');
        expect(result.find(r => r.type === 'stock')?.label).toBe('Exclude zero stock');
      });

      it('should handle empty criteria', () => {
        const criteria = {};
        const result = CountSheetUtils.formatScopeSummary(criteria, {});
        
        expect(result).toHaveLength(0);
      });
    });

    describe('Permission Checks', () => {
      const mockSheet = {
        id: 'sheet-1',
        name: 'Test Sheet',
        branchScope: { type: 'all' as const },
        criteria: { categoryIds: ['produce'] },
        isArchived: false,
        createdAt: Date.now(),
        createdBy: 'user-1'
      };

      const archivedSheet = { ...mockSheet, isArchived: true };

      it('should check archive permissions correctly', () => {
        expect(CountSheetUtils.canArchive(mockSheet)).toBe(true);
        expect(CountSheetUtils.canArchive(archivedSheet)).toBe(false);
      });

      it('should check unarchive permissions correctly', () => {
        expect(CountSheetUtils.canUnarchive(mockSheet)).toBe(false);
        expect(CountSheetUtils.canUnarchive(archivedSheet)).toBe(true);
      });

      it('should check use permissions correctly', () => {
        expect(CountSheetUtils.canUse(mockSheet)).toBe(true);
        expect(CountSheetUtils.canUse(archivedSheet)).toBe(false);
      });

      it('should allow editing all sheets', () => {
        expect(CountSheetUtils.canEdit(mockSheet)).toBe(true);
        expect(CountSheetUtils.canEdit(archivedSheet)).toBe(true);
      });

      it('should allow duplicating all sheets', () => {
        expect(CountSheetUtils.canDuplicate(mockSheet)).toBe(true);
        expect(CountSheetUtils.canDuplicate(archivedSheet)).toBe(true);
      });
    });

    describe('formatLastUsed', () => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      it('should format never used', () => {
        expect(CountSheetUtils.formatLastUsed()).toBe('Never used');
        expect(CountSheetUtils.formatLastUsed(undefined)).toBe('Never used');
      });

      it('should format today', () => {
        expect(CountSheetUtils.formatLastUsed(now)).toBe('Today');
      });

      it('should format yesterday', () => {
        expect(CountSheetUtils.formatLastUsed(now - oneDay)).toBe('Yesterday');
      });

      it('should format days ago', () => {
        expect(CountSheetUtils.formatLastUsed(now - (3 * oneDay))).toBe('3 days ago');
      });

      it('should format weeks ago', () => {
        expect(CountSheetUtils.formatLastUsed(now - (10 * oneDay))).toBe('1 weeks ago');
      });

      it('should format months ago', () => {
        expect(CountSheetUtils.formatLastUsed(now - (45 * oneDay))).toBe('1 months ago');
      });

      it('should format years ago with date', () => {
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        
        const result = CountSheetUtils.formatLastUsed(yearAgo.getTime());
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Should be a formatted date
      });
    });
  });
});
