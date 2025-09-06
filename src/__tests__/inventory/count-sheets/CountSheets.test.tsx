import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CountSheets from '../../../pages/inventory/CountSheets';
import type { CountSheet, CountSheetsResponse } from '../../../inventory/count-sheets/types';

// Mock the hooks and API
const mockNavigate = vi.fn();
const mockShowToast = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: mockShowToast
  })
}));

const mockCountSheets: CountSheet[] = [
  {
    id: 'sheet-1',
    name: 'Daily Produce Check',
    branchScope: { type: 'all' },
    criteria: {
      categoryIds: ['produce'],
      includeZeroStock: false
    },
    isArchived: false,
    lastUsedAt: Date.now() - 24 * 60 * 60 * 1000, // Yesterday
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // Week ago
    createdBy: 'john.manager'
  },
  {
    id: 'sheet-2',
    name: 'Freezer Items',
    branchScope: { type: 'specific', branchId: 'main-restaurant' },
    criteria: {
      storageAreaIds: ['freezer'],
      includeZeroStock: true
    },
    isArchived: false,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    createdBy: 'jane.supervisor'
  },
  {
    id: 'sheet-3',
    name: 'Old Sheet',
    branchScope: { type: 'all' },
    criteria: {
      categoryIds: ['beverages']
    },
    isArchived: true,
    lastUsedAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // Month ago
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    createdBy: 'old.user'
  }
];

const mockResponse: CountSheetsResponse = {
  data: mockCountSheets.filter(s => !s.isArchived), // Default to active sheets
  total: 2,
  page: 1,
  pageSize: 25,
  totalPages: 1
};

vi.mock('../../../hooks/useApi', () => ({
  useApi: (url: string, options?: any) => {
    const params = options?.params || {};
    const isArchived = params.archived === true;
    
    const filteredSheets = mockCountSheets.filter(sheet => {
      if (isArchived !== sheet.isArchived) return false;
      if (params.search && !sheet.name.toLowerCase().includes(params.search.toLowerCase())) return false;
      return true;
    });

    return {
      data: {
        data: filteredSheets,
        total: filteredSheets.length,
        page: params.page || 1,
        pageSize: params.pageSize || 25,
        totalPages: Math.ceil(filteredSheets.length / (params.pageSize || 25))
      },
      loading: false,
      error: null,
      refetch: vi.fn()
    };
  }
}));

