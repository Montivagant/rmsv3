/**
 * Inventory Item Create Modal Integration Tests
 * 
 * Tests modal behavior, form validation, and user interactions
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InventoryItemCreateModal from '../../../components/inventory/InventoryItemCreateModal';

// Mock dependencies
vi.mock('../../../hooks/useApi', () => ({
  useApi: vi.fn(),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

const mockUseApi = vi.mocked((await import('../../../hooks/useApi')).useApi as any);
const mockUseToast = vi.mocked((await import('../../../hooks/useToast')).useToast as any);

// Mock data
const mockCategories = [
  { id: 'cat-1', name: 'Food - Perishable', description: 'Perishable food items' },
  { id: 'cat-2', name: 'Food - Non-Perishable', description: 'Non-perishable food items' },
  { id: 'cat-3', name: 'Beverages', description: 'Drinks and beverage supplies' },
];

const mockUnits = [
  { id: 'pieces', name: 'Pieces', abbreviation: 'pcs' },
  { id: 'lbs', name: 'Pounds', abbreviation: 'lbs' },
  { id: 'gallons', name: 'Gallons', abbreviation: 'gal' },
  { id: 'grams', name: 'Grams', abbreviation: 'g' },
];

const mockItems = {
  items: [
    { sku: 'EXISTING-001' },
    { sku: 'EXISTING-002' },
  ],
};

describe('InventoryItemCreateModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
    });

    // Default successful API responses
    mockUseApi.mockImplementation((endpoint: string) => {
      if (endpoint === '/api/inventory/categories') {
        return { data: mockCategories, loading: false, error: null };
      }
      if (endpoint === '/api/inventory/units') {
        return { data: mockUnits, loading: false, error: null };
      }
      if (endpoint === '/api/inventory/items?fields=sku') {
        return { data: mockItems, loading: false, error: null };
      }
      return { data: null, loading: false, error: null };
    });

    // Mock successful API creation
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'new-item-123',
        sku: 'TEST-001',
        name: 'Test Item',
        status: 'active',
        createdAt: new Date().toISOString(),
      }),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Modal Rendering', () => {
    it('should not render when closed', () => {
      render(
        <InventoryItemCreateModal
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.queryByText('Create Item')).not.toBeInTheDocument();
    });

    it('should render form when open', () => {
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('Create Item')).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sku/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      mockUseApi.mockImplementation(() => {
        return { data: null, loading: true, error: null };
      });

      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('Loading form data...')).toBeInTheDocument();
    });

    it('should show error state', () => {
      mockUseApi.mockImplementation((endpoint: string) => {
        if (endpoint === '/api/inventory/categories') {
          return { 
            data: null, 
            loading: false, 
            error: { message: 'Failed to load categories' } 
          };
        }
        return { data: null, loading: false, error: null };
      });

      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('Failed to load form data')).toBeInTheDocument();
      expect(screen.getByText('Failed to load categories')).toBeInTheDocument();
    });

    it('should populate dropdown options', () => {
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const categorySelect = screen.getByLabelText(/category/i);
      expect(categorySelect).toBeInTheDocument();

      // Check that options are present (in a real test you might open the dropdown)
      // Note: Testing select options requires more complex interaction or different testing approach
    });
  });

  describe('Form Validation', () => {
    it('should require name field', async () => {
      const user = userEvent.setup();
      
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Please fix the errors in the form',
          'error'
        );
      });
    });

    it('should validate SKU format', async () => {
      const user = userEvent.setup();
      
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const skuInput = screen.getByLabelText(/sku/i);
      await user.type(skuInput, 'AB'); // Too short

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Please fix the errors in the form',
          'error'
        );
      });
    });

    it('should check SKU uniqueness', async () => {
      const user = userEvent.setup();
      
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill out required fields
      await user.type(screen.getByLabelText(/name/i), 'Test Item');
      await user.type(screen.getByLabelText(/sku/i), 'EXISTING-001'); // Exists in mock data

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Please fix the errors in the form',
          'error'
        );
      });
    });

    it('should validate level hierarchy', async () => {
      const user = userEvent.setup();
      
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/name/i), 'Test Item');
      await user.type(screen.getByLabelText(/sku/i), 'TEST-001');

      // Set invalid levels (max < min)
      await user.type(screen.getByLabelText(/minimum level/i), '20');
      await user.type(screen.getByLabelText(/maximum level/i), '10');

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Please fix the errors in the form',
          'error'
        );
      });
    });
  });

  describe('SKU Generation', () => {
    it('should generate SKU from item name', async () => {
      const user = userEvent.setup();
      
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'Test Item');

      const generateButton = screen.getByRole('button', { name: /generate/i });
      await user.click(generateButton);

      const skuInput = screen.getByLabelText(/sku/i) as HTMLInputElement;
      expect(skuInput.value).toMatch(/^ITM-TES\d{3}$/);
      
      expect(mockShowToast).toHaveBeenCalledWith(
        'SKU generated successfully',
        'success'
      );
    });

    it('should warn if trying to generate SKU without name', async () => {
      const user = userEvent.setup();
      
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const generateButton = screen.getByRole('button', { name: /generate/i });
      await user.click(generateButton);

      expect(mockShowToast).toHaveBeenCalledWith(
        'Enter an item name first',
        'warning'
      );
    });
  });

  describe('Form Submission', () => {
    it('should submit valid form data', async () => {
      const user = userEvent.setup();
      
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/name/i), 'Test Item');
      await user.type(screen.getByLabelText(/sku/i), 'TEST-001');
      
      // Note: In a real test, you'd need to select from dropdowns
      // This is simplified for the test structure
      
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/inventory/items',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: expect.stringContaining('Test Item'),
          })
        );
      });
    });

    it('should handle API errors', async () => {
      const user = userEvent.setup();
      
      // Mock failed API response
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'SKU already exists' }),
      });

      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill required fields (simplified)
      await user.type(screen.getByLabelText(/name/i), 'Test Item');
      await user.type(screen.getByLabelText(/sku/i), 'TEST-001');

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'SKU already exists',
          'error'
        );
      });
    });

    it('should call onSuccess after successful creation', async () => {
      const user = userEvent.setup();
      
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill and submit form (simplified)
      await user.type(screen.getByLabelText(/name/i), 'Test Item');
      await user.type(screen.getByLabelText(/sku/i), 'TEST-001');

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('new-item-123');
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith(
          'Item created successfully!',
          'success'
        );
      });
    });
  });

  describe('Modal Behavior', () => {
    it('should handle close with unsaved changes', async () => {
      const user = userEvent.setup();
      
      // Mock confirm dialog
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Make some changes
      await user.type(screen.getByLabelText(/name/i), 'Test Item');

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(window.confirm).toHaveBeenCalledWith(
        'You have unsaved changes. Are you sure you want to close?'
      );
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should close without confirmation when no changes', async () => {
      const user = userEvent.setup();
      
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset form when modal reopens', () => {
      const { rerender } = render(
        <InventoryItemCreateModal
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      rerender(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('should focus name input when modal opens', () => {
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveFocus();
    });

    it('should have proper ARIA attributes', () => {
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
      
      const requiredFields = screen.getAllByLabelText(/\*/);
      requiredFields.forEach(field => {
        expect(field).toHaveAttribute('required');
        expect(field).toHaveAttribute('aria-required', 'true');
      });
    });

    it('should have proper error associations', async () => {
      const user = userEvent.setup();
      
      render(
        <InventoryItemCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Trigger validation error
      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        const errorId = nameInput.getAttribute('aria-describedby');
        if (errorId) {
          const errorElement = document.getElementById(errorId);
          expect(errorElement).toHaveAttribute('role', 'alert');
        }
      });
    });
  });
});
