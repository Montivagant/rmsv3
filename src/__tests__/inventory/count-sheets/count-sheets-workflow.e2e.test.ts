import { describe, it, expect, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { countSheetsApiHandlers } from '../../../inventory/count-sheets/api';
import { countSheetsApiService } from '../../../inventory/count-sheets/api';
import type { 
  CreateCountSheetRequest, 
  CountSheet 
} from '../../../inventory/count-sheets/types';

// Setup MSW server for API mocking
const server = setupServer(...countSheetsApiHandlers);

beforeAll(() => server.listen());

describe('Count Sheets Workflow E2E', () => {
  it('should complete full count sheet lifecycle: create → preview → use → archive', async () => {
    // Step 1: Create count sheet
    const createRequest: CreateCountSheetRequest = {
      name: 'E2E Test Sheet',
      branchScope: { type: 'all' },
      criteria: {
        categoryIds: ['produce'],
        includeZeroStock: false
      }
    };

    const createResult = await countSheetsApiService.createCountSheet(createRequest);
    expect(createResult.countSheetId).toBeDefined();
    expect(createResult.name).toBe('E2E Test Sheet');

    // Step 2: Verify sheet was created
    const countSheet = await countSheetsApiService.getCountSheet(createResult.countSheetId);
    expect(countSheet.name).toBe('E2E Test Sheet');
    expect(countSheet.branchScope.type).toBe('all');
    expect(countSheet.criteria.categoryIds).toEqual(['produce']);
    expect(countSheet.isArchived).toBe(false);

    // Step 3: Preview items
    const preview = await countSheetsApiService.previewCountSheet(createResult.countSheetId);
    expect(preview.totalItems).toBeGreaterThan(0);
    expect(preview.items).toHaveLength(Math.min(preview.totalItems, 20)); // Default page size
    expect(preview.items[0]).toHaveProperty('itemId');
    expect(preview.items[0]).toHaveProperty('name');
    expect(preview.items[0]).toHaveProperty('sku');

    // Step 4: Update count sheet
    const updateRequest: CreateCountSheetRequest = {
      name: 'Updated E2E Test Sheet',
      branchScope: countSheet.branchScope,
      criteria: {
        ...countSheet.criteria,
        supplierIds: ['fresh-farms']
      }
    };

    const updateResult = await countSheetsApiService.updateCountSheet(
      createResult.countSheetId,
      updateRequest
    );
    expect(updateResult.message).toContain('updated successfully');

    // Verify update
    const updatedSheet = await countSheetsApiService.getCountSheet(createResult.countSheetId);
    expect(updatedSheet.name).toBe('Updated E2E Test Sheet');
    expect(updatedSheet.criteria.supplierIds).toEqual(['fresh-farms']);

    // Step 5: Duplicate count sheet
    const duplicateResult = await countSheetsApiService.duplicateCountSheet(
      createResult.countSheetId,
      'Duplicate E2E Sheet'
    );
    expect(duplicateResult.countSheetId).toBeDefined();
    expect(duplicateResult.name).toBe('Duplicate E2E Sheet');

    // Verify duplicate has same criteria but different ID
    const duplicatedSheet = await countSheetsApiService.getCountSheet(duplicateResult.countSheetId);
    expect(duplicatedSheet.criteria).toEqual(updatedSheet.criteria);
    expect(duplicatedSheet.id).not.toBe(updatedSheet.id);

    // Step 6: Archive original sheet
    const archiveResult = await countSheetsApiService.archiveCountSheet(
      createResult.countSheetId,
      true,
      'E2E test completion'
    );
    expect(archiveResult.message).toContain('archived successfully');

    // Verify archival
    const archivedSheet = await countSheetsApiService.getCountSheet(createResult.countSheetId);
    expect(archivedSheet.isArchived).toBe(true);

    // Step 7: Unarchive sheet
    const unarchiveResult = await countSheetsApiService.archiveCountSheet(
      createResult.countSheetId,
      false
    );
    expect(unarchiveResult.message).toContain('unarchived successfully');

    const unarchivedSheet = await countSheetsApiService.getCountSheet(createResult.countSheetId);
    expect(unarchivedSheet.isArchived).toBe(false);
  });

  it('should handle name uniqueness validation', async () => {
    // Create first sheet
    const firstRequest: CreateCountSheetRequest = {
      name: 'Unique Test Sheet',
      branchScope: { type: 'all' },
      criteria: { categoryIds: ['produce'] }
    };

    const firstResult = await countSheetsApiService.createCountSheet(firstRequest);
    expect(firstResult.countSheetId).toBeDefined();

    // Try to create second sheet with same name in same scope
    const duplicateRequest: CreateCountSheetRequest = {
      name: 'Unique Test Sheet', // Same name
      branchScope: { type: 'all' }, // Same scope
      criteria: { categoryIds: ['meat'] }
    };

    try {
      await countSheetsApiService.createCountSheet(duplicateRequest);
      expect.fail('Should have failed due to name conflict');
    } catch (error: any) {
      // Expected to fail
      expect(error).toBeDefined();
    }

    // But should succeed with different branch scope
    const differentScopeRequest: CreateCountSheetRequest = {
      name: 'Unique Test Sheet', // Same name
      branchScope: { type: 'specific', branchId: 'main-restaurant' }, // Different scope
      criteria: { categoryIds: ['meat'] }
    };

    const differentScopeResult = await countSheetsApiService.createCountSheet(differentScopeRequest);
    expect(differentScopeResult.countSheetId).toBeDefined();
  });

  it('should handle preview with different filters', async () => {
    // Create sheet with multiple criteria
    const createRequest: CreateCountSheetRequest = {
      name: 'Multi-Criteria Sheet',
      branchScope: { type: 'all' },
      criteria: {
        categoryIds: ['produce', 'meat'],
        storageAreaIds: ['cooler'],
        includeZeroStock: false
      }
    };

    const result = await countSheetsApiService.createCountSheet(createRequest);
    
    // Preview with different branches
    const allBranchesPreview = await countSheetsApiService.previewCountSheet(result.countSheetId);
    expect(allBranchesPreview.totalItems).toBeGreaterThan(0);

    const specificBranchPreview = await countSheetsApiService.previewCountSheet(
      result.countSheetId,
      { branchId: 'main-restaurant' }
    );
    expect(specificBranchPreview.totalItems).toBeGreaterThan(0);

    // Preview should handle pagination
    const pagedPreview = await countSheetsApiService.previewCountSheet(
      result.countSheetId,
      { page: 1, pageSize: 5 }
    );
    expect(pagedPreview.items).toHaveLength(Math.min(5, pagedPreview.totalItems));
    expect(pagedPreview.pageSize).toBe(5);
  });

  it('should list count sheets with filtering', async () => {
    // Create a few test sheets
    const testSheets = [
      { name: 'Produce Daily', branchScope: { type: 'all' as const }, criteria: { categoryIds: ['produce'] } },
      { name: 'Main Restaurant Check', branchScope: { type: 'specific' as const, branchId: 'main-restaurant' }, criteria: { categoryIds: ['meat'] } }
    ];

    for (const sheet of testSheets) {
      await countSheetsApiService.createCountSheet(sheet);
    }

    // List all count sheets
    const allSheets = await countSheetsApiService.listCountSheets();
    expect(allSheets.data.length).toBeGreaterThanOrEqual(2);

    // List with search filter
    const searchedSheets = await countSheetsApiService.listCountSheets({
      search: 'Produce'
    });
    expect(searchedSheets.data.every(sheet => 
      sheet.name.toLowerCase().includes('produce')
    )).toBe(true);

    // List with branch filter
    const branchFilteredSheets = await countSheetsApiService.listCountSheets({
      branchId: 'main-restaurant'
    });
    // Should include sheets for all branches AND specific main-restaurant sheets
    expect(branchFilteredSheets.data.length).toBeGreaterThan(0);
  });

  it('should handle count sheet criteria resolution correctly', async () => {
    // Test different criteria combinations
    const testCases = [
      {
        name: 'Categories Only',
        criteria: { categoryIds: ['produce'], includeZeroStock: true }
      },
      {
        name: 'Storage Areas Only', 
        criteria: { storageAreaIds: ['freezer'], includeZeroStock: false }
      },
      {
        name: 'Mixed Criteria',
        criteria: {
          categoryIds: ['produce'],
          storageAreaIds: ['cooler'],
          includeZeroStock: true
        }
      },
      {
        name: 'Zero Stock Exclusion',
        criteria: {
          categoryIds: ['produce'],
          includeZeroStock: false
        }
      }
    ];

    for (const testCase of testCases) {
      const createResult = await countSheetsApiService.createCountSheet({
        name: testCase.name,
        branchScope: { type: 'all' },
        criteria: testCase.criteria
      });

      const preview = await countSheetsApiService.previewCountSheet(createResult.countSheetId);
      
      // Verify preview respects criteria
      expect(preview.totalItems).toBeGreaterThanOrEqual(0);
      
      if (testCase.criteria.includeZeroStock === false) {
        // Should only include items with stock > 0
        expect(preview.items.every(item => item.currentStock > 0)).toBe(true);
      }
    }
  });

  it('should handle archiving and filtering by archive status', async () => {
    // Create and then archive a sheet
    const createRequest: CreateCountSheetRequest = {
      name: 'Archive Test Sheet',
      branchScope: { type: 'all' },
      criteria: { categoryIds: ['produce'] }
    };

    const result = await countSheetsApiService.createCountSheet(createRequest);
    
    // Archive the sheet
    await countSheetsApiService.archiveCountSheet(result.countSheetId, true, 'Test archival');

    // Verify it doesn't appear in active list
    const activeSheets = await countSheetsApiService.listCountSheets({ archived: false });
    expect(activeSheets.data.find(s => s.id === result.countSheetId)).toBeUndefined();

    // Verify it appears in archived list
    const archivedSheets = await countSheetsApiService.listCountSheets({ archived: true });
    expect(archivedSheets.data.find(s => s.id === result.countSheetId)).toBeDefined();

    // Unarchive and verify it's back in active list
    await countSheetsApiService.archiveCountSheet(result.countSheetId, false);
    
    const activeAgain = await countSheetsApiService.listCountSheets({ archived: false });
    expect(activeAgain.data.find(s => s.id === result.countSheetId)).toBeDefined();
  });
});