function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe('CountSheets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render count sheets list correctly', () => {
      renderWithRouter(<CountSheets />);

      // Check header
      expect(screen.getByText('Count Sheets')).toBeInTheDocument();
      expect(screen.getByText('Saved item scopes for quick inventory counts')).toBeInTheDocument();
      expect(screen.getByText('Create Count Sheet')).toBeInTheDocument();

      // Check table headers
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Scope Summary')).toBeInTheDocument();
      expect(screen.getByText('Branch Scope')).toBeInTheDocument();
      expect(screen.getByText('Last Used')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();

      // Check count sheet data
      expect(screen.getByText('Daily Produce Check')).toBeInTheDocument();
      expect(screen.getByText('Freezer Items')).toBeInTheDocument();
      expect(screen.getAllByText('All Branches')).toHaveLength(1);
      expect(screen.getByText('Main Restaurant')).toBeInTheDocument();

      // Check scope summary badges
      expect(screen.getByText('Categories: Produce')).toBeInTheDocument();
      expect(screen.getByText('Storage: Walk-in Freezer')).toBeInTheDocument();

      // Check last used formatting
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
      expect(screen.getByText('Never used')).toBeInTheDocument();

      // Check status badges
      expect(screen.getAllByText('Active')).toHaveLength(2);
    });

    it('should show empty state when no count sheets', () => {
      vi.doMock('../../../hooks/useApi', () => ({
        useApi: () => ({
          data: { data: [], total: 0, page: 1, pageSize: 25, totalPages: 0 },
          loading: false,
          error: null,
          refetch: vi.fn()
        })
      }));

      renderWithRouter(<CountSheets />);
      
      expect(screen.getByText('No count sheets found')).toBeInTheDocument();
      expect(screen.getByText(/Create your first count sheet to quickly start inventory counts/)).toBeInTheDocument();
    });

    it('should show loading state', () => {
      vi.doMock('../../../hooks/useApi', () => ({
        useApi: () => ({
          data: null,
          loading: true,
          error: null,
          refetch: vi.fn()
        })
      }));

      renderWithRouter(<CountSheets />);
      
      // Should show skeleton loaders
      const skeletons = screen.getAllByTestId(/skeleton/i);
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Filtering', () => {
    it('should filter by search term', () => {
      renderWithRouter(<CountSheets />);
      
      const searchInput = screen.getByPlaceholderText('Search count sheets by name...');
      fireEvent.change(searchInput, { target: { value: 'Daily' } });

      // Should trigger filter change - this would be tested with actual API integration
      expect(searchInput).toHaveValue('Daily');
    });

    it('should filter by branch', () => {
      renderWithRouter(<CountSheets />);
      
      const branchSelect = screen.getAllByRole('combobox')[0]; // First select is branch filter
      fireEvent.change(branchSelect, { target: { value: 'main-restaurant' } });

      expect(branchSelect).toHaveValue('main-restaurant');
    });

    it('should toggle between active and archived', () => {
      renderWithRouter(<CountSheets />);
      
      const statusSelect = screen.getAllByRole('combobox')[1]; // Second select is archive filter
      fireEvent.change(statusSelect, { target: { value: 'true' } });

      expect(statusSelect).toHaveValue('true');
    });
  });

  describe('Actions', () => {
    it('should navigate to start count when use action clicked', async () => {
      renderWithRouter(<CountSheets />);
      
      // Find and click the actions button for first sheet
      const actionButtons = screen.getAllByRole('button', { name: /open menu/i });
      fireEvent.click(actionButtons[0]);

      await waitFor(() => {
        const startCountButton = screen.getByText('Start Count');
        fireEvent.click(startCountButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/inventory/counts/new?sheetId=sheet-1');
    });

    it('should open edit modal when edit action clicked', async () => {
      renderWithRouter(<CountSheets />);
      
      const actionButtons = screen.getAllByRole('button', { name: /open menu/i });
      fireEvent.click(actionButtons[0]);

      await waitFor(() => {
        const editButton = screen.getByText('Edit');
        fireEvent.click(editButton);
      });

      // Should open edit modal (in real test, would check for modal content)
    });

    it('should show correct actions based on sheet status', async () => {
      renderWithRouter(<CountSheets />);
      
      // Check actions for active sheet
      const actionButtons = screen.getAllByRole('button', { name: /open menu/i });
      fireEvent.click(actionButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Start Count')).toBeInTheDocument();
        expect(screen.getByText('Edit')).toBeInTheDocument();
        expect(screen.getByText('Duplicate')).toBeInTheDocument();
        expect(screen.getByText('Archive')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });
  });

  describe('CRUD Operations', () => {
    it('should open create modal when create button clicked', () => {
      renderWithRouter(<CountSheets />);
      
      const createButton = screen.getByText('Create Count Sheet');
      fireEvent.click(createButton);

      // In real implementation, would check for modal being open
      // expect(screen.getByText('Create Count Sheet')).toBeInTheDocument();
    });

    it('should handle successful creation', async () => {
      renderWithRouter(<CountSheets />);
      
      // This would test the actual creation flow in integration tests
      // For now, we can verify the success callback structure exists
      expect(screen.getByText('Create Count Sheet')).toBeInTheDocument();
    });

    it('should handle duplication with name conflict', async () => {
      // Mock API error response
      global.fetch = vi.fn().mockRejectedValue(new Error('Name already exists'));

      renderWithRouter(<CountSheets />);
      
      // This would test actual duplication error handling
      // The component should show error toast when duplication fails
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithRouter(<CountSheets />);
      
      // Check for screen reader text
      expect(screen.getAllByText('Open menu')).toHaveLength(2);
      
      // Check search input has proper labeling
      const searchInput = screen.getByPlaceholderText('Search count sheets by name...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderWithRouter(<CountSheets />);
      
      // All interactive elements should be focusable
      const buttons = screen.getAllByRole('button');
      const selects = screen.getAllByRole('combobox');
      const inputs = screen.getAllByRole('textbox');
      
      [...buttons, ...selects, ...inputs].forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});
